# Supabase setup

## Required environment variables

Create a local `.env.local` (do not commit it):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_ENABLE_DEMO_DATA=false
```

Keep `VITE_ENABLE_DEMO_DATA=false` for real organizations. Set it to `true` only when intentionally previewing the seeded prototype dataset; demo records are not persisted or isolated as production tenant data.

The publishable/anon key is expected to be present in browser builds. Never put a service-role key in a `VITE_*` variable or browser code.

## Connect and inspect staging before applying migrations

Use a **disposable staging Supabase project**. The project reference in `supabase/config.toml` is only a pointer; do not assume it is staging or safe to modify.

From a terminal on a machine with Node.js installed, check out this branch and run:

```bash
npx supabase --version
npx supabase login
npx supabase link --project-ref YOUR_CONFIRMED_STAGING_PROJECT_REF
npx supabase migration list --remote
```

The Supabase CLI v3 uses explicit `--remote` flags for commands that inspect or change a hosted database. Review the remote migration history before proceeding.

Then open the SQL Editor in that same staging project and run `supabase/validation/preflight_existing_schema.sql`. It is read-only and checks that the legacy `profiles` and `user_roles` tables and required columns exist, then lists current public tables and policies. Resolve any reported mismatch before applying migrations.

After reviewing the preflight results and remote migration history, preview pending migrations:

```bash
npx supabase db push --dry-run --remote
```

Only when the target project is confirmed as staging and the dry-run list is understood, apply migrations with:

```bash
npx supabase db push --remote
```

The CLI asks for confirmation before hosted changes; do not bypass that confirmation with `--yes` until you have independently verified the target and migration list. After applying, run `supabase/validation/verify_backend.sql` in the SQL Editor.

Review the existing migrations and database state before applying. The backend foundation migration adds organization-scoped tables and RLS; the membership RPC exposes only the signed-in user's active organization memberships.

## First organization bootstrap

New sign-ups do not automatically receive an organization or elevated role. This is intentional: a browser user must never be able to create their own organization-admin membership.

For initial development bootstrap, use the Supabase SQL editor as a trusted project administrator. Replace the values with the real auth user UUID and organization details:

```sql
insert into public.organizations (name, slug)
values ('Your Organization', 'your-organization')
returning id;

-- Use the organization UUID returned above and the verified auth.users.id.
insert into public.organization_members (organization_id, user_id, role, status, joined_at)
values ('ORGANIZATION_UUID', 'AUTH_USER_UUID', 'org_admin', 'active', now());
```

For production, replace manual bootstrap with a reviewed server-side invitation/provisioning Edge Function. Do not expose the Supabase service-role key to the client.

## Current boundary

Authentication and active membership lookup are wired in the frontend. Operational writes for attendance and tasks remain intentionally unavailable until trusted Edge Functions validate and record those transitions. Do not treat frontend state or client-supplied GPS/device timestamps as authoritative.


## Verify the staging backend

After linking the CLI to the **confirmed staging project** and applying migrations, run the read-only verification script in the Supabase SQL editor:

- `supabase/validation/verify_backend.sql`

The script checks that all backend tables exist with RLS enabled, required RPCs and the email-confirmation trigger exist, browser roles cannot write organization memberships or invoke privileged write RPCs, and the service role can invoke the attendance write RPC. It raises an exception when a check fails and makes no schema or data changes.

Do not use the project reference in `supabase/config.toml` for a database push until you have confirmed in the Supabase dashboard that it is the intended **staging** project. Never run the initial migration set against production without a reviewed backup and migration plan.
