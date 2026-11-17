create or replace function public.get_my_tasks(p_organization_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  assigned_to uuid,
  created_by uuid,
  due_at timestamptz,
  priority text,
  status text,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select t.id, t.title, t.description, t.assigned_to, t.created_by,
         t.due_at, t.priority, t.status, t.submitted_at, t.reviewed_by,
         t.reviewed_at, t.created_at, t.updated_at
  from public.tasks t
  where t.organization_id = p_organization_id
    and public.is_org_member(p_organization_id)
    and (
      t.assigned_to = auth.uid()
      or t.created_by = auth.uid()
      or public.has_org_role(p_organization_id, array['org_admin','hr_admin','manager','supervisor'])
    )
  order by t.due_at nulls last, t.created_at desc;
$$;

revoke all on function public.get_my_tasks(uuid) from public;
grant execute on function public.get_my_tasks(uuid) to authenticated;

create or replace function public.apply_task_transition(
  p_organization_id uuid,
  p_task_id uuid,
  p_actor_id uuid,
  p_expected_status text,
  p_next_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  if p_next_status not in ('accepted','in_progress','submitted','approved','rejected','cancelled') then
    raise exception 'INVALID_TASK_STATUS' using errcode = '22023';
  end if;

  update public.tasks
    set status = p_next_status,
        submitted_at = case when p_next_status = 'submitted' then now() else submitted_at end,
        reviewed_by = case when p_next_status in ('approved','rejected') then p_actor_id else reviewed_by end,
        reviewed_at = case when p_next_status in ('approved','rejected') then now() else reviewed_at end,
        updated_at = now()
  where id = p_task_id
    and organization_id = p_organization_id
    and status = p_expected_status
  returning * into v_task;

  if not found then
    raise exception 'TASK_STATE_CONFLICT' using errcode = '40001';
  end if;

  insert into public.task_status_history (
    organization_id, task_id, changed_by, from_status, to_status, note
  ) values (
    p_organization_id, p_task_id, p_actor_id, p_expected_status, p_next_status, p_note
  );

  insert into public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    p_organization_id, p_actor_id, 'task.status_changed', 'task', p_task_id,
    jsonb_build_object('from', p_expected_status, 'to', p_next_status, 'note', p_note)
  );

  return to_jsonb(v_task);
end;
$$;

revoke all on function public.apply_task_transition(uuid, uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_task_transition(uuid, uuid, uuid, text, text, text)
  to service_role;
