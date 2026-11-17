import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";
import { getOrganizationDashboard, type OrganizationDashboardSummary } from "@/lib/dashboard-service";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle2, ListChecks, AlertTriangle, RefreshCw, Loader2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { activeMembership } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState<OrganizationDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!activeMembership?.organization_id) {
      setSummary(null);
      setLoading(false);
      return;
    }
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      setSummary(await getOrganizationDashboard(activeMembership.organization_id));
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

  const stats = summary ? [
    { icon: Users, label: "Active members", value: summary.active_members },
    { icon: CheckCircle2, label: "Checked in today", value: summary.checked_in_today },
    { icon: ListChecks, label: "Open tasks", value: summary.open_tasks },
    { icon: AlertTriangle, label: "Awaiting review", value: summary.awaiting_review },
  ] : [];

  return (
    <>
      <Topbar title="Operations Dashboard" subtitle={activeMembership?.organization_name ?? "Organization workforce overview"} />
      <div className="mx-auto max-w-7xl space-y-6 p-4 lg:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {summary?.work_date ? `Business date · ${new Date(summary.work_date + "T00:00:00").toLocaleDateString("en-IN")}` : "Live organization summary"}
          </p>
          <Button size="sm" variant="outline" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" /> Loading organization metrics…</div>
        ) : summary ? (
          <>
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

            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-xl border border-border bg-card p-5 shadow-card">
                <h2 className="font-display font-semibold">Task health</h2>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">In progress</span><strong>{summary.tasks_in_progress}</strong></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${summary.open_tasks ? Math.min(100, summary.tasks_in_progress / summary.open_tasks * 100) : 0}%` }} /></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Approved</span><strong>{summary.tasks_approved}</strong></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Awaiting review</span><strong>{summary.awaiting_review}</strong></div>
                </div>
                <Link to="/app/tasks" className="mt-5 inline-block text-xs font-medium text-primary hover:underline">Open task board →</Link>
              </section>

              <section className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-display font-semibold">Recently created tasks</h2>
                  <Link to="/app/tasks" className="text-xs font-medium text-primary hover:underline">View all</Link>
                </div>
                {summary.recent_tasks.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No tasks have been created for this organization.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {summary.recent_tasks.map((task) => (
                      <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{task.title}</div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" /> {task.assignee_name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{task.priority}</Badge>
                          <Badge variant="secondary">{task.status.replace("_", " ")}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/app/team" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted"><Users className="size-4" /> Team directory</Link>
              <Link to="/app/tasks" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-muted"><Clock3 className="size-4" /> Task management</Link>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Organization metrics are not available. Check your membership or refresh the dashboard.
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
