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

export interface TaskAssignee {
  user_id: string;
  display_name: string;
  employee_id: string | null;
  member_role: string;
}

export async function getOrganizationAssignees(organizationId: string): Promise<TaskAssignee[]> {
  const { data, error } = (await supabase.rpc(
    "get_organization_assignees" as never,
    { p_organization_id: organizationId } as never,
  )) as unknown as {
    data: TaskAssignee[] | null;
    error: { message: string } | null;
  };
  if (error) throw new Error(error.message);
  return data ?? [];
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


export interface TaskDetailComment {
  id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

export interface TaskDetailHistoryEntry {
  id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  note: string | null;
  changed_by: string | null;
  actor_name: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  uploader_name: string;
  created_at: string;
}

export interface OrganizationTaskDetail {
  task: OrganizationTask & {
    assignee_name: string;
    created_by_name: string;
  };
  comments: TaskDetailComment[];
  history: TaskDetailHistoryEntry[];
  attachments: TaskAttachment[];
}

export async function getOrganizationTaskDetail(
  organizationId: string,
  taskId: string,
): Promise<OrganizationTaskDetail> {
  const { data, error } = (await supabase.rpc(
    "get_organization_task_detail" as never,
    {
      p_organization_id: organizationId,
      p_task_id: taskId,
    } as never,
  )) as unknown as {
    data: OrganizationTaskDetail | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  if (!data?.task) throw new Error("Task details are not available for this account.");
  return data;
}

export async function addOrganizationTaskComment(input: {
  organizationId: string;
  taskId: string;
  body: string;
}): Promise<TaskDetailComment> {
  const { data, error } = (await supabase.rpc(
    "add_task_comment" as never,
    {
      p_organization_id: input.organizationId,
      p_task_id: input.taskId,
      p_body: input.body.trim(),
    } as never,
  )) as unknown as {
    data: TaskDetailComment | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  if (!data) throw new Error("The task comment was not saved.");
  return data;
}

export async function uploadOrganizationTaskAttachment(input: {
  organizationId: string;
  taskId: string;
  userId: string;
  file: File;
}): Promise<TaskAttachment> {
  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);
  if (!allowedTypes.has(input.file.type)) {
    throw new Error("Choose a JPG, PNG, WebP image or PDF file.");
  }
  if (input.file.size < 1 || input.file.size > 10 * 1024 * 1024) {
    throw new Error("The attachment must be 10 MB or smaller.");
  }

  const safeName = input.file.name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(-120) || "proof";
  const storagePath = [
    input.organizationId,
    input.taskId,
    input.userId,
    `${crypto.randomUUID()}-${safeName}`,
  ].join("/");

  const { error: uploadError } = await supabase.storage
    .from("task-proof")
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = (await supabase.rpc(
    "register_task_attachment" as never,
    {
      p_organization_id: input.organizationId,
      p_task_id: input.taskId,
      p_storage_path: storagePath,
      p_file_name: input.file.name.slice(0, 255),
      p_content_type: input.file.type,
      p_size_bytes: input.file.size,
    } as never,
  )) as unknown as {
    data: TaskAttachment | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(
      `File uploaded but could not be registered on the task: ${error.message}. Contact an administrator before uploading it again.`,
    );
  }
  if (!data) throw new Error("The uploaded file could not be attached to this task.");
  return data;
}

export async function getTaskAttachmentSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("task-proof")
    .createSignedUrl(storagePath, 60);

  if (error) throw new Error(error.message);
  if (!data?.signedUrl) throw new Error("A secure download link could not be created.");
  return data.signedUrl;
}
