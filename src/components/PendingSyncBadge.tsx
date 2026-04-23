import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const PendingSyncBadge = ({ className, label = "Pending sync" }: { className?: string; label?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-warning/40 bg-warning/15 text-warning-foreground text-[10px] font-semibold uppercase tracking-wider",
      className,
    )}
  >
    <CloudOff className="size-3" />
    {label}
  </span>
);
