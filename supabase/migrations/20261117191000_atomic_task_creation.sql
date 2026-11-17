create or replace function public.create_task_with_audit(
  p_organization_id uuid,
  p_title text,
  p_description text,
  p_assigned_to uuid,
  p_created_by uuid,
  p_due_at timestamptz,
  p_priority text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  insert into public.tasks (
    organization_id, title, description, assigned_to, created_by, due_at, priority, status
  ) values (
    p_organization_id, p_title, p_description, p_assigned_to, p_created_by, p_due_at,
    coalesce(p_priority, 'normal'), 'assigned'
  )
  returning * into v_task;

  insert into public.task_status_history (
    organization_id, task_id, changed_by, from_status, to_status, note
  ) values (
    p_organization_id, v_task.id, p_created_by, null, 'assigned', 'Task created'
  );

  insert into public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    p_organization_id, p_created_by, 'task.created', 'task', v_task.id,
    jsonb_build_object('assigned_to', p_assigned_to, 'priority', p_priority)
  );

  return to_jsonb(v_task);
end;
$$;

revoke all on function public.create_task_with_audit(uuid, text, text, uuid, uuid, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.create_task_with_audit(uuid, text, text, uuid, uuid, timestamptz, text)
  to service_role;
