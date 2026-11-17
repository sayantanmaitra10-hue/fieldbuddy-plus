-- Atomic, idempotent attendance write. Called only by the trusted Edge Function.
create or replace function public.record_attendance_event(
  p_organization_id uuid,
  p_employee_id uuid,
  p_event_type text,
  p_captured_at timestamptz,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_geofence_id uuid,
  p_device_id text,
  p_idempotency_key text,
  p_validation_status text,
  p_validation_details jsonb,
  p_work_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_attendance_id uuid;
  v_duplicate boolean := false;
  v_event jsonb;
begin
  insert into public.attendance_events (
    organization_id, employee_id, event_type, captured_at,
    latitude, longitude, accuracy_meters, geofence_id, device_id,
    idempotency_key, validation_status, validation_details
  ) values (
    p_organization_id, p_employee_id, p_event_type, p_captured_at,
    p_latitude, p_longitude, p_accuracy_meters, p_geofence_id, p_device_id,
    p_idempotency_key, p_validation_status, coalesce(p_validation_details, '{}'::jsonb)
  )
  on conflict (organization_id, employee_id, idempotency_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    v_duplicate := true;
    select id, attendance_record_id into v_event_id, v_attendance_id
    from public.attendance_events
    where organization_id = p_organization_id
      and employee_id = p_employee_id
      and idempotency_key = p_idempotency_key;
  elsif p_validation_status = 'accepted' and p_work_date is not null then
    insert into public.attendance_records (
      organization_id, employee_id, work_date,
      first_check_in_at, last_check_out_at, status
    ) values (
      p_organization_id, p_employee_id, p_work_date,
      case when p_event_type = 'check_in' then p_captured_at else null end,
      case when p_event_type = 'check_out' then p_captured_at else null end,
      'pending_review'
    )
    on conflict (organization_id, employee_id, work_date)
    do update set
      first_check_in_at = coalesce(
        public.attendance_records.first_check_in_at,
        excluded.first_check_in_at
      ),
      last_check_out_at = coalesce(
        excluded.last_check_out_at,
        public.attendance_records.last_check_out_at
      ),
      status = 'pending_review',
      updated_at = now()
    returning id into v_attendance_id;

    update public.attendance_events
      set attendance_record_id = v_attendance_id
    where id = v_event_id;
  end if;

  select to_jsonb(e) into v_event
  from public.attendance_events e
  where e.id = v_event_id;

  return jsonb_build_object(
    'event', v_event,
    'attendance_record_id', v_attendance_id,
    'duplicate', v_duplicate
  );
end;
$$;

revoke all on function public.record_attendance_event(
  uuid, uuid, text, timestamptz, double precision, double precision,
  double precision, uuid, text, text, text, jsonb, date
) from public, anon, authenticated;
grant execute on function public.record_attendance_event(
  uuid, uuid, text, timestamptz, double precision, double precision,
  double precision, uuid, text, text, text, jsonb, date
) to service_role;
