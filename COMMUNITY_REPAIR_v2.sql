-- ELSEBORN COMMUNITY REPAIR v2: run in Supabase SQL Editor, safe to rerun.
-- Fixes public profile visibility, avatar/banner storage and rating loading.
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles enable row level security;
drop policy if exists "Elseborn public profiles v2" on public.profiles;
create policy "Elseborn public profiles v2" on public.profiles for select to anon, authenticated using (true);
grant select (id,display_name,minecraft_nickname,role,avatar_url,banner_url,last_seen_at) on public.profiles to anon, authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-images','profile-images',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Elseborn profile images public v2" on storage.objects;
create policy "Elseborn profile images public v2" on storage.objects for select to anon,authenticated using(bucket_id='profile-images');
drop policy if exists "Elseborn profile images upload v2" on storage.objects;
create policy "Elseborn profile images upload v2" on storage.objects for insert to authenticated
with check(bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
create table if not exists public.profile_ratings(
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
drop policy if exists "Elseborn own rating read v2" on public.profile_ratings;
create policy "Elseborn own rating read v2" on public.profile_ratings for select to authenticated using(rater_id=auth.uid());
create or replace function public.rate_elseborn_profile(target_id uuid,stars integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Войди в аккаунт'; end if;
 if target_id=auth.uid() then raise exception 'Нельзя оценивать себя'; end if;
 if stars is null or stars<1 or stars>5 then raise exception 'Оценка от 1 до 5'; end if;
 insert into public.profile_ratings(profile_id,rater_id,stars) values(target_id,auth.uid(),stars)
 on conflict(profile_id,rater_id) do update set stars=excluded.stars,updated_at=now();
end $$;
revoke all on function public.rate_elseborn_profile(uuid,integer) from public,anon;
grant execute on function public.rate_elseborn_profile(uuid,integer) to authenticated;
create or replace function public.elseborn_rating_summary()
returns table(profile_id uuid,average numeric,count bigint)
language sql stable security definer set search_path = '' as $$
 select r.profile_id,round(avg(r.stars)::numeric,1),count(*) from public.profile_ratings r group by r.profile_id
$$;
revoke all on function public.elseborn_rating_summary() from public;
grant execute on function public.elseborn_rating_summary() to anon,authenticated;
-- Existing users with no rating will show "Пока нет оценок" (not endless loading).
