# Supabase Edge Functions

## invite-member

Deploy with:

```bash
supabase functions deploy invite-member
```

Required server-side secrets are managed in the Supabase project, never in Vite/browser environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ORIGIN` (recommended: exact production origin)
- `INVITE_REDIRECT_URL` (for example, the production sign-in route)

The function verifies the caller's JWT, checks that the caller is an active organization admin or HR admin, creates an Auth invitation, provisions an invited organization membership, and appends an audit event.

Current limitation: invitations for an email that already has an Auth account return a conflict. Existing-user linking needs a separate administrator workflow with stronger identity verification.

## attendance-event

Deploy with:

```bash
supabase functions deploy attendance-event
```

This endpoint validates the caller's JWT and active organization membership, checks GPS accuracy and the nearest active organization geofence, and calls a service-role-only SQL function that atomically writes the event and daily attendance summary. The event retains the device capture time and the database-generated server receipt time. GPS coordinates remain spoofable on a compromised device and must not be treated as cryptographic proof of presence.

## task-action

Deploy with:

```bash
supabase functions deploy task-action
```

The endpoint supports task creation and status transitions. It verifies organization membership, limits task creation to organization leadership roles, verifies the assignee belongs to the same organization, and delegates status changes to an atomic SQL function that writes status history and an audit record.
