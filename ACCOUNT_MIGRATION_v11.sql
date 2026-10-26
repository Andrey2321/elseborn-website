-- ELSEBORN v11. Non-destructive migration. Back up database before applying.
-- Preserve all existing auth.users IDs, profiles, roles, ratings, posts and achievements.
-- Existing column minecraft_nickname is used. No password is stored in public.profiles.
create unique index if not exists elseborn_profiles_nick_unique
  on public.profiles (lower(minecraft_nickname)) where minecraft_nickname is not null;
-- If the unique index fails, first resolve duplicate existing nicknames.
create or replace function public.elseborn_nickname_available(candidate text)
returns boolean language sql stable security definer set search_path = '' as $$
 select candidate ~ '^[A-Za-z0-9_]{3,16}$' and not exists (
   select 1 from public.profiles where lower(minecraft_nickname)=lower(candidate)
 );
$$;
revoke all on function public.elseborn_nickname_available(text) from public;
grant execute on function public.elseborn_nickname_available(text) to anon, authenticated;
-- Prevent newly registered users from claiming a duplicate nickname. Existing auth user creation
-- trigger (if installed) must populate profiles.minecraft_nickname from raw_user_meta_data.
-- Run the following to check whether profiles were created for new registrations:
-- select id,display_name,minecraft_nickname from public.profiles order by created_at desc limit 10;
-- Do not disable Google provider until existing Google users have set passwords.
