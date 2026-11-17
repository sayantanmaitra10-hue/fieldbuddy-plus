-- FieldBuddy Plus: multi-tenant backend foundation
-- Apply with Supabase CLI after reviewing against the target project's existing migrations.
-- Existing public.profiles(id) and auth.users(id) are reused; existing user_roles is left untouched.

begin;

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$'),
  timezone text not null default 'Asia/Kolkata',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('org_admin','hr_admin','manager','supervisor','field_employee')),
  status text not null default 'active' check (status in ('invited','active','suspended','removed')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (id, organization_id)
);

create index if not exists organization_members_user_idx on public.organization_members(user_id, status);
create index if not exists organization_members_org_role_idx on public.organization_members(organization_id, role, status);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  code text,
  created_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (id, organization_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid,
  name text not null check (length(trim(name)) between 1 and 120),
  manager_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name),
  foreign key (department_id, organization_id)
    references public.departments(id, organization_id) on delete set null
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid,
  name text not null,
  center_latitude double precision not null check (center_latitude between -90 and 90),
  center_longitude double precision not null check (center_longitude between -180 and 180),
  radius_meters integer not null check (radius_meters between 25 and 10000),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (location_id, organization_id)
    references public.locations(id, organization_id) on delete set null
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references auth.users(id) on delete restrict,
  work_date date not null,
  first_check_in_at timestamptz,
  last_check_out_at timestamptz,
  status text not null default 'pending_review'
    check (status in ('pending_review','present','late','absent','half_day','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, work_date),
  unique (id, organization_id)
);

create index if not exists attendance_org_date_idx
  on public.attendance_records(organization_id, work_date desc);
create index if not exists attendance_employee_date_idx
  on public.attendance_records(employee_id, work_date desc);

create table if not exists public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  attendance_record_id uuid,
  employee_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('check_in','check_out')),
  captured_at timestamptz not null,
  received_at timestamptz not null default now(),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy_meters double precision check (accuracy_meters >= 0),
  geofence_id uuid,
  device_id text,
  idempotency_key text not null,
  validation_status text not null default 'pending'
    check (validation_status in ('pending','accepted','outside_geofence','low_accuracy','rejected')),
  validation_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, employee_id, idempotency_key),
  foreign key (attendance_record_id, organization_id)
    references public.attendance_records(id, organization_id) on delete set null,
  foreign key (geofence_id, organization_id)
    references public.geofences(id, organization_id) on delete set null
);

create index if not exists attendance_events_org_received_idx
  on public.attendance_events(organization_id, received_at desc);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 240),
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'assigned'
    check (status in ('assigned','accepted','in_progress','submitted','approved','rejected','cancelled')),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index if not exists tasks_org_assignee_status_idx
  on public.tasks(organization_id, assigned_to, status);
create index if not exists tasks_org_due_idx on public.tasks(organization_id, due_at);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  foreign key (task_id, organization_id)
    references public.tasks(id, organization_id) on delete cascade
);

create table if not exists public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null,
  changed_by uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now(),
  foreign key (task_id, organization_id)
    references public.tasks(id, organization_id) on delete cascade
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx
  on public.audit_logs(organization_id, created_at desc);

-- SECURITY DEFINER helpers avoid recursive RLS checks on organization_members.
create or replace function public.is_org_member(
  p_organization_id uuid,
  p_allowed_status text default 'active'
) returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = p_allowed_status
  );
$$;

create or replace function public.has_org_role(
  p_organization_id uuid,
  p_roles text[]
) returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(p_roles)
  );
$$;

revoke all on function public.is_org_member(uuid, text) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid, text) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','organization_members','geofences',
    'attendance_records','tasks'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- RLS: tenant membership is the boundary. Membership provisioning/invitations
-- should be performed by a trusted server/Edge Function using the service role.
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.locations enable row level security;
alter table public.geofences enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_events enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_status_history enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "members read their organizations" on public.organizations;
create policy "members read their organizations"
on public.organizations for select to authenticated
using (public.is_org_member(id));

