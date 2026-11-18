import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";
import { getOrganizationDashboard, type OrganizationDashboardSummary } from "@/lib/dashboard-service";
import {
  getOrganizationAssignees,
  getOrganizationTasks,
  type OrganizationTask,
  type TaskAssignee,
  type TaskStatus,
} from "@/lib/task-service";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  CheckCircle2,
  ListChecks,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Clock3,
  Timer,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const employeeWorkStatuses = new Set<TaskStatus>([
  "assigned",
  "accepted",
  "in_progress",
  "rejected",
]);

const isOverdue = (task: OrganizationTask, now = Date.now()) =>
  Boolean(
    task.due_at &&
    new Date(task.due_at).getTime() < now &&
    employeeWorkStatuses.has(task.status),
  );

const formatDueDate = (value: string) =>
  new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const Dashboard = () => {
  const { activeMembership } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState<OrganizationDashboardSummary | null>(null);
  const [tasks, setTasks] = useState<OrganizationTask[]>([]);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    const organizationId = activeMembership?.organization_id;
    if (!organizationId) {
      setSummary(null);
      setTasks([]);
      setAssignees([]);
      setLoading(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const [nextSummary, nextTasks, nextAssignees] = await Promise.all([
        getOrganizationDashboard(organizationId),
        getOrganizationTasks(organizationId),
        getOrganizationAssignees(organizationId),
      ]);
      setSummary(nextSummary);
      setTasks(nextTasks);
      setAssignees(nextAssignees);
    } catch (error) {
      toast({
        title: "Unable to load dashboard",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMembership?.organization_id, toast]);

  useEffect(() => { void load(); }, [load]);

  const now = Date.now();
  const overdueTasks = useMemo(
    () => tasks.filter((task) => isOverdue(task, now))
      .sort((a, b) => new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime()),
    [tasks, now],
  );

  const employeeSummaries = useMemo(() => {
    return assignees.map((person) => {
      const assignedTasks = tasks.filter((task) => task.assigned_to === person.user_id);
      return {
        ...person,
        assigned: assignedTasks.filter((task) => !["approved", "cancelled"].includes(task.status)).length,
        inProgress: assignedTasks.filter((task) => task.status === "in_progress").length,
        awaitingReview: assignedTasks.filter((task) => task.status === "submitted").length,
        overdue: assignedTasks.filter((task) => isOverdue(task, now)).length,
        approved: assignedTasks.filter((task) => task.status === "approved").length,
      };
    }).sort((a, b) =>
      b.overdue - a.overdue ||
      b.awaitingReview - a.awaitingReview ||
      b.inProgress - a.inProgress ||
      b.assigned - a.assigned ||
      a.display_name.localeCompare(b.display_name),
    );
  }, [assignees, tasks, now]);

  const assigneeNames = useMemo(
    () => new Map(assignees.map((person) => [person.user_id, person.display_name])),
    [assignees],
  );

  const activeTasksCount = tasks.filter((task) => !["approved", "cancelled"].includes(task.status)).length;
  const stats = summary ? [
    { icon: ListChecks, label: "Active tasks", value: activeTasksCount },
    { icon: Timer, label: "In progress", value: summary.tasks_in_progress },
    { icon: ClipboardCheck, label: "Awaiting review", value: summary.awaiting_review },
    { icon: AlertTriangle, label: "Overdue", value: overdueTasks.length },
  ] : [];

  return (
    <>
      <Topbar title="Task Operations" subtitle={activeMembership?.organization_name ?? "Organisation task execution"} />
      <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {summary?.work_date ? `Business date · ${new Date(summary.work_date + "T00:00:00").toLocaleDateString("en-IN")}` : "Live organisation task overview"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Track ownership, progress, overdue work and submissions awaiting your review.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" /> Loading task operations…</div>
        ) : summary ? (
          <>
            <section aria-label="Task performance overview">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Task performance</h2>
                <Link to="/app/tasks" className="text-xs font-medium text-primary hover:underline">Open task board →</Link>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
                      <Icon className="mb-3 size-5 text-primary" />
                      <div className="font-display text-3xl font-bold leading-none">{stat.value}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="font-display font-semibold">Employee task performance</h2>
                  <p className="mt-1 text-xs text-muted-foreground">See who owns each task and where work is getting stuck.</p>
                </div>
                <Link to="/app/team" className="text-xs font-medium text-primary hover:underline">Team directory →</Link>
              </div>
              {employeeSummaries.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No active team members are available yet. Invite employees to start assigning work.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 font-medium">Employee</th>
                        <th className="px-3 py-3 text-center font-medium">Active</th>
                        <th className="px-3 py-3 text-center font-medium">In progress</th>
                        <th className="px-3 py-3 text-center font-medium">Awaiting review</th>
                        <th className="px-3 py-3 text-center font-medium">Overdue</th>
                        <th className="px-3 py-3 text-center font-medium">Approved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {employeeSummaries.map((person) => (
                        <tr key={person.user_id} className="hover:bg-muted/20">
                          <td className="px-5 py-3">
                            <div className="font-medium">{person.display_name}</div>
                            <div className="text-xs text-muted-foreground">{person.member_role.replace("_", " ")}</div>
                          </td>
                          <td className="px-3 py-3 text-center font-semibold">{person.assigned}</td>
                          <td className="px-3 py-3 text-center">{person.inProgress}</td>
                          <td className="px-3 py-3 text-center">
                            {person.awaitingReview > 0 ? <Badge variant="secondary">{person.awaitingReview}</Badge> : <span className="text-muted-foreground">0</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {person.overdue > 0 ? <Badge variant="destructive">{person.overdue}</Badge> : <span className="text-muted-foreground">0</span>}
                          </td>
                          <td className="px-3 py-3 text-center">{person.approved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
                <Users className="size-3.5" />
                {employeeSummaries.length} active team members · {tasks.length} total task records visible to your role
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-semibold">Overdue tasks</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Work past its due date that has not been completed.</p>
                  </div>
                  <Badge variant={overdueTasks.length > 0 ? "destructive" : "secondary"}>{overdueTasks.length}</Badge>
                </div>
                {overdueTasks.length === 0 ? (
                  <div className="py-7 text-center text-sm text-muted-foreground">No overdue tasks. Your team is on track.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {overdueTasks.slice(0, 6).map((task) => (
                      <div key={task.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{task.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                            <Users className="size-3" /> {task.assigned_to ? assigneeNames.get(task.assigned_to) ?? "Assigned employee" : "Unassigned"}
                            <span>· Due {task.due_at ? formatDueDate(task.due_at) : "not set"}</span>
                          </div>
                        </div>
                        <Badge variant="destructive" className="shrink-0">{task.priority}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/app/tasks?filter=overdue" className="mt-4 inline-block text-xs font-medium text-primary hover:underline">Review overdue work →</Link>
              </section>

              <section className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-semibold">Awaiting your review</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Employees have submitted these tasks for approval.</p>
                  </div>
                  <Badge variant={summary.awaiting_review > 0 ? "default" : "secondary"}>{summary.awaiting_review}</Badge>
                </div>
                {tasks.filter((task) => task.status === "submitted").length === 0 ? (
                  <div className="py-7 text-center text-sm text-muted-foreground">No task submissions are waiting for review.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {tasks.filter((task) => task.status === "submitted").slice(0, 6).map((task) => (
                      <div key={task.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{task.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{task.assigned_to ? assigneeNames.get(task.assigned_to) ?? "Assigned employee" : "Unassigned"} · Submitted {task.submitted_at ? formatDueDate(task.submitted_at) : "recently"}</div>
                        </div>
                        <Badge variant="secondary">{task.priority}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/app/tasks" className="mt-4 inline-block text-xs font-medium text-primary hover:underline">Open review queue →</Link>
              </section>
            </div>

            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-semibold">Workforce attendance</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Attendance is a supporting workforce signal; task delivery remains the primary performance view.</p>
                </div>
                <Clock3 className="size-5 text-muted-foreground" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-4">
                  <div className="text-xs text-muted-foreground">Active members</div>
                  <div className="mt-1 font-display text-2xl font-semibold">{summary.active_members}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <div className="text-xs text-muted-foreground">Checked in today</div>
                  <div className="mt-1 font-display text-2xl font-semibold">{summary.checked_in_today}</div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Organization task metrics are not available. Check your membership or refresh the dashboard.
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
