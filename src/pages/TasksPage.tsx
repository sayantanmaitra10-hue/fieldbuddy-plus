import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { TaskCard } from "@/components/TaskCard";
import { tasks } from "@/lib/mock-data";
import { useRole } from "@/context/RoleContext";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const tabs = ["Pending", "In Progress", "Completed"] as const;

const TasksPage = () => {
  const { role } = useRole();
  const [active, setActive] = useState<typeof tabs[number]>("In Progress");
  const [q, setQ] = useState("");
  const { toast } = useToast();
  const visible = (role === "field" ? tasks.filter((t) => t.assigneeId === "e1") : tasks).filter((t) => {
    const map = { Pending: "pending", "In Progress": "in_progress", Completed: "completed" } as const;
    return t.status === map[active] && t.title.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      <Topbar title="Tasks" subtitle={role === "field" ? "Your assignments" : "All field operations"} />
      <div className="p-4 lg:p-8 space-y-5 max-w-6xl">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="pl-9 bg-card" />
          </div>
          {role !== "field" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="size-4 mr-1.5" /> New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Create new task</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div><Label>Title</Label><Input placeholder="e.g. Site survey" /></div>
                  <div><Label>Assignee</Label><Input placeholder="Select field user" /></div>
                  <div><Label>Deadline</Label><Input type="datetime-local" /></div>
                  <div><Label>Description</Label><Textarea rows={3} /></div>
                </div>
                <DialogFooter>
                  <Button onClick={() => toast({ title: "Task assigned", description: "Notification sent to assignee." })}>
                    Assign Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`px-3.5 py-1.5 text-sm rounded-md font-medium transition-all ${
                active === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t} <span className="opacity-60 ml-1">{(role === "field" ? tasks.filter((x) => x.assigneeId === "e1") : tasks).filter((x) => {
                const m = { Pending: "pending", "In Progress": "in_progress", Completed: "completed" } as const;
                return x.status === m[t];
              }).length}</span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No tasks in this view.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {visible.map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        )}
      </div>
    </>
  );
};

export default TasksPage;
