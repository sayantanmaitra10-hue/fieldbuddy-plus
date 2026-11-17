create or replace function public.get_my_attendance_today(p_organization_id uuid)
returns table (
  attendance_record_id uuid,
  first_check_in_at timestamptz,
  last_check_out_at timestamptz,
  attendance_status text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select a.id, a.first_check_in_at, a.last_check_out_at, a.status
  from public.attendance_records a
  join public.organizations o on o.id = a.organization_id
  where a.organization_id = p_organization_id
    and a.employee_id = auth.uid()
    and a.work_date = (timezone(coalesce(o.timezone, 'Asia/Kolkata'), now()))::date
    and public.is_org_member(p_organization_id);
$$;

revoke all on function public.get_my_attendance_today(uuid) from public;
grant execute on function public.get_my_attendance_today(uuid) to authenticated;