drop policy if exists "members read own memberships" on public.organization_members;
create policy "members read own memberships"
on public.organization_members for select to authenticated
using (
  user_id = auth.uid()
  or public.has_org_role(organization_id, array['org_admin','hr_admin','manager'])
);

drop policy if exists "org admins manage memberships" on public.organization_members;
create policy "org admins manage memberships"
on public.organization_members for all to authenticated
using (public.has_org_role(organization_id, array['org_admin']))
with check (public.has_org_role(organization_id, array['org_admin']));

-- Organization-scoped reference data
do $$
declare t text;
begin
  foreach t in array array['departments','teams','locations','geofences'] loop
    execute format('drop policy if exists "members read %1$s" on public.%1$I', t);
    execute format(
      'create policy "members read %1$s" on public.%1$I for select to authenticated using (public.is_org_member(organization_id))',
      t
    );
    execute format('drop policy if exists "admins manage %1$s" on public.%1$I', t);
    execute format(
      'create policy "admins manage %1$s" on public.%1$I for all to authenticated using (public.has_org_role(organization_id, array[''org_admin'',''hr_admin''])) with check (public.has_org_role(organization_id, array[''org_admin'',''hr_admin'']))',
      t
    );
  end loop;
end $$;

-- Attendance: employees can read their own records; managers/HR can read
-- organization records. Writes are deliberately server-mediated for integrity.
drop policy if exists "employees and managers read attendance" on public.attendance_records;
create policy "employees and managers read attendance"
on public.attendance_records for select to authenticated
using (
  (employee_id = auth.uid() and public.is_org_member(organization_id))
  or public.has_org_role(organization_id, array['org_admin','hr_admin','manager','supervisor'])
);

drop policy if exists "employees and managers read attendance events" on public.attendance_events;
create policy "employees and managers read attendance events"
on public.attendance_events for select to authenticated
using (
  (employee_id = auth.uid() and public.is_org_member(organization_id))
  or public.has_org_role(organization_id, array['org_admin','hr_admin','manager','supervisor'])
);

-- Task visibility: assignee, creator, or authorized team leadership.
drop policy if exists "task participants read tasks" on public.tasks;
create policy "task participants read tasks"
on public.tasks for select to authenticated
using (
  public.is_org_member(organization_id)
  and (
    assigned_to = auth.uid()
    or created_by = auth.uid()
    or public.has_org_role(organization_id, array['org_admin','hr_admin','manager','supervisor'])
  )
);

drop policy if exists "task participants read comments" on public.task_comments;
create policy "task participants read comments"
on public.task_comments for select to authenticated
using (
  public.is_org_member(organization_id)
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.organization_id = task_comments.organization_id
      and (t.assigned_to = auth.uid() or t.created_by = auth.uid()
        or public.has_org_role(organization_id, array['org_admin','hr_admin','manager','supervisor']))
  )
);

drop policy if exists "task participants add comments" on public.task_comments;
create policy "task participants add comments"
on public.task_comments for insert to authenticated
with check (
  author_id = auth.uid()
  and public.is_org_member(organization_id)
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.organization_id = task_comments.organization_id
      and (t.assigned_to = auth.uid() or t.created_by = auth.uid()
        or public.has_org_role(organization_id, array['org_admin','hr_admin','manager','supervisor']))
  )
);

drop policy if exists "task participants read status history" on public.task_status_history;
create policy "task participants read status history"
on public.task_status_history for select to authenticated
using (
  public.is_org_member(organization_id)
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.organization_id = task_status_history.organization_id
      and (t.assigned_to = auth.uid() or t.created_by = auth.uid()
        or public.has_org_role(organization_id, array['org_admin','hr_admin','manager','supervisor']))
  )
);

-- Audit events are readable by organization admins/HR only and append-only.
drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs"
on public.audit_logs for select to authenticated
using (public.has_org_role(organization_id, array['org_admin','hr_admin']));

commit;
