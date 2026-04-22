import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/mock-data";

const map: Record<TaskStatus | "valid" | "outside" | "high" | "medium" | "low", string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-info/15 text-info border border-info/20",
  completed: "bg-success/15 text-success border border-success/20",
  overdue: "bg-destructive/15 text-destructive border border-destructive/20",
  valid: "bg-success/15 text-success border border-success/20",
  outside: "bg-warning/20 text-warning-foreground border border-warning/30",
  high: "bg-destructive/15 text-destructive",
  medium: "bg-accent/20 text-accent-foreground",
  low: "bg-muted text-muted-foreground",
};

const labels: Partial<Record<string, string>> = {
  in_progress: "In Progress",
  outside: "Outside Zone",
};

export const StatusPill = ({ status, className }: { status: keyof typeof map; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize", map[status], className)}>
    <span className="size-1.5 rounded-full bg-current opacity-70" />
    {labels[status] ?? status}
  </span>
);
