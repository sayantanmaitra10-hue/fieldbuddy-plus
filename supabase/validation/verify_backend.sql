-- Read-only backend foundation verification.
-- Run in the Supabase SQL editor after applying all migrations to the staging project.
-- This script does not modify application data or schema.

do $$
declare
  missing_tables text;
  tables_without_rls text;
  missing_functions text;
begin
  select string_agg(required.table_name, ', ' order by required.table_name)
    into missing_tables
  from (values
    ('organizations'),
    ('organization_members'),
    ('departments'),
    ('teams'),
    ('locations'),
    ('geofences'),
    ('attendance_records'),
    ('attendance_events'),
    ('tasks'),
    ('task_comments'),
    ('task_status_history'),
    ('audit_logs')
  ) as required(table_name)
  where to_regclass(format('public.%I', required.table_name)) is null;

  if missing_tables is not null then
    raise exception 'Missing required tables: %', missing_tables;
  end if;

  select string_agg(required.table_name, ', ' order by required.table_name)
    into tables_without_rls
  from (values
    ('organizations'),
    ('organization_members'),
    ('departments'),
    ('teams'),
    ('locations'),
    ('geofences'),
    ('attendance_records'),
    ('attendance_events'),
    ('tasks'),
    ('task_comments'),
    ('task_status_history'),
    ('audit_logs')
  ) as required(table_name)
  join pg_class c
    on c.oid = to_regclass(format('public.%I', required.table_name))
  where not c.relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'RLS is disabled on: %', tables_without_rls;
  end if;

  select string_agg(required.signature, ', ' order by required.signature)
    into missing_functions
  from (values
    ('public.get_my_organization_memberships()'),
    ('public.get_organization_directory(uuid)'),
    ('public.get_my_attendance_today(uuid)'),
    ('public.get_my_tasks(uuid)'),
    ('public.get_organization_assignees(uuid)'),
    ('public.get_organization_dashboard(uuid)'),
    ('public.record_attendance_event(uuid,uuid,text,timestamptz,double precision,double precision,double precision,uuid,text,text,text,jsonb,date)'),
    ('public.create_task_with_audit(uuid,text,text,uuid,uuid,timestamptz,text)'),
    ('public.apply_task_transition(uuid,uuid,uuid,text,text,text)')
  ) as required(signature)
  where to_regprocedure(required.signature) is null;

  if missing_functions is not null then
    raise exception 'Missing required RPCs: %', missing_functions;
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'organization_members'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) then
    raise exception 'anon/authenticated still has direct write privileges on organization_members';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_members'
      and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'organization_members still has a client write policy';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.record_attendance_event(uuid,uuid,text,timestamptz,double precision,double precision,double precision,uuid,text,text,text,jsonb,date)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.record_attendance_event(uuid,uuid,text,timestamptz,double precision,double precision,double precision,uuid,text,text,text,jsonb,date)',
    'EXECUTE'
  ) then
    raise exception 'Attendance write RPC must not be executable by anon/authenticated';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.record_attendance_event(uuid,uuid,text,timestamptz,double precision,double precision,double precision,uuid,text,text,text,jsonb,date)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute the attendance write RPC';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.create_task_with_audit(uuid,text,text,uuid,uuid,timestamptz,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.apply_task_transition(uuid,uuid,uuid,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Task write RPCs must not be executable by authenticated clients';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and t.tgname = 'on_auth_user_confirmed_activate_memberships'
      and not t.tgisinternal
  ) then
    raise exception 'Email-confirmation membership activation trigger is missing';
  end if;
end;
$$;

select 'PASS: FieldBuddy backend foundation schema, RLS, privileged RPC grants, and membership trigger verified' as validation_result;
