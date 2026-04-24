import { cn } from "@/lib/utils";
import type { WorkloadBand } from "@/lib/smart-task";

const styles: Record<WorkloadBand, { dot: string; pill: string; label: string }> = {
  low: {
    dot: "bg-success",
    pill: "border-success/40 bg-success/15 text-success",
    label: "Low",
  },
  medium: {
    dot: "bg-warning",
    pill: "border-warning/40 bg-warning/15 text-warning-foreground",
    label: "Medium",
  },
  high: {
    dot: "bg-destructive",
    pill: "border-destructive/40 bg-destructive/15 text-destructive",
    label: "High",
  },
};

export const WorkloadPill = ({
  band,
  className,
  showLabel = true,
}: {
  band: WorkloadBand;
  className?: string;
  showLabel?: boolean;
}) => {
  const s = styles[band];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider",
        s.pill,
        className,
      )}
      title={`${s.label} workload`}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {showLabel && <>{s.label} load</>}
    </span>
  );
};
