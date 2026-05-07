export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type Role = "field" | "manager" | "admin";

export interface Task {
  id: string;
  code: string; // human-readable unique task code, e.g., TSK-1042
  title: string;
  description: string;
  assignee: string;
  assigneeId: string;
  deadline: string; // ISO
  status: TaskStatus;
  location: string;
  priority: "low" | "medium" | "high";
  proof?: { type: "photo" | "video"; url: string; timestamp: string; geo: string }[];
  messages: { id: string; from: string; text: string; time: string; media?: string }[];
  source?: "manual" | "chat";
  sourceMessageId?: string;
  sourceThreadId?: string;
  defaultHours?: number;
  extendedTimeline?: boolean;
  createdAt?: string; // ISO — used to compute total task duration when adjusting deadlines
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  checkedIn: boolean;
  checkInTime?: string;
  zone: "valid" | "outside" | "n/a";
  lastActivity: string;
  tasksAssigned: number;
  tasksCompleted: number;
  location: string;
}

export interface Alert {
  id: string;
  type: "no_checkin" | "overdue" | "inactivity" | "outside_zone" | "extended_timeline";
  severity: "high" | "medium" | "low";
  employee: string;
  message: string;
  time: string;
}

export const employees: Employee[] = [
  { id: "e1", name: "Arjun Mehta", role: "Field Executive", avatar: "AM", checkedIn: true, checkInTime: "08:42", zone: "valid", lastActivity: "2 min ago", tasksAssigned: 6, tasksCompleted: 4, location: "Bandra West, Mumbai" },
  { id: "e2", name: "Priya Sharma", role: "Field Executive", avatar: "PS", checkedIn: true, checkInTime: "09:05", zone: "valid", lastActivity: "12 min ago", tasksAssigned: 5, tasksCompleted: 3, location: "Andheri East, Mumbai" },
  { id: "e3", name: "Rahul Verma", role: "Senior Field", avatar: "RV", checkedIn: true, checkInTime: "08:30", zone: "outside", lastActivity: "5 min ago", tasksAssigned: 8, tasksCompleted: 5, location: "Powai, Mumbai" },
  { id: "e4", name: "Sneha Iyer", role: "Field Executive", avatar: "SI", checkedIn: false, zone: "n/a", lastActivity: "Yesterday 18:30", tasksAssigned: 4, tasksCompleted: 0, location: "Thane West" },
  { id: "e5", name: "Karan Patel", role: "Field Executive", avatar: "KP", checkedIn: true, checkInTime: "09:18", zone: "valid", lastActivity: "Just now", tasksAssigned: 7, tasksCompleted: 6, location: "Lower Parel, Mumbai" },
  { id: "e6", name: "Divya Nair", role: "Field Executive", avatar: "DN", checkedIn: true, checkInTime: "08:55", zone: "valid", lastActivity: "20 min ago", tasksAssigned: 5, tasksCompleted: 2, location: "Goregaon, Mumbai" },
];

// Helper: createdAt = deadline - 24h, so initial duration = 24h for all seeds.
const seedCreatedAt = (deadlineIso: string) =>
  new Date(new Date(deadlineIso).getTime() - 24 * 60 * 60 * 1000).toISOString();

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Site survey — Bandra retail outlet",
    description: "Complete dimensional survey of new retail floor. Capture wall measurements, electrical points, and HVAC layout.",
    assignee: "Arjun Mehta", assigneeId: "e1",
    deadline: "2026-04-22T17:00:00",
    createdAt: seedCreatedAt("2026-04-22T17:00:00"),
    status: "in_progress",
    location: "Linking Road, Bandra W",
    priority: "high",
    proof: [],
    messages: [
      { id: "m1", from: "Manager", text: "Please prioritise the HVAC section first.", time: "09:12" },
      { id: "m2", from: "You", text: "On it. Will share photos by noon.", time: "09:14" },
    ],
  },
  {
    id: "t2",
    title: "Equipment installation — Andheri",
    description: "Install POS terminals at counter 3 & 4. Verify network handshake.",
    assignee: "Arjun Mehta", assigneeId: "e1",
    deadline: "2026-04-22T14:00:00",
    createdAt: seedCreatedAt("2026-04-22T14:00:00"),
    status: "pending",
    location: "Infinity Mall, Andheri W",
    priority: "medium",
    proof: [],
    messages: [],
  },
  {
    id: "t3",
    title: "Client handover — Powai office",
    description: "Walk client through deployed setup. Capture sign-off photo.",
    assignee: "Arjun Mehta", assigneeId: "e1",
    deadline: "2026-04-21T18:00:00",
    createdAt: seedCreatedAt("2026-04-21T18:00:00"),
    status: "completed",
    location: "Hiranandani Gardens",
    priority: "high",
    proof: [{ type: "photo", url: "", timestamp: "2026-04-21 17:45", geo: "19.1197° N, 72.9051° E" }],
    messages: [
      { id: "m1", from: "You", text: "Handover complete, signed receipt attached.", time: "17:46" },
    ],
  },
  {
    id: "t4",
    title: "Inventory audit — Lower Parel",
    description: "Spot-count items against system. Flag mismatches.",
    assignee: "Karan Patel", assigneeId: "e5",
    deadline: "2026-04-22T16:00:00",
    createdAt: seedCreatedAt("2026-04-22T16:00:00"),
    status: "in_progress",
    location: "Phoenix Mills",
    priority: "medium",
    proof: [],
    messages: [],
  },
  {
    id: "t5",
    title: "Maintenance check — Goregaon",
    description: "Quarterly preventive maintenance on rooftop unit.",
    assignee: "Arjun Mehta", assigneeId: "e1",
    deadline: "2026-04-22T12:00:00",
    createdAt: seedCreatedAt("2026-04-22T12:00:00"),
    status: "pending",
    location: "Oberoi Mall",
    priority: "low",
    proof: [],
    messages: [],
  },
];

export const alerts: Alert[] = [
  { id: "a1", type: "no_checkin", severity: "high", employee: "Sneha Iyer", message: "No check-in 47 min after shift start (09:00)", time: "2 min ago" },
  { id: "a2", type: "outside_zone", severity: "medium", employee: "Rahul Verma", message: "Punched in 1.2 km outside assigned geo-fence", time: "18 min ago" },
  { id: "a3", type: "overdue", severity: "high", employee: "Divya Nair", message: "Task 'Vendor pickup — Goregaon' is 2h overdue", time: "1 hr ago" },
  { id: "a4", type: "inactivity", severity: "low", employee: "Priya Sharma", message: "No activity logged in last 90 minutes", time: "1 hr ago" },
];

export const activitySeries = [
  { hour: "08", checkins: 12, completions: 0 },
  { hour: "09", checkins: 28, completions: 3 },
  { hour: "10", checkins: 34, completions: 8 },
  { hour: "11", checkins: 36, completions: 14 },
  { hour: "12", checkins: 36, completions: 19 },
  { hour: "13", checkins: 36, completions: 22 },
  { hour: "14", checkins: 36, completions: 28 },
  { hour: "15", checkins: 35, completions: 33 },
];
