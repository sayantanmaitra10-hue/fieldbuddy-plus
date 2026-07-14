import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { useTasks } from "@/context/TasksContext";
import { useRole } from "@/context/RoleContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlarmClock, CheckCircle2, Eye, Search } from "lucide-react";

type AuditRow = {
  taskId: string;
  taskCode: string;
  taskTitle: string;
  assignee: string;
  eventId: string;
  type: "shown" | "acknowledged";
  at: string;
  actor?: string;
  reminderAt?: string;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All events" },
  { value: "shown", label: "Shown only" },
  { value: "acknowledged", label: "Acknowledged only" },
] as const;

export default function RemindersAudit() {
  const { role } = useRole();
  const { tasks } = useTasks();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  if (role === "field") {
    return <Navigate to="/app/tasks" replace />;
  }

  const allRows = useMemo<AuditRow[]>(() => {
    const rows: AuditRow[] = [];
    for (const t of tasks) {
      if (!t.reminderLog || t.reminderLog.length === 0) continue;
      for (const entry of t.reminderLog) {
        rows.push({
          taskId: t.id,
          taskCode: t.code,
          taskTitle: t.title,
          assignee: t.assignee,
          eventId: entry.id,
          type: entry.type,
          at: entry.at,
          actor: entry.actor,
          reminderAt: entry.reminderAt,
        });
      }
    }
    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [tasks]);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) set.add(r.assignee);
    return Array.from(set).sort();
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      const matchesQuery =
        !q ||
        r.taskCode.toLowerCase().includes(q) ||
        r.taskTitle.toLowerCase().includes(q) ||
        r.taskId.toLowerCase().includes(q) ||
        r.assignee.toLowerCase().includes(q) ||
        r.actor.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.type === statusFilter;
      const matchesAssignee = assigneeFilter === "all" || r.assignee === assigneeFilter;
      return matchesQuery && matchesStatus && matchesAssignee;
    });
  }, [allRows, query, statusFilter, assigneeFilter]);

  const formatDt = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const shownCount = allRows.filter((r) => r.type === "shown").length;
  const ackCount = allRows.filter((r) => r.type === "acknowledged").length;

  return (
    <>
      <Topbar
        title="Reminder Audit Trail"
        subtitle={`${shownCount} shown · ${ackCount} acknowledged across ${tasks.length} tasks`}
      />
      <div className="p-4 lg:p-8 max-w-6xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by task ID, code, or title..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No reminder audit events match your filters.
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Task</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Scheduled Reminder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.eventId}>
                    <TableCell>
                      <Link
                        to={`/app/tasks/${row.taskId}`}
                        className="font-medium text-primary hover:underline block"
                      >
                        {row.taskCode}
                      </Link>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {row.taskTitle}
                      </span>
                    </TableCell>
                    <TableCell>{row.assignee}</TableCell>
                    <TableCell>
                      {row.type === "shown" ? (
                        <Badge variant="secondary" className="gap-1">
                          <Eye className="size-3" /> Shown
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="size-3" /> Acknowledged
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDt(row.at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {row.actor ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      <div className="flex items-center gap-1">
                        <AlarmClock className="size-3" />
                        {formatDt(row.reminderAt)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
