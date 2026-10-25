-- Запусти один раз в Supabase SQL Editor. Не удаляет существующие profiles или аккаунты.
create extension if not exists pgcrypto;
create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('topic','application')),
 title text not null check (char_length(title) between 3 and 160),
 body text not null check (char_length(body) between 1 and 100000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists posts_kind_created_idx on public.posts(kind,created_at desc);
create index if not exists posts_author_idx on public.posts(author_id);
alter table public.posts enable row level security;
drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts" on public.posts for select to anon,authenticated using (true);
drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts" on public.posts for insert to authenticated with check (auth.uid()=author_id);
drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts" on public.posts for update to authenticated using (auth.uid()=author_id) with check (auth.uid()=author_id);
drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts" on public.posts for delete to authenticated using (auth.uid()=author_id);
-- Public image bucket, only authenticated users may upload into their own UUID folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('post-images','post-images',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Read post images" on storage.objects;
create policy "Read post images" on storage.objects for select to anon,authenticated using (bucket_id='post-images');
drop policy if exists "Upload own post images" on storage.objects;
create policy "Upload own post images" on storage.objects for insert to authenticated
with check (bucket_id='post-images' and (storage.foldername(name))[1]=auth.uid()::text);
