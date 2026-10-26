-- Elseborn v7. Existing accounts and posts are preserved.
alter table public.profiles add column if not exists bio text default '';
create table if not exists public.friend_requests (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 receiver_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint different_users check(sender_id <> receiver_id),
 constraint unique_friend_request unique(sender_id,receiver_id)
);
create index if not exists friend_receiver_idx on public.friend_requests(receiver_id,status);
create index if not exists friend_sender_idx on public.friend_requests(sender_id,status);
alter table public.friend_requests enable row level security;
drop policy if exists "friends_read" on public.friend_requests;
create policy "friends_read" on public.friend_requests for select to authenticated using (auth.uid() in (sender_id,receiver_id));
drop policy if exists "friends_request" on public.friend_requests;
create policy "friends_request" on public.friend_requests for insert to authenticated with check (sender_id=auth.uid() and status='pending');
drop policy if exists "friends_accept" on public.friend_requests;
create policy "friends_accept" on public.friend_requests for update to authenticated using(receiver_id=auth.uid()) with check(receiver_id=auth.uid() and status in ('accepted','rejected'));
drop policy if exists "friends_delete" on public.friend_requests;
create policy "friends_delete" on public.friend_requests for delete to authenticated using(auth.uid() in(sender_id,receiver_id));
grant select,insert,update,delete on public.friend_requests to authenticated;
-- Allow public biographies to be read, and only owners to edit theirs.
grant select (bio,created_at) on public.profiles to anon,authenticated;
grant update (bio) on public.profiles to authenticated;
