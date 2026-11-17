import { supabase } from "@/integrations/supabase/client";

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "assigned" | "accepted" | "in_progress" | "submitted" | "approved" | "rejected" | "cancelled";

export interface OrganizationTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  organizationId: string;
  title: string;
  description?: string;
  assignedTo: string;
  dueAt?: string | null;
  priority: TaskPriority;
}

export async function getOrganizationTasks(organizationId: string): Promise<OrganizationTask[]> {
  const { data, error } = (await supabase.rpc(
    "get_my_tasks" as never,
    { p_organization_id: organizationId } as never,
  )) as unknown as {
    data: OrganizationTask[] | null;
    error: { message: string } | null;
  };
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createOrganizationTask(input: CreateTaskInput) {
  const { data, error } = await supabase.functions.invoke("task-action", {
    body: {
      action: "create",
      organizationId: input.organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      assignedTo: input.assignedTo,
      dueAt: input.dueAt ?? null,
      priority: input.priority,
    },
  });
  if (error) throw new Error(data?.error ?? error.message);
  if (data?.error) throw new Error(String(data.error));
  return data.task as OrganizationTask;
}

export async function transitionOrganizationTask(input: {
  organizationId: string;
  taskId: string;
  nextStatus: TaskStatus;
  note?: string;
}) {
  const { data, error } = await supabase.functions.invoke("task-action", {
    body: {
      action: "transition",
      organizationId: input.organizationId,
      taskId: input.taskId,
      nextStatus: input.nextStatus,
      note: input.note,
    },
  });
  if (error) throw new Error(data?.error ?? error.message);
  if (data?.error) throw new Error(String(data.error));
  return data.task as OrganizationTask;
}
