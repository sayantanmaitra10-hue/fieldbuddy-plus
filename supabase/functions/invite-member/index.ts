import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const configuredAppOrigin = (() => {
  const raw = Deno.env.get("APP_ORIGIN")?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && parsed.hostname === "localhost")) return null;
    return parsed.origin;
  } catch {
    return null;
  }
})();

const corsHeaders = {
  ...(configuredAppOrigin ? { "Access-Control-Allow-Origin": configuredAppOrigin, "Vary": "Origin" } : {}),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const allowedRoles = new Set(["hr_admin", "manager", "supervisor", "field_employee"]);

function getInvitationRedirectUrl(): string {
  const configuredRedirect = Deno.env.get("INVITE_REDIRECT_URL")?.trim();
  if (!configuredAppOrigin || !configuredRedirect) {
    throw new Error("APP_ORIGIN and INVITE_REDIRECT_URL must be configured before invitations can be sent.");
  }

  const redirect = new URL(configuredRedirect);
  if (redirect.origin !== configuredAppOrigin) {
    throw new Error("INVITE_REDIRECT_URL must use the same origin as APP_ORIGIN.");
  }

  // Always land invitees on the app's first-party callback/password setup route.
  // This avoids silently sending them to the landing page or Lovable editor.
  redirect.pathname = "/auth/callback";
  redirect.search = "?flow=invite";
  redirect.hash = "";
  return redirect.toString();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!configuredAppOrigin) {
    return json({ error: "The invitation service is not configured. Ask an administrator to verify APP_ORIGIN." }, 500);
  }
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin && requestOrigin !== configuredAppOrigin) {
    return json({ error: "This application origin is not allowed to send invitations." }, 403);
  }

  let redirectTo: string;
  try {
    redirectTo = getInvitationRedirectUrl();
  } catch (cause) {
    console.error("Invitation redirect configuration is invalid", cause);
    return json({ error: "The invitation callback is not configured correctly. Ask an administrator to verify the application URL settings." }, 500);
  }

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

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: displayName ? { display_name: displayName } : {},
    redirectTo,
  });

  if (inviteError || !inviteData.user) {
    const existingAccount = /already registered|already exists|user already|duplicate/i.test(inviteError?.message ?? "");
    return json({
      code: existingAccount ? "USER_ALREADY_EXISTS" : "INVITE_FAILED",
      error: existingAccount
        ? "This email already has a FieldBuddy authentication account. The employee must use that account, or an administrator must follow the existing-account provisioning process."
        : "The invitation could not be sent. Verify the email address and email-provider configuration, then try again.",
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
    console.error("Invitation sent but organization membership insert failed", insertError);
    return json({
      error: "The invitation email was sent, but the organization membership could not be saved. Do not send another invitation until an administrator checks the team directory.",
    }, 500);
  }

  const { error: auditError } = await adminClient.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actorId,
    action: "member.invited",
    entity_type: "organization_member",
    entity_id: membership.id,
    metadata: { email, role },
  });
  if (auditError) console.error("Unable to record member invitation audit event", auditError);

  return json({ membership, message: "Invitation sent" }, 201);
});
