import { useParams, useNavigate } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { isDemoMode } from "@/lib/runtime-config";
import { employees } from "@/lib/mock-data";
import { TaskCard } from "@/components/TaskCard";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { MapPin, MessageSquare } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { useTasks } from "@/context/TasksContext";

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const { tasks } = useTasks();
  if (!isDemoMode) {
    return (
      <>
        <Topbar title="Employee details" subtitle="Organization directory" />
        <div className="p-8 text-sm text-muted-foreground">Employee detail records will appear after the organization directory and task services are connected.</div>
      </>
    );
  }
  const e = employees.find((x) => x.id === id);
  if (!e) return <div className="p-8">Not found</div>;
  const myTasks = tasks.filter((t) => t.assigneeId === e.id);
  const canMessage = role === "manager" || role === "admin";

  return (
    <>
      <Topbar title={e.name} subtitle={e.role} />
      <div className="p-4 lg:p-8 max-w-5xl space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="size-20 rounded-2xl gradient-primary text-primary-foreground grid place-items-center font-display font-bold text-2xl">
              {e.avatar}
            </div>
            <div className="flex-1 w-full">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  {e.checkedIn ? (
                    <StatusPill status="valid" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Off shift</span>
                  )}
                  {e.zone === "outside" && <StatusPill status="outside" />}
                </div>
                {canMessage && (
                  <Button
                    onClick={() => navigate(`/app/chat?thread=dm-${e.id}`)}
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                    size="sm"
                  >
                    <MessageSquare className="size-4" /> Message
                  </Button>
                )}
              </div>
              <h1 className="font-display text-2xl font-semibold">{e.name}</h1>
              <div className="text-sm text-muted-foreground">{e.role}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div>
                  <div className="text-xs text-muted-foreground">Check-in</div>
                  <div className="font-medium">{e.checkInTime ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last activity</div>
                  <div className="font-medium">{e.lastActivity}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Assigned</div>
                  <div className="font-medium">{e.tasksAssigned}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="font-medium text-success">{e.tasksCompleted}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-4">
                <MapPin className="size-4" /> {e.location}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-display font-semibold mb-3">Assigned tasks</h2>
          {myTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">No tasks assigned.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {myTasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EmployeeDetail;
