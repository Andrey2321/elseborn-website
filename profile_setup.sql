-- Elseborn v0.4: профиль, изображения и присутствие.
-- Запустить в Supabase SQL Editor. Не удаляет существующие аккаунты.
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
-- Не разрешаем клиентам менять роль через REST API.
revoke update on table public.profiles from public, anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (avatar_url,banner_url,last_seen_at) on public.profiles to authenticated;
alter table public.profiles enable row level security;
drop policy if exists "Profile read v04" on public.profiles;
create policy "Profile read v04" on public.profiles for select to authenticated using (true);
drop policy if exists "Profile update v04" on public.profiles;
create policy "Profile update v04" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);
-- Публичное хранилище картинок; загрузка только в папку своего UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-images','profile-images',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Profile images read v04" on storage.objects;
create policy "Profile images read v04" on storage.objects for select to anon,authenticated using (bucket_id='profile-images');
drop policy if exists "Profile images upload v04" on storage.objects;
create policy "Profile images upload v04" on storage.objects for insert to authenticated
with check (bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
-- ВНИМАНИЕ: назначение ролей только вручную в SQL Editor администратором.
-- Пример: update public.profiles set role='creator' where id='UUID_ВЛАДЕЛЬЦА';
