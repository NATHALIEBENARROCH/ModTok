-- ============================================================
-- ModTok Marketplace — complete Supabase setup
-- Physical clothing sales, United States sellers, USD checkout
-- Safe to re-run. Run as one script in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- Keep the existing wardrobe table compatible with the marketplace UI.
alter table public.closet_items add column if not exists listing_type text;
alter table public.closet_items add column if not exists occasions text[] default '{}';

-- Seller-to-Stripe account mapping. Stripe secrets never belong in this table.
create table if not exists public.seller_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id text unique not null,
  country text not null default 'US' check (country = 'US'),
  default_currency text not null default 'usd' check (default_currency = 'usd'),
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  requirements jsonb not null default '{}'::jsonb,
  onboarding_started_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public marketplace records are separate from private wardrobe records.
create table if not exists public.seller_onboarding_sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text not null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists seller_onboarding_sessions_user_idx
  on public.seller_onboarding_sessions(user_id, created_at desc);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  closet_item_id uuid references public.closet_items(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null,
  brand text,
  size text,
  condition text not null default 'good' check (condition in ('new_with_tags','like_new','good','fair')),
  image_urls text[] not null default '{}',
  currency text not null default 'usd' check (currency = 'usd'),
  price_cents integer not null check (price_cents >= 100),
  shipping_price_cents integer not null default 0 check (shipping_price_cents >= 0),
  status text not null default 'draft' check (status in ('draft','active','reserved','sold','archived')),
  reserved_until timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.share_stories
  add column if not exists tagged_listing_id uuid references public.marketplace_listings(id) on delete set null;

create index if not exists marketplace_listings_status_created_idx
  on public.marketplace_listings(status, created_at desc);
create index if not exists marketplace_listings_category_idx
  on public.marketplace_listings(category);
create index if not exists marketplace_listings_seller_idx
  on public.marketplace_listings(seller_id, created_at desc);
create unique index if not exists marketplace_one_open_listing_per_item_idx
  on public.marketplace_listings(closet_item_id)
  where status in ('draft','active','reserved');

-- Orders contain an immutable listing snapshot and buyer shipping details.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending_payment' check (status in (
    'pending_payment','paid','processing','shipped','delivered',
    'canceled','refund_pending','partially_refunded','refunded','disputed'
  )),
  currency text not null default 'usd' check (currency = 'usd'),
  item_amount_cents integer not null check (item_amount_cents >= 0),
  shipping_amount_cents integer not null default 0 check (shipping_amount_cents >= 0),
  tax_amount_cents integer not null default 0 check (tax_amount_cents >= 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  seller_net_cents integer not null default 0 check (seller_net_cents >= 0),
  total_amount_cents integer not null check (total_amount_cents >= 0),
  shipping_address jsonb not null,
  listing_snapshot jsonb not null,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_refund_id text,
  tracking_carrier text,
  tracking_number text,
  tracking_url text,
  reserved_expires_at timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  canceled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  check (total_amount_cents = item_amount_cents + shipping_amount_cents + tax_amount_cents),
  check (seller_net_cents = total_amount_cents - platform_fee_cents)
);

create index if not exists orders_buyer_created_idx on public.orders(buyer_id, created_at desc);
create index if not exists orders_seller_created_idx on public.orders(seller_id, created_at desc);
create index if not exists orders_listing_idx on public.orders(listing_id);
create index if not exists orders_status_idx on public.orders(status);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx on public.order_events(order_id, created_at desc);

-- Stores webhook ids for idempotency. Payload access is service-only.
create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

