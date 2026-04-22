import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const PunchInCard = () => {
  const [state, setState] = useState<"idle" | "locating" | "checked">("idle");
  const [location, setLocation] = useState("Linking Road, Bandra W");
  const [time, setTime] = useState("");
  const { toast } = useToast();

  const handlePunch = () => {
    if (state === "checked") return;
    setState("locating");
    setTimeout(() => {
      const t = new Date();
      setTime(t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      setLocation("19.0596° N, 72.8295° E · Bandra W");
      setState("checked");
      toast({ title: "Checked in", description: "Inside geo-fence · Marked Valid" });
    }, 1400);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground p-6 lg:p-8 shadow-elegant">
      <div className="absolute inset-0 grid-dots opacity-30" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60 mb-2">
            {state === "checked" ? "Active shift" : "Start your day"}
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight mb-3">
            {state === "checked" ? `Checked in · ${time}` : "Ready to punch in?"}
          </h2>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/75">
            <MapPin className="size-4" />
            <span className="truncate">{location}</span>
          </div>
          {state === "checked" && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-accent text-xs font-medium">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              Inside geo-fence · Bandra Zone A
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePunch}
          disabled={state === "checked"}
          className="relative shrink-0 self-center size-32 lg:size-36 rounded-full gradient-gold text-primary font-display font-bold text-base shadow-gold disabled:opacity-90 disabled:cursor-default"
        >
          <span className={state === "idle" ? "absolute inset-0 rounded-full animate-pulse-ring" : ""} />
          <span className="relative flex flex-col items-center justify-center gap-1">
            {state === "locating" && <Loader2 className="size-7 animate-spin" />}
            {state === "idle" && <MapPin className="size-7" />}
            {state === "checked" && <CheckCircle2 className="size-7" />}
            {state === "idle" && "Start Day"}
            {state === "locating" && "Locating…"}
            {state === "checked" && "Checked In"}
          </span>
        </motion.button>
      </div>
    </div>
  );
};
