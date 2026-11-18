import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  addOrganizationTaskComment,
  getOrganizationTaskDetail,
  getTaskAttachmentSignedUrl,
  transitionOrganizationTask,
  uploadOrganizationTaskAttachment,
  type OrganizationTaskDetail,
  type TaskStatus,
} from "@/lib/task-service";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

const statusLabels: Record<TaskStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  in_progress: "In progress",
  submitted: "Awaiting review",
  approved: "Approved",
  rejected: "Changes requested",
  cancelled: "Cancelled",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const employeeNextStatus: Partial<Record<TaskStatus, TaskStatus>> = {
  assigned: "accepted",
  accepted: "in_progress",
  in_progress: "submitted",
  rejected: "in_progress",
};

const dateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "Not set";

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeMembership, user } = useAuth();
  const { role } = useRole();
  const { toast } = useToast();
  const organizationId = activeMembership?.organization_id;
  const canManage = role === "manager" || role === "admin";

  const [detail, setDetail] = useState<OrganizationTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingAttachment, setOpeningAttachment] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!organizationId || !id) {
      setDetail(null);
      setLoading(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await getOrganizationTaskDetail(organizationId, id);
      setDetail(result);
    } catch (error) {
      setDetail(null);
      toast({
        title: "Unable to load task",
        description: error instanceof Error ? error.message : "The task may not exist or you may not have access.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, id, toast]);

  useEffect(() => { void load(); }, [load]);

  async function handleTransition(nextStatus: TaskStatus) {
    if (!organizationId || !detail) return;
    if (nextStatus === "submitted" && detail.attachments.length === 0) {
      toast({
        title: "Proof required",
        description: "Upload at least one proof-of-work file before submitting this task for review.",
        variant: "destructive",
      });
      return;
    }
    setActionBusy(true);
    try {
      await transitionOrganizationTask({
        organizationId,
        taskId: detail.task.id,
        nextStatus,
      });
      toast({
        title: "Task updated",
        description: `Task status changed to ${statusLabels[nextStatus]}.`,
      });
      await load(true);
    } catch (error) {
      toast({
        title: "Could not update task",
        description: error instanceof Error ? error.message : "Refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUpload() {
    if (!organizationId || !user || !detail || !selectedFile) return;
    setUploading(true);
    try {
      await uploadOrganizationTaskAttachment({
        organizationId,
        taskId: detail.task.id,
        userId: user.id,
        file: selectedFile,
      });
      setSelectedFile(null);
      toast({
        title: "Proof attached",
        description: "The file is stored privately and linked to this task.",
      });
      await load(true);
    } catch (error) {
      toast({
        title: "Proof upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenAttachment(attachmentId: string, storagePath: string) {
    setOpeningAttachment(attachmentId);
    try {
      const signedUrl = await getTaskAttachmentSignedUrl(storagePath);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open attachment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setOpeningAttachment(null);
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !detail || !comment.trim()) return;
    setSendingComment(true);
    try {
      await addOrganizationTaskComment({
        organizationId,
        taskId: detail.task.id,
        body: comment,
      });
      setComment("");
      await load(true);
    } catch (error) {
      toast({
        title: "Comment not saved",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingComment(false);
    }
  }

  const task = detail?.task;
  const isAssignee = Boolean(task && task.assigned_to === user?.id);
  const employeeAction = task && isAssignee ? employeeNextStatus[task.status] : undefined;
  const isClosed = task ? ["approved", "cancelled"].includes(task.status) : false;
  const canUploadProof = Boolean(task && !isClosed && (isAssignee || canManage));

  if (loading) {
    return (
      <>
        <Topbar title="Task detail" subtitle="Loading task record" />
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading live task details…
        </div>
      </>
    );
  }

  if (!detail || !task) {
    return (
      <>
        <Topbar title="Task detail" subtitle="Task record unavailable" />
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          <p className="text-sm text-muted-foreground">This task could not be loaded from the organisation database, or your account does not have permission to view it.</p>
          <Button asChild variant="outline"><Link to="/app/tasks"><ArrowLeft className="mr-2 size-4" /> Back to tasks</Link></Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Task detail" subtitle={activeMembership?.organization_name ?? "Organisation task"} />
      <div className="mx-auto max-w-5xl space-y-5 p-4 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/tasks"><ArrowLeft className="mr-2 size-4" /> Back to task board</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card lg:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{statusLabels[task.status]}</Badge>
            <Badge variant="outline">{priorityLabels[task.priority] ?? task.priority}</Badge>
            {task.status === "submitted" && <Badge>Submitted for review</Badge>}
          </div>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight lg:text-3xl">{task.title}</h1>
          {task.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{task.description}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No additional instructions were added to this task.</p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Assigned to</div>
              <div className="mt-1 text-sm font-medium">{task.assignee_name || "Unassigned"}</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">Created by</div>
              <div className="mt-1 text-sm font-medium">{task.created_by_name || "Team member"}</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="size-3.5" /> Due date</div>
              <div className="mt-1 text-sm font-medium">{dateTime(task.due_at)}</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3.5" /> Created</div>
              <div className="mt-1 text-sm font-medium">{dateTime(task.created_at)}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
            {employeeAction && employeeAction !== "submitted" && (
              <Button disabled={actionBusy} onClick={() => void handleTransition(employeeAction)}>
                {actionBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : employeeAction === "accepted" ? <Check className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
                {employeeAction === "accepted" ? "Accept task" : "Start / resume task"}
              </Button>
            )}
            {employeeAction === "submitted" && (
              <Button disabled={actionBusy || detail.attachments.length === 0} onClick={() => void handleTransition("submitted")}>
                {actionBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Submit for manager review
              </Button>
            )}
            {canManage && task.status === "submitted" && (
              <>
                <Button disabled={actionBusy} onClick={() => void handleTransition("approved")} className="bg-success text-success-foreground hover:bg-success/90">
                  {actionBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                  Approve task
                </Button>
                <Button variant="outline" disabled={actionBusy} onClick={() => void handleTransition("rejected")}>
                  <X className="mr-2 size-4" /> Request changes
                </Button>
              </>
            )}
            {canManage && !isClosed && (
              <Button variant="ghost" disabled={actionBusy} onClick={() => void handleTransition("cancelled")}>Cancel task</Button>
            )}
            {task.status === "approved" && (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-success"><ShieldCheck className="size-4" /> Completed and approved</span>
            )}
            {task.status === "submitted" && (
              <span className="self-center text-xs text-muted-foreground">Submitted {dateTime(task.submitted_at)} · Awaiting manager review</span>
            )}
            {employeeAction === "submitted" && detail.attachments.length === 0 && (
              <span className="self-center text-xs text-muted-foreground">Attach proof of work before submitting.</span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card lg:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display font-semibold"><Paperclip className="size-4 text-primary" /> Proof of work</h2>
              <p className="mt-1 text-xs text-muted-foreground">Private task attachments · JPG, PNG, WebP or PDF · Maximum 10 MB each</p>
            </div>
            <Badge variant="secondary">{detail.attachments.length} attached</Badge>
          </div>

          {detail.attachments.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
              <FileText className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No proof attached yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Employees can attach photos or documents that demonstrate the work completed.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border rounded-lg border border-border">
              {detail.attachments.map((attachment) => (
                <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"><FileText className="size-4 text-primary" /></div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{attachment.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {attachment.uploader_name} · {(attachment.size_bytes / 1024 / 1024).toFixed(2)} MB · {dateTime(attachment.created_at)}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled={openingAttachment === attachment.id} onClick={() => void handleOpenAttachment(attachment.id, attachment.storage_path)}>
                    {openingAttachment === attachment.id ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Download className="mr-2 size-3.5" />}
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}

          {canUploadProof && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="task-proof-file" className="mb-1.5 block text-sm font-medium">Add evidence</label>
                <Input
                  id="task-proof-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                {selectedFile && <p className="mt-1 text-xs text-muted-foreground">Selected: {selectedFile.name}</p>}
              </div>
              <Button onClick={() => void handleUpload()} disabled={!selectedFile || uploading}>
                {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                Upload proof
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card lg:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold">Task activity</h2>
              <p className="mt-1 text-xs text-muted-foreground">Server-recorded status history and comments.</p>
            </div>
            <Badge variant="secondary">{detail.history.length} events</Badge>
          </div>
          {detail.history.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No status history has been recorded yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {detail.history.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="size-3.5" /></div>
                  <div className="min-w-0 flex-1 rounded-lg bg-muted/40 p-3">
                    <div className="text-sm font-medium">
                      {entry.from_status ? `${statusLabels[entry.from_status]} → ` : ""}
                      {statusLabels[entry.to_status] ?? entry.to_status}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{entry.actor_name} · {dateTime(entry.created_at)}</div>
                    {entry.note && <p className="mt-2 text-sm">{entry.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-card lg:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display font-semibold"><MessageSquare className="size-4 text-primary" /> Task discussion</h2>
              <p className="mt-1 text-xs text-muted-foreground">Comments are visible to the task assignee and authorised organisation managers.</p>
            </div>
            <Badge variant="secondary">{detail.comments.length} comments</Badge>
          </div>
          {detail.comments.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No comments yet. Use the discussion to clarify instructions or give feedback.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {detail.comments.map((item) => (
                <article key={item.id} className="rounded-lg bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{item.author_name}</span>
                    <span className="text-xs text-muted-foreground">{dateTime(item.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.body}</p>
                </article>
              ))}
            </div>
          )}
          <form onSubmit={(event) => void handleComment(event)} className="mt-4 space-y-3 border-t border-border pt-4">
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Write an update, ask a question or provide manager feedback…"
              maxLength={10000}
              rows={3}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!comment.trim() || sendingComment}>
                {sendingComment ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Add comment
              </Button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
};

export default TaskDetail;
