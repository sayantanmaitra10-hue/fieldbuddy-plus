import { Topbar } from "@/components/layout/Topbar";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, MessageSquare } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import { WorkloadPill } from "@/components/WorkloadPill";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/context/TasksContext";
import { useRole } from "@/context/RoleContext";
import { useAdmin } from "@/context/AdminContext";

const Team = () => {
  const { workloadFor, pendingFor } = useTasks();
  const { role } = useRole();
  const { members } = useAdmin();
  const navigate = useNavigate();
  const canMessage = role === "manager" || role === "admin";
  const fieldStaff = members.filter((m) => m.appRole === "field");

  return (
    <>
      <Topbar title="Team" subtitle={`${fieldStaff.length} field employees`} />
      <div className="p-4 lg:p-8 max-w-6xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fieldStaff.map((e) => {
            const { band } = workloadFor(e.id);
            const pendingCount = pendingFor(e.id).length;
            return (
              <Link
                key={e.id}
                to={`/app/team/${e.id}`}
                className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-elegant hover:border-primary/30 transition-all relative block"
              >
                {canMessage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      navigate(`/app/chat?thread=dm-${e.id}`);
                    }}
                    className="absolute top-3 right-3 size-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    title={`Message ${e.name}`}
                    aria-label={`Message ${e.name}`}
                  >
                    <MessageSquare className="size-4" />
                  </Button>
                )}
                <div className="flex items-center gap-3 mb-4 pr-9">
                  <div className="size-12 rounded-full gradient-primary text-primary-foreground grid place-items-center font-display font-semibold">
                    {e.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.role}</div>
                  </div>
                  {e.checkedIn && <span className="size-2 rounded-full bg-success animate-pulse" />}
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {e.checkedIn ? (
                    <StatusPill status="valid" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not checked in</span>
                  )}
                  {e.zone === "outside" && <StatusPill status="outside" />}
                  <WorkloadPill band={band} />
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                  <MapPin className="size-3" /> {e.location}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <div className="font-display font-semibold">
                      {e.tasksCompleted}
                      <span className="text-muted-foreground font-normal">/{e.tasksAssigned}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tasks</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs">{pendingCount} pending</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live workload</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Team;
