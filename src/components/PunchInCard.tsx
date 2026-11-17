import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, CheckCircle2, TriangleAlert, ShieldCheck, CloudUpload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  getQueuedAttendanceEvents,
  getTodayAttendance,
  queueAttendanceEvent,
  submitAttendanceEvent,
  syncQueuedAttendanceEvents,
  type AttendanceEventType,
  type TodayAttendance,
} from "@/lib/attendance-service";

type PunchState = "idle" | "locating" | "submitting" | "checked" | "completed" | "pending";

const timeLabel = (value: string) => new Date(value).toLocaleTimeString("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});

const applyAttendanceRecord = (record: TodayAttendance | null, setState: (state: PunchState) => void, setTime: (time: string) => void) => {
  if (record?.last_check_out_at) {
    setState("completed");
    setTime(timeLabel(record.last_check_out_at));
  } else if (record?.first_check_in_at) {
    setState("checked");
    setTime(timeLabel(record.first_check_in_at));
  } else {
    setState("idle");
    setTime("");
  }
};

const validationMessage = (status: string) => {
  if (status === "low_accuracy") return "GPS accuracy is too low. Move to an open area and try again.";
  if (status === "outside_geofence") return "You are outside every active work geofence. The event has been recorded for manager review.";
  return "The server could not validate this attendance event.";
};

export const PunchInCard = () => {
  const [state, setState] = useState<PunchState>("idle");
  const [location, setLocation] = useState("Location permission required");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [statusReady, setStatusReady] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  const syncingRef = useRef(false);
  const { toast } = useToast();
  const { activeMembership } = useAuth();
  const organizationId = activeMembership?.organization_id;

  useEffect(() => {
    let active = true;
    if (!organizationId) {
      setStatusReady(false);
      return () => { active = false; };
    }

    const synchronize = async () => {
      if (!navigator.onLine || syncingRef.current) return;
      syncingRef.current = true;
      try {
        const results = await syncQueuedAttendanceEvents(organizationId);
        const remaining = await getQueuedAttendanceEvents(organizationId);
        if (!active) return;
        setPendingCount(remaining.length);
        if (remaining.length > 0) {
          setState("pending");
          return;
        }

        const rejected = [...results].reverse().find((item) => item.event.validation_status !== "accepted");
        if (rejected) {
          setState("idle");
          setLocationMessage(validationMessage(rejected.event.validation_status));
          return;
        }

        const record = await getTodayAttendance(organizationId);
        if (active) {
          applyAttendanceRecord(record, setState, setTime);
          setLocationMessage(null);
        }
      } catch (error) {
        if (active) setLocationMessage(error instanceof Error ? error.message : "Unable to sync queued attendance.");
      } finally {
        syncingRef.current = false;
      }
    };

    const load = async () => {
      setStatusReady(false);
      try {
        const [record, queued] = await Promise.all([
          getTodayAttendance(organizationId),
          getQueuedAttendanceEvents(organizationId),
        ]);
        if (!active) return;
        setPendingCount(queued.length);
        if (queued.length > 0) {
          setState("pending");
          setLocationMessage(`${queued.length} attendance event(s) are saved on this device and waiting for server validation.`);
        } else {
          applyAttendanceRecord(record, setState, setTime);
        }
        setStatusReady(true);
        if (queued.length > 0 && navigator.onLine) await synchronize();
      } catch (error) {
        if (!active) return;
        setLocationMessage(error instanceof Error ? error.message : "Unable to load today's attendance.");
        setStatusReady(false);
      }
    };

    const handleOnline = () => { void synchronize(); };
    window.addEventListener("online", handleOnline);
    void load();

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
    };
  }, [organizationId, retryToken]);

  const handlePunch = () => {
    if (!statusReady || !organizationId) return;
    if (state !== "idle" && state !== "checked") return;
    const eventType: AttendanceEventType = state === "checked" ? "check_out" : "check_in";
    const wasCheckedIn = state === "checked";

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

        if (!navigator.onLine) {
          try {
            await queueAttendanceEvent(organizationId, eventType, {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracyMeters: coords.accuracy,
            });
            setPendingCount((count) => count + 1);
            setState("pending");
            setLocationMessage("Saved on this device. Attendance will count only after the server validates it when you reconnect.");
            toast({ title: "Attendance saved offline", description: "Waiting for connection and server validation." });
          } catch (error) {
            setState(wasCheckedIn ? "checked" : "idle");
            const message = error instanceof Error ? error.message : "Offline storage is unavailable.";
            setLocationMessage(message);
            toast({ title: "Could not save offline", description: message, variant: "destructive" });
          }
          return;
        }

        setState("submitting");
        try {
          const result = await submitAttendanceEvent(organizationId, eventType, {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracyMeters: coords.accuracy,
          });

          if (result.event.validation_status !== "accepted") {
            const message = validationMessage(result.event.validation_status);
            setLocationMessage(message);
            setState(wasCheckedIn ? "checked" : "idle");
            toast({ title: "Attendance not validated", description: message, variant: "destructive" });
            return;
          }

          setTime(timeLabel(result.event.captured_at));
          setState(eventType === "check_in" ? "checked" : "completed");
          toast({
            title: result.duplicate
              ? "Attendance already recorded"
              : eventType === "check_in" ? "Checked in successfully" : "Checked out successfully",
            description: "Your attendance was accepted by the server.",
          });
        } catch (error) {
          if (!navigator.onLine) {
            try {
              await queueAttendanceEvent(organizationId, eventType, {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracyMeters: coords.accuracy,
              });
              setPendingCount((count) => count + 1);
              setState("pending");
              setLocationMessage("Connection dropped. Your event is saved locally and waiting for server validation.");
              return;
            } catch {
              // Fall through to the original submission error.
            }
          }
          const message = error instanceof Error ? error.message : "Attendance could not be submitted.";
          setLocationMessage(message);
          setState(wasCheckedIn ? "checked" : "idle");
          toast({ title: eventType === "check_in" ? "Punch-in failed" : "Punch-out failed", description: message, variant: "destructive" });
        }
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Allow location access in your browser settings, then try again. Attendance was not recorded."
          : error.code === error.POSITION_UNAVAILABLE
            ? "Your current location could not be determined. Move to an open area and try again."
            : "Location check timed out. Try again where GPS reception is stronger.";
        setLocationMessage(message);
        setState(wasCheckedIn ? "checked" : "idle");
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
              {state === "completed" ? "Shift completed" : state === "checked" ? "Active shift" : state === "pending" ? "Waiting for sync" : "Start your day"}
            </div>
          </div>
          <h2 className="mb-3 font-display text-2xl font-semibold tracking-tight lg:text-3xl">
            {state === "completed" ? `Checked out · ${time}` : state === "checked" ? `Checked in · ${time}` : state === "pending" ? "Attendance saved offline" : "Ready to punch in?"}
          </h2>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/75">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          {locationMessage && (
            <p role="status" className="mt-3 flex items-start gap-2 text-sm text-primary-foreground/80">
              {state === "pending" ? <CloudUpload className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" />}
              <span>{locationMessage}</span>
            </p>
          )}
          {(state === "checked" || state === "completed") && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent">
              <ShieldCheck className="size-3.5" />
              {state === "completed" ? "Attendance validated · Shift closed" : "Server validated · Active organization geofence"}
            </div>
          )}
          {state === "pending" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning-foreground">
              <CloudUpload className="size-3.5" />
              {pendingCount} pending · Not yet counted as attendance
              {typeof navigator !== "undefined" && navigator.onLine && (
                <button type="button" onClick={() => setRetryToken((value) => value + 1)} className="ml-2 underline underline-offset-2">
                  Retry sync
                </button>
              )}
            </div>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handlePunch}
          disabled={!statusReady || (state !== "idle" && state !== "checked")}
          className="relative size-32 shrink-0 self-center rounded-full gradient-gold font-display text-base font-bold text-primary shadow-gold disabled:cursor-default disabled:opacity-90 lg:size-36"
        >
          <span className={state === "idle" ? "absolute inset-0 animate-pulse-ring rounded-full" : ""} />
          <span className="relative flex flex-col items-center justify-center gap-1">
            {(state === "locating" || state === "submitting") && <Loader2 className="size-7 animate-spin" />}
            {state === "idle" && <MapPin className="size-7" />}
            {(state === "checked" || state === "completed") && <CheckCircle2 className="size-7" />}
            {state === "pending" && <CloudUpload className="size-7" />}
            {state === "idle" && (statusReady ? "Start Day" : "Loading…")}
            {state === "locating" && "Locating…"}
            {state === "submitting" && "Validating…"}
            {state === "checked" && "End Day"}
            {state === "pending" && "Pending Sync"}
            {state === "completed" && "Completed"}
          </span>
        </motion.button>
      </div>
    </div>
  );
};
