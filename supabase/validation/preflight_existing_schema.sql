-- FieldBuddy Plus fresh-staging preflight.
-- Read-only: run this in the target Supabase SQL Editor BEFORE applying migrations.
-- The first four repository migrations create public.profiles and public.user_roles;
-- a fresh staging project should not already contain these application objects.

do $$
declare
  conflicts text;
begin
  select string_agg(required.object_name, ', ' order by required.object_name)
    into conflicts
  from (values
    ('public.profiles'),
    ('public.user_roles'),
    ('public.organizations'),
    ('public.organization_members'),
    ('public.departments'),
    ('public.teams'),
    ('public.locations'),
    ('public.geofences'),
    ('public.attendance_records'),
    ('public.attendance_events'),
    ('public.tasks'),
    ('public.task_comments'),
    ('public.task_status_history'),
    ('public.audit_logs')
  ) as required(object_name)
  where to_regclass(required.object_name) is not null;

  if conflicts is not null then
    raise exception
      'Staging preflight stopped: application tables already exist (%). Review schema and migration history; do not push the initial migration set blindly.',
      conflicts;
  end if;

  if to_regtype('public.app_role') is not null then
    raise exception
      'Staging preflight stopped: public.app_role already exists. Review schema and migration history before applying the initial migration set.';
  end if;

  if exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and t.tgname = 'on_auth_user_created'
      and not t.tgisinternal
  ) then
    raise exception
      'Staging preflight stopped: auth.users already has on_auth_user_created. Review the existing signup trigger before applying migrations.';
  end if;
end;
$$;

select
  current_database() as database_name,
  current_user as checked_as,
  now() as checked_at,
  'PASS: no FieldBuddy application tables, app_role type, or conflicting auth signup trigger exist; target is structurally clean for initial migration review' as result;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
