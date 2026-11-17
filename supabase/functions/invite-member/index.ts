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

const allowedRoles = new Set(["hr_admin", "manager", "supervisor", "field_employee"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server authentication is not configured" }, 500);
  }

  const token = authorization.slice("Bearer ".length);
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Invalid or expired session" }, 401);
  const actorId = authData.user.id;

  let input: { organizationId?: string; email?: string; role?: string; displayName?: string };
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const organizationId = input.organizationId;
  const email = input.email?.trim().toLowerCase();
  const role = input.role ?? "field_employee";
  const displayName = input.displayName?.trim() ?? "";

  if (!organizationId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "A valid organization ID and email are required" }, 400);
  }
  if (!allowedRoles.has(role)) return json({ error: "This role cannot be assigned through invitations" }, 400);
  if (displayName.length > 120) return json({ error: "Display name is too long" }, 400);

  const { data: actorMembership, error: membershipError } = await adminClient
    .from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", actorId)
    .maybeSingle();

  if (membershipError) return json({ error: "Unable to verify organization permissions" }, 500);
  if (!actorMembership || actorMembership.status !== "active" ||
      !["org_admin", "hr_admin"].includes(actorMembership.role)) {
    return json({ error: "You are not authorized to invite members to this organization" }, 403);
  }

  const { data: existing } = await adminClient
    .from("organization_members")
    .select("id,status")
    .eq("organization_id", organizationId)
    .eq("user_id", actorId)
    .maybeSingle();

  if (existing) {
    // No duplicate membership can be created for the same organization/user pair.
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: displayName ? { display_name: displayName } : {},
    redirectTo: Deno.env.get("INVITE_REDIRECT_URL"),
  });

  if (inviteError || !inviteData.user) {
    return json({
      error: inviteError?.message ?? "Invitation could not be created",
      hint: "If this email already has a FieldBuddy account, ask an administrator to link the existing account through the approved provisioning process.",
    }, 409);
  }

  const { data: membership, error: insertError } = await adminClient
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: inviteData.user.id,
      role,
      status: "invited",
      invited_by: actorId,
    })
    .select("id,organization_id,user_id,role,status")
    .single();

  if (insertError) {
    // The invited auth account remains valid; surface a safe, actionable error.
    return json({ error: "Invitation was sent, but organization membership could not be created. Contact an administrator.", detail: insertError.message }, 500);
  }

  await adminClient.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actorId,
    action: "member.invited",
    entity_type: "organization_member",
    entity_id: membership.id,
    metadata: { email, role },
  });

  return json({ membership, message: "Invitation sent" }, 201);
});
