import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { tasks as initial } from "@/lib/mock-data";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Clock, Camera, Send, CheckCircle2, Play, Image as ImageIcon, MessageSquare, CloudOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSync } from "@/context/SyncContext";

const TaskDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const { online, enqueue } = useSync();
  const t = initial.find((x) => x.id === id);
  const [status, setStatus] = useState(t?.status ?? "pending");
  const [hasProof, setHasProof] = useState((t?.proof?.length ?? 0) > 0);
  const [proofPending, setProofPending] = useState(false);
  const [msg, setMsg] = useState("");
  const [thread, setThread] = useState(t?.messages ?? []);

  if (!t) return <div className="p-8">Task not found.</div>;

  const send = () => {
    if (!msg.trim()) return;
    setThread([...thread, { id: String(Date.now()), from: "You", text: msg, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) }]);
    if (!online) enqueue({ kind: "message", label: `Message on ${t.title}` });
    setMsg("");
  };

  const complete = () => {
    if (!hasProof) {
      toast({ title: "Proof required", description: "Upload a photo or video before marking complete.", variant: "destructive" });
      return;
    }
    setStatus("completed");
    if (!online) {
      enqueue({ kind: "status", label: `Completed: ${t.title}` });
      toast({ title: "Completed (offline)", description: "Will sync when you reconnect" });
    } else {
      toast({ title: "Task completed", description: "Manager notified." });
    }
  };

  return (
    <>
      <Topbar title="Task detail" subtitle={t.location} />
      <div className="p-4 lg:p-8 max-w-5xl space-y-6">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back
        </button>

        <div className="bg-card border border-border rounded-2xl p-5 lg:p-7 shadow-card">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusPill status={status} />
            <StatusPill status={t.priority} />
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight mb-2 text-balance">{t.title}</h1>
          <p className="text-muted-foreground leading-relaxed mb-5">{t.description}</p>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MapPin className="size-4 text-primary" /> {t.location}
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Clock className="size-4 text-primary" /> Due {new Date(t.deadline).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5 items-center">
            {status === "pending" && (
              <Button onClick={() => {
                setStatus("in_progress");
                if (!online) enqueue({ kind: "status", label: `Started: ${t.title}` });
                toast({ title: online ? "Task started" : "Task started (offline)" });
              }} className="gap-1.5">
                <Play className="size-4" /> Start Task
              </Button>
            )}
            {status === "in_progress" && (
              <Button onClick={complete} className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground">
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
                  toast({ title: "Proof captured (offline)", description: "Will upload when you reconnect" });
                } else {
                  toast({ title: "Proof uploaded", description: "Geo-tagged · 19.0596° N, 72.8295° E" });
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
              onClick={() => nav(`/app/chat?thread=task-${t.id}`)}
              className="gap-1.5 shrink-0"
            >
              <MessageSquare className="size-3.5" /> Open in Messages
            </Button>
          </div>
          <div className="p-5 lg:p-7 space-y-3 max-h-72 overflow-y-auto">
            {thread.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No messages yet.</div>}
            {thread.map((m) => {
              const mine = m.from === "You";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                    {!mine && <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">{m.from}</div>}
                    {m.text}
                    <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{m.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <Input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" className="bg-background" />
            <Button onClick={send} size="icon"><Send className="size-4" /></Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetail;
