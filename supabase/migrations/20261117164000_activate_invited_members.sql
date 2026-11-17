-- Activate organization memberships only after an invited user confirms their email.
create or replace function public.activate_invited_organization_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.organization_members
      set status = 'active',
          joined_at = coalesce(joined_at, now()),
          updated_at = now()
    where user_id = new.id
      and status = 'invited';
  end if;
  return new;
end;
$$;

revoke all on function public.activate_invited_organization_memberships() from public, anon, authenticated;

drop trigger if exists on_auth_user_confirmed_activate_memberships on auth.users;
create trigger on_auth_user_confirmed_activate_memberships
  after update of email_confirmed_at on auth.users
  for each row
  execute function public.activate_invited_organization_memberships();

-- Return a deliberately limited directory, never personal phone/contact fields.
create or replace function public.get_organization_directory(p_organization_id uuid)
returns table (
  user_id uuid,
  display_name text,
  employee_id text,
  avatar_url text,
  member_role text,
  member_status text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.user_id,
         coalesce(p.display_name, 'Team member') as display_name,
         p.employee_id,
         p.avatar_url,
         m.role,
         m.status,
         m.joined_at
  from public.organization_members m
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = p_organization_id
    and public.has_org_role(p_organization_id, array['org_admin','hr_admin'])
  order by coalesce(p.display_name, 'Team member');
$$;

revoke all on function public.get_organization_directory(uuid) from public;
grant execute on function public.get_organization_directory(uuid) to authenticated;
