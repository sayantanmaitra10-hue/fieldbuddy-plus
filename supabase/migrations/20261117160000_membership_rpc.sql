-- Safe membership bootstrap RPC used by the authenticated client.
create or replace function public.get_my_organization_memberships()
returns table (
  membership_id uuid,
  organization_id uuid,
  organization_name text,
  organization_slug text,
  member_role text,
  member_status text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.id, o.id, o.name, o.slug, m.role, m.status
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and o.is_active = true
  order by o.name;
$$;

revoke all on function public.get_my_organization_memberships() from public;
grant execute on function public.get_my_organization_memberships() to authenticated;
