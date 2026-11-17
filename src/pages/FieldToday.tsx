import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { PunchInCard } from "@/components/PunchInCard";
import { useAuth } from "@/context/AuthContext";
import { getOrganizationTasks, type OrganizationTask } from "@/lib/task-service";
import { CheckCircle2, ListChecks, Timer, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const FieldToday = () => {
  const { user, activeMembership } = useAuth();
  const [tasks, setTasks] = useState<OrganizationTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);
  const displayName = user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "there";
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const loadTasks = useCallback(async () => {
    if (!activeMembership?.organization_id) {
      setTasks([]);
      setLoadingTasks(false);
      return;
    }
    setLoadingTasks(true);
    try {
      const rows = await getOrganizationTasks(activeMembership.organization_id);
      setTasks(rows.filter((task) => task.assigned_to === user?.id));
      setTaskError(null);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : "Unable to load tasks.");
    } finally {
      setLoadingTasks(false);
    }
  }, [activeMembership?.organization_id, user?.id]);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  const stats = [
    { label: "Pending", value: tasks.filter((task) => ["assigned", "accepted", "rejected"].includes(task.status)).length, icon: ListChecks },
    { label: "In Progress", value: tasks.filter((task) => task.status === "in_progress").length, icon: Timer },
    { label: "Completed", value: tasks.filter((task) => task.status === "approved").length, icon: CheckCircle2 },
  ];

  return (
    <>
      <Topbar title={`Hello, ${displayName.split(" ")[0]}`} subtitle={`${today} · Your field workspace`} />
      <div className="max-w-6xl space-y-6 p-4 lg:space-y-8 lg:p-8">
        <div className="animate-fade-up"><PunchInCard /></div>

        <div className="grid grid-cols-3 gap-3 animate-fade-up lg:gap-4" style={{ animationDelay: "60ms" }}>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-3 shadow-card lg:p-5">
                <Icon className="mb-2 size-4 text-primary lg:size-5" />
                <div className="font-display text-2xl font-bold leading-none lg:text-3xl">{stat.value}</div>
                <div className="mt-1 text-[11px] text-muted-foreground lg:text-xs">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <section className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Your tasks</h2>
            <span className="text-xs text-muted-foreground">{tasks.length} assigned</span>
          </div>
          {loadingTasks ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading tasks…</div>
          ) : taskError ? (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{taskError}</div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/60 px-5 py-8 text-center">
              <ListChecks className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No tasks assigned to your account yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Tasks assigned to you will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tasks.map((task) => (
                <article key={task.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium">{task.title}</h3>
                    <Badge variant="outline" className="shrink-0">{task.priority}</Badge>
                  </div>
                  {task.description && <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{task.status.replace("_", " ")}</Badge>
                    {task.due_at && <span>Due {new Date(task.due_at).toLocaleString("en-IN")}</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default FieldToday;
