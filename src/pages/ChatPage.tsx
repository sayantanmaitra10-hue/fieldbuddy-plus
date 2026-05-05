import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { tasks as seedTasks, employees } from "@/lib/mock-data";
import { useRole } from "@/context/RoleContext";
import { useTasks } from "@/context/TasksContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Users,
  User,
  Send,
  Paperclip,
  Image as ImageIcon,
  Search,
  ArrowLeft,
  CheckCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { detectIntent, defaultHoursFor } from "@/lib/smart-task";
import { SuggestionChip, ConvertCallout } from "@/components/SmartTaskSuggestion";
import {
  SmartTaskPreviewDialog,
  type SmartTaskDraft,
} from "@/components/SmartTaskPreviewDialog";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  from: string;
  text: string;
  time: string;
  media?: { name: string; kind: "image" | "file" };
  mine?: boolean;
  pendingSyncId?: string;
  intent?: { keyword: string; cleanedTitle: string };
  converted?: boolean;
  dismissed?: boolean;
  system?: boolean;
  taskId?: string;
};

type Thread = {
  id: string;
  kind: "task" | "channel" | "direct";
  title: string;
  subtitle: string;
  initials: string;
  unread: number;
  messages: Message[];
};

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

const initialsOf = (s: string) =>
  s
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const buildDirectThread = (employeeId: string): Thread | null => {
  const e = employees.find((x) => x.id === employeeId);
  if (!e) return null;
  return {
    id: `dm-${e.id}`,
    kind: "direct",
    title: e.name,
    subtitle: e.role,
    initials: initialsOf(e.name),
    unread: 0,
    messages: [],
  };
};

const buildInitialThreads = (role: "field" | "manager" | "admin"): Thread[] => {
  const taskScope = role === "field" ? seedTasks.filter((t) => t.assigneeId === "e1") : seedTasks;

  const taskThreads: Thread[] = taskScope.map((t, i) => ({
    id: `task-${t.id}`,
    kind: "task",
    title: t.title,
    subtitle: `${t.assignee} · ${t.location.split(",")[0]}`,
    initials: initialsOf(t.title),
    unread: i === 0 ? 2 : 0,
    messages: t.messages.map((m) => ({
      id: m.id,
      from: m.from,
      text: m.text,
      time: m.time,
      mine: m.from === "You",
    })),
  }));

  const channelThreads: Thread[] = [
    {
      id: "ch-mumbai",
      kind: "channel",
      title: "Mumbai West Field Team",
      subtitle: "12 members",
      initials: "MW",
      unread: 3,
      messages: [
        { id: "c1", from: "Priya Sharma", text: "Reached Andheri site, starting setup.", time: "08:55" },
        { id: "c2", from: "Karan Patel", text: "Need a hand at Phoenix Mills around noon?", time: "09:10" },
        { id: "c3", from: "Manager", text: "Standup at 10 sharp, please punch in.", time: "09:22" },
      ],
    },
    {
      id: "ch-ops",
      kind: "channel",
      title: "Operations · Daily Standup",
      subtitle: "8 members",
      initials: "OP",
      unread: 0,
      messages: [
        { id: "o1", from: "Manager", text: "Yesterday's completion rate hit 91%. Great work team.", time: "08:30" },
      ],
    },
  ];

  // Managers/admins get a DM thread per field employee.
  // Field users get a single DM thread with their manager so they can reply.
  const directThreads: Thread[] =
    role === "field"
      ? [
          {
            id: "dm-manager",
            kind: "direct" as const,
            title: "Manager",
            subtitle: "Operations Lead",
            initials: "MG",
            unread: 0,
            messages: [],
          },
        ]
      : employees
          .filter((e) => e.role.toLowerCase().includes("field"))
          .map((e) => ({
            id: `dm-${e.id}`,
            kind: "direct" as const,
            title: e.name,
            subtitle: e.role,
            initials: initialsOf(e.name),
            unread: 0,
            messages: [],
          }));

  return [...directThreads, ...channelThreads, ...taskThreads];
};