create table if not exists public.marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('listing','story','user')),
  target_id text not null,
  reason text not null check (reason in ('spam','fraud','counterfeit','harassment','inappropriate','other')),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Shared updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'seller_accounts_set_updated_at') then
    create trigger seller_accounts_set_updated_at before update on public.seller_accounts
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'marketplace_listings_set_updated_at') then
    create trigger marketplace_listings_set_updated_at before update on public.marketplace_listings
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'orders_set_updated_at') then
    create trigger orders_set_updated_at before update on public.orders
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'marketplace_reports_set_updated_at') then
    create trigger marketplace_reports_set_updated_at before update on public.marketplace_reports
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- Keep legacy closet flags synchronized for the existing Sell and Story screens.
create or replace function public.sync_closet_item_listing_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_open_listing public.marketplace_listings%rowtype;
begin
  if tg_op = 'DELETE' then
    v_item_id := old.closet_item_id;
  else
    v_item_id := new.closet_item_id;
  end if;

  select * into v_open_listing
  from public.marketplace_listings
  where closet_item_id = v_item_id
    and status in ('active','reserved')
  order by created_at desc
  limit 1;

  if found then
    update public.closet_items
    set for_sale = true,
        sale_price = v_open_listing.price_cents::numeric / 100,
        listing_type = 'sale'
    where id = v_item_id;
  else
    update public.closet_items
    set for_sale = false,
        sale_price = null,
        listing_type = null
    where id = v_item_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_sync_closet_item on public.marketplace_listings;
create trigger marketplace_sync_closet_item
after insert or update or delete on public.marketplace_listings
for each row execute function public.sync_closet_item_listing_state();

-- Service-only atomic reservation. The client can never choose authoritative prices.
create or replace function public.reserve_marketplace_listing(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_shipping_address jsonb,
  p_platform_fee_bps integer default 1000
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.marketplace_listings%rowtype;
  v_order public.orders%rowtype;
  v_total integer;
  v_fee integer;
begin
  if p_platform_fee_bps < 0 or p_platform_fee_bps > 5000 then
    raise exception 'Invalid platform fee configuration';
  end if;

  -- Release this listing if a previous checkout reservation expired.
  update public.marketplace_listings
  set status = 'active', reserved_until = null
  where id = p_listing_id and status = 'reserved' and reserved_until < now();

  update public.orders
  set status = 'canceled', canceled_at = now()
  where listing_id = p_listing_id
    and status = 'pending_payment'
    and reserved_expires_at < now();

  select * into v_listing
  from public.marketplace_listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Listing not found';
  end if;

  if v_listing.seller_id = p_buyer_id then
    raise exception 'You cannot purchase your own listing';
  end if;

  if v_listing.status = 'reserved' then
    select * into v_order
    from public.orders
    where listing_id = p_listing_id
      and buyer_id = p_buyer_id
      and status = 'pending_payment'
      and reserved_expires_at > now()
    order by created_at desc
    limit 1;

    if found then
      return v_order;
    end if;
  end if;

  if v_listing.status <> 'active' then
    raise exception 'This listing is no longer available';
  end if;

  if not exists (
    select 1 from public.seller_accounts sa
    where sa.user_id = v_listing.seller_id
      and sa.details_submitted
      and sa.charges_enabled
      and sa.payouts_enabled
  ) then
    raise exception 'Seller payouts are not ready';
  end if;

  v_total := v_listing.price_cents + v_listing.shipping_price_cents;
  v_fee := round(v_listing.price_cents * p_platform_fee_bps / 10000.0);

  insert into public.orders (
    listing_id, buyer_id, seller_id, status, currency,
    item_amount_cents, shipping_amount_cents, tax_amount_cents,
    platform_fee_cents, seller_net_cents, total_amount_cents,
    shipping_address, listing_snapshot, reserved_expires_at
  ) values (
    v_listing.id, p_buyer_id, v_listing.seller_id, 'pending_payment', 'usd',
    v_listing.price_cents, v_listing.shipping_price_cents, 0,
    v_fee, v_total - v_fee, v_total,
    p_shipping_address,
    jsonb_build_object(
      'id', v_listing.id,
      'title', v_listing.title,
      'description', v_listing.description,
      'category', v_listing.category,
      'brand', v_listing.brand,
      'size', v_listing.size,
      'condition', v_listing.condition,
      'image_urls', v_listing.image_urls,
      'price_cents', v_listing.price_cents,
      'shipping_price_cents', v_listing.shipping_price_cents,
      'currency', v_listing.currency
    ),
    now() + interval '30 minutes'
  ) returning * into v_order;

  update public.marketplace_listings
  set status = 'reserved', reserved_until = v_order.reserved_expires_at
  where id = v_listing.id;

  insert into public.order_events(order_id, event_type, actor_id, metadata)
  values (v_order.id, 'checkout_started', p_buyer_id, jsonb_build_object('listing_id', v_listing.id));

  return v_order;
end;
$$;

revoke all on function public.reserve_marketplace_listing(uuid, uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.reserve_marketplace_listing(uuid, uuid, jsonb, integer) to service_role;

-- RLS -------------------------------------------------------------------------
alter table public.seller_accounts enable row level security;
alter table public.seller_onboarding_sessions enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.stripe_events enable row level security;
alter table public.marketplace_reports enable row level security;
alter table public.user_blocks enable row level security;

-- Drop known policies so the script is safe to run again.
drop policy if exists "Seller can view own Stripe status" on public.seller_accounts;
drop policy if exists "Marketplace listings are discoverable" on public.marketplace_listings;
drop policy if exists "Seller can create own listings" on public.marketplace_listings;
drop policy if exists "Seller can edit open listings" on public.marketplace_listings;
drop policy if exists "Seller can delete drafts" on public.marketplace_listings;
drop policy if exists "Order parties can view orders" on public.orders;
drop policy if exists "Order parties can view events" on public.order_events;
drop policy if exists "Users can create reports" on public.marketplace_reports;
drop policy if exists "Users can view own reports" on public.marketplace_reports;
drop policy if exists "Users can view own blocks" on public.user_blocks;
drop policy if exists "Users can create own blocks" on public.user_blocks;
drop policy if exists "Users can remove own blocks" on public.user_blocks;

create policy "Seller can view own Stripe status"
  on public.seller_accounts for select
  using (auth.uid() = user_id);

create policy "Marketplace listings are discoverable"
  on public.marketplace_listings for select
  using (
    seller_id = auth.uid()
    or (
      status = 'active'
      and auth.uid() is not null
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = seller_id)
           or (b.blocker_id = seller_id and b.blocked_id = auth.uid())
      )
    )
  );

