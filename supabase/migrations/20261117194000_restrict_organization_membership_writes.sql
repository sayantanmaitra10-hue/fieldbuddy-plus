-- Membership provisioning is restricted to trusted server-side workflows.
-- The initial policy allowed an authenticated org admin to insert or promote
-- any member directly, bypassing the invitation and audited provisioning flow.

begin;

drop policy if exists "org admins manage memberships" on public.organization_members;

revoke insert, update, delete, truncate, references, trigger
  on table public.organization_members
  from anon, authenticated;

grant select on table public.organization_members to authenticated;

commit;
