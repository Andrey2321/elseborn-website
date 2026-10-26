-- Elseborn Community v1: выполнить один раз в Supabase SQL Editor.
-- Требуется существующая public.profiles с id uuid (auth.users).
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles enable row level security;
-- Открытые профили видны всем; email и закрытые данные никогда не запрашиваются на сайте.
grant select (id,display_name,minecraft_nickname,role,avatar_url,banner_url,last_seen_at) on public.profiles to anon,authenticated;
drop policy if exists "Elseborn public profiles v1" on public.profiles;
create policy "Elseborn public profiles v1" on public.profiles for select to anon,authenticated using (true);
-- Только свои публичные данные; роли редактировать через клиент нельзя.
grant update (display_name,minecraft_nickname,avatar_url,banner_url,last_seen_at) on public.profiles to authenticated;
drop policy if exists "Elseborn own profile v1" on public.profiles;
create policy "Elseborn own profile v1" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create table if not exists public.profile_ratings (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 rater_id uuid not null references auth.users(id) on delete cascade,
 stars smallint not null check(stars between 1 and 5),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(profile_id,rater_id),
 constraint not_self_rating check(profile_id<>rater_id)
);
alter table public.profile_ratings enable row level security;
revoke all on public.profile_ratings from anon,authenticated;
grant select on public.profile_ratings to authenticated;
drop policy if exists "Elseborn own rating read v1" on public.profile_ratings;
create policy "Elseborn own rating read v1" on public.profile_ratings for select to authenticated using(rater_id=auth.uid());
create or replace function public.rate_elseborn_profile(target_id uuid,stars integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Войди в аккаунт'; end if;
 if target_id=auth.uid() then raise exception 'Нельзя оценивать себя'; end if;
 if stars is null or stars<1 or stars>5 then raise exception 'Оценка от 1 до 5'; end if;
 insert into public.profile_ratings(profile_id,rater_id,stars)
 values(target_id,auth.uid(),stars)
 on conflict(profile_id,rater_id) do update set stars=excluded.stars,updated_at=now();
end $$;
revoke all on function public.rate_elseborn_profile(uuid,integer) from public,anon;
grant execute on function public.rate_elseborn_profile(uuid,integer) to authenticated;
-- Aggregates expose no rater identities and cannot be altered from the browser.
create or replace function public.elseborn_rating_summary()
returns table(profile_id uuid,average numeric,count bigint)
language sql stable security definer set search_path = '' as $$
 select r.profile_id,round(avg(r.stars)::numeric,1),count(*) from public.profile_ratings r group by r.profile_id
$$;
revoke all on function public.elseborn_rating_summary() from public;
grant execute on function public.elseborn_rating_summary() to anon,authenticated;
-- REST-friendly view (uses only the safe aggregate function).
create or replace view public.profile_rating_summary as select * from public.elseborn_rating_summary();
grant select on public.profile_rating_summary to anon,authenticated;
