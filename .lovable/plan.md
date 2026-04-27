## Fix — Manager → Field employee direct chat entry points

**Problem:** In the current build, managers can only open chats that already exist (task threads + channels seeded in `ChatPage`). There's no affordance to start a 1:1 conversation with a specific field employee, so the manager cannot initiate a chat from the Team page or Employee detail.

### Solution

Add **"Message"** buttons on the Team grid and Employee detail header that deep-link into `ChatPage` and open (or create on the fly) a direct thread with that employee.

### Changes

**`src/pages/ChatPage.tsx`**
- Extend `buildInitialThreads` to seed a **Direct messages** section: one thread per field employee for managers/admins (`id: "dm-{employeeId}"`, kind `"direct"`, title = employee name, subtitle = role, initials from name).
- Add `"direct"` to the `Thread["kind"]` union and render a new **"Direct messages"** group in the sidebar (with a `User` icon header), shown above task threads.
- When `?thread=dm-{employeeId}` is in the URL but not yet in state (e.g. role just switched or first visit), lazily create the thread from `employees` lookup so the deep-link always resolves.
- `defaultAssigneeIdFor` updated: for `direct` threads, return the employee id parsed from the thread id — so converting a chat message to a task auto-assigns to that employee.
- Reuse the existing send / smart-task / offline-sync logic unchanged — direct threads behave like task threads minus the auto-reply.

**`src/pages/Team.tsx`**
- Add a small **"Message"** ghost button (MessageSquare icon) to each employee card, visible only when `role === "manager" | "admin"`. Clicking it `navigate("/app/chat?thread=dm-{e.id}")` and `e.stopPropagation()` so the card link still works for the rest of the card.

**`src/pages/EmployeeDetail.tsx`**
- Add a primary **"Message"** button in the header (next to the name block) for managers/admins, linking to `/app/chat?thread=dm-{id}`.

**`src/components/TaskCard.tsx`** (small bonus, low risk)
- If manager/admin viewing a task assigned to a field user, the existing chat icon already opens the task thread — no change needed. (Mention only so we don't accidentally duplicate.)

### Visual spec
- Team card button: ghost, `size="sm"`, `MessageSquare` icon + "Message" label, placed in the card footer right side or as an icon-only button top-right of the card depending on space (icon-only on mobile, label on desktop).
- Employee detail button: `variant="default"`, gap-1.5, MessageSquare icon, sits in the header row.
- Sidebar "Direct messages" group: same styling as existing "Channels" / "Task threads" headers, `User` lucide icon.

### Out of scope
- Group DM creation / new-chat composer modal — the per-employee deep-link covers the immediate gap.
- Persisting DM history across reloads (stays in-memory like the rest of the prototype).
- Field-role view of DMs to other field employees — only manager→field is unblocked here, matching the reported issue.

### Files touched
- **Edit:** `src/pages/ChatPage.tsx`, `src/pages/Team.tsx`, `src/pages/EmployeeDetail.tsx`
