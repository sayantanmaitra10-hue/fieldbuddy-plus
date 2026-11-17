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

## Apply migrations

Run migrations against a disposable development Supabase project first:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

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
