import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const ExtendedTimelineBanner = ({
  defaultHours,
  className,
}: {
  defaultHours: number;
  className?: string;
}) => (
  <div
    className={cn(
      "flex items-start gap-3 p-3 rounded-lg border border-warning/40 bg-warning/10 text-warning-foreground",
      className,
    )}
  >
    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
    <div className="text-xs">
      <div className="font-semibold mb-0.5">Extended timeline</div>
      <div className="opacity-80">
        Deadline is beyond 150% of the recommended {defaultHours}h. Manager has
        been notified — you may be reassigned for faster turnaround.
      </div>
    </div>
  </div>
);
