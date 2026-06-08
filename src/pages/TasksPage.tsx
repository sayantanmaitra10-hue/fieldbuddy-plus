import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Topbar } from "@/components/layout/Topbar";
import { TaskCard } from "@/components/TaskCard";
import { type Task } from "@/lib/mock-data";
import { useRole } from "@/context/RoleContext";
import { useSync } from "@/context/SyncContext";
import { useTasks } from "@/context/TasksContext";
import { useAdmin } from "@/context/AdminContext";
import { Plus, Search, CalendarIcon, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const tabs = ["Pending", "In Progress", "Completed"] as const;




const taskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, { message: "Title must be at least 3 characters" })
      .max(120, { message: "Title must be under 120 characters" }),
    assigneeId: z.string().min(1, { message: "Please select an assignee" }),
    deadlineDate: z.date({ required_error: "Deadline date is required" }),
    deadlineTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Use HH:MM (24h) format" }),
    priority: z.enum(["low", "medium", "high"], {
      required_error: "Select a priority",
    }),
    description: z
      .string()
      .trim()
      .max(500, { message: "Description must be under 500 characters" })
      .optional(),
  })
  .refine(
    (data) => {
      const [h, m] = data.deadlineTime.split(":").map(Number);
      const dl = new Date(data.deadlineDate);
      dl.setHours(h, m, 0, 0);
      return dl.getTime() > Date.now();
    },
    { message: "Deadline must be in the future", path: ["deadlineDate"] },
  );

type TaskForm = z.infer<typeof taskSchema>;

