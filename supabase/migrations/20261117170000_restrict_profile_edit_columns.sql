-- Restrict self-service profile edits to non-privileged profile fields.
-- Employee IDs are assigned by organization administrators/provisioning services.
revoke update on public.profiles from authenticated;
grant update (display_name, phone, avatar_url) on public.profiles to authenticated;
