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

For this repository, the recommended path is GitHub Actions. You do not need Node.js, npm, or the Supabase CLI installed on your laptop. Follow **No local Node.js: run staging preflight in GitHub Actions** below. That workflow connects directly to Postgres by using a database URI, so it does not require `supabase login`, `supabase link`, or a Supabase Personal Access Token.

The current read-only preflight against staging project `jrmwkdputphprscfomxc` completed successfully on 17 November 2026. The dry run listed 16 pending migrations and applied none. The first four migrations create the initial `app_role`, `profiles`, and `user_roles` objects; the later migrations add the multi-tenant organization, attendance, task, audit, RPC, and security layers. Before any migration push, run `supabase/validation/preflight_existing_schema.sql` in the staging SQL Editor. It verifies that the target does not already contain application tables, the `app_role` type, or a conflicting signup trigger.

For a developer workstation with the Supabase CLI already installed, CLI v3 can inspect migration history and preview migrations using the same direct database URI without `supabase link`:

```bash
supabase migration list --db-url "$SUPABASE_DB_URL"
supabase db push --dry-run --db-url "$SUPABASE_DB_URL"
```

The `--dry-run` command previews pending migrations but applies nothing. Do not run a hosted `db push` until the target is confirmed as staging, the migration history is understood, and an appropriate backup exists. After migrations are applied through an explicitly reviewed deployment step, run `supabase/validation/verify_backend.sql` in the SQL Editor.

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

After applying migrations to the **confirmed staging project**, run the read-only verification script in the Supabase SQL editor:

- `supabase/validation/verify_backend.sql`

The script checks that all backend tables exist with RLS enabled, required RPCs and the email-confirmation trigger exist, browser roles cannot write organization memberships or invoke privileged write RPCs, and the service role can invoke the attendance write RPC. It raises an exception when a check fails and makes no schema or data changes.

Do not use the project reference in `supabase/config.toml` for a database push until you have confirmed in the Supabase dashboard that it is the intended **staging** project. Never run the initial migration set against production without a reviewed backup and migration plan.


## No local Node.js: run staging preflight in GitHub Actions

You do not need Node.js, npm, the Supabase CLI, or a Supabase Personal Access Token on your laptop. A manual read-only workflow is available in the repository's default branch at `.github/workflows/supabase-staging-preflight.yml`. It runs the Supabase CLI on a GitHub-hosted runner and connects directly to Postgres using a database URI. It does **not** call `supabase link` or the Supabase Management API.

### Set the database URI secret

In the Supabase Dashboard, open the confirmed staging project and click **Connect** at the top of the page. Select **Session pooler** and copy its PostgreSQL URI (port 5432). Replace `[YOUR-PASSWORD]` with the staging database password. Percent-encode reserved characters in the password (for example `&`, `#`, `?`, or spaces).

Add the complete URI as the GitHub repository Actions secret named `SUPABASE_DB_URL` under **Settings → Secrets and variables → Actions**. Treat this URI as a password; never put it in chat, source files, or workflow logs.

### Run the preflight

Open **Actions → Supabase staging preflight → Run workflow**, enter the staging project's 20-character project reference, and run it. The workflow verifies that the URI includes that project reference, lists migration history, runs `db push --dry-run`, and reads the required legacy columns and existing public RLS policies.

The workflow is entirely read-only: it does not apply migrations, change schema/data, or deploy Edge Functions. The earlier `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` secrets are not used by this direct-connection workflow and may be removed after the new one works.