const TasksPage = () => {
  const { role } = useRole();
  const { online, enqueue, queue } = useSync();
  const { tasks: localTasks, addTask } = useTasks();
  const { members } = useAdmin();
  const fieldEmployees = members.filter((m) => m.appRole === "field");
  const [active, setActive] = useState<typeof tabs[number]>("In Progress");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<TaskForm | null>(null);
  const [pendingSyncIds, setPendingSyncIds] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      assigneeId: "",
      deadlineTime: "17:00",
      priority: "medium",
      description: "",
    },
    mode: "onTouched",
  });

  const visible = (role === "field" ? localTasks.filter((t) => t.assigneeId === "e1") : localTasks).filter(
    (t) => {
      const map = { Pending: "pending", "In Progress": "in_progress", Completed: "completed" } as const;
      const ql = q.toLowerCase();
      return t.status === map[active] && (t.title.toLowerCase().includes(ql) || t.code.toLowerCase().includes(ql));
    },
  );

  const onSubmit = (data: TaskForm) => {
    setPending(data);
    setConfirmOpen(true);
  };

  const confirmAssign = () => {
    if (!pending) return;
    const assignee = members.find((e) => e.id === pending.assigneeId);
    const [h, m] = pending.deadlineTime.split(":").map(Number);
    const dl = new Date(pending.deadlineDate);
    dl.setHours(h, m, 0, 0);

    const newTask = addTask({
      title: pending.title,
      description: pending.description ?? "",
      assigneeId: pending.assigneeId,
      deadline: dl.toISOString(),
      priority: pending.priority,
      source: "manual",
    });

    if (!online) {
      const qid = enqueue({ kind: "task", label: `New task ${newTask.code}: ${pending.title}` });
      setPendingSyncIds((prev) => ({ ...prev, [newTask.id]: qid }));
      toast({
        title: `Task ${newTask.code} queued (offline)`,
        description: `"${pending.title}" → ${assignee?.name} · will sync when online`,
      });
    } else {
      toast({
        title: `Task ${newTask.code} assigned`,
        description: `"${pending.title}" → ${assignee?.name} · due ${format(dl, "MMM d, HH:mm")}`,
      });
    }
    form.reset();
    setPending(null);
    setConfirmOpen(false);
    setOpen(false);
  };

  const pendingAssignee = pending ? members.find((e) => e.id === pending.assigneeId) : null;
  const pendingDeadline = (() => {
    if (!pending) return null;
    const [h, m] = pending.deadlineTime.split(":").map(Number);
    const dl = new Date(pending.deadlineDate);
    dl.setHours(h, m, 0, 0);
    return dl;
  })();

  // Resolve pending-sync ids: once they leave the queue, drop the marker
  const isStillPending = (taskId: string) => {
    const qid = pendingSyncIds[taskId];
    return !!qid && queue.some((q) => q.id === qid);
  };


  const errorCount = Object.keys(form.formState.errors).length;

  const exportCsv = () => {
    if (visible.length === 0) {
      toast({ title: "Nothing to export", description: "No tasks match the current filters." });
      return;
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    // Excel-friendly local datetime: "yyyy-MM-dd HH:mm:ss" (no T, no Z) — Excel parses as a real date.
    const fmtLocal = (iso?: string) => (iso ? format(new Date(iso), "yyyy-MM-dd HH:mm:ss") : "");
    const fmtUtc = (iso?: string) => (iso ? new Date(iso).toISOString() : "");

    const headers = [
      "ID",
      "Title",
      "Status",
      "Priority",
      "Assignee",
      `Deadline (Local ${tz})`,
      "Deadline (UTC ISO 8601)",
      "Source",
      "Description",
    ];
    const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = visible.map((t) => {
      const assignee = members.find((e) => e.id === t.assigneeId)?.name ?? t.assignee ?? "";
      return [
        t.id,
        t.title,
        t.status,
        t.priority,
        assignee,
        fmtLocal(t.deadline),
        fmtUtc(t.deadline),
        t.source ?? "manual",
        t.description ?? "",
      ]
        .map(escape)
        .join(",");
    });
    // Prepend UTF-8 BOM so Excel opens it with correct encoding.
    const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = format(new Date(), "yyyyMMdd-HHmm");
    a.href = url;
    a.download = `tasks-${active.toLowerCase().replace(" ", "-")}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Exported",
      description: `${visible.length} task${visible.length === 1 ? "" : "s"} exported · times in ${tz} + UTC.`,
    });
  };

  return (
    <>
      <Topbar title="Tasks" subtitle={role === "field" ? "Your assignments" : "All field operations"} />
      <div className="p-4 lg:p-8 space-y-5 max-w-6xl">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tasks…"
              className="pl-9 bg-card"
            />
          </div>
          <Button
            variant="outline"
            onClick={exportCsv}
            aria-label="Export tasks to CSV"
          >
            <Download className="size-4 mr-1.5" /> Export CSV
          </Button>
          {role !== "field" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="size-4 mr-1.5" /> New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Create new task</DialogTitle>
                  <DialogDescription>
                    Assign a task to a field user. They'll be notified instantly.
                  </DialogDescription>
                </DialogHeader>

                {form.formState.isSubmitted && errorCount > 0 && (
                  <Alert variant="destructive" className="border-destructive/30">
                    <AlertCircle className="size-4" />
                    <AlertDescription>
                      Please fix {errorCount} {errorCount === 1 ? "error" : "errors"} below.
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Title <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Site survey — Bandra outlet" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Assignee <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select field user" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover">
                              {fieldEmployees.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  <span className="flex items-center gap-2">
                                    <span className="size-6 rounded-full bg-primary/15 text-primary text-[10px] font-semibold inline-flex items-center justify-center">
                                      {e.avatar}
                                    </span>
                                    {e.name}
                                    <span className="text-muted-foreground text-xs">· {e.location.split(",")[0]}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="deadlineDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>
                              Deadline date <span className="text-destructive">*</span>
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "pl-3 text-left font-normal h-10",
                                      !field.value && "text-muted-foreground",
                                    )}
                                  >
                                    {field.value ? format(field.value, "MMM d, yyyy") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto size-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deadlineTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Time <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-popover">
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Brief instructions, expected outcome, references…"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          form.reset();
                          setOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Assign Task
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Confirm task assignment</AlertDialogTitle>
              <AlertDialogDescription>
                Review the details below before assigning. The assignee will be notified.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {pending && (
              <div className="rounded-lg border bg-muted/40 divide-y text-sm">
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <span className="text-muted-foreground">Title</span>
                  <span className="font-medium text-right">{pending.title}</span>
                </div>
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <span className="text-muted-foreground">Assignee</span>
                  <span className="font-medium text-right flex items-center gap-2">
                    <span className="size-6 rounded-full bg-primary/15 text-primary text-[10px] font-semibold inline-flex items-center justify-center">
                      {pendingAssignee?.avatar}
                    </span>
                    {pendingAssignee?.name}
                  </span>
                </div>
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <span className="text-muted-foreground">Deadline</span>
                  <span className="font-medium text-right">
                    {pendingDeadline ? format(pendingDeadline, "EEE, MMM d · HH:mm") : ""}
                  </span>
                </div>
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <span className="text-muted-foreground">Priority</span>
                  <span className="font-medium text-right capitalize">{pending.priority}</span>
                </div>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel>Go back & edit</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmAssign}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Confirm & assign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`px-3.5 py-1.5 text-sm rounded-md font-medium transition-all ${
                active === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}{" "}
              <span className="opacity-60 ml-1">
                {(role === "field" ? localTasks.filter((x) => x.assigneeId === "e1") : localTasks).filter((x) => {
                  const m = { Pending: "pending", "In Progress": "in_progress", Completed: "completed" } as const;
                  return x.status === m[t];
                }).length}
              </span>
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No tasks in this view.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {visible.map((t) => (
              <TaskCard key={t.id} task={t} pendingSync={isStillPending(t.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default TasksPage;
