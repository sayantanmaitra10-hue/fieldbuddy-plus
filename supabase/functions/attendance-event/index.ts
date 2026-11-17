import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type AttendanceInput = {
  organizationId?: string;
  eventType?: "check_in" | "check_out";
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  idempotencyKey?: string;
  deviceId?: string;
};

const validCoordinate = (lat: number, lon: number) =>
  Number.isFinite(lat) && Number.isFinite(lon) &&
  lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function localDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Server is not configured" }, 500);

  const token = authorization.slice("Bearer ".length);
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Invalid or expired session" }, 401);
  const employeeId = authData.user.id;

  let input: AttendanceInput;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    organizationId,
    eventType,
    capturedAt,
    latitude,
    longitude,
    accuracyMeters,
    idempotencyKey,
    deviceId,
  } = input;

  if (!organizationId || !idempotencyKey || idempotencyKey.length > 128 ||
      !["check_in", "check_out"].includes(eventType ?? "")) {
    return json({ error: "Organization, event type and idempotency key are required" }, 400);
  }
  if (typeof latitude !== "number" || typeof longitude !== "number" ||
      !validCoordinate(latitude, longitude) ||
      typeof accuracyMeters !== "number" || !Number.isFinite(accuracyMeters) || accuracyMeters < 0) {
    return json({ error: "A valid GPS position and accuracy value are required" }, 400);
  }

  const eventTime = capturedAt ? new Date(capturedAt) : new Date();
  if (!Number.isFinite(eventTime.getTime())) return json({ error: "Invalid capture timestamp" }, 400);
  const now = Date.now();
  if (eventTime.getTime() > now + 5 * 60 * 1000 || eventTime.getTime() < now - 7 * 24 * 60 * 60 * 1000) {
    return json({ error: "Capture timestamp is outside the permitted 7-day offline window" }, 400);
  }

  const { data: membership, error: membershipError } = await db
    .from("organization_members")
    .select("id,status")
    .eq("organization_id", organizationId)
    .eq("user_id", employeeId)
    .maybeSingle();

  if (membershipError) return json({ error: "Unable to verify organization membership" }, 500);
  if (!membership || membership.status !== "active") return json({ error: "Active organization membership required" }, 403);

  const { data: duplicate } = await db
    .from("attendance_events")
    .select("id,event_type,captured_at,received_at,validation_status,attendance_record_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (duplicate) return json({ event: duplicate, duplicate: true });

  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .select("timezone")
    .eq("id", organizationId)
    .single();
  if (organizationError || !organization) return json({ error: "Organization not found" }, 404);

  const { data: geofences, error: geofenceError } = await db
    .from("geofences")
    .select("id,name,center_latitude,center_longitude,radius_meters")
    .eq("organization_id", organizationId)
    .eq("is_active", true);
  if (geofenceError) return json({ error: "Unable to load organization geofences" }, 500);

  let nearest: { id: string; name: string; distance: number; radius: number } | null = null;
  for (const fence of geofences ?? []) {
    const distance = distanceMeters(latitude, longitude, fence.center_latitude, fence.center_longitude);
    if (!nearest || distance < nearest.distance) {
      nearest = { id: fence.id, name: fence.name, distance, radius: fence.radius_meters };
    }
  }

  let validationStatus: "accepted" | "outside_geofence" | "low_accuracy" = "accepted";
  let validationDetails: Record<string, unknown> = {
    serverValidatedAt: new Date().toISOString(),
    gpsSource: "browser_geolocation",
    note: "Client GPS coordinates are not cryptographic proof of physical presence.",
  };
  if (accuracyMeters > 150) {
    validationStatus = "low_accuracy";
    validationDetails = { ...validationDetails, reason: "GPS accuracy exceeds 150 metres", accuracyMeters };
  } else if (!nearest || nearest.distance > nearest.radius) {
    validationStatus = "outside_geofence";
    validationDetails = {
      ...validationDetails,
      reason: nearest ? "Outside the nearest active geofence" : "No active geofence is configured",
      nearestDistanceMeters: nearest?.distance ?? null,
    };
  } else {
    validationDetails = {
      ...validationDetails,
      geofenceName: nearest.name,
      distanceFromCenterMeters: Math.round(nearest.distance),
      geofenceRadiusMeters: nearest.radius,
    };
  }

  const workDate = validationStatus === "accepted"
    ? localDate(eventTime, organization.timezone || "Asia/Kolkata")
    : null;

  const { data: result, error: recordError } = await db.rpc("record_attendance_event", {
    p_organization_id: organizationId,
    p_employee_id: employeeId,
    p_event_type: eventType,
    p_captured_at: eventTime.toISOString(),
    p_latitude: latitude,
    p_longitude: longitude,
    p_accuracy_meters: accuracyMeters,
    p_geofence_id: nearest?.id ?? null,
    p_device_id: deviceId?.slice(0, 160) ?? null,
    p_idempotency_key: idempotencyKey,
    p_validation_status: validationStatus,
    p_validation_details: validationDetails,
    p_work_date: workDate,
  });

  if (recordError || !result) {
    return json({ error: "Unable to save attendance event" }, 500);
  }

  return json({
    ...result,
    message: validationStatus === "accepted"
      ? "Attendance event recorded"
      : "Event recorded for manager review",
  }, result.duplicate ? 200 : 201);
});