const ChatPage = () => {
  const { role } = useRole();
  const { online, enqueue, queue } = useSync();
  const { addTask } = useTasks();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedThread = searchParams.get("thread");

  const [threads, setThreads] = useState<Thread[]>(() => buildInitialThreads(role));
  const [activeId, setActiveId] = useState<string>(
    () => requestedThread ?? buildInitialThreads(role)[0]?.id ?? "",
  );
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [showListMobile, setShowListMobile] = useState(!requestedThread);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<SmartTaskDraft | null>(null);
  const [previewSourceMsgId, setPreviewSourceMsgId] = useState<string | null>(null);
  const [previewThreadId, setPreviewThreadId] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  // Text snapshots that have already been converted from the composer chip — prevents
  // re-creating the same task by re-clicking Convert on identical draft text.
  const [convertedDrafts, setConvertedDrafts] = useState<Set<string>>(new Set());
  const [chipDismissed, setChipDismissed] = useState(false);
  const [tipDismissed, setTipDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("smart-task-tip-dismissed") === "1";
  });
  const dismissTip = () => {
    setTipDismissed(true);
    try {
      window.localStorage.setItem("smart-task-tip-dismissed", "1");
    } catch {
      /* noop */
    }
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Field users can also convert chat content into self-assigned tasks.
  const canConvert = role === "field" || role === "manager" || role === "admin";
  const isManager = role === "manager" || role === "admin";
  const draftIntent = useMemo(() => detectIntent(draft), [draft]);

  // Reset threads when role flips
  useEffect(() => {
    const next = buildInitialThreads(role);
    setThreads(next);
    setActiveId((prev) => (next.find((t) => t.id === prev) ? prev : next[0]?.id ?? ""));
  }, [role]);

  // React to ?thread= changes (e.g. navigated from Task detail or Team page)
  useEffect(() => {
    if (!requestedThread) return;
    setThreads((prev) => {
      // Lazily materialise a DM thread if not yet present
      if (!prev.find((t) => t.id === requestedThread)) {
        if (requestedThread.startsWith("dm-") && isManager) {
          const dm = buildDirectThread(requestedThread.replace(/^dm-/, ""));
          if (dm) return [dm, ...prev];
        }
        return prev;
      }
      return prev.map((t) => (t.id === requestedThread ? { ...t, unread: 0 } : t));
    });
    
    setActiveId(requestedThread);
    setShowListMobile(false);
  }, [requestedThread, isManager]);

  const active = threads.find((t) => t.id === activeId);

  const filtered = useMemo(
    () =>
      threads.filter((t) =>
        (t.title + " " + t.subtitle).toLowerCase().includes(query.toLowerCase()),
      ),
    [threads, query],
  );

  const directThreads = filtered.filter((t) => t.kind === "direct");
  const taskThreads = filtered.filter((t) => t.kind === "task");
  const channelThreads = filtered.filter((t) => t.kind === "channel");

  const totalUnread = threads.reduce((acc, t) => acc + t.unread, 0);

  const openThread = (id: string) => {
    setActiveId(id);
    setShowListMobile(false);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
    if (searchParams.get("thread") && searchParams.get("thread") !== id) {
      searchParams.delete("thread");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const send = (text: string, media?: Message["media"]) => {
    if (!text.trim() && !media) return;
    if (!active) return;
    const pendingSyncId = !online
      ? enqueue({ kind: "message", label: `Message in ${active.title}` })
      : undefined;
    const intent = canConvert ? detectIntent(text) : { isTask: false, cleanedTitle: "" };
    const msg: Message = {
      id: `m-${Date.now()}`,
      from: "You",
      text: text.trim(),
      time: nowTime(),
      media,
      mine: true,
      pendingSyncId,
      intent: intent.isTask && intent.keyword
        ? { keyword: intent.keyword, cleanedTitle: intent.cleanedTitle }
        : undefined,
    };
    setThreads((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, msg] } : t)),
    );
    setDraft("");
    setChipDismissed(false);
    // simulate teammate auto-reply on channels (only when online)
    if (active.kind === "channel" && online) {
      setTimeout(() => {
        const replyText = "Got it 👍";
        const replyIntent = detectIntent(replyText);
        const reply: Message = {
          id: `m-${Date.now()}-r`,
          from: "Priya Sharma",
          text: replyText,
          time: nowTime(),
          intent: replyIntent.isTask && replyIntent.keyword
            ? { keyword: replyIntent.keyword, cleanedTitle: replyIntent.cleanedTitle }
            : undefined,
        };
        setThreads((prev) =>
          prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, reply] } : t)),
        );
      }, 1200);
    }
    // simulate the other side replying on direct threads (only when online)
    if (active.kind === "direct" && online) {
      const replyFrom =
        role === "field"
          ? "Manager"
          : active.title;
      const replyText =
        role === "field"
          ? "Thanks for the update — keep me posted."
          : "On it, will update you shortly.";
      const replyIntent = detectIntent(replyText);
      setTimeout(() => {
        const reply: Message = {
          id: `m-${Date.now()}-r`,
          from: replyFrom,
          text: replyText,
          time: nowTime(),
          intent: replyIntent.isTask && replyIntent.keyword
            ? { keyword: replyIntent.keyword, cleanedTitle: replyIntent.cleanedTitle }
            : undefined,
        };
        setThreads((prev) =>
          prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, reply] } : t)),
        );
      }, 1400);
    }
  };

  // Map an inbound message sender name to an employee id, falling back to thread default
  const senderToAssigneeId = (fromName: string): string | null => {
    const e = employees.find((x) => x.name === fromName);
    return e?.id ?? null;
  };

  const defaultAssigneeIdFor = (thread?: Thread): string => {
    if (!thread) return "e1";
    if (thread.kind === "task") {
      const taskId = thread.id.replace(/^task-/, "");
      const t = seedTasks.find((x) => x.id === taskId);
      if (t) return t.assigneeId;
    }
    if (thread.kind === "direct") {
      return thread.id.replace(/^dm-/, "");
    }
    // channel → first field employee
    const first = employees.find((e) => e.role.toLowerCase().includes("field"));
    return first?.id ?? "e1";
  };

  const openConvert = (
    sourceText: string,
    keyword: string | undefined,
    cleanedTitle: string,
    sourceMsgId: string | null,
    assigneeIdOverride?: string,
  ) => {
    setPreviewDraft({
      title: cleanedTitle || sourceText,
      assigneeId: assigneeIdOverride ?? defaultAssigneeIdFor(active),
      hours: defaultHoursFor(keyword as any),
      priority: "medium",
      keyword: keyword as any,
      sourceMessage: sourceText,
    });
    setPreviewSourceMsgId(sourceMsgId);
    setPreviewOpen(true);
  };

  const handleConfirmTask = (d: SmartTaskDraft) => {
    if (!active) return;
    const deadline = new Date(Date.now() + d.hours * 60 * 60 * 1000).toISOString();
    const newTask = addTask({
      title: d.title,
      assigneeId: d.assigneeId,
      deadline,
      priority: d.priority,
      source: "chat",
      sourceMessageId: previewSourceMsgId ?? undefined,
      sourceThreadId: active.id,
      keyword: d.keyword,
    });
    // mark source message as converted
    if (previewSourceMsgId) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === active.id
            ? {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === previewSourceMsgId ? { ...m, converted: true, taskId: newTask.id } : m,
                ),
              }
            : t,
        ),
      );
    }
    // append system message
    const systemMsg: Message = {
      id: `m-sys-${Date.now()}`,
      from: "System",
      text: `📋 Task created → ${newTask.title} · due in ${d.hours}h`,
      time: nowTime(),
      system: true,
      taskId: newTask.id,
    };
    setThreads((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, systemMsg] } : t)),
    );
    setPreviewOpen(false);
    setPreviewDraft(null);
    setPreviewSourceMsgId(null);
    toast({ title: "Task created", description: `${newTask.title} → ${newTask.assignee}` });
  };

  const dismissMessage = (msgId: string) => {
    if (!active) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              messages: t.messages.map((m) => (m.id === msgId ? { ...m, dismissed: true } : m)),
            }
          : t,
      ),
    );
  };

  const onAttach = (kind: "image" | "file") => {
    const file = fileRef.current?.files?.[0];
    const name = file?.name ?? (kind === "image" ? "photo.jpg" : "document.pdf");
    send(draft || (kind === "image" ? "📷 Photo" : "📎 Attachment"), { name, kind });
    if (fileRef.current) fileRef.current.value = "";
  };

  // auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, activeId]);

  const ThreadRow = ({ t }: { t: Thread }) => (
    <button
      onClick={() => openThread(t.id)}
      className={cn(
        "w-full flex items-center gap-3 p-3 text-left transition-colors border-l-2",
        activeId === t.id
          ? "bg-primary/5 border-primary"
          : "border-transparent hover:bg-muted/40",
      )}
    >
      <div
        className={cn(
          "size-10 grid place-items-center font-display font-semibold text-sm shrink-0",
          t.kind === "task" && "rounded-lg gradient-primary text-primary-foreground",
          t.kind === "channel" && "rounded-lg bg-accent/20 text-accent-foreground",
          t.kind === "direct" && "rounded-full bg-primary/15 text-primary border border-primary/20",
        )}
      >
        {t.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-sm truncate">{t.title}</div>
          {t.messages.length > 0 && (
            <div className="text-[10px] text-muted-foreground shrink-0">
              {t.messages[t.messages.length - 1].time}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="text-xs text-muted-foreground truncate">
            {t.messages.length > 0
              ? `${t.messages[t.messages.length - 1].from}: ${t.messages[t.messages.length - 1].text}`
              : t.subtitle}
          </div>
          {t.unread > 0 && (
            <Badge className="bg-primary text-primary-foreground h-5 min-w-5 px-1.5 text-[10px] shrink-0">
              {t.unread}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );

  return (
    <>
      <Topbar
        title="Messages"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
      />
      <div className="lg:p-6 lg:max-w-6xl">
        <div className="lg:rounded-xl lg:border lg:border-border lg:shadow-card lg:overflow-hidden bg-card grid grid-cols-1 lg:grid-cols-[320px_1fr] h-[calc(100vh-9rem)] lg:h-[calc(100vh-8rem)]">
          {/* Sidebar list */}
          <aside
            className={cn(
              "border-r border-border flex flex-col bg-card",
              showListMobile ? "flex" : "hidden lg:flex",
            )}
          >
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations…"
                  className="pl-9 h-9 bg-background"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {directThreads.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <User className="size-3" /> Direct messages
                  </div>
                  {directThreads.map((t) => (
                    <ThreadRow key={t.id} t={t} />
                  ))}
                </div>
              )}
              {channelThreads.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Users className="size-3" /> Channels
                  </div>
                  {channelThreads.map((t) => (
                    <ThreadRow key={t.id} t={t} />
                  ))}
                </div>
              )}
              {taskThreads.length > 0 && (
                <div>
                  <div className="px-3 pt-3 pb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <MessageSquare className="size-3" /> Task threads
                  </div>
                  {taskThreads.map((t) => (
                    <ThreadRow key={t.id} t={t} />
                  ))}
                </div>
              )}
              {filtered.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No conversations match.
                </div>
              )}
            </ScrollArea>
          </aside>

          {/* Conversation pane */}
          <section
            className={cn(
              "flex flex-col min-w-0 bg-background",
              showListMobile ? "hidden lg:flex" : "flex",
            )}
          >
            {active ? (
              <>
                <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden -ml-2"
                    onClick={() => setShowListMobile(true)}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div
                    className={cn(
                      "size-9 grid place-items-center font-display font-semibold text-sm shrink-0",
                      active.kind === "task" && "rounded-lg gradient-primary text-primary-foreground",
                      active.kind === "channel" && "rounded-lg bg-accent/20 text-accent-foreground",
                      active.kind === "direct" && "rounded-full bg-primary/15 text-primary border border-primary/20",
                    )}
                  >
                    {active.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{active.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {active.subtitle}
                    </div>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">
                    {active.kind === "task" ? "Task thread" : active.kind === "direct" ? "Direct" : "Channel"}
                  </Badge>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
                  {active.messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-12">
                      No messages yet. Say hello 👋
                    </div>
                  )}
                  {active.messages.map((m) => {
                    if (m.system) {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <button
                            onClick={() => m.taskId && navigate(`/app/tasks/${m.taskId}`)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/40 bg-accent/15 text-accent-foreground text-xs hover:bg-accent/25 transition-colors"
                          >
                            <Sparkles className="size-3.5" />
                            <span>{m.text}</span>
                          </button>
                        </div>
                      );
                    }
                    // Compute intent on-the-fly for inbound messages so seeded/auto-reply
                    // text also surfaces a Convert callout to managers.
                    const liveIntent =
                      m.intent ??
                      (isManager && !m.mine && m.text
                        ? (() => {
                            const r = detectIntent(m.text);
                            return r.isTask && r.keyword
                              ? { keyword: r.keyword, cleanedTitle: r.cleanedTitle }
                              : undefined;
                          })()
                        : undefined);
                    const showCallout =
                      isManager && !!liveIntent && !m.converted && !m.dismissed;
                    return (
                      <div key={m.id} className={cn("flex flex-col", m.mine ? "items-end" : "items-start")}>
                        <div className={cn("flex gap-2 w-full", m.mine ? "justify-end" : "justify-start")}>
                          {!m.mine && (
                            <div className="size-7 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold grid place-items-center shrink-0">
                              {initialsOf(m.from)}
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                              m.mine
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-card border border-border rounded-bl-sm",
                            )}
                          >
                            {!m.mine && (
                              <div className="text-[11px] font-semibold opacity-80 mb-0.5">
                                {m.from}
                              </div>
                            )}
                            {m.media && (
                              <div
                                className={cn(
                                  "mb-1.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                                  m.mine ? "bg-primary-foreground/15" : "bg-muted",
                                )}
                              >
                                {m.media.kind === "image" ? (
                                  <ImageIcon className="size-3.5" />
                                ) : (
                                  <Paperclip className="size-3.5" />
                                )}
                                <span className="truncate">{m.media.name}</span>
                              </div>
                            )}
                            {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                            <div
                              className={cn(
                                "flex items-center gap-1 justify-end mt-1 text-[10px]",
                                m.mine ? "opacity-80" : "text-muted-foreground",
                              )}
                            >
                              {m.converted && (
                                <span className="inline-flex items-center gap-0.5 text-accent-foreground/90">
                                  <Sparkles className="size-2.5" /> Task
                                </span>
                              )}
                              {m.time}
                              {m.mine &&
                                (m.pendingSyncId && queue.some((q) => q.id === m.pendingSyncId) ? (
                                  <Clock className="size-3" />
                                ) : (
                                  <CheckCheck className="size-3" />
                                ))}
                            </div>
                          </div>
                        </div>
                        {showCallout && liveIntent && (
                          <div className="max-w-[78%] mt-1">
                            <ConvertCallout
                              onConvert={() =>
                                openConvert(
                                  m.text,
                                  liveIntent.keyword,
                                  liveIntent.cleanedTitle,
                                  m.id,
                                  m.mine ? undefined : senderToAssigneeId(m.from) ?? undefined,
                                )
                              }
                              onDismiss={() => dismissMessage(m.id)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <footer className="border-t border-border bg-card p-3">
                  {isManager && !draft.trim() && !tipDismissed && (
                    <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                      <Sparkles className="size-3 text-primary/70 shrink-0" />
                      <span className="flex-1">
                        Tip: messages with verbs like <span className="font-medium">visit</span>,{" "}
                        <span className="font-medium">deliver</span>,{" "}
                        <span className="font-medium">pick up</span>,{" "}
                        <span className="font-medium">take</span> can be turned into tasks.
                      </span>
                      <button
                        type="button"
                        onClick={dismissTip}
                        className="text-muted-foreground/70 hover:text-foreground"
                        aria-label="Dismiss tip"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {isManager && draftIntent.isTask && !chipDismissed && (
                    <div className="mb-2 flex">
                      <SuggestionChip
                        keyword={draftIntent.keyword!}
                        onConvert={() =>
                          openConvert(draft, draftIntent.keyword, draftIntent.cleanedTitle, null)
                        }
                        onDismiss={() => setChipDismissed(true)}
                      />
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send(draft);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      onChange={() => onAttach(fileRef.current?.files?.[0]?.type.startsWith("image") ? "image" : "file")}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => fileRef.current?.click()}
                      aria-label="Attach file"
                    >
                      <Paperclip className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onAttach("image")}
                      aria-label="Attach photo"
                    >
                      <ImageIcon className="size-4" />
                    </Button>
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={`Message ${active.kind === "task" ? "thread" : active.kind === "direct" ? active.title : active.title}…`}
                      className="flex-1 bg-background"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!draft.trim()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      aria-label="Send"
                    >
                      <Send className="size-4" />
                    </Button>
                  </form>
                </footer>
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
                Select a conversation to start chatting.
              </div>
            )}
          </section>
        </div>
      </div>
      <SmartTaskPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        initial={previewDraft}
        onConfirm={handleConfirmTask}
      />
    </>
  );
};

export default ChatPage;
