import { FormEvent, useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import {
  createOrganizationTask,
  getOrganizationAssignees,
  getOrganizationTasks,
  transitionOrganizationTask,
  type OrganizationTask,
  type TaskAssignee,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, ListChecks, Check, X, Play, Send } from "lucide-react";

const statusLabels: Record<TaskStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  in_progress: "In progress",
  submitted: "Awaiting review",
  approved: "Approved",
  rejected: "Needs changes",
  cancelled: "Cancelled",
};

const priorityLabels: Record<TaskPriority, string> = {
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

const TasksPage = () => {
  const { activeMembership, user } = useAuth();
  const { role } = useRole();
  const { toast } = useToast();
  const organizationId = activeMembership?.organization_id;
  const canManage = role === "manager" || role === "admin";
  const [tasks, setTasks] = useState<OrganizationTask[]>([]);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [filter, setFilter] = useState<"all" | "open" | "review" | "closed">("all");

  const refresh = useCallback(async (quiet = false) => {
    if (!organizationId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const rows = await getOrganizationTasks(organizationId);
      setTasks(rows);
      if (canManage) {
        const team = await getOrganizationAssignees(organizationId);
        setAssignees(team);
        if (!assignedTo && team.length > 0) setAssignedTo(team[0].user_id);
      }
    } catch (error) {
      toast({
        title: "Unable to load tasks",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId, canManage, assignedTo, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !assignedTo) return;
    setCreating(true);
    try {
      await createOrganizationTask({
        organizationId,
        title,
        description,
        assignedTo,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        priority,
      });
      toast({ title: "Task created", description: "The task has been assigned to the selected employee." });
      setTitle("");
      setDescription("");
      setDueAt("");
      setPriority("normal");
      setShowCreate(false);
      await refresh(true);
    } catch (error) {
      toast({
        title: "Task creation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleTransition(task: OrganizationTask, nextStatus: TaskStatus) {
    if (!organizationId) return;
    setBusyTaskId(task.id);
    try {
      await transitionOrganizationTask({ organizationId, taskId: task.id, nextStatus });
      toast({ title: "Task updated", description: `Status changed to ${statusLabels[nextStatus]}.` });
      await refresh(true);
    } catch (error) {
      toast({
        title: "Could not update task",
        description: error instanceof Error ? error.message : "Refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setBusyTaskId(null);
    }
  }

  const visibleTasks = tasks.filter((task) => {
    if (filter === "open") return !["approved", "cancelled"].includes(task.status);
    if (filter === "review") return task.status === "submitted";
    if (filter === "closed") return ["approved", "cancelled"].includes(task.status);
    return true;
  });

  return (
    <>
      <Topbar title="Tasks" subtitle={activeMembership?.organization_name ?? "Organization task execution"} />
      <div className="mx-auto max-w-6xl space-y-5 p-4 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Task board</h2>
            <p className="text-xs text-muted-foreground">Assignments and status changes are stored on the server.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void refresh(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => setShowCreate((value) => !value)}>
                <Plus className="mr-2 size-4" /> New task
              </Button>
            )}
          </div>
        </div>

        {showCreate && canManage && (
          <form onSubmit={handleCreate} className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-card md:grid-cols-2">
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="task-title">Task title</Label>
              <Input id="task-title" required minLength={3} maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Visit assigned customer location" />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add instructions, expected outcome or supporting details." />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-assignee">Assign to</Label>
              <select id="task-assignee" required value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select an employee</option>
                {assignees.map((person) => (
                  <option key={person.user_id} value={person.user_id}>
                    {person.display_name}{person.employee_id ? ` · ${person.employee_id}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-due">Due date and time</Label>
              <Input id="task-due" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={creating || !assignedTo}>
                {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                Create task
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          {([
            ["all", "All tasks"],
            ["open", "Open"],
            ["review", "Awaiting review"],
            ["closed", "Closed"],
          ] as const).map(([value, label]) => (
            <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>
              {label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading organization tasks…</div>
        ) : visibleTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <ListChecks className="mx-auto mb-3 size-7 text-muted-foreground" />
            <p className="font-medium">No tasks in this view</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canManage ? "Create a task and assign it to an active organization member." : "Tasks assigned to your account will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleTasks.map((task) => {
              const isAssignee = task.assigned_to === user?.id;
              const nextStatus = isAssignee ? employeeNextStatus[task.status] : undefined;
              const canReview = canManage && task.status === "submitted";
              const canCancel = canManage && !["approved", "cancelled"].includes(task.status);
              const busy = busyTaskId === task.id;
              return (
                <article key={task.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">{task.title}</h3>
                      {task.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p>}
                    </div>
                    <Badge variant="outline">{priorityLabels[task.priority]}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{statusLabels[task.status]}</Badge>
                    {task.due_at && <span>Due {new Date(task.due_at).toLocaleString("en-IN")}</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {nextStatus && (
                      <Button size="sm" disabled={busy} onClick={() => void handleTransition(task, nextStatus)}>
                        {busy ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : nextStatus === "submitted" ? <Send className="mr-1 size-3.5" /> : <Play className="mr-1 size-3.5" />}
                        {nextStatus === "accepted" ? "Accept" : nextStatus === "in_progress" ? "Start / Resume" : "Submit for review"}
                      </Button>
                    )}
                    {canReview && (
                      <>
                        <Button size="sm" disabled={busy} onClick={() => void handleTransition(task, "approved")}>
                          <Check className="mr-1 size-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleTransition(task, "rejected")}>
                          <X className="mr-1 size-3.5" /> Request changes
                        </Button>
                      </>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void handleTransition(task, "cancelled")}>
                        Cancel task
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default TasksPage;
