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

const managerRoles = new Set(["org_admin", "hr_admin", "manager", "supervisor"]);
const employeeTransitions: Record<string, string[]> = {
  assigned: ["accepted"],
  accepted: ["in_progress"],
  in_progress: ["submitted"],
  rejected: ["in_progress"],
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) return json({ error: "Server is not configured" }, 500);

  const token = authorization.slice("Bearer ".length);
  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Invalid or expired session" }, 401);
  const actorId = authData.user.id;

  let input: {
    action?: "create" | "transition";
    organizationId?: string;
    taskId?: string;
    title?: string;
    description?: string;
    assignedTo?: string;
    dueAt?: string | null;
    priority?: string;
    nextStatus?: string;
    note?: string;
  };
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const organizationId = input.organizationId;
  if (!organizationId || !["create", "transition"].includes(input.action ?? "")) {
    return json({ error: "Organization and valid task action are required" }, 400);
  }

  const { data: membership, error: membershipError } = await db
    .from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", actorId)
    .maybeSingle();

  if (membershipError) return json({ error: "Unable to verify organization permissions" }, 500);
  if (!membership || membership.status !== "active") return json({ error: "Active organization membership required" }, 403);

  if (input.action === "create") {
    if (!managerRoles.has(membership.role)) return json({ error: "Only organization managers can create tasks" }, 403);
    const title = input.title?.trim();
    const description = input.description?.trim() ?? null;
    const assignedTo = input.assignedTo;
    const priority = input.priority ?? "normal";
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;

    if (!title || title.length > 240 || (description && description.length > 10000)) {
      return json({ error: "Task title or description is invalid" }, 400);
    }
    if (!assignedTo) return json({ error: "Select an employee to assign this task to" }, 400);
    if (!["low", "normal", "high", "urgent"].includes(priority)) return json({ error: "Invalid priority" }, 400);
    if (input.dueAt && (!dueAt || !Number.isFinite(dueAt.getTime()))) return json({ error: "Invalid due date" }, 400);

    const { data: assignee, error: assigneeError } = await db
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", assignedTo)
      .eq("status", "active")
      .maybeSingle();
    if (assigneeError) return json({ error: "Unable to verify assignee" }, 500);
    if (!assignee) return json({ error: "Assignee is not an active member of this organization" }, 400);

    const { data: task, error: createError } = await db.rpc("create_task_with_audit", {
      p_organization_id: organizationId,
      p_title: title,
      p_description: description,
      p_assigned_to: assignedTo,
      p_created_by: actorId,
      p_due_at: dueAt?.toISOString() ?? null,
      p_priority: priority,
    });
    if (createError) return json({ error: "Task could not be created" }, 500);
    return json({ task, message: "Task created" }, 201);
  }

  if (!input.taskId || !input.nextStatus) return json({ error: "Task ID and next status are required" }, 400);

  const { data: task, error: taskError } = await db
    .from("tasks")
    .select("id,assigned_to,created_by,status")
    .eq("id", input.taskId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (taskError) return json({ error: "Unable to load task" }, 500);
  if (!task) return json({ error: "Task not found" }, 404);

  const nextStatus = input.nextStatus;
  const isManager = managerRoles.has(membership.role);
  const isParticipant = task.assigned_to === actorId || task.created_by === actorId;
  if (!isParticipant && !isManager) return json({ error: "You cannot access this task" }, 403);

  let allowed = false;
  if (isManager && ["approved", "rejected", "cancelled"].includes(nextStatus)) {
    allowed = nextStatus === "cancelled" ? !["approved", "cancelled"].includes(task.status) : task.status === "submitted";
  } else if (task.assigned_to === actorId) {
    allowed = (employeeTransitions[task.status] ?? []).includes(nextStatus);
  }
  if (!allowed) return json({ error: "This task status transition is not permitted" }, 403);

  // A task cannot be submitted for manager review until proof of work has
  // been uploaded to the private, organisation-scoped task-proof bucket.
  if (nextStatus === "submitted") {
    const { count, error: attachmentError } = await db
      .from("task_attachments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("task_id", task.id);

    if (attachmentError) {
      return json({ error: "Unable to verify task proof attachments" }, 500);
    }
    if (!count || count < 1) {
      return json({ error: "Attach at least one proof-of-work file before submitting this task for review." }, 400);
    }
  }

  const { data: updatedTask, error: transitionError } = await db.rpc("apply_task_transition", {
    p_organization_id: organizationId,
    p_task_id: task.id,
    p_actor_id: actorId,
    p_expected_status: task.status,
    p_next_status: nextStatus,
    p_note: input.note?.trim() || null,
  });

  if (transitionError) {
    const conflict = transitionError.code === "40001";
    return json({ error: conflict ? "Task was updated by someone else. Refresh and try again." : "Task status could not be updated" }, conflict ? 409 : 500);
  }

  return json({ task: updatedTask, message: "Task status updated" });
});
