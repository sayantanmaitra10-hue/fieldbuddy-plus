-- FieldBuddy Plus staging preflight.
-- Read-only: run this in the SQL Editor of the candidate Supabase project
-- BEFORE applying any FieldBuddy migrations. It does not change schema or data.

do $$
declare
  missing text;
begin
  -- The existing application schema is reused by the new backend migrations.
  select string_agg(req.table_name, ', ' order by req.table_name)
    into missing
  from (values ('profiles'), ('user_roles')) as req(table_name)
  where to_regclass(format('public.%I', req.table_name)) is null;

  if missing is not null then
    raise exception 'Preflight failed. Expected existing public table(s) not found: %', missing;
  end if;

  select string_agg(req.column_name, ', ' order by req.column_name)
    into missing
  from (values
    ('profiles','id'),
    ('profiles','display_name'),
    ('profiles','employee_id'),
    ('profiles','avatar_url'),
    ('profiles','phone'),
    ('user_roles','user_id')
  ) as req(table_name, column_name)
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = req.table_name
   and c.column_name = req.column_name
  where c.column_name is null;

  if missing is not null then
    raise exception 'Preflight failed. Expected existing column(s) not found: %', missing;
  end if;
end;
$$;

select
  current_database() as database_name,
  current_user as sql_editor_role,
  now() as checked_at,
  'PASS: existing profiles and user_roles tables/columns are present; continue with migration-history and schema review before applying changes' as result;

-- Review existing public tables and current RLS configuration.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- Review existing policies before deciding whether these new policies safely
-- replace or supplement them.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
