import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { tasks as seedTasks, alerts as seedAlerts, employees, type Task, type Alert } from "@/lib/mock-data";
import {
  defaultHoursFor,
  isExtended,
  pendingTasksFor,
  workloadBand,
  workloadScore,
  type SmartKeyword,
  type WorkloadBand,
} from "@/lib/smart-task";

type CreateInput = {
  title: string;
  description?: string;
  assigneeId: string;
  deadline: string; // ISO
  priority?: Task["priority"];
  source?: Task["source"];
  sourceMessageId?: string;
  sourceThreadId?: string;
  keyword?: SmartKeyword;
};

type TasksContextValue = {
  tasks: Task[];
  alerts: Alert[];
  addTask: (input: CreateInput) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  reassignTask: (id: string, newAssigneeId: string) => Task | undefined;
  setDeadline: (id: string, iso: string) => { extended: boolean; task: Task } | undefined;
  pendingFor: (employeeId: string) => Task[];
  workloadFor: (employeeId: string) => { score: number; band: WorkloadBand };
  pushAlert: (alert: Omit<Alert, "id" | "time">) => void;
  resolveAlert: (id: string) => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

const justNow = () => "just now";

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [alerts, setAlerts] = useState<Alert[]>(seedAlerts);

  const pushAlert = useCallback((alert: Omit<Alert, "id" | "time">) => {
    setAlerts((prev) => [
      { ...alert, id: `a-${Date.now()}`, time: justNow() },
      ...prev,
    ]);
  }, []);

  const resolveAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addTask = useCallback((input: CreateInput): Task => {
    const assignee = employees.find((e) => e.id === input.assigneeId);
    const defHours = defaultHoursFor(input.keyword);
    let createdTask!: Task;
    setTasks((prev) => {
      const maxNum = prev.reduce((max, t) => {
        const m = /^TSK-(\d+)$/.exec(t.code ?? "");
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 1000);
      createdTask = {
        id: `t-${Date.now()}`,
        code: `TSK-${maxNum + 1}`,
        title: input.title,
        description: input.description ?? "",
        status: "pending",
        priority: input.priority ?? "medium",
        assigneeId: input.assigneeId,
        assignee: assignee?.name ?? "—",
        location: assignee?.location ?? "—",
        deadline: input.deadline,
        createdAt: new Date().toISOString(),
        proof: [],
        messages: [],
        source: input.source ?? "manual",
        sourceMessageId: input.sourceMessageId,
        sourceThreadId: input.sourceThreadId,
        defaultHours: defHours,
        extendedTimeline: false,
      };
      return [createdTask, ...prev];
    });
    return createdTask;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const reassignTask = useCallback(
    (id: string, newAssigneeId: string): Task | undefined => {
      const next = employees.find((e) => e.id === newAssigneeId);
      if (!next) return undefined;
      let updated: Task | undefined;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          updated = {
            ...t,
            assigneeId: newAssigneeId,
            assignee: next.name,
            location: next.location,
            extendedTimeline: false,
          };
          return updated;
        }),
      );
      return updated;
    },
    [],
  );

  const setDeadline = useCallback(
    (id: string, iso: string) => {
      let resultTask: Task | undefined;
      let extended = false;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const def = t.defaultHours ?? defaultHoursFor();
          const baseMs = t.createdAt
            ? new Date(t.createdAt).getTime()
            : Date.now();
          const newHours = (new Date(iso).getTime() - baseMs) / (1000 * 60 * 60);
          extended = isExtended(Math.max(0.1, newHours), def);
          resultTask = { ...t, deadline: iso, extendedTimeline: extended };
          return resultTask;
        }),
      );
      if (resultTask && extended) {
        const taskTitle = resultTask.title;
        const employeeName = resultTask.assignee;
        // Dedupe: if an unresolved extended_timeline alert already exists for
        // this employee+task, refresh its time instead of pushing a duplicate.
        setAlerts((prev) => {
          const existingIdx = prev.findIndex(
            (a) =>
              a.type === "extended_timeline" &&
              a.employee === employeeName &&
              a.message.includes(`"${taskTitle}"`),
          );
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = { ...next[existingIdx], time: justNow() };
            return next;
          }
          return [
            {
              id: `a-${Date.now()}`,
              type: "extended_timeline",
              severity: "medium",
              employee: employeeName,
              message: `Deadline for "${taskTitle}" extended beyond ${Math.round(
                (resultTask!.defaultHours ?? 4) * 1.5,
              )}h recommended limit`,
              time: justNow(),
            },
            ...prev,
          ];
        });
      }
      return resultTask ? { extended, task: resultTask } : undefined;
    },
    [],
  );

  const pendingFor = useCallback(
    (employeeId: string) => pendingTasksFor(employeeId, tasks),
    [tasks],
  );

  const workloadFor = useCallback(
    (employeeId: string) => {
      const score = workloadScore(employeeId, tasks);
      return { score, band: workloadBand(score) };
    },
    [tasks],
  );

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      alerts,
      addTask,
      updateTask,
      reassignTask,
      setDeadline,
      pendingFor,
      workloadFor,
      pushAlert,
      resolveAlert,
    }),
    [tasks, alerts, addTask, updateTask, reassignTask, setDeadline, pendingFor, workloadFor, pushAlert, resolveAlert],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};

export const useTasks = () => {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
};
