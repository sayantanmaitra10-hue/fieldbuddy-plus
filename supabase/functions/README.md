# Supabase Edge Functions

The three functions below are part of the FieldBuddy staging backend. They must be deployed to the confirmed staging Supabase project before the real-user integration test.

## Deploy through GitHub Actions (recommended)

No local Node.js, Deno, npm, or Supabase CLI installation is needed.

1. Create a Supabase personal access token with access to the confirmed staging project.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**.
3. Add the secret named `SUPABASE_ACCESS_TOKEN`. Paste the token as the value. Never put it in source code, a workflow input, chat, or a log.
4. Keep the existing `SUPABASE_DB_URL` Actions secret pointed to the same confirmed staging project. The workflow checks that its connection URI contains the supplied staging project reference.
5. Open **Actions → Deploy Supabase staging Edge Functions → Run workflow**.
6. Use branch `main`, project reference `jrmwkdputphprscfomxc`, and type `DEPLOY_EDGE_FUNCTIONS_TO_STAGING` in the confirmation field.

The workflow checks that the project reference matches the fixed staging project, the Supabase config, and the database URI before deploying only these named functions:

- `invite-member`
- `attendance-event`
- `task-action`

It does not apply migrations or write application data. It uses the unmerged `feat/backend-foundation` source branch intentionally; the code is still under review and is being deployed only to staging.

## Runtime configuration

Supabase provides project-level runtime variables including `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions. The code currently reads the legacy single-key variables. Supabase's current docs also expose `SUPABASE_PUBLISHABLE_KEYS` and `SUPABASE_SECRET_KEYS`; migrating the functions to the newer key format should be done as a separately tested hardening task.

Custom settings used by the functions:

- `APP_ORIGIN`: the exact web-app origin. Set this in Supabase **Edge Functions → Secrets** before opening the app to browser clients. Current source falls back to `*` when unset, which is acceptable only for an isolated staging test and must be replaced with a specific origin before production.
- `INVITE_REDIRECT_URL`: the exact sign-in/accept-invitation URL for the deployed app. Configure it before testing invitation emails so users return to the correct app route.

Never add a service-role or secret API key to any `VITE_*` variable or frontend bundle.

## Function responsibilities

### invite-member

The function verifies the caller's JWT, checks that the caller is an active organization admin or HR admin, creates an Auth invitation, provisions an invited organization membership, and appends an audit event.

Known limitation: invitations for an email that already has an Auth account currently return a conflict. Existing-user linking needs a separately reviewed administrator workflow with stronger identity verification.

### attendance-event

The function validates the caller's JWT and active organization membership, checks GPS accuracy and the nearest active organization geofence, and calls a service-role-only SQL function that atomically writes the event and daily attendance summary. The event retains the device capture time and database-generated server receipt time. GPS coordinates remain spoofable on a compromised device and must not be treated as cryptographic proof of presence.

### task-action

The function supports task creation and status transitions. It verifies organization membership, limits task creation to organization leadership roles, verifies the assignee belongs to the same organization, and delegates status changes to atomic SQL functions that write status history and an audit record.
