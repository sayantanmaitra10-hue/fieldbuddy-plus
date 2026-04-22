import { Topbar } from "@/components/layout/Topbar";
import { tasks } from "@/lib/mock-data";
import { Link } from "react-router-dom";
import { MessageSquare, Users } from "lucide-react";

const ChatPage = () => {
  const conversations = tasks.filter((t) => t.assigneeId === "e1");
  return (
    <>
      <Topbar title="Messages" subtitle="Task threads & team channels" />
      <div className="p-4 lg:p-8 max-w-4xl space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="size-4 text-primary" />
            <h2 className="font-display font-semibold">Team channels</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {["Mumbai West Field Team", "Operations · Daily Standup"].map((c) => (
              <div key={c} className="bg-card border border-border rounded-xl p-4 shadow-card">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium">{c}</div>
                  <span className="size-2 rounded-full bg-success" />
                </div>
                <div className="text-xs text-muted-foreground">3 new messages · 12 members</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="size-4 text-primary" />
            <h2 className="font-display font-semibold">Task conversations</h2>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-card divide-y divide-border">
            {conversations.map((t) => {
              const last = t.messages[t.messages.length - 1];
              return (
                <Link key={t.id} to={`/app/tasks/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <div className="size-10 rounded-lg gradient-primary text-primary-foreground grid place-items-center font-display font-semibold text-sm">
                    {t.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {last ? `${last.from}: ${last.text}` : "No messages yet"}
                    </div>
                  </div>
                  {last && <div className="text-[11px] text-muted-foreground shrink-0">{last.time}</div>}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
};

export default ChatPage;
