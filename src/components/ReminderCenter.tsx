import { useEffect, useMemo, useState } from "react";
import { useTasks } from "@/context/TasksContext";
import { useRole } from "@/context/RoleContext";
import { useAdmin } from "@/context/AdminContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { AlarmClock } from "lucide-react";
import { formatOffset } from "@/lib/reminder";
import type { Task } from "@/lib/mock-data";

// Field users see reminders only for tasks assigned to them.
// Managers/Admins see reminders for any task they should follow up on.
const isDueNow = (t: Task, nowMs: number) => {
  if (!t.reminderAt) return false;
  if (t.reminderAcknowledgedAt) return false;
  if (t.status === "completed") return false;
  if (new Date(t.reminderAt).getTime() > nowMs) return false;
  // Don't pop reminders for tasks already past deadline
  if (new Date(t.deadline).getTime() < nowMs) return false;
  return true;
};

export const ReminderCenter = () => {
  const { tasks, acknowledgeReminder, logReminderShown } = useTasks();
  const { role } = useRole();
  const { impersonatedId, impersonatedMember } = useAdmin();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);

  // Determine the "current viewer" id when in field mode or while impersonating.
  const viewerEmployeeId = useMemo(() => {
    if (impersonatedId) return impersonatedId;
    if (role === "field") return "e1";
    return null; // manager/admin
  }, [role, impersonatedId]);

  const actorLabel = useMemo(() => {
    if (impersonatedMember) return `${impersonatedMember.name} (impersonated)`;
    if (role === "field") return "Arjun Mehta";
    return role === "admin" ? "Admin" : "Manager";
  }, [impersonatedMember, role]);

  const due = useMemo(() => {
    const list = tasks.filter((t) => isDueNow(t, now));
    if (viewerEmployeeId) {
      return list.filter((t) => t.assigneeId === viewerEmployeeId);
    }
    return list;
  }, [tasks, now, viewerEmployeeId]);

  const current = due[0];

  // Record a "shown" audit entry the first time a reminder surfaces to this viewer.
  useEffect(() => {
    if (current) logReminderShown(current.id, actorLabel);
  }, [current, actorLabel, logReminderShown]);

  if (!current) return null;

  const minsLeft = Math.max(
    0,
    Math.round((new Date(current.deadline).getTime() - now) / 60000),
  );
  const timeLeftLabel =
    minsLeft >= 60
      ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`
      : `${minsLeft}m`;

  return (
    <AlertDialog open>
      <AlertDialogContent className="border-amber-500/40">

        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlarmClock className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Deadline reminder · {current.code}
            </span>
          </div>
          <AlertDialogTitle className="font-display text-left">
            {current.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Assigned to <strong>{current.assignee}</strong> · {current.location}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border bg-muted/40 divide-y text-sm">
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <span className="text-muted-foreground">Deadline</span>
            <span className="font-medium text-right">
              {format(new Date(current.deadline), "EEE, MMM d · HH:mm")}
            </span>
          </div>
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <span className="text-muted-foreground">Time left</span>
            <span className="font-semibold text-right text-amber-600 dark:text-amber-400">
              {timeLeftLabel}
            </span>
          </div>
          <div className="flex justify-between gap-4 px-4 py-2.5">
            <span className="text-muted-foreground">Reminder window</span>
            <span className="font-medium text-right">
              {formatOffset(current.reminderOffsetHours ?? 0)}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => acknowledgeReminder(current.id, actorLabel)}
            className="bg-amber-500 text-white hover:bg-amber-500/90"
          >
            I'll handle it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
