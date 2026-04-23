

## Epic 7 — Offline Sync (interactive mock)

Build a global offline simulation that ties together the Topbar toggle, queues mutations, badges affected items, and animates a sync sweep when the connection returns.

### What you'll see

1. **Global offline state** — a single source of truth so toggling once affects every screen.
2. **Top banner** — slides in when offline, shows queued count, "Retry" button. Slides out and shows a green "Synced" toast when back online.
3. **Pending sync badges** — small amber pill ("Pending sync") on tasks created offline (Tasks list + Task detail) and on proof uploads attached offline.
4. **Queue actions while offline** — punch-in, task create, status change, proof upload, chat message all succeed visually but get tagged `pendingSync: true` and increment the queue counter.
5. **Auto-sync on reconnect** — banner switches to "Syncing… (n)" with a progress sweep, badges fade out one-by-one over ~1.8s, ending with a success toast.

### Technical plan

**New: `src/context/SyncContext.tsx`**
- State: `online: boolean`, `queue: QueueItem[]` (`{id, kind, label, createdAt}`).
- Actions: `setOnline`, `enqueue(item)`, `flush()` (async simulated, removes items progressively), `clearItem(id)`.
- On `setOnline(true)` with queue length > 0 → auto-call `flush()`.
- Wrap app in `<SyncProvider>` inside `src/App.tsx` (above `BrowserRouter`).

**New: `src/components/SyncBanner.tsx`**
- Reads `SyncContext`. Renders a sticky bar under Topbar when `!online` or `syncing`.
- States: `Offline · n queued [Retry]`, `Syncing n items… [progress bar]`, hidden when idle+online.
- Mounted inside `AppShell` so it appears on every `/app/*` route.

**Edit: `src/components/layout/Topbar.tsx`**
- Replace local `online` useState with `useSync()`. Show live queue count in the pill ("Offline · 3 queued"). Remove duplicated state.

**Edit: `src/components/PunchInCard.tsx`**
- If offline at punch time → still show "Checked in" but call `enqueue({kind:'punch', label:'Punch-in @ Bandra W'})` and badge the active-shift card with "Pending sync".

**Edit: `src/pages/TasksPage.tsx`**
- On confirm-assign while offline → mark new task with `pendingSync` flag in local state, enqueue, render amber pill on the card.
- TaskCard gains an optional `pendingSync` prop (small badge top-right).

**Edit: `src/components/TaskCard.tsx`**
- Accept `pendingSync?: boolean`; render "Pending sync" pill (amber, with cloud-off icon) when true.

**Edit: `src/pages/TaskDetail.tsx`**
- Status change / proof upload while offline → enqueue + show inline "Will sync when online" hint near the action.

**Edit: `src/pages/ChatPage.tsx`**
- Messages sent offline get a clock icon instead of the read ticks; on flush, ticks animate in.

**Edit: `src/App.tsx`**
- Wrap `RoleProvider` children with `<SyncProvider>`.

### Visual spec
- Banner: full-width, 36px tall, `bg-warning/10 border-warning/30 text-warning-foreground` when offline; `bg-success/10 border-success/30` while syncing.
- Pending pill: `bg-amber-500/15 text-amber-600 border-amber-500/30`, `CloudOff` icon, 10px text, uppercase tracking.
- Sync sweep: `framer-motion` width animation 0→100% over 1.5s, then banner fades out.

### Files touched
- **New**: `src/context/SyncContext.tsx`, `src/components/SyncBanner.tsx`
- **Edit**: `src/App.tsx`, `src/components/layout/AppShell.tsx`, `src/components/layout/Topbar.tsx`, `src/components/PunchInCard.tsx`, `src/components/TaskCard.tsx`, `src/pages/TasksPage.tsx`, `src/pages/TaskDetail.tsx`, `src/pages/ChatPage.tsx`

### Out of scope
- Real network detection (`navigator.onLine`) — toggle stays manual for demo control. Easy to add later by listening to `online`/`offline` window events inside `SyncProvider`.
- Persistence across reloads (queue is in-memory only, matching the prototype fidelity chosen earlier).

