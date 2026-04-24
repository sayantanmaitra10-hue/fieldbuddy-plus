

## Epic 9 — Smart Task Creation from Chat (rule-based, interactive mock)

Layer intent detection, auto-task creation, workload-aware scheduling, and reassignment on top of the existing chat + tasks + alerts surfaces. All rule-based for the MVP — no AI calls — so it stays a self-contained interactive prototype consistent with prior epics.

### What you'll see end-to-end

1. **Manager types in chat** → as keywords appear, an inline "✨ Convert to Task" suggestion chip slides in above the input (Story 9.7).
2. **Manager sends an actionable message** → a callout bubble attaches under the message: *"This looks like a task. Convert?"* with **Convert** / **Dismiss** (Story 9.1).
3. **Convert opens a Task Preview drawer** with prefilled title (cleaned message), assignee (chat recipient or channel-picker), priority, and a **smart deadline** chosen by keyword (Stories 9.2 + 9.7).
4. **Task is created instantly** → appears on Tasks page with a new **"From chat"** badge, and a system message lands back in the thread: *"📋 Task created → Site visit at Andheri · due 6h"* with a deep-link.
5. **Field user opens the new task** → header shows *Suggested timeline · 6h* + *You have 3 pending tasks* meter; if pending > 1, **"Adjust deadline"** is enabled (Story 9.3).
6. **Field user extends deadline > 150% of default** → task gets an **"Extended Timeline"** pill, and a new alert fires on the Alerts page + manager toast (Story 9.4).
7. **Manager opens an Extended task** → a **"Reassign to faster teammate"** panel lists field users sorted by workload score, with Low/Med/High pills and ETA. Selecting one reassigns + posts a system message in the thread (Story 9.5).
8. **Team page** picks up workload pills (Low/Med/High) on every employee card (Story 9.6).

### Rule definitions (centralised in one file)

**`src/lib/smart-task.ts`** — pure functions, fully unit-testable:
- `KEYWORDS = ["visit","check","deliver","install","call","inspect","collect"]`
- `detectIntent(text)` → `{ isTask: boolean, keyword?: string, cleanedTitle: string }` (strips leading "please", "can you", trailing punctuation, capitalises).
- `defaultHoursFor(keyword)`:
  - `call` → 1h, `check`/`inspect` → 3h, `visit` → 6h, `collect` → 4h, `deliver` → 8h, `install` → 8h, fallback → 4h.
- `EXTENDED_THRESHOLD = 1.5` and `isExtended(actualHours, defaultHours)`.
- `workloadScore(employee, tasks)` = `pendingCount + sum(urgencyWeight(deadline))` where urgency is 3 if <2h, 2 if <8h, 1 otherwise.
- `workloadBand(score)` → `"low" | "medium" | "high"` (≤3 / ≤7 / >7).
- `suggestAlternates(currentAssigneeId, employees, tasks)` → sorted ascending by score, excluding current.

### Files touched

**New**
- `src/lib/smart-task.ts` — rules + scoring engine described above.
- `src/components/SmartTaskSuggestion.tsx` — inline chip rendered above the chat input + convert callout under detected messages.
- `src/components/SmartTaskPreviewDialog.tsx` — review drawer (title / assignee / deadline / priority / source-message reference) reusing existing `Dialog` + `Calendar` primitives. Saves into a new shared store.
- `src/context/TasksContext.tsx` — promote the currently-local Tasks state into a provider so Chat → Tasks → TaskDetail share one source. Exposes `addTask`, `updateTask`, `reassignTask`, `tasks`, plus selectors `pendingFor(employeeId)` and `workloadFor(employeeId)`.
- `src/components/WorkloadPill.tsx` — Low/Med/High pill (green / amber / red tokens already in theme).
- `src/components/ExtendedTimelineBanner.tsx` — used in TaskDetail when flagged.

**Edit**
- `src/App.tsx` — wrap with `<TasksProvider>` (inside `SyncProvider`).
- `src/pages/ChatPage.tsx`
  - On `draft` change → run `detectIntent`; if matched + role is `manager`/`admin`, show inline suggestion chip above the input.
  - On `send` of an actionable message → push the message *and* a follow-up "convert?" affordance attached to that message id.
  - "Convert" opens `SmartTaskPreviewDialog` prefilled (assignee = chat counterpart for task threads, or first channel member for channels).
  - On confirm → `tasksContext.addTask({ source: "chat", sourceMessageId, sourceThreadId })` and append a system message with deep-link to `/app/tasks/{id}`.
- `src/pages/TasksPage.tsx`
  - Read tasks from `TasksContext` instead of `useState(seedTasks)`.
  - TaskCard receives `fromChat` + `extendedTimeline` flags from new task fields.
- `src/components/TaskCard.tsx`
  - Add small **"From chat"** badge (left of pending-sync) and **"Extended"** badge (amber, AlertTriangle icon) when relevant.
- `src/pages/TaskDetail.tsx`
  - Read/write via `TasksContext` so deadline edits persist across pages.
  - Field-role header card: *Suggested · Xh · You have N pending tasks today*. Show **"Adjust deadline"** button (disabled when pendingCount ≤ 1).
  - Deadline editor (Popover with Calendar + time input) — on save, recompute `isExtended`; if true → set `task.extendedTimeline = true`, push an `Alert` (managerial) and a manager toast.
  - Manager-role view, when `extendedTimeline === true`: render a **"Reassign for faster turnaround"** panel listing top-3 alternates from `suggestAlternates` with workload pill + pending-count + estimated availability ("free in ~Xh"). "Reassign" updates context and posts a system message in the linked thread (if any).
- `src/pages/Team.tsx` — add `WorkloadPill` next to each employee using `workloadFor(e.id)`.
- `src/pages/Alerts.tsx` — render new `extended_timeline` alerts emitted by the engine. Add the type to `Alert` union in `mock-data.ts`.
- `src/lib/mock-data.ts`
  - Extend `Task` with `source?: "manual" | "chat"`, `sourceMessageId?`, `sourceThreadId?`, `defaultHours?: number`, `extendedTimeline?: boolean`.
  - Extend `Alert['type']` with `"extended_timeline"`.

### Visual spec
- Suggestion chip: pill above input, `bg-primary/10 text-primary border-primary/30`, sparkles icon, slide-in via existing tailwind `animate-in`.
- Convert callout under message: subtle inset card with two ghost buttons.
- "From chat" badge: violet (`bg-accent/15 text-accent-foreground`), MessageSquare icon, 9px uppercase.
- "Extended" badge: amber, AlertTriangle icon, matches existing pending-sync language.
- Workload pill: `low`=success, `medium`=warning, `high`=destructive, all at 15% bg, dot indicator.
- Reassign panel: rows with avatar + name + workload pill + pending count + "Reassign" button on the right.

### Out of scope (deferred upgrades)
- True NLP — keyword matcher only; structure leaves room to swap `detectIntent` with an AI gateway call later.
- Server-side persistence — context is in-memory like the rest of the prototype.
- Multi-task batch creation from a single message.
- Auto-rebalance daemon — reassignment stays manager-initiated.

