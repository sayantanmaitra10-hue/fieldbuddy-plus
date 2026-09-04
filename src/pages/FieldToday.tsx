import { Topbar } from "@/components/layout/Topbar";
import { PunchInCard } from "@/components/PunchInCard";
import { TaskCard } from "@/components/TaskCard";
import { useTasks } from "@/context/TasksContext";
import { useAdmin } from "@/context/AdminContext";
import { CheckCircle2, ListChecks, Timer } from "lucide-react";

const FieldToday = () => {
  const { tasks } = useTasks();
  const { members, impersonatedMember } = useAdmin();
  const activeField =
    impersonatedMember?.appRole === "field"
      ? impersonatedMember
      : members.find((m) => m.appRole === "field");
  const mine = tasks.filter((t) => t.assigneeId === activeField?.id);
  const stats = [
    { label: "Pending", value: mine.filter((t) => t.status === "pending").length, icon: ListChecks },
    { label: "In Progress", value: mine.filter((t) => t.status === "in_progress").length, icon: Timer },
    { label: "Completed", value: mine.filter((t) => t.status === "completed").length, icon: CheckCircle2 },
  ];

  return (
    <>
      <Topbar
        title={`Good morning, ${activeField?.name.split(" ")[0] ?? "there"}`}
        subtitle="Tuesday · 22 April · Bandra Zone A"
      />
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 max-w-6xl">
        <div className="animate-fade-up">
          <PunchInCard />
        </div>

        <div className="grid grid-cols-3 gap-3 lg:gap-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 lg:p-5 shadow-card">
                <Icon className="size-4 lg:size-5 text-primary mb-2" />
                <div className="font-display text-2xl lg:text-3xl font-bold leading-none">{s.value}</div>
                <div className="text-[11px] lg:text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            );
          })}
        </div>

        <section className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Today's tasks</h2>
            <span className="text-xs text-muted-foreground">{mine.length} assigned</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {mine.map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        </section>
      </div>
    </>
  );
};

export default FieldToday;
