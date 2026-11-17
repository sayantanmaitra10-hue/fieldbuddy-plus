-- Tighten legacy global profile and role policies.
-- Personal profile fields are private by default; directory access will be added
-- through a purpose-built, limited employee view/API once employee onboarding is wired.

drop policy if exists "Profiles viewable by authenticated users" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Roles viewable by authenticated users" on public.user_roles;
drop policy if exists "Users can view own legacy role" on public.user_roles;
create policy "Users can view own legacy role"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

-- Role assignment is performed by trusted provisioning, not by browser clients.
drop policy if exists "Only admins can insert roles" on public.user_roles;
drop policy if exists "Only admins can update roles" on public.user_roles;
drop policy if exists "Only admins can delete roles" on public.user_roles;

-- Profiles remain self-service for editable profile attributes only.
-- A later migration should restrict which columns are user-editable if sensitive
-- employment metadata is added to this table.
