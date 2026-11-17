import { Topbar } from "@/components/layout/Topbar";
import { PunchInCard } from "@/components/PunchInCard";
import { TaskCard } from "@/components/TaskCard";
import { useTasks } from "@/context/TasksContext";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, ListChecks, Timer } from "lucide-react";

const FieldToday = () => {
  const { tasks } = useTasks();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "there";
  const mine = tasks.filter((task) => task.assigneeId === user?.id);
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const stats = [
    { label: "Pending", value: mine.filter((task) => task.status === "pending").length, icon: ListChecks },
    { label: "In Progress", value: mine.filter((task) => task.status === "in_progress").length, icon: Timer },
    { label: "Completed", value: mine.filter((task) => task.status === "completed").length, icon: CheckCircle2 },
  ];

  return (
    <>
      <Topbar title={`Hello, ${displayName.split(" ")[0]}`} subtitle={`${today} · Your field workspace`} />
      <div className="max-w-6xl space-y-6 p-4 lg:space-y-8 lg:p-8">
        <div className="animate-fade-up">
          <PunchInCard />
        </div>

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
            <h2 className="font-display text-lg font-semibold">Today's tasks</h2>
            <span className="text-xs text-muted-foreground">{mine.length} assigned</span>
          </div>
          {mine.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {mine.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/60 px-5 py-8 text-center">
              <ListChecks className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No tasks assigned to your account yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Tasks assigned to you will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default FieldToday;
