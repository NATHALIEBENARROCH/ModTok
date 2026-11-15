-- ============================================================
-- ModTok 1.2: follow people + home feed (Instagram-style)
--
-- Run once in Supabase -> SQL Editor -> New query, AFTER the 1.1 scripts.
-- Safe to run again.
--
-- Adds:
--   follows        who follows whom
--   feed_posts     permanent posts (an outfit, a closet piece or a photo) that show in followers' feeds
--   post_likes     hearts on posts
--   get_home_feed  posts from people you follow (and your own), newest first
--   search_people  find people by name or @username
-- Keeps profiles.followers / profiles.following up to date automatically.
-- Blocking someone removes the follow in both directions and hides their posts.
-- ============================================================

-- 0. Profile fields people can edit (bio already exists; these are new and optional).
alter table public.profiles add column if not exists website text;

-- Lowercase, case-insensitive unique usernames (existing ones like "@nathalie" keep working).
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

-- Users may only update their own profile (policy exists in supabase_schema.sql; recreate safely).
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Make sure every signed-up user has a profile row (some older accounts may not).
insert into public.profiles (id, username, display_name)
select u.id,
       case when u.email is null then null else '@' || split_part(u.email, '@', 1) end,
       coalesce(u.raw_user_meta_data->>'display_name', split_part(coalesce(u.email, ''), '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;

-- Helper: true when either user has blocked the other.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Only answers for the signed-in user, so nobody can look up other people's blocks.
  select auth.uid() in (a, b) and exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

-- ============================================================
-- 1. FOLLOWS
-- ============================================================
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows(following_id, created_at desc);
create index if not exists follows_follower_idx on public.follows(follower_id, created_at desc);

alter table public.follows enable row level security;

drop policy if exists "Signed-in users can see follows" on public.follows;
create policy "Signed-in users can see follows"
  on public.follows for select to authenticated using (true);

drop policy if exists "Users follow as themselves" on public.follows;
create policy "Users follow as themselves"
  on public.follows for insert to authenticated
  with check (
    follower_id = auth.uid()
    and not public.is_blocked_between(follower_id, following_id)
    -- Guests (anonymous sign-ins) cannot follow.
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

drop policy if exists "Users unfollow as themselves" on public.follows;
create policy "Users unfollow as themselves"
  on public.follows for delete to authenticated
  using (follower_id = auth.uid());

-- Keep the follower / following counts on profiles in sync.
-- Only the server may change the follower counts (people can still edit their name, bio, photo).
create or replace function public.profiles_protect_counts()
returns trigger
language plpgsql
as $$
begin
  if current_setting('modtok.internal', true) = 'on' then
    return new;
  end if;
  new.followers := old.followers;
  new.following := old.following;
  return new;
end;
$$;

drop trigger if exists profiles_protect_counts on public.profiles;
create trigger profiles_protect_counts
  before update on public.profiles
  for each row execute function public.profiles_protect_counts();

create or replace function public.update_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('modtok.internal', 'on', true);
  if tg_op = 'INSERT' then
    update public.profiles set following = coalesce(following, 0) + 1 where id = new.follower_id;
    update public.profiles set followers = coalesce(followers, 0) + 1 where id = new.following_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set following = greatest(coalesce(following, 0) - 1, 0) where id = old.follower_id;
    update public.profiles set followers = greatest(coalesce(followers, 0) - 1, 0) where id = old.following_id;
  end if;
  perform set_config('modtok.internal', 'off', true);
  return null;
end;
$$;

drop trigger if exists follows_update_counts on public.follows;
create trigger follows_update_counts
  after insert or delete on public.follows
  for each row execute function public.update_follow_counts();

-- Re-sync the counts once (fixes the placeholder zeros).
do $$
begin
  perform set_config('modtok.internal', 'on', true);
  update public.profiles p set
    followers = (select count(*) from public.follows f where f.following_id = p.id),
    following = (select count(*) from public.follows f where f.follower_id = p.id);
  perform set_config('modtok.internal', 'off', true);
end;
$$;

-- Blocking someone removes any follow between the two people.
create or replace function public.remove_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists user_blocks_remove_follows on public.user_blocks;
create trigger user_blocks_remove_follows
  after insert on public.user_blocks
  for each row execute function public.remove_follows_on_block();

-- ============================================================
-- 2. FEED POSTS
-- ============================================================
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'outfit' check (kind in ('outfit','item','photo')),
  outfit_id uuid references public.outfits(id) on delete set null,
  closet_item_id uuid references public.closet_items(id) on delete set null,
  tagged_listing_id uuid references public.marketplace_listings(id) on delete set null,
  caption text not null default '' check (char_length(caption) <= 2200),
  image_urls text[] not null check (cardinality(image_urls) between 1 and 10),
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists feed_posts_user_created_idx on public.feed_posts(user_id, created_at desc);
create index if not exists feed_posts_created_idx on public.feed_posts(created_at desc);

alter table public.feed_posts enable row level security;

-- Posts are visible to signed-in users, except between people who blocked each other.
drop policy if exists "Signed-in users can see posts" on public.feed_posts;
create policy "Signed-in users can see posts"
  on public.feed_posts for select to authenticated
  using (user_id = auth.uid() or not public.is_blocked_between(auth.uid(), user_id));

drop policy if exists "Users post as themselves" on public.feed_posts;
create policy "Users post as themselves"
  on public.feed_posts for insert to authenticated
  with check (
    user_id = auth.uid()
    and likes_count = 0
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

drop policy if exists "Users edit own posts" on public.feed_posts;
create policy "Users edit own posts"
  on public.feed_posts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users delete own posts" on public.feed_posts;
create policy "Users delete own posts"
  on public.feed_posts for delete to authenticated
  using (user_id = auth.uid());

-- Owners may only change the caption (not the like count).
create or replace function public.feed_posts_protect_columns()
returns trigger
language plpgsql
as $$
begin
  if current_setting('modtok.internal', true) = 'on' then
    return new;
  end if;
  new.likes_count := old.likes_count;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists feed_posts_protect on public.feed_posts;
create trigger feed_posts_protect
  before update on public.feed_posts
  for each row execute function public.feed_posts_protect_columns();

-- ============================================================
-- 3. LIKES
-- ============================================================
create table if not exists public.post_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx on public.post_likes(user_id);

alter table public.post_likes enable row level security;

drop policy if exists "Signed-in users can see likes" on public.post_likes;
create policy "Signed-in users can see likes"
  on public.post_likes for select to authenticated using (true);

drop policy if exists "Users like as themselves" on public.post_likes;
create policy "Users like as themselves"
  on public.post_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.feed_posts p where p.id = post_id)
  );

drop policy if exists "Users unlike as themselves" on public.post_likes;
create policy "Users unlike as themselves"
  on public.post_likes for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.update_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('modtok.internal', 'on', true);
  if tg_op = 'INSERT' then
    update public.feed_posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.feed_posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  perform set_config('modtok.internal', 'off', true);
  return null;
end;
$$;

drop trigger if exists post_likes_update_count on public.post_likes;
create trigger post_likes_update_count
  after insert or delete on public.post_likes
  for each row execute function public.update_post_like_count();

-- ============================================================
-- 4. REPORTS: allow reporting a post (Apple requires report + block for user content)
-- ============================================================
alter table public.marketplace_reports drop constraint if exists marketplace_reports_target_type_check;
alter table public.marketplace_reports add constraint marketplace_reports_target_type_check
  check (target_type in ('listing','story','user','post'));

-- ============================================================
-- 5. HOME FEED: posts from people I follow plus my own, newest first.
--    Pass the created_at of the last post you have to load the next page.
-- ============================================================
create or replace function public.get_home_feed(before timestamptz default null, page_size integer default 20)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  outfit_id uuid,
  closet_item_id uuid,
  tagged_listing_id uuid,
  caption text,
  image_urls text[],
  likes_count integer,
  created_at timestamptz,
  liked_by_me boolean,
  username text,
  display_name text,
  avatar_url text,
  listing_title text,
  listing_price_cents integer,
  listing_status text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id, p.user_id, p.kind, p.outfit_id, p.closet_item_id, p.tagged_listing_id,
    p.caption, p.image_urls, p.likes_count, p.created_at,
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
    pr.username, pr.display_name, pr.avatar_url,
    ml.title, ml.price_cents, ml.status
  from public.feed_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.marketplace_listings ml on ml.id = p.tagged_listing_id
  where (p.user_id = auth.uid()
         or p.user_id in (select f.following_id from public.follows f where f.follower_id = auth.uid()))
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit least(greatest(coalesce(page_size, 20), 1), 50);
$$;

grant execute on function public.get_home_feed(timestamptz, integer) to authenticated;

-- One person's posts (for their profile grid).
create or replace function public.get_user_posts(profile_id uuid, before timestamptz default null, page_size integer default 30)
returns table (
  id uuid,
  user_id uuid,
  kind text,
  outfit_id uuid,
  closet_item_id uuid,
  tagged_listing_id uuid,
  caption text,
  image_urls text[],
  likes_count integer,
  created_at timestamptz,
  liked_by_me boolean,
  username text,
  display_name text,
  avatar_url text,
  listing_title text,
  listing_price_cents integer,
  listing_status text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id, p.user_id, p.kind, p.outfit_id, p.closet_item_id, p.tagged_listing_id,
    p.caption, p.image_urls, p.likes_count, p.created_at,
    exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
    pr.username, pr.display_name, pr.avatar_url,
    ml.title, ml.price_cents, ml.status
  from public.feed_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.marketplace_listings ml on ml.id = p.tagged_listing_id
  where p.user_id = profile_id
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit least(greatest(coalesce(page_size, 30), 1), 60);
$$;

grant execute on function public.get_user_posts(uuid, timestamptz, integer) to authenticated;

-- ============================================================
-- 6. FIND PEOPLE: search by name or @username. With an empty search it suggests
--    people who posted recently and whom you don't follow yet.
-- ============================================================
create or replace function public.search_people(term text default '', max_results integer default 30)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  followers integer,
  following integer,
  is_following boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (select nullif(trim(both from replace(coalesce(term, ''), '@', '')), '') as t)
  select
    pr.id, pr.username, pr.display_name, pr.avatar_url, pr.bio,
    coalesce(pr.followers, 0), coalesce(pr.following, 0),
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = pr.id)
  from public.profiles pr, q
  where pr.id <> auth.uid()
    and pr.username is not null
    and not public.is_blocked_between(auth.uid(), pr.id)
    and (
      (q.t is not null and (pr.username ilike '%' || q.t || '%' or pr.display_name ilike '%' || q.t || '%'))
      or (q.t is null
          and not exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = pr.id)
          and exists (select 1 from public.feed_posts p where p.user_id = pr.id))
    )
  order by
    case when q.t is not null and lower(replace(pr.username, '@', '')) = lower(q.t) then 0 else 1 end,
    coalesce(pr.followers, 0) desc,
    pr.created_at desc
  limit least(greatest(coalesce(max_results, 30), 1), 50);
$$;

grant execute on function public.search_people(text, integer) to authenticated;

-- Followers / following lists for a profile.
create or replace function public.get_follow_list(profile_id uuid, list_type text default 'followers')
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  followers integer,
  following integer,
  is_following boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    pr.id, pr.username, pr.display_name, pr.avatar_url, pr.bio,
    coalesce(pr.followers, 0), coalesce(pr.following, 0),
    exists (select 1 from public.follows mine where mine.follower_id = auth.uid() and mine.following_id = pr.id)
  from public.follows f
  join public.profiles pr
    on pr.id = case when list_type = 'following' then f.following_id else f.follower_id end
  where (case when list_type = 'following' then f.follower_id else f.following_id end) = profile_id
    and not public.is_blocked_between(auth.uid(), pr.id)
  order by f.created_at desc
  limit 200;
$$;

grant execute on function public.get_follow_list(uuid, text) to authenticated;
