// Deadline reminder rules
// - Large task  (ETA >= 24h):  48h before deadline
// - Standard    (ETA >= 6h):   12h before deadline
// - Small       (ETA >= 3h):    3h before deadline
// - Tiny        (ETA <  3h):   manager-defined offset (minutes)

export type TaskSize = "large" | "standard" | "small" | "tiny";

export const taskSizeFor = (etaHours: number): TaskSize => {
  if (etaHours >= 24) return "large";
  if (etaHours >= 6) return "standard";
  if (etaHours >= 3) return "small";
  return "tiny";
};

export const defaultReminderOffsetHours = (etaHours: number): number | null => {
  const size = taskSizeFor(etaHours);
  if (size === "large") return 48;
  if (size === "standard") return 12;
  if (size === "small") return 3;
  return null; // tiny → manager chooses
};

// Choices (in hours) offered to the manager when ETA < 3h
export const TINY_REMINDER_CHOICES: { label: string; hours: number }[] = [
  { label: "5 min before", hours: 5 / 60 },
  { label: "15 min before", hours: 15 / 60 },
  { label: "30 min before", hours: 30 / 60 },
  { label: "1 hour before", hours: 1 },
  { label: "2 hours before", hours: 2 },
];

export const reminderTimeFor = (
  deadlineIso: string,
  offsetHours: number,
): string => {
  const dl = new Date(deadlineIso).getTime();
  return new Date(dl - offsetHours * 60 * 60 * 1000).toISOString();
};

export const formatOffset = (hours: number): string => {
  if (hours >= 1) return `${hours}h before deadline`;
  const mins = Math.round(hours * 60);
  return `${mins} min before deadline`;
};
