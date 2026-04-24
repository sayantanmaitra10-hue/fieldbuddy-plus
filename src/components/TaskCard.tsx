import { Link } from "react-router-dom";
import { MapPin, Clock, ChevronRight, MessageSquare, AlertTriangle } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { PendingSyncBadge } from "./PendingSyncBadge";
import type { Task } from "@/lib/mock-data";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export const TaskCard = ({ task, pendingSync = false }: { task: Task; pendingSync?: boolean }) => {
  const fromChat = task.source === "chat";
  const extended = !!task.extendedTimeline;
  return (
    <Link
      to={`/app/tasks/${task.id}`}
      className="group block bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-elegant hover:border-primary/30 transition-all relative"
    >
      <div className="absolute top-3 right-9 flex items-center gap-1.5">
        {fromChat && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-accent/40 bg-accent/15 text-accent-foreground text-[9px] font-semibold uppercase tracking-wider">
            <MessageSquare className="size-2.5" /> From chat
          </span>
        )}
        {extended && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-warning/40 bg-warning/15 text-warning-foreground text-[9px] font-semibold uppercase tracking-wider">
            <AlertTriangle className="size-2.5" /> Extended
          </span>
        )}
        {pendingSync && <PendingSyncBadge />}
      </div>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <StatusPill status={task.status} />
          <StatusPill status={task.priority} />
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
      <h3 className="font-display font-semibold text-base leading-snug mb-1.5 text-balance">
        {task.title}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5" /> {task.location}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> Due {fmtTime(task.deadline)}
        </span>
      </div>
    </Link>
  );
};