create policy "Seller can create own listings"
  on public.marketplace_listings for insert
  with check (
    auth.uid() = seller_id
    and status in ('draft','active')
    and (
      status = 'draft'
      or exists (
        select 1 from public.seller_accounts sa
        where sa.user_id = auth.uid()
          and sa.details_submitted
          and sa.charges_enabled
          and sa.payouts_enabled
      )
    )
  );

create policy "Seller can edit open listings"
  on public.marketplace_listings for update
  using (auth.uid() = seller_id and status in ('draft','active'))
  with check (
    auth.uid() = seller_id
    and status in ('draft','active','archived')
    and (
      status <> 'active'
      or exists (
        select 1 from public.seller_accounts sa
        where sa.user_id = auth.uid()
          and sa.details_submitted
          and sa.charges_enabled
          and sa.payouts_enabled
      )
    )
  );

create policy "Seller can delete drafts"
  on public.marketplace_listings for delete
  using (auth.uid() = seller_id and status = 'draft');

create policy "Order parties can view orders"
  on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Order parties can view events"
  on public.order_events for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

create policy "Users can create reports"
  on public.marketplace_reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
  on public.marketplace_reports for select
  using (auth.uid() = reporter_id);

create policy "Users can view own blocks"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

create policy "Users can create own blocks"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

create policy "Users can remove own blocks"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

-- Realtime order updates are optional but useful for PaymentSheet/webhook status.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
end $$;

-- Helpful comments for future maintainers.
comment on table public.marketplace_listings is 'Public sale listings separated from private wardrobe items.';
comment on table public.orders is 'Buyer/seller order records. Writes are controlled by Stripe Edge Functions.';
comment on table public.stripe_events is 'Stripe webhook idempotency ledger; service-role access only.';
