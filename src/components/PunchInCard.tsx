import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, CheckCircle2, TriangleAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSync } from "@/context/SyncContext";
import { BANDRA_ZONE, calculateDistanceMeters, isWithinGeofence } from "@/lib/geofence";
import { PendingSyncBadge } from "./PendingSyncBadge";

export const PunchInCard = () => {
  const [state, setState] = useState<"idle" | "locating" | "checked">("idle");
  const [location, setLocation] = useState("Bandra Zone A · GPS check required");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [queueId, setQueueId] = useState<string | null>(null);
  const { toast } = useToast();
  const { online, enqueue, queue } = useSync();

  const isPending = queueId !== null && queue.some((q) => q.id === queueId);

  const handlePunch = () => {
    if (state === "checked") return;
    setLocationMessage(null);
    setState("locating");

    if (!navigator.geolocation) {
      const message = "Location is not available on this device. Punch-in was not recorded.";
      setLocationMessage(message);
      setState("idle");
      toast({ title: "Location unavailable", description: message, variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const distance = calculateDistanceMeters(latitude, longitude, BANDRA_ZONE.latitude, BANDRA_ZONE.longitude);
        setLocation(`${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E · Bandra W`);

        if (!isWithinGeofence(latitude, longitude, accuracy)) {
          const message = `Outside the ${BANDRA_ZONE.name} ${BANDRA_ZONE.radiusMeters} m boundary. About ${Math.round(distance)} m from its center; punch-in was not recorded.`;
          setLocationMessage(message);
          setState("idle");
          toast({ title: "Outside the work zone", description: message, variant: "destructive" });
          return;
        }

      const t = new Date();
      setTime(t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      setState("checked");
      if (!online) {
        const id = enqueue({ kind: "punch", label: "Punch-in @ Bandra W" });
        setQueueId(id);
        toast({ title: "Checked in (offline)", description: "Will sync when you reconnect" });
      } else {
        toast({ title: "Checked in", description: "Inside geo-fence · Marked Valid" });
      }
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Allow location access in your browser settings, then try again. Punch-in was not recorded."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Your current location could not be determined. Move to an open area and try again."
            : "Location check timed out. Try again where GPS reception is stronger.";
        setLocationMessage(message);
        setState("idle");
        toast({ title: "Location check failed", description: message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground p-6 lg:p-8 shadow-elegant">
      <div className="absolute inset-0 grid-dots opacity-30" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">
              {state === "checked" ? "Active shift" : "Start your day"}
            </div>
            {isPending && <PendingSyncBadge />}
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight mb-3">
            {state === "checked" ? `Checked in · ${time}` : "Ready to punch in?"}
          </h2>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/75">
            <MapPin className="size-4" />
            <span className="truncate">{location}</span>
          </div>
          {locationMessage && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{locationMessage}</span>
            </p>
          )}
          {state === "checked" && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30 text-accent text-xs font-medium">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              Inside {BANDRA_ZONE.name} · {BANDRA_ZONE.radiusMeters} m zone
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePunch}
          disabled={state !== "idle"}
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
