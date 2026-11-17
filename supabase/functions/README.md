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
