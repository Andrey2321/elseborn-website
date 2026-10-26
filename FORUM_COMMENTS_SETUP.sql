-- Elseborn: forum comments, run once in Supabase SQL Editor.
create table if not exists public.post_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (char_length(trim(body)) between 1 and 3000),
 created_at timestamptz not null default now()
);
create index if not exists post_comments_post_created_idx on public.post_comments(post_id,created_at);
alter table public.post_comments enable row level security;
drop policy if exists "Anyone can read comments" on public.post_comments;
create policy "Anyone can read comments" on public.post_comments for select to anon,authenticated using (true);
drop policy if exists "Users can add own comments" on public.post_comments;
create policy "Users can add own comments" on public.post_comments for insert to authenticated with check (author_id=auth.uid());
drop policy if exists "Users can delete own comments" on public.post_comments;
create policy "Users can delete own comments" on public.post_comments for delete to authenticated using (author_id=auth.uid());
grant select on public.post_comments to anon,authenticated;
grant insert,delete on public.post_comments to authenticated;
