create or replace function public.get_organization_dashboard(p_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_today date;
  v_active_members integer;
  v_checked_in integer;
  v_open_tasks integer;
  v_in_progress integer;
  v_review integer;
  v_approved integer;
  v_recent_tasks jsonb;
begin
  if not public.has_org_role(
    p_organization_id,
    array['org_admin','hr_admin','manager','supervisor']
  ) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select (timezone(coalesce(o.timezone, 'Asia/Kolkata'), now()))::date
    into v_today
  from public.organizations o
  where o.id = p_organization_id and o.is_active = true;

  if v_today is null then
    raise exception 'ORGANIZATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select count(*) into v_active_members
  from public.organization_members m
  where m.organization_id = p_organization_id and m.status = 'active';

  select count(*) into v_checked_in
  from public.attendance_records a
  where a.organization_id = p_organization_id
    and a.work_date = v_today
    and a.first_check_in_at is not null
    and a.status <> 'rejected';

  select count(*) into v_open_tasks
  from public.tasks t
  where t.organization_id = p_organization_id
    and t.status in ('assigned','accepted','in_progress','rejected');

  select count(*) into v_in_progress
  from public.tasks t
  where t.organization_id = p_organization_id and t.status = 'in_progress';

  select count(*) into v_review
  from public.tasks t
  where t.organization_id = p_organization_id and t.status = 'submitted';

  select count(*) into v_approved
  from public.tasks t
  where t.organization_id = p_organization_id and t.status = 'approved';

  select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb)
    into v_recent_tasks
  from (
    select t.id, t.title, t.status, t.priority, t.due_at, t.created_at,
           coalesce(p.display_name, 'Team member') as assignee_name
    from public.tasks t
    left join public.profiles p on p.id = t.assigned_to
    where t.organization_id = p_organization_id
    order by t.created_at desc
    limit 8
  ) recent;

  return jsonb_build_object(
    'active_members', v_active_members,
    'checked_in_today', v_checked_in,
    'open_tasks', v_open_tasks,
    'tasks_in_progress', v_in_progress,
    'awaiting_review', v_review,
    'tasks_approved', v_approved,
    'recent_tasks', v_recent_tasks,
    'work_date', v_today
  );
end;
$$;

revoke all on function public.get_organization_dashboard(uuid) from public;
grant execute on function public.get_organization_dashboard(uuid) to authenticated;
