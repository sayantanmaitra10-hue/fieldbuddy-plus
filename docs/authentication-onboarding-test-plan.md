# FieldBuddy Plus — Authentication & Employee Onboarding Test Plan

**Target test session:** Saturday, 28 November 2026  
**Environment:** Confirmed Supabase staging project `jrmwkdputphprscfomxc`  
**Purpose:** Verify an invited employee can accept an invitation, set a first password, sign in again, and reach their organization workspace.

This is a manual integration test plan. Passing GitHub CI does not replace these checks.

## Before sending an invitation

- [ ] Confirm the frontend being tested is deployed from the reviewed authentication branch, not the older demo-only `main` frontend.
- [ ] Confirm the frontend build has both `VITE_SUPABASE_PROJECT_ID=jrmwkdputphprscfomxc` and `VITE_SUPABASE_URL=https://jrmwkdputphprscfomxc.supabase.co`; do not use the older `main` branch environment target.
- [ ] Open the deployed app's landing page and `/login` in a clean Incognito window. Both must be publicly reachable without Lovable/editor sign-in or a project-access request. If the browser asks for Lovable project access, fix the hosting/publication access policy or use a public staging host before employee testing; Supabase authentication cannot bypass a website-level access gate.
- [ ] Confirm Supabase Authentication → URL Configuration allows the deployed origin's `/auth/callback` path.
- [ ] Confirm the Edge Function secret `APP_ORIGIN` is the exact deployed app origin.
- [ ] Confirm `INVITE_REDIRECT_URL` points to the same app origin. The current invite function normalizes it to `/auth/callback?flow=invite`.
- [ ] Check Supabase Auth → Email Templates → Invite user. The action link should use Supabase's `{{ .ConfirmationURL }}` (or a correctly constructed `{{ .RedirectTo }}` link), not a hard-coded Site URL that bypasses the redirect parameter.
- [ ] Confirm email delivery is enabled for the test inbox. Supabase's default SMTP service only delivers to addresses that belong to the project's organization team; for an external employee mailbox, configure a custom SMTP provider before testing.
- [ ] Deploy the reviewed `invite-member` function to this staging project after the authentication branch is merged into `feat/backend-foundation`.
- [ ] Use a mailbox that can be opened during the test. Do not reuse an email that already has a Supabase Auth account.

## Test A — Invite a new employee

1. Sign in using the existing Organization Admin account.
2. Open Organization Admin → Invite a team member.
3. Enter a new, accessible email address, a display name, and the Field Employee role.
4. Send the invitation.

**Expected result**
- The app displays an invitation-sent confirmation.
- The team directory shows the new member with status `invited`.
- Supabase Edge Function logs show a successful `invite-member` invocation.
- The invitation email arrives in the employee's inbox.

**If it fails**
- No function invocation: investigate the deployed frontend, function name, and browser network request.
- 401/403: inspect the admin session and the caller's active organization role.
- 409: verify whether the email already exists in Supabase Auth.
- 500 with origin/callback configuration message: inspect `APP_ORIGIN` and `INVITE_REDIRECT_URL`.
- Email not delivered: inspect the Supabase Auth email provider, templates, rate limits, and Auth logs.

## Test B — Accept the invitation and set the first password

1. Open the latest invitation email.
2. Click its action link in the same browser where the app is reachable.
3. Confirm the browser lands on `/auth/callback?flow=invite` (the token/code may also appear in the URL).
4. Confirm the app displays the Set up your password page.
5. Enter a password of at least eight characters and confirm it.

**Expected result**
- The callback establishes a Supabase session.
- The password setup screen shows the invited employee's email.
- Mismatched passwords are rejected before submission.
- A valid password is saved.
- The app routes to the employee workspace, or to Access Pending if organization membership has not activated yet.
- The organization directory changes the employee status from `invited` to `active` after email confirmation.

## Test C — Sign in as the employee

1. Keep the manager session open in the normal browser.
2. Open a separate Incognito window.
3. Navigate to the deployed application origin and open Sign in.
4. Enter the employee email and newly created password.

**Expected result**
- The employee signs in without any Lovable editor login.
- The employee reaches the Field Employee workspace.
- The employee can see only tasks assigned to their organization membership.

## Test D — Password recovery

1. Sign out of the employee session.
2. On the Login page, choose Forgot password.
3. Enter the employee email and request a reset link.
4. Open the latest reset email and follow the link.
5. Confirm the app lands on `/auth/callback?flow=recovery`, then the Choose a new password page.
6. Save a different password.
7. Sign in again with the new password.

**Expected result**
- The recovery link establishes a recovery session.
- The user can save a new password.
- The new password works; the old password no longer does.

## Test E — Failure and session handling

- [ ] Open an expired or previously used invitation link; the app should show an actionable expired-link message and a link to sign in.
- [ ] Refresh the employee workspace; the session should remain valid.
- [ ] Sign out; protected workspace routes should return to Login.
- [ ] Sign in with an account that has no active organization membership; the app should show Access Pending, not a blank page.
- [ ] Confirm no Supabase service-role key or other server secret appears in browser requests or frontend assets.

## Evidence to capture

- [ ] Invitation-sent confirmation and team directory status.
- [ ] Edge Function invocation result for `invite-member`.
- [ ] Invitation email and callback destination (redact token query/hash values).
- [ ] Set-password screen and successful completion.
- [ ] Employee workspace after sign-in.
- [ ] Password-reset completion.
- [ ] Any browser console or Edge Function errors, with tokens and personal data redacted.

## Scope boundary

GitHub CI currently validates dependency installation, TypeScript, the Vite build, unit tests, and Deno type-checking. It does not prove actual email delivery, click-through, password persistence, organization membership activation, or real two-account access. Those remain part of this Saturday's manual integration test.
