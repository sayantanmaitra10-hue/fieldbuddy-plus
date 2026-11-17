import { supabase } from "@/integrations/supabase/client";

export type AttendanceEventType = "check_in" | "check_out";

export interface AttendancePosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface AttendanceEventResult {
  event: {
    id: string;
    event_type: AttendanceEventType;
    captured_at: string;
    received_at: string;
    validation_status: "accepted" | "outside_geofence" | "low_accuracy" | "rejected" | "pending";
    attendance_record_id: string | null;
  };
  attendance_record_id: string | null;
  duplicate: boolean;
  message: string;
}

export interface TodayAttendance {
  attendance_record_id: string;
  first_check_in_at: string | null;
  last_check_out_at: string | null;
  attendance_status: string;
}

export async function getTodayAttendance(organizationId: string): Promise<TodayAttendance | null> {
  const { data, error } = (await supabase.rpc(
    "get_my_attendance_today" as never,
    { p_organization_id: organizationId } as never,
  )) as unknown as {
    data: TodayAttendance[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function submitAttendanceEvent(
  organizationId: string,
  eventType: AttendanceEventType,
  position: AttendancePosition,
): Promise<AttendanceEventResult> {
  const { data, error } = await supabase.functions.invoke("attendance-event", {
    body: {
      organizationId,
      eventType,
      capturedAt: new Date().toISOString(),
      latitude: position.latitude,
      longitude: position.longitude,
      accuracyMeters: position.accuracyMeters,
      idempotencyKey: crypto.randomUUID(),
    },
  });

  if (error) {
    const message = data && typeof data === "object" && "error" in data
      ? String(data.error)
      : error.message;
    throw new Error(message || "Attendance could not be submitted");
  }
  if (!data?.event) throw new Error(data?.error ?? "The attendance service returned an invalid response");
  return data as AttendanceEventResult;
}
