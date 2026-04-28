## Epic 9 — Loophole audit & fixes

After reviewing the chat → task → workload → reassignment flow end-to-end (and the session where you typed *"can you go and take the stock"* and nothing happened), I found four real loopholes. None are showstoppers individually, but together they make Epic 9 feel inert.

### Loophole 1 — Intent keyword list is too narrow (the one you just hit)

`detectIntent` only matches: `visit, check, deliver, install, call, inspect, collect`. Natural manager phrasings like:
- "go and **take** the stock"
- "**pick up** the package"
- "**drop** the invoice at"
- "**bring** the sample"
- "**meet** the client"
- "**fix** the terminal"
- "**verify** the count"
- "**handover** the keys"
- "**update** the display"
- "**survey** the floor"

…all silently fall through, so the "Convert to task" chip never appears. Result: managers think the feature is broken.

**Fix:** expand `KEYWORDS` in `src/lib/smart-task.ts` to add `pick, pickup, drop, bring, meet, fix, verify, handover, update, survey, take, replace, audit, follow up`. Also match multi-word phrases (`pick up`, `follow up`) via a small phrase-match pass before the single-word regex. Add sensible `defaultHoursFor` entries for the new verbs (e.g. `pick/take/drop = 2h`, `meet = 1h`, `fix/replace = 5h`, `audit/survey = 6h`, `handover = 2h`, `verify/update = 2h`, `bring = 3h`, `follow up = 1h`).

### Loophole 2 — Deadline-extension math is wrong for seeded tasks

In `TasksContext.setDeadline` the "task creation time" is reverse-engineered from the task id:

```ts
const created = Number(t.id.replace(/\D/g, "")) || Date.now();
const baseMs = isFinite(created) && created > 1e12 ? created : Date.now();
```

For seeded tasks (`t1`, `t2`, …) `created = 1`, the `> 1e12` guard fails, and `baseMs` falls back to `Date.now()` — so "newHours" becomes "hours from now until new deadline" instead of "total task duration". A field user pushing `t1` from 5pm today to 5pm tomorrow gets flagged as extended, while pushing it 30 minutes only checks against right-now. Either way it's wrong.

**Fix:** track an explicit `createdAt` ISO on every task. Backfill seed tasks with a creation timestamp ~24h before their deadline (or `Date.now() - defaultHours*1h`, whichever is earlier) and stamp `createdAt: new Date().toISOString()` in `addTask`. Use that field in `setDeadline` instead of parsing the id.

### Loophole 3 — Convert-to-task callout doesn't appear on already-sent messages from field users

The smart-task "Convert" callout only renders when `m.mine && isManager` (ChatPage line 571). That makes sense for things the manager types, but a manager reading an *incoming* field message like "I'll go check the Andheri site at 4pm" gets no affordance — even though that's a prime moment to spin off a follow-up task.

**Fix:** also detect intent on inbound messages when the viewer is a manager. Render the callout under any message (mine or not) where intent is detected and not converted/dismissed. For inbound messages, default the assignee to the message sender (look up by name in `employees`, fall back to current `defaultAssigneeIdFor` logic).

### Loophole 4 — Smart-task UX is invisible until you happen to type a keyword

There's no in-product hint that chat can create tasks. New managers won't discover it.

**Fix (small):** in the chat composer footer, when the input is empty and the user is a manager, show a one-line muted hint: *"Tip: messages with verbs like 'visit', 'deliver', 'pick up' can be turned into tasks."* Hides as soon as they start typing or after first dismiss (persisted in `localStorage`).

### Bonus loophole — Extended-timeline alert dedup

`setDeadline` pushes a new `extended_timeline` alert every time the deadline changes past threshold. Adjusting the deadline twice creates two alerts for the same task.

**Fix:** before pushing, check if an unresolved `extended_timeline` alert already exists for this employee + task title; if so, replace its `time` instead of adding a duplicate.

### Files touched

- **Edit** `src/lib/smart-task.ts` — expand `KEYWORDS`, add phrase matcher, extend `defaultHoursFor`.
- **Edit** `src/lib/mock-data.ts` — add `createdAt` to `Task` interface and backfill seed tasks.
- **Edit** `src/context/TasksContext.tsx` — use `createdAt` in `setDeadline`; stamp it in `addTask`; dedupe extended-timeline alerts.
- **Edit** `src/pages/ChatPage.tsx` — detect intent on inbound messages for managers; render callout for non-mine messages with sender-based default assignee; add empty-state composer tip.

### Out of scope

- Real NLP / AI gateway swap-in (still rule-based per epic plan).
- Persisting chat threads across reloads.
- Auto-resolving extended-timeline alerts when the deadline is later shortened back under threshold.

After approval I'll implement all four fixes in one pass and verify the "take the stock" message now surfaces a Convert chip.