import { useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { tasks as seedTasks, employees } from "@/lib/mock-data";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Users,
  Send,
  Paperclip,
  Image as ImageIcon,
  Search,
  ArrowLeft,
  CheckCheck,
} from "lucide-react";

type Message = {
  id: string;
  from: string;
  text: string;
  time: string;
  media?: { name: string; kind: "image" | "file" };
  mine?: boolean;
};

type Thread = {
  id: string;
  kind: "task" | "channel";
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

  return [...taskThreads, ...channelThreads];
};

const ChatPage = () => {
  const { role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedThread = searchParams.get("thread");

  const [threads, setThreads] = useState<Thread[]>(() => buildInitialThreads(role));
  const [activeId, setActiveId] = useState<string>(
    () => requestedThread ?? buildInitialThreads(role)[0]?.id ?? "",
  );
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [showListMobile, setShowListMobile] = useState(!requestedThread);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset threads when role flips
  useEffect(() => {
    const next = buildInitialThreads(role);
    setThreads(next);
    setActiveId((prev) => (next.find((t) => t.id === prev) ? prev : next[0]?.id ?? ""));
  }, [role]);

  // React to ?thread= changes (e.g. navigated from Task detail)
  useEffect(() => {
    if (!requestedThread) return;
    setThreads((prev) => {
      if (!prev.find((t) => t.id === requestedThread)) return prev;
      return prev.map((t) => (t.id === requestedThread ? { ...t, unread: 0 } : t));
    });
    setActiveId(requestedThread);
    setShowListMobile(false);
  }, [requestedThread]);

  const active = threads.find((t) => t.id === activeId);

  const filtered = useMemo(
    () =>
      threads.filter((t) =>
        (t.title + " " + t.subtitle).toLowerCase().includes(query.toLowerCase()),
      ),
    [threads, query],
  );

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
    const msg: Message = {
      id: `m-${Date.now()}`,
      from: "You",
      text: text.trim(),
      time: nowTime(),
      media,
      mine: true,
    };
    setThreads((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, msg] } : t)),
    );
    setDraft("");
    // simulate teammate auto-reply on channels
    if (active.kind === "channel") {
      setTimeout(() => {
        const reply: Message = {
          id: `m-${Date.now()}-r`,
          from: "Priya Sharma",
          text: "Got it 👍",
          time: nowTime(),
        };
        setThreads((prev) =>
          prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, reply] } : t)),
        );
      }, 1200);
    }
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
          "size-10 rounded-lg grid place-items-center font-display font-semibold text-sm shrink-0",
          t.kind === "task"
            ? "gradient-primary text-primary-foreground"
            : "bg-accent/20 text-accent-foreground",
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
                      "size-9 rounded-lg grid place-items-center font-display font-semibold text-sm shrink-0",
                      active.kind === "task"
                        ? "gradient-primary text-primary-foreground"
                        : "bg-accent/20 text-accent-foreground",
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
                    {active.kind === "task" ? "Task thread" : "Channel"}
                  </Badge>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
                  {active.messages.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-12">
                      No messages yet. Say hello 👋
                    </div>
                  )}
                  {active.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn("flex gap-2", m.mine ? "justify-end" : "justify-start")}
                    >
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
                          {m.time}
                          {m.mine && <CheckCheck className="size-3" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <footer className="border-t border-border bg-card p-3">
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
                      placeholder={`Message ${active.kind === "task" ? "thread" : active.title}…`}
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
    </>
  );
};

export default ChatPage;
