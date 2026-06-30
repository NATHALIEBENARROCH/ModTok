-- ============================================================
-- ModTok Supabase Schema
-- Run this entire file in your Supabase SQL Editor once.
-- ============================================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  followers int default 0,
  following int default 0,
  created_at timestamptz default now()
);

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    '@' || split_part(new.email, '@', 1),
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. CLOSET ITEMS TABLE
create table if not exists public.closet_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null default 'Other',
  brand text,
  color text,
  size text,
  season text,
  price numeric(10,2),
  image_url text,
  tags text[] default '{}',
  is_favorite boolean default false,
  for_sale boolean default false,
  sale_price numeric(10,2),
  notes text,
  added_date date default current_date,
  created_at timestamptz default now()
);

-- 3. OUTFITS TABLE
create table if not exists public.outfits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  item_ids uuid[] default '{}',
  occasion text,
  season text,
  is_shared boolean default false,
  likes int default 0,
  created_date date default current_date,
  created_at timestamptz default now()
);

-- 4. ROW LEVEL SECURITY (users can only see/edit their own data)
alter table public.profiles enable row level security;
alter table public.closet_items enable row level security;
alter table public.outfits enable row level security;

-- Profiles: users can read all profiles but only update their own
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Closet items: private to owner
create policy "Users can view own closet items"
  on public.closet_items for select using (auth.uid() = user_id);
create policy "Users can insert own closet items"
  on public.closet_items for insert with check (auth.uid() = user_id);
create policy "Users can update own closet items"
  on public.closet_items for update using (auth.uid() = user_id);
create policy "Users can delete own closet items"
  on public.closet_items for delete using (auth.uid() = user_id);

-- Outfits: private to owner
create policy "Users can view own outfits"
  on public.outfits for select using (auth.uid() = user_id);
create policy "Users can insert own outfits"
  on public.outfits for insert with check (auth.uid() = user_id);
create policy "Users can update own outfits"
  on public.outfits for update using (auth.uid() = user_id);
create policy "Users can delete own outfits"
  on public.outfits for delete using (auth.uid() = user_id);

-- 5. STORAGE BUCKET for clothing photos
-- Run this separately in the Supabase dashboard Storage section,
-- OR uncomment and run via SQL (requires storage extension):
-- insert into storage.buckets (id, name, public) values ('clothing-photos', 'clothing-photos', true);
-- create policy "Anyone can view clothing photos" on storage.objects for select using (bucket_id = 'clothing-photos');
-- create policy "Auth users can upload clothing photos" on storage.objects for insert with check (bucket_id = 'clothing-photos' and auth.role() = 'authenticated');
-- create policy "Users can delete own clothing photos" on storage.objects for delete using (bucket_id = 'clothing-photos' and auth.uid()::text = (storage.foldername(name))[1]);
