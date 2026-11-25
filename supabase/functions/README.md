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

It does not apply database migrations or write application data. It uses the unmerged `feat/backend-foundation` source branch intentionally; the code is still under review and is being deployed only to staging.

## Runtime configuration

Supabase provides project-level runtime variables including `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions.

Custom settings used by the functions:

- `APP_ORIGIN`: the exact HTTPS origin of the deployed web application, without a path (for example, `https://fieldbuddy.example`). The invitation function uses this value for a strict CORS origin check.
- `INVITE_REDIRECT_URL`: the deployed web-app base URL. The function normalizes this value to `/auth/callback?flow=invite`, so the existing base URL secret can be retained. The final callback URL must be included in Supabase Authentication → URL Configuration → Redirect URLs.

Never add a service-role or secret API key to any `VITE_*` variable or frontend bundle.

## Authentication and onboarding

The web application exposes:

- `/auth/callback`: completes the Supabase redirect and routes invitations and recovery links to password setup.
- `/set-password?flow=invite`: lets an invited employee establish their first password.
- `/set-password?flow=recovery`: lets an existing employee choose a replacement password.
- `/login`: provides sign-in, account creation, and a password-reset email request.

Supabase redirects return a session in the URL fragment or exchange a PKCE code. The Supabase JavaScript client processes the callback URL; the callback page waits for session restoration before routing the user.

For invitation and password recovery, add the deployed callback URL (or an appropriate path wildcard) to the Supabase redirect allow list. Do not send invitation emails until the deployed frontend includes these routes.

## Function responsibilities

### invite-member

The function verifies the caller's JWT, checks that the caller is an active organization admin or HR admin, validates the application origin and invitation callback configuration, creates an Auth invitation, provisions an invited organization membership, and appends an audit event.

Invitations for an email that already belongs to an Auth account currently return a conflict. Existing-user linking needs a separately reviewed administrator workflow with stronger identity verification.

### attendance-event

The function validates the caller's JWT and active organization membership, checks GPS accuracy and the nearest active organization geofence, and calls a service-role-only SQL function that atomically writes the event and daily attendance summary. The event retains the device capture time and database-generated server receipt time. GPS coordinates remain spoofable on a compromised device and must not be treated as cryptographic proof of presence.

### task-action

The function supports task creation and status transitions. It verifies organization membership, limits task creation to organization leadership roles, verifies the assignee belongs to the same organization, and delegates status changes to atomic SQL functions that write status history and an audit record.
