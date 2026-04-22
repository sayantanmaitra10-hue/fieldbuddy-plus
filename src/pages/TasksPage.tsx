import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Topbar } from "@/components/layout/Topbar";
import { TaskCard } from "@/components/TaskCard";
import { tasks, employees } from "@/lib/mock-data";
import { useRole } from "@/context/RoleContext";
import { Plus, Search, CalendarIcon, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

const tabs = ["Pending", "In Progress", "Completed"] as const;

const fieldEmployees = employees.filter((e) => e.role.toLowerCase().includes("field"));

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
  const [active, setActive] = useState<typeof tabs[number]>("In Progress");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
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

  const visible = (role === "field" ? tasks.filter((t) => t.assigneeId === "e1") : tasks).filter(
    (t) => {
      const map = { Pending: "pending", "In Progress": "in_progress", Completed: "completed" } as const;
      return t.status === map[active] && t.title.toLowerCase().includes(q.toLowerCase());
    },
  );

  const onSubmit = (data: TaskForm) => {
    const assignee = employees.find((e) => e.id === data.assigneeId);
    const [h, m] = data.deadlineTime.split(":").map(Number);
    const dl = new Date(data.deadlineDate);
    dl.setHours(h, m, 0, 0);
    toast({
      title: "Task assigned",
      description: `"${data.title}" → ${assignee?.name} · due ${format(dl, "MMM d, HH:mm")}`,
    });
    form.reset();
    setOpen(false);
  };

  const errorCount = Object.keys(form.formState.errors).length;

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
                {(role === "field" ? tasks.filter((x) => x.assigneeId === "e1") : tasks).filter((x) => {
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
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default TasksPage;
