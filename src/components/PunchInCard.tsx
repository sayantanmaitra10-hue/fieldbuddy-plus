import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, CheckCircle2, TriangleAlert, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { submitAttendanceEvent } from "@/lib/attendance-service";

type PunchState = "idle" | "locating" | "submitting" | "checked";

export const PunchInCard = () => {
  const [state, setState] = useState<PunchState>("idle");
  const [location, setLocation] = useState("Location permission required");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const { toast } = useToast();
  const { activeMembership } = useAuth();

  const handlePunch = () => {
    if (state !== "idle") return;
    if (!activeMembership) {
      setLocationMessage("Your account is not connected to an active organization.");
      return;
    }
    if (!navigator.onLine) {
      const message = "You are offline. Attendance must reach the server for geofence validation; reconnect before punching in.";
      setLocationMessage(message);
      toast({ title: "Connection required", description: message, variant: "destructive" });
      return;
    }
    if (!navigator.geolocation) {
      const message = "Location services are not available on this device. Attendance was not recorded.";
      setLocationMessage(message);
      toast({ title: "Location unavailable", description: message, variant: "destructive" });
      return;
    }

    setLocationMessage(null);
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = position.coords;
        setLocation(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} · ±${Math.round(coords.accuracy)} m`);
        setState("submitting");
        try {
          const result = await submitAttendanceEvent(activeMembership.organization_id, "check_in", {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyMeters: coords.accuracy,
          });

          if (result.event.validation_status !== "accepted") {
            const message = result.event.validation_status === "low_accuracy"
              ? "GPS accuracy is too low. Move to an open area and try again."
              : result.event.validation_status === "outside_geofence"
                ? "You are outside every active work geofence configured for your organization. The event has been recorded for review."
                : "The server could not validate this attendance event.";
            setLocationMessage(message);
            setState("idle");
            toast({ title: "Attendance not validated", description: message, variant: "destructive" });
            return;
          }

          setTime(new Date(result.event.captured_at).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }));
          setState("checked");
          toast({
            title: result.duplicate ? "Attendance already recorded" : "Checked in successfully",
            description: "Your attendance was accepted by the server.",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Attendance could not be submitted.";
          setLocationMessage(message);
          setState("idle");
          toast({ title: "Punch-in failed", description: message, variant: "destructive" });
        }
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Allow location access in your browser settings, then try again. Attendance was not recorded."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Your current location could not be determined. Move to an open area and try again."
            : "Location check timed out. Try again where GPS reception is stronger.";
        setLocationMessage(message);
        setState("idle");
        toast({ title: "Location check failed", description: message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl gradient-hero p-6 text-primary-foreground shadow-elegant lg:p-8">
      <div className="absolute inset-0 grid-dots opacity-30" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">
              {state === "checked" ? "Attendance recorded" : "Start your day"}
            </div>
          </div>
          <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight lg:text-3xl">
            {state === "checked" ? `Checked in · ${time}` : "Ready to punch in?"}
          </h2>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/75">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          {locationMessage && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{locationMessage}</span>
            </p>
          )}
          {state === "checked" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent">
              <ShieldCheck className="size-3.5" />
              Server validated · Active organization geofence
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePunch}
          disabled={state !== "idle"}
          className="relative size-32 shrink-0 self-center rounded-full gradient-gold font-display text-base font-bold text-primary shadow-gold disabled:cursor-default disabled:opacity-90 lg:size-36"
        >
          <span className={state === "idle" ? "absolute inset-0 animate-pulse-ring rounded-full" : ""} />
          <span className="relative flex flex-col items-center justify-center gap-1">
            {(state === "locating" || state === "submitting") && <Loader2 className="size-7 animate-spin" />}
            {state === "idle" && <MapPin className="size-7" />}
            {state === "checked" && <CheckCircle2 className="size-7" />}
            {state === "idle" && "Start Day"}
            {state === "locating" && "Locating…"}
            {state === "submitting" && "Validating…"}
            {state === "checked" && "Checked In"}
          </span>
        </motion.button>
      </div>
    </div>
  );
};
