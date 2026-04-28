import type { Employee, Task } from "./mock-data";

export const KEYWORDS = [
  "visit",
  "check",
  "deliver",
  "install",
  "call",
  "inspect",
  "collect",
  "pick",
  "pickup",
  "drop",
  "bring",
  "meet",
  "fix",
  "verify",
  "handover",
  "update",
  "survey",
  "take",
  "replace",
  "audit",
  "follow up",
  "follow-up",
] as const;

export type SmartKeyword = (typeof KEYWORDS)[number];

// Multi-word phrases checked before single-word matches
const PHRASES: SmartKeyword[] = ["follow up", "follow-up", "pickup"];

export const EXTENDED_THRESHOLD = 1.5;

export type IntentResult = {
  isTask: boolean;
  keyword?: SmartKeyword;
  cleanedTitle: string;
};

const LEADING_FILLERS = [
  /^please\s+/i,
  /^pls\s+/i,
  /^kindly\s+/i,
  /^can you\s+/i,
  /^could you\s+/i,
  /^hey[, ]+/i,
  /^hi[, ]+/i,
];

const stripLeading = (text: string) => {
  let out = text.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of LEADING_FILLERS) {
      if (re.test(out)) {
        out = out.replace(re, "");
        changed = true;
      }
    }
  }
  return out;
};

const capitalise = (s: string) =>
  s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;

export function detectIntent(text: string): IntentResult {
  const trimmed = text.trim();
  if (!trimmed) return { isTask: false, cleanedTitle: "" };
  const lower = trimmed.toLowerCase();
  const cleaned = capitalise(stripLeading(trimmed).replace(/[.!?]+$/g, ""));
  // Phrase pass first (multi-word wins over a substring single-word)
  const phrase = PHRASES.find((p) =>
    new RegExp(`\\b${p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(lower),
  );
  if (phrase) return { isTask: true, keyword: phrase, cleanedTitle: cleaned };
  const matched = KEYWORDS.find(
    (k) => !PHRASES.includes(k) && new RegExp(`\\b${k}\\b`, "i").test(lower),
  );
  if (!matched) return { isTask: false, cleanedTitle: cleaned };
  return { isTask: true, keyword: matched, cleanedTitle: cleaned };
}

export function defaultHoursFor(keyword?: SmartKeyword | string): number {
  switch (keyword) {
    case "call":
    case "meet":
    case "follow up":
    case "follow-up":
      return 1;
    case "pick":
    case "pickup":
    case "take":
    case "drop":
    case "handover":
    case "verify":
    case "update":
      return 2;
    case "check":
    case "inspect":
    case "bring":
      return 3;
    case "collect":
      return 4;
    case "fix":
    case "replace":
      return 5;
    case "visit":
    case "audit":
    case "survey":
      return 6;
    case "deliver":
    case "install":
      return 8;
    default:
      return 4;
  }
}

export function isExtended(actualHours: number, defaultHours: number): boolean {
  if (defaultHours <= 0) return false;
  return actualHours / defaultHours > EXTENDED_THRESHOLD;
}

export function hoursUntil(deadlineIso: string, fromMs = Date.now()): number {
  const dl = new Date(deadlineIso).getTime();
  return (dl - fromMs) / (1000 * 60 * 60);
}

const urgencyWeight = (hoursLeft: number): number => {
  if (hoursLeft < 2) return 3;
  if (hoursLeft < 8) return 2;
  return 1;
};

export function pendingTasksFor(employeeId: string, tasks: Task[]): Task[] {
  return tasks.filter(
    (t) =>
      t.assigneeId === employeeId &&
      (t.status === "pending" || t.status === "in_progress"),
  );
}

export function workloadScore(employeeId: string, tasks: Task[]): number {
  const pending = pendingTasksFor(employeeId, tasks);
  const urgency = pending.reduce(
    (acc, t) => acc + urgencyWeight(hoursUntil(t.deadline)),
    0,
  );
  return pending.length + urgency;
}

export type WorkloadBand = "low" | "medium" | "high";

export function workloadBand(score: number): WorkloadBand {
  if (score <= 3) return "low";
  if (score <= 7) return "medium";
  return "high";
}

export type Alternate = {
  employee: Employee;
  score: number;
  band: WorkloadBand;
  pendingCount: number;
  etaHours: number;
};

export function suggestAlternates(
  currentAssigneeId: string,
  employees: Employee[],
  tasks: Task[],
  limit = 3,
): Alternate[] {
  return employees
    .filter((e) => e.id !== currentAssigneeId)
    .map((e) => {
      const pending = pendingTasksFor(e.id, tasks);
      const score = workloadScore(e.id, tasks);
      const etaHours = Math.max(1, pending.length * 1.5);
      return {
        employee: e,
        score,
        band: workloadBand(score),
        pendingCount: pending.length,
        etaHours,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
