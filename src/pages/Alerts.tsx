import { Topbar } from "@/components/layout/Topbar";
import { alerts } from "@/lib/mock-data";
import { AlertTriangle, MapPin, Clock, Activity, UserX } from "lucide-react";

const iconFor = (t: string) => ({ no_checkin: UserX, overdue: Clock, inactivity: Activity, outside_zone: MapPin } as any)[t] ?? AlertTriangle;
const labelFor = (t: string) => ({ no_checkin: "No Check-in", overdue: "Task Overdue", inactivity: "Inactivity", outside_zone: "Outside Zone" } as any)[t];

const Alerts = () => (
  <>
    <Topbar title="Alerts & Exceptions" subtitle="Real-time exceptions across teams" />
    <div className="p-4 lg:p-8 max-w-4xl space-y-3">
      {alerts.map((a) => {
        const Icon = iconFor(a.type);
        const tone = a.severity === "high" ? "border-destructive/30 bg-destructive/5" : a.severity === "medium" ? "border-warning/30 bg-warning/5" : "border-info/30 bg-info/5";
        const iconTone = a.severity === "high" ? "bg-destructive/15 text-destructive" : a.severity === "medium" ? "bg-warning/20 text-warning-foreground" : "bg-info/15 text-info";
        return (
          <div key={a.id} className={`flex gap-4 p-4 lg:p-5 rounded-xl border ${tone}`}>
            <div className={`size-11 rounded-lg grid place-items-center shrink-0 ${iconTone}`}>
              <Icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">{labelFor(a.type)}</span>
                <span className="text-[10px] text-muted-foreground">· {a.time}</span>
              </div>
              <div className="font-display font-semibold">{a.employee}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{a.message}</div>
            </div>
            <button className="self-start text-xs font-medium text-primary hover:underline shrink-0">Resolve</button>
          </div>
        );
      })}
    </div>
  </>
);

export default Alerts;
