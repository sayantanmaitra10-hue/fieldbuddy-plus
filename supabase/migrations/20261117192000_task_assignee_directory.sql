create or replace function public.get_organization_assignees(p_organization_id uuid)
returns table (
  user_id uuid,
  display_name text,
  employee_id text,
  member_role text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.user_id,
         coalesce(p.display_name, 'Team member') as display_name,
         p.employee_id,
         m.role
  from public.organization_members m
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = p_organization_id
    and m.status = 'active'
    and public.has_org_role(p_organization_id, array['org_admin','hr_admin','manager','supervisor'])
  order by coalesce(p.display_name, 'Team member');
$$;

revoke all on function public.get_organization_assignees(uuid) from public;
grant execute on function public.get_organization_assignees(uuid) to authenticated;
