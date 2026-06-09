import { useParams, useNavigate, Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { employees } from "@/lib/mock-data";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Camera,
  Send,
  CheckCircle2,
  Play,
  Image as ImageIcon,
  MessageSquare,
  CloudOff,
  Sparkles,
  AlertTriangle,
  CalendarIcon,
  Users,
  AlarmClock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSync } from "@/context/SyncContext";
import { useTasks } from "@/context/TasksContext";
import { useRole } from "@/context/RoleContext";
import {
  defaultHoursFor,
  suggestAlternates,
} from "@/lib/smart-task";
import { WorkloadPill } from "@/components/WorkloadPill";
import { ExtendedTimelineBanner } from "@/components/ExtendedTimelineBanner";
import { cn } from "@/lib/utils";

const TaskDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const { online, enqueue } = useSync();
  const { tasks, updateTask, setDeadline, reassignTask, pendingFor } = useTasks();
  const { role } = useRole();

  const t = tasks.find((x) => x.id === id);
  const [hasProof, setHasProof] = useState((t?.proof?.length ?? 0) > 0);
  const [proofPending, setProofPending] = useState(false);
  const [msg, setMsg] = useState("");
  const [thread, setThread] = useState(t?.messages ?? []);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | undefined>(
    t ? new Date(t.deadline) : undefined,
  );
  const [pendingTime, setPendingTime] = useState<string>(
    t
      ? new Date(t.deadline).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "17:00",
  );

  const status = t?.status ?? "pending";
  const defHours = t?.defaultHours ?? defaultHoursFor();
  const assigneeId = t?.assigneeId ?? "";
  const pendingForUser = pendingFor(assigneeId);
  const pendingCount = pendingForUser.length;
  const canAdjust = pendingCount > 1;
  const isManager = role === "manager" || role === "admin";

  const alternates = useMemo(
    () => suggestAlternates(assigneeId, employees, tasks, 3),
    [assigneeId, tasks],
  );

  if (!t) return <div className="p-8">Task not found.</div>;

  const send = () => {
    if (!msg.trim()) return;
    setThread([
      ...thread,
      {
        id: String(Date.now()),
        from: "You",
        text: msg,
        time: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    if (!online) enqueue({ kind: "message", label: `Message on ${t.title}` });
    setMsg("");
  };

  const complete = () => {
    if (!hasProof) {
      toast({
        title: "Proof required",
        description: "Upload a photo or video before marking complete.",
        variant: "destructive",
      });
      return;
    }
    updateTask(t.id, { status: "completed" });
    if (!online) {
      enqueue({ kind: "status", label: `Completed: ${t.title}` });
      toast({ title: "Completed (offline)", description: "Will sync when you reconnect" });
    } else {
      toast({ title: "Task completed", description: "Manager notified." });
    }
  };

  const saveDeadline = () => {
    if (!pendingDate) return;
    const [h, m] = pendingTime.split(":").map(Number);
    const dl = new Date(pendingDate);
    dl.setHours(h, m, 0, 0);
    if (dl.getTime() <= Date.now()) {
      toast({
        title: "Invalid deadline",
        description: "Pick a future date and time.",
        variant: "destructive",
      });
      return;
    }
    const result = setDeadline(t.id, dl.toISOString());
    setDatePickerOpen(false);
    if (result?.extended) {
      toast({
        title: "Extended timeline flagged",
        description: "Manager has been notified — task may be reassigned.",
      });
    } else {
      toast({ title: "Deadline updated" });
    }
  };

  const handleReassign = (employeeId: string) => {
    const updated = reassignTask(t.id, employeeId);
    if (updated) {
      const sysMsg = {
        id: `sys-${Date.now()}`,
        from: "System",
        text: `🔁 Reassigned to ${updated.assignee} for faster turnaround.`,
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      };
      setThread((prev) => [...prev, sysMsg]);
      toast({ title: "Reassigned", description: `Task handed off to ${updated.assignee}.` });
    }
  };

  return (
    <>
      <Topbar title="Task detail" subtitle={t.location} />
      <div className="p-4 lg:p-8 max-w-5xl space-y-6">
        <button
          onClick={() => nav(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <div className="bg-card border border-border rounded-2xl p-5 lg:p-7 shadow-card">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {t.code}
            </span>
            <StatusPill status={status} />
            <StatusPill status={t.priority} />
            {t.source === "chat" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-accent/40 bg-accent/15 text-accent-foreground text-[10px] font-semibold uppercase tracking-wider">
                <MessageSquare className="size-3" /> From chat
              </span>
            )}
            {t.extendedTimeline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-warning/40 bg-warning/15 text-warning-foreground text-[10px] font-semibold uppercase tracking-wider">
                <AlertTriangle className="size-3" /> Extended
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight mb-2 text-balance">
            {t.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-5">{t.description}</p>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MapPin className="size-4 text-primary" /> {t.location}
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Clock className="size-4 text-primary" /> Due{" "}
              {new Date(t.deadline).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5 items-center">
            {status === "pending" && (
              <Button
                onClick={() => {
                  updateTask(t.id, { status: "in_progress" });
                  if (!online) enqueue({ kind: "status", label: `Started: ${t.title}` });
                  toast({ title: online ? "Task started" : "Task started (offline)" });
                }}
                className="gap-1.5"
              >
                <Play className="size-4" /> Start Task
              </Button>
            )}
            {status === "in_progress" && (
              <Button
                onClick={complete}
                className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
              >
                <CheckCircle2 className="size-4" /> Mark Complete
              </Button>
            )}
            {status === "completed" && (
              <div className="inline-flex items-center gap-2 text-success font-medium text-sm">
                <CheckCircle2 className="size-4" /> Completed · proof attached
              </div>
            )}
            {!online && status !== "completed" && (
              <span className="inline-flex items-center gap-1 text-xs text-warning-foreground/80">
                <CloudOff className="size-3" /> Will sync when online
              </span>
            )}
          </div>
        </div>

        {/* Smart timeline header (field role) */}
        {role === "field" && status !== "completed" && (
          <div className="bg-card border border-border rounded-2xl p-5 lg:p-7 shadow-card space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="size-4 text-primary" />
                  <h2 className="font-display font-semibold">Smart timeline</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  Suggested · <span className="font-medium text-foreground">{defHours}h</span>{" "}
                  · You have{" "}
                  <span className="font-medium text-foreground">{pendingCount}</span>{" "}
                  pending {pendingCount === 1 ? "task" : "tasks"} today
                </div>
              </div>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canAdjust}
                    className="gap-1.5"
                    title={canAdjust ? "Adjust deadline" : "Need >1 pending tasks to adjust"}
                  >
                    <CalendarIcon className="size-3.5" />
                    Adjust deadline
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 bg-popover" align="end">
                  <Calendar
                    mode="single"
                    selected={pendingDate}
                    onSelect={setPendingDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <Input
                      type="time"
                      value={pendingTime}
                      onChange={(e) => setPendingTime(e.target.value)}
                      className="h-9"
                    />
                    <Button size="sm" onClick={saveDeadline}>
                      Save
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {!canAdjust && (
              <div className="text-xs text-muted-foreground">
                Adjusting is enabled when you have more than one pending task.
              </div>
            )}
            {t.extendedTimeline && <ExtendedTimelineBanner defaultHours={defHours} />}
          </div>
        )}

        {/* Manager reassign panel */}
        {isManager && t.extendedTimeline && status !== "completed" && (
          <div className="bg-card border border-border rounded-2xl p-5 lg:p-7 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Users className="size-4 text-primary" />
              <h2 className="font-display font-semibold">Reassign for faster turnaround</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t.assignee}'s timeline is beyond the recommended {defHours}h. Teammates with
              lower workload are highlighted below.
            </p>
            <div className="space-y-2">
              {alternates.map((alt, idx) => (
                <div
                  key={alt.employee.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    idx === 0 ? "border-success/40 bg-success/5" : "border-border",
                  )}
                >
                  <div className="size-9 rounded-full gradient-primary text-primary-foreground grid place-items-center font-display font-semibold text-sm shrink-0">
                    {alt.employee.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{alt.employee.name}</span>
                      <WorkloadPill band={alt.band} showLabel={false} />
                      {idx === 0 && (
                        <span className="text-[10px] font-semibold text-success uppercase tracking-wider">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {alt.pendingCount} pending · free in ~{Math.round(alt.etaHours)}h
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={idx === 0 ? "default" : "outline"}
                    onClick={() => handleReassign(alt.employee.id)}
                  >
                    Reassign
                  </Button>
                </div>
              ))}
              {alternates.length === 0 && (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No alternates available.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminder audit trail */}
        <div className="bg-card border border-border rounded-2xl p-5 lg:p-7 shadow-card">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlarmClock className="size-4 text-primary" />
              <h2 className="font-display font-semibold">Reminder audit trail</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {(t.reminderLog?.length ?? 0)} {((t.reminderLog?.length ?? 0) === 1) ? "event" : "events"}
            </span>
          </div>
          {(t.reminderLog?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground py-3">
              No reminders have fired yet.
              {t.reminderAt && (
                <> Next scheduled for{" "}
                  <span className="font-medium text-foreground">
                    {new Date(t.reminderAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>.
                </>
              )}
            </div>
          ) : (
            <ol className="space-y-2">
              {[...(t.reminderLog ?? [])]
                .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40 text-sm"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0",
                        e.type === "acknowledged"
                          ? "bg-success/15 text-success border border-success/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
                      )}
                    >
                      {e.type === "acknowledged" ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <AlarmClock className="size-3" />
                      )}
                      {e.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {e.type === "acknowledged"
                          ? `${e.actor ?? "Viewer"} acknowledged the reminder`
                          : `Reminder shown to ${e.actor ?? "viewer"}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {e.reminderAt && (
                          <>
                            {" · scheduled for "}
                            {new Date(e.reminderAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 lg:p-7 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Proof of work</h2>
            <span className="text-xs text-muted-foreground">Geo + timestamp captured</span>
          </div>
          {hasProof ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="aspect-square rounded-lg gradient-surface border border-border grid place-items-center relative">
                <ImageIcon className="size-8 text-muted-foreground" />
                {proofPending && (
                  <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-warning/40 bg-warning/15 text-warning-foreground text-[9px] font-semibold uppercase tracking-wider">
                    <CloudOff className="size-2.5" /> Pending
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground sm:col-span-2 self-end">
                {proofPending
                  ? "Captured offline · will upload when reconnected"
                  : "Captured 2026-04-21 17:45 · 19.1197° N, 72.9051° E"}
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setHasProof(true);
                if (!online) {
                  setProofPending(true);
                  enqueue({ kind: "proof", label: `Proof for ${t.title}` });
                  toast({
                    title: "Proof captured (offline)",
                    description: "Will upload when you reconnect",
                  });
                } else {
                  toast({
                    title: "Proof uploaded",
                    description: "Geo-tagged · 19.0596° N, 72.8295° E",
                  });
                }
              }}
              className="w-full py-10 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-muted/40 transition-colors flex flex-col items-center gap-2 text-muted-foreground"
            >
              <Camera className="size-6" />
              <span className="text-sm font-medium">Capture / upload proof</span>
              <span className="text-xs">Photo or video, location auto-tagged</span>
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 lg:px-7 pt-5 pb-3 border-b border-border flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold">Task chat</h2>
              <p className="text-xs text-muted-foreground">All messages tied to this task</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                nav(`/app/chat?thread=${t.sourceThreadId ?? `task-${t.id}`}`)
              }
              className="gap-1.5 shrink-0"
            >
              <MessageSquare className="size-3.5" /> Open in Messages
            </Button>
          </div>
          <div className="p-5 lg:p-7 space-y-3 max-h-72 overflow-y-auto">
            {thread.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">
                No messages yet.
              </div>
            )}
            {thread.map((m) => {
              const mine = m.from === "You";
              const isSystem = m.from === "System";
              if (isSystem) {
                return (
                  <div key={m.id} className="flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/40 bg-accent/15 text-accent-foreground text-xs">
                      <Sparkles className="size-3" /> {m.text}
                    </span>
                  </div>
                );
              }
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {!mine && (
                      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">
                        {m.from}
                      </div>
                    )}
                    {m.text}
                    <div
                      className={`text-[10px] mt-1 ${
                        mine ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <Input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="bg-background"
            />
            <Button onClick={send} size="icon">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetail;
