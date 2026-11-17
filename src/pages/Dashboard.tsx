import { Topbar } from "@/components/layout/Topbar";
import { employees, tasks, alerts, activitySeries } from "@/lib/mock-data";
import { isDemoMode } from "@/lib/runtime-config";
import { StatusPill } from "@/components/StatusPill";
import { Users, CheckCircle2, ListChecks, AlertTriangle, MapPin, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const Stat = ({ icon: Icon, label, value, hint, accent }: any) => (
  <div className="bg-card border border-border rounded-xl p-5 shadow-card">
    <div className="flex items-center justify-between mb-3">
      <Icon className={`size-5 ${accent ?? "text-primary"}`} />
      <ArrowUpRight className="size-3.5 text-muted-foreground" />
    </div>
    <div className="font-display text-3xl font-bold leading-none">{value}</div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
    {hint && <div className="text-[11px] text-success mt-2">{hint}</div>}
  </div>
);

const Dashboard = () => {
  const dashboardEmployees = isDemoMode ? employees : [];
  const dashboardTasks = isDemoMode ? tasks : [];
  const dashboardAlerts = isDemoMode ? alerts : [];
  const dashboardActivity = isDemoMode ? activitySeries : [];
  const checkedIn = dashboardEmployees.filter((e) => e.checkedIn).length;
  const inprog = dashboardTasks.filter((t) => t.status === "in_progress").length;
  const done = dashboardTasks.filter((t) => t.status === "completed").length;

  return (
    <>
      <Topbar title="Operations Dashboard" subtitle="Organization workforce overview" />
      <div className="p-4 lg:p-8 space-y-6 max-w-7xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Stat icon={Users} label="Checked in today" value={`${checkedIn}/${dashboardEmployees.length}`} />
          <Stat icon={ListChecks} label="Tasks in progress" value={inprog} />
          <Stat icon={CheckCircle2} label="Tasks completed" value={done} accent="text-success" hint="On track" />
          <Stat icon={AlertTriangle} label="Open alerts" value={dashboardAlerts.length} accent="text-destructive" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 lg:p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold">Activity timeline</h2>
                <p className="text-xs text-muted-foreground">Check-ins & task completions today</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary-glow" /> Check-ins</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" /> Completed</span>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardActivity}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary-glow))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="checkins" stroke="hsl(var(--primary-glow))" strokeWidth={2} fill="url(#g1)" />
                  <Area type="monotone" dataKey="completions" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Live alerts</h2>
              <Link to="/app/alerts" className="text-xs text-primary font-medium">View all</Link>
            </div>
            <div className="space-y-3">
              {dashboardAlerts.slice(0, 4).map((a) => (
                <div key={a.id} className="flex gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <div className={`size-1.5 rounded-full mt-1.5 shrink-0 ${a.severity === "high" ? "bg-destructive" : a.severity === "medium" ? "bg-warning" : "bg-info"}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.employee}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{a.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 lg:px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-semibold">Field team status</h2>
            <Link to="/app/team" className="text-xs text-primary font-medium">All employees</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Employee</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Zone</th>
                  <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Location</th>
                  <th className="text-left font-medium px-5 py-3">Tasks</th>
                  <th className="text-left font-medium px-5 py-3 hidden sm:table-cell">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboardEmployees.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <Link to={`/app/team/${e.id}`} className="flex items-center gap-3">
                        <div className="size-8 rounded-full gradient-primary text-primary-foreground grid place-items-center text-xs font-semibold">{e.avatar}</div>
                        <div>
                          <div className="font-medium">{e.name}</div>
                          <div className="text-[11px] text-muted-foreground">{e.role}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {e.checkedIn
                        ? <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium"><span className="size-1.5 rounded-full bg-success" /> In · {e.checkInTime}</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-muted-foreground" /> Off</span>}
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">{e.zone !== "n/a" && <StatusPill status={e.zone} />}</td>
                    <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {e.location}</span></td>
                    <td className="px-5 py-3"><span className="font-medium">{e.tasksCompleted}</span><span className="text-muted-foreground">/{e.tasksAssigned}</span></td>
                    <td className="px-5 py-3 hidden sm:table-cell text-muted-foreground text-xs">{e.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
