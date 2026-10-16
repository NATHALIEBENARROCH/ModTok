-- ============================================================
-- ModTok 1.1: shipping labels, outfit listings, buyer bundles
--
-- Run ONCE in the Supabase SQL Editor, AFTER Apple approves 1.0 and
-- right before deploying the 1.1 server functions. Safe to re-run.
-- Requires modtok_marketplace_complete_setup.sql to have been run first.
--
-- What it adds
--   1. Package sizes (Small / Medium / Large) with ModTok-set shipping prices.
--      The buyer pays shipping; ModTok buys the prepaid label (Shippo) and the
--      seller just prints it and drops the package off.
--   2. Outfit listings: a seller sells a saved outfit as one item, and decides
--      whether each piece can ALSO be bought on its own.
--   3. Buyer bundles: buy several items from one seller in one checkout, with
--      one shipping label and an optional seller bundle discount.
-- ============================================================

-- 1. SHIPPING RATES ------------------------------------------------------------
-- Prices buyers pay. ModTok uses this money to buy the label, so keep these
-- at or above what Shippo charges (check Shippo's rate calculator).
create table if not exists public.shipping_rates (
  package_size text primary key check (package_size in ('small','medium','large')),
  label text not null,
  examples text not null,
  price_cents integer not null check (price_cents >= 0),
  weight_oz integer not null check (weight_oz > 0),
  length_in numeric(5,1) not null,
  width_in numeric(5,1) not null,
  height_in numeric(5,1) not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.shipping_rates (package_size, label, examples, price_cents, weight_oz, length_in, width_in, height_in, sort_order) values
  ('small',  'Small',  'T-shirts, tops, jewelry, small accessories', 599,  16, 10, 8, 2, 1),
  ('medium', 'Medium', 'Dresses, jeans, sweaters, shoes, bags',       999,  48, 14, 11, 4, 2),
  ('large',  'Large',  'Coats, boots, outfits and bundles',          1499,  80, 18, 14, 6, 3)
on conflict (package_size) do nothing;

alter table public.shipping_rates enable row level security;
drop policy if exists "Shipping rates are public" on public.shipping_rates;
create policy "Shipping rates are public" on public.shipping_rates for select using (true);
grant select on table public.shipping_rates to anon, authenticated;
grant all on table public.shipping_rates to service_role;

-- 2. LISTING COLUMNS -------------------------------------------------------------
alter table public.marketplace_listings add column if not exists listing_kind text not null default 'item';
alter table public.marketplace_listings add column if not exists package_size text not null default 'medium';
alter table public.marketplace_listings add column if not exists outfit_id uuid references public.outfits(id) on delete set null;
alter table public.marketplace_listings add column if not exists allow_separate_sale boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'marketplace_listings_kind_check') then
    alter table public.marketplace_listings
      add constraint marketplace_listings_kind_check check (listing_kind in ('item','outfit'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'marketplace_listings_package_size_check') then
    alter table public.marketplace_listings
      add constraint marketplace_listings_package_size_check check (package_size in ('small','medium','large'));
  end if;
end $$;

-- Pieces inside an outfit listing. piece_listing_id is set when the seller
-- allowed that piece to also be sold on its own.
create table if not exists public.marketplace_outfit_pieces (
  outfit_listing_id uuid not null,
  position integer not null,
  closet_item_id uuid,
  piece_listing_id uuid,
  title text not null,
  category text,
  brand text,
  size text,
  image_url text,
  created_at timestamptz not null default now(),
  constraint marketplace_outfit_pieces_pkey primary key (outfit_listing_id, position),
  constraint marketplace_outfit_pieces_outfit_fkey
    foreign key (outfit_listing_id) references public.marketplace_listings(id) on delete cascade,
  constraint marketplace_outfit_pieces_piece_listing_fkey
    foreign key (piece_listing_id) references public.marketplace_listings(id) on delete set null,
  constraint marketplace_outfit_pieces_closet_item_fkey
    foreign key (closet_item_id) references public.closet_items(id) on delete set null
);
create index if not exists marketplace_outfit_pieces_piece_idx on public.marketplace_outfit_pieces(piece_listing_id);
create index if not exists marketplace_outfit_pieces_item_idx on public.marketplace_outfit_pieces(closet_item_id);

alter table public.marketplace_outfit_pieces enable row level security;
drop policy if exists "Outfit pieces follow listing visibility" on public.marketplace_outfit_pieces;
create policy "Outfit pieces follow listing visibility"
  on public.marketplace_outfit_pieces for select
  using (exists (select 1 from public.marketplace_listings l where l.id = outfit_listing_id));
grant select on table public.marketplace_outfit_pieces to authenticated;
grant all on table public.marketplace_outfit_pieces to service_role;

-- Shipping price always comes from the package size (the app cannot set it),
-- outfits can only be created through create_outfit_listing(), and a piece that
-- belongs to an outfit-only listing cannot be listed again on its own.
create or replace function public.marketplace_listing_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate integer;
begin
  if tg_op = 'UPDATE' then
    if new.listing_kind is distinct from old.listing_kind or new.outfit_id is distinct from old.outfit_id then
      raise exception 'A listing cannot be changed between an item and an outfit.';
    end if;
  end if;

  if tg_op = 'INSERT' and new.listing_kind = 'outfit'
     and coalesce(current_setting('modtok.creating_outfit', true), '') <> 'on' then
    raise exception 'Outfits must be listed with the Sell an Outfit flow.';
  end if;

  if tg_op = 'INSERT' and new.listing_kind = 'item' and new.closet_item_id is not null
     and coalesce(current_setting('modtok.creating_outfit', true), '') <> 'on'
     and exists (
       select 1
       from public.marketplace_outfit_pieces p
       join public.marketplace_listings o on o.id = p.outfit_listing_id
       where p.closet_item_id = new.closet_item_id
         and p.piece_listing_id is null
         and o.status in ('draft','active','reserved')
     ) then
    raise exception 'This piece is part of an outfit listing that is sold only as a whole.';
  end if;

  select price_cents into v_rate from public.shipping_rates where package_size = new.package_size;
  if v_rate is null then
    raise exception 'Choose a package size: small, medium, or large.';
  end if;
  new.shipping_price_cents := v_rate;
  return new;
end;
$$;

drop trigger if exists marketplace_listing_guard on public.marketplace_listings;
create trigger marketplace_listing_guard
before insert or update on public.marketplace_listings
for each row execute function public.marketplace_listing_guard();

-- Apply the new shipping prices to listings that are still for sale.
update public.marketplace_listings
set package_size = package_size
where status in ('draft','active');

-- 3. SELLER SETTINGS ---------------------------------------------------------------
-- Private: where the seller ships from (printed on the label).
create table if not exists public.seller_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ship_from jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_settings enable row level security;
drop policy if exists "Sellers manage own settings" on public.seller_settings;
create policy "Sellers manage own settings"
  on public.seller_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update on table public.seller_settings to authenticated;
grant all on table public.seller_settings to service_role;

-- Public: each seller's bundle discount (like Vinted). No row = bundles allowed, no discount.
create table if not exists public.seller_bundle_discounts (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  two_items_bps integer not null default 1000 check (two_items_bps between 0 and 5000),
  three_items_bps integer not null default 1500 check (three_items_bps between 0 and 5000),
  five_items_bps integer not null default 2000 check (five_items_bps between 0 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seller_bundle_discounts enable row level security;
drop policy if exists "Bundle discounts are visible" on public.seller_bundle_discounts;
drop policy if exists "Sellers create own bundle discount" on public.seller_bundle_discounts;
drop policy if exists "Sellers update own bundle discount" on public.seller_bundle_discounts;
create policy "Bundle discounts are visible"
  on public.seller_bundle_discounts for select using (auth.uid() is not null);
create policy "Sellers create own bundle discount"
  on public.seller_bundle_discounts for insert with check (auth.uid() = seller_id);
create policy "Sellers update own bundle discount"
  on public.seller_bundle_discounts for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
grant select, insert, update on table public.seller_bundle_discounts to authenticated;
grant all on table public.seller_bundle_discounts to service_role;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'seller_settings_set_updated_at') then
    create trigger seller_settings_set_updated_at before update on public.seller_settings
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'seller_bundle_discounts_set_updated_at') then
    create trigger seller_bundle_discounts_set_updated_at before update on public.seller_bundle_discounts
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- 4. ORDERS: kinds, discounts, labels -------------------------------------------
alter table public.orders add column if not exists order_kind text not null default 'single';
alter table public.orders add column if not exists discount_amount_cents integer not null default 0;
alter table public.orders add column if not exists platform_shipping_cents integer not null default 0;
alter table public.orders add column if not exists package_size text;
alter table public.orders add column if not exists label_status text not null default 'none';
alter table public.orders add column if not exists label_url text;
alter table public.orders add column if not exists label_error text;
alter table public.orders add column if not exists label_cost_cents integer;
alter table public.orders add column if not exists label_created_at timestamptz;
alter table public.orders add column if not exists shippo_shipment_id text;
alter table public.orders add column if not exists shippo_transaction_id text;

do $$
declare
  v_name text;
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_kind_check') then
    alter table public.orders add constraint orders_kind_check check (order_kind in ('single','outfit','bundle'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_label_status_check') then
    alter table public.orders add constraint orders_label_status_check
      check (label_status in ('none','pending','purchased','failed','refunded'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_discount_check') then
    alter table public.orders add constraint orders_discount_check
      check (discount_amount_cents >= 0 and platform_shipping_cents >= 0);
  end if;

  -- The seller no longer receives the shipping money (ModTok pays for the label),
  -- so the payout rule becomes: total - ModTok fee - label money.
  if not exists (select 1 from pg_constraint where conname = 'orders_seller_net_check') then
    for v_name in
      select conname from pg_constraint
      where conrelid = 'public.orders'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) like '%seller_net_cents = %'
    loop
      execute format('alter table public.orders drop constraint %I', v_name);
    end loop;
    alter table public.orders add constraint orders_seller_net_check
      check (seller_net_cents = total_amount_cents - platform_fee_cents - platform_shipping_cents);
  end if;
end $$;

create index if not exists orders_shippo_transaction_idx on public.orders(shippo_transaction_id);
create index if not exists orders_tracking_number_idx on public.orders(tracking_number);

-- Every listing an order touches. 'purchased' = what the buyer is buying.
-- 'linked' = held back during checkout and unlisted after the sale
-- (the separate pieces of a purchased outfit, or the outfit a purchased piece belongs to).
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  role text not null default 'purchased' check (role in ('purchased','linked')),
  price_cents integer not null default 0 check (price_cents >= 0),
  listing_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_listing_idx on public.order_items(listing_id);

alter table public.order_items enable row level security;
drop policy if exists "Order parties can view items" on public.order_items;
create policy "Order parties can view items"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
  ));
grant select on table public.order_items to authenticated;
grant all on table public.order_items to service_role;

-- 5. CHECKOUT FUNCTIONS (server only) --------------------------------------------

-- Cancels a pending checkout and puts every listing it held back on sale again.
create or replace function public.release_order_reservation(p_order_id uuid, p_event text default 'checkout_released')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  update public.orders
  set status = 'canceled', canceled_at = now()
  where id = p_order_id and status = 'pending_payment'
  returning * into v_order;
  if not found then
    return false;
  end if;

  update public.marketplace_listings
  set status = 'active', reserved_until = null
  where status = 'reserved'
    and (
      id = v_order.listing_id
      or id in (select oi.listing_id from public.order_items oi where oi.order_id = p_order_id)
    );

  insert into public.order_events(order_id, event_type, metadata)
  values (p_order_id, p_event, '{}'::jsonb);
  return true;
end;
$$;

-- Releases checkouts that ran out of time on any of these listings.
create or replace function public.release_expired_reservations(p_listing_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  for v_order_id in
    select distinct o.id
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    where o.status = 'pending_payment'
      and o.reserved_expires_at < now()
      and (o.listing_id = any(p_listing_ids) or oi.listing_id = any(p_listing_ids))
  loop
    perform public.release_order_reservation(v_order_id, 'checkout_expired');
  end loop;

  update public.marketplace_listings
  set status = 'active', reserved_until = null
  where id = any(p_listing_ids) and status = 'reserved' and reserved_until < now();
end;
$$;

-- Holds one or more listings from ONE seller for 30 minutes and creates the order.
-- One listing = a single item or an outfit. Several = a buyer-built bundle.
-- All prices, discounts and shipping are decided here, never by the app.
create or replace function public.reserve_marketplace_cart(
  p_listing_ids uuid[],
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
  v_ids uuid[];
  v_linked uuid[];
  v_all uuid[];
  v_count integer;
  v_listing public.marketplace_listings%rowtype;
  v_seller uuid;
  v_order public.orders%rowtype;
  v_old_order_id uuid;
  v_subtotal integer := 0;
  v_discount_bps integer := 0;
  v_discount integer := 0;
  v_items_total integer;
  v_shipping integer;
  v_fee integer;
  v_kind text;
  v_size text;
  v_size_rank integer := 0;
  v_rank integer;
  v_pieces integer := 0;
  v_piece_count integer;
  v_snapshot jsonb;
  v_snapshots jsonb := '[]'::jsonb;
  v_images text[] := '{}';
  v_settings public.seller_bundle_discounts%rowtype;
  v_title text;
begin
  if p_platform_fee_bps < 0 or p_platform_fee_bps > 5000 then
    raise exception 'Invalid platform fee configuration';
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_ids
  from unnest(p_listing_ids) as x where x is not null;
  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count = 0 then
    raise exception 'Choose at least one item.';
  end if;
  if v_count > 20 then
    raise exception 'A bundle can have up to 20 items.';
  end if;

  -- A piece and the outfit it belongs to cannot be bought together.
  if exists (
    select 1 from public.marketplace_outfit_pieces p
    where p.outfit_listing_id = any(v_ids) and p.piece_listing_id = any(v_ids)
  ) then
    raise exception 'This bundle has a piece that is already included in an outfit you chose.';
  end if;

  -- Listings to hold back so nobody else can buy an overlapping piece meanwhile.
  select coalesce(array_agg(distinct linked_id), '{}') into v_linked
  from (
    select p.piece_listing_id as linked_id
    from public.marketplace_outfit_pieces p
    where p.outfit_listing_id = any(v_ids) and p.piece_listing_id is not null
    union
    select p.outfit_listing_id
    from public.marketplace_outfit_pieces p
    join public.marketplace_listings o on o.id = p.outfit_listing_id
    where p.piece_listing_id = any(v_ids) and o.status in ('active','reserved')
  ) linked
  where not (linked_id = any(v_ids));

  v_all := v_ids || v_linked;
  perform public.release_expired_reservations(v_all);

  -- Lock every listing involved, always in the same order.
  perform 1 from public.marketplace_listings where id = any(v_all) order by id for update;

  -- If this buyer already has an open checkout for exactly these items, reuse it.
  select o.* into v_order
  from public.orders o
  where o.buyer_id = p_buyer_id
    and o.status = 'pending_payment'
    and o.reserved_expires_at > now()
    and exists (select 1 from public.order_items oi where oi.order_id = o.id)
    and (select array_agg(oi.listing_id order by oi.listing_id) from public.order_items oi
         where oi.order_id = o.id and oi.role = 'purchased')
        = (select array_agg(x order by x) from unnest(v_ids) x)
  order by o.created_at desc
  limit 1;
  if found then
    return v_order;
  end if;

  -- Any other open checkout of this buyer that holds these items is replaced.
  for v_old_order_id in
    select distinct o.id
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    where o.buyer_id = p_buyer_id
      and o.status = 'pending_payment'
      and (o.listing_id = any(v_all) or oi.listing_id = any(v_all))
  loop
    perform public.release_order_reservation(v_old_order_id, 'checkout_replaced');
  end loop;

  for v_listing in
    select * from public.marketplace_listings where id = any(v_ids) order by created_at
  loop
    if v_listing.status <> 'active' then
      raise exception '"%" is no longer available.', v_listing.title;
    end if;
    if v_listing.seller_id = p_buyer_id then
      raise exception 'You cannot purchase your own listing.';
    end if;
    if v_seller is null then
      v_seller := v_listing.seller_id;
    elsif v_seller is distinct from v_listing.seller_id then
      raise exception 'A bundle can only include items from one seller.';
    end if;

    v_subtotal := v_subtotal + v_listing.price_cents;
    v_rank := case v_listing.package_size when 'small' then 1 when 'medium' then 2 else 3 end;
    v_size_rank := greatest(v_size_rank, v_rank);

    if v_listing.listing_kind = 'outfit' then
      select count(*) into v_piece_count from public.marketplace_outfit_pieces where outfit_listing_id = v_listing.id;
      v_pieces := v_pieces + greatest(v_piece_count, 1);
    else
      v_pieces := v_pieces + 1;
    end if;

    v_snapshot := jsonb_build_object(
      'id', v_listing.id,
      'listing_kind', v_listing.listing_kind,
      'title', v_listing.title,
      'description', v_listing.description,
      'category', v_listing.category,
      'brand', v_listing.brand,
      'size', v_listing.size,
      'condition', v_listing.condition,
      'image_urls', v_listing.image_urls,
      'price_cents', v_listing.price_cents,
      'package_size', v_listing.package_size,
      'currency', v_listing.currency,
      'pieces', coalesce((
        select jsonb_agg(jsonb_build_object('title', p.title, 'category', p.category, 'size', p.size, 'image_url', p.image_url) order by p.position)
        from public.marketplace_outfit_pieces p where p.outfit_listing_id = v_listing.id
      ), '[]'::jsonb)
    );
    v_snapshots := v_snapshots || jsonb_build_array(v_snapshot);
    if coalesce(array_length(v_listing.image_urls, 1), 0) > 0 then
      v_images := v_images || v_listing.image_urls[1];
    end if;
  end loop;

  if (select count(*) from public.marketplace_listings
      where id = any(v_linked) and status not in ('active','archived','draft')) > 0 then
    raise exception 'Part of this outfit is being bought by someone else right now. Please try again later.';
  end if;

  if not exists (
    select 1 from public.seller_accounts sa
    where sa.user_id = v_seller and sa.details_submitted and sa.charges_enabled and sa.payouts_enabled
  ) then
    raise exception 'Seller payouts are not ready';
  end if;

  -- Package for the whole order: the biggest item decides, and more pieces need a bigger box.
  if v_count > 1 then
    if v_pieces >= 5 then
      v_size_rank := 3;
    elsif v_pieces >= 3 then
      v_size_rank := greatest(v_size_rank, 2);
    end if;
  end if;
  v_size := case v_size_rank when 1 then 'small' when 2 then 'medium' else 'large' end;
  select price_cents into v_shipping from public.shipping_rates where package_size = v_size;
  if v_shipping is null then
    raise exception 'Shipping rates are not set up.';
  end if;

  -- Seller's bundle discount applies when the buyer picks 2 or more listings.
  if v_count >= 2 then
    select * into v_settings from public.seller_bundle_discounts where seller_id = v_seller;
    if found and v_settings.enabled then
      v_discount_bps := case
        when v_count >= 5 then v_settings.five_items_bps
        when v_count >= 3 then v_settings.three_items_bps
        else v_settings.two_items_bps
      end;
    end if;
  end if;
  v_discount := round(v_subtotal * v_discount_bps / 10000.0);
  v_items_total := v_subtotal - v_discount;
  if v_items_total < 100 then
    raise exception 'The order total is too low.';
  end if;
  v_fee := round(v_items_total * p_platform_fee_bps / 10000.0);

  if v_count = 1 then
    v_kind := case when (v_snapshots -> 0 ->> 'listing_kind') = 'outfit' then 'outfit' else 'single' end;
    v_snapshot := (v_snapshots -> 0) || jsonb_build_object('shipping_price_cents', v_shipping);
  else
    v_kind := 'bundle';
    v_title := format('Bundle of %s items', v_count);
    v_snapshot := jsonb_build_object(
      'title', v_title,
      'listing_kind', 'bundle',
      'image_urls', to_jsonb(v_images),
      'price_cents', v_subtotal,
      'discount_bps', v_discount_bps,
      'shipping_price_cents', v_shipping,
      'package_size', v_size,
      'currency', 'usd',
      'items', v_snapshots
    );
  end if;

  insert into public.orders (
    listing_id, buyer_id, seller_id, status, currency, order_kind, package_size,
    item_amount_cents, discount_amount_cents, shipping_amount_cents, tax_amount_cents,
    platform_fee_cents, platform_shipping_cents, seller_net_cents, total_amount_cents,
    shipping_address, listing_snapshot, reserved_expires_at
  ) values (
    case when v_count = 1 then v_ids[1] else null end, p_buyer_id, v_seller, 'pending_payment', 'usd', v_kind, v_size,
    v_items_total, v_discount, v_shipping, 0,
    v_fee, v_shipping, v_items_total - v_fee, v_items_total + v_shipping,
    p_shipping_address, v_snapshot, now() + interval '30 minutes'
  ) returning * into v_order;

  insert into public.order_items(order_id, listing_id, role, price_cents, listing_snapshot)
  select v_order.id, (s ->> 'id')::uuid, 'purchased', (s ->> 'price_cents')::integer, s
  from jsonb_array_elements(v_snapshots) s;

  insert into public.order_items(order_id, listing_id, role)
  select v_order.id, l.id, 'linked'
  from public.marketplace_listings l
  where l.id = any(v_linked) and l.status = 'active';

  update public.marketplace_listings
  set status = 'reserved', reserved_until = v_order.reserved_expires_at
  where status = 'active'
    and id in (select oi.listing_id from public.order_items oi where oi.order_id = v_order.id);

  insert into public.order_events(order_id, event_type, actor_id, metadata)
  values (v_order.id, 'checkout_started', p_buyer_id,
          jsonb_build_object('listing_ids', to_jsonb(v_ids), 'kind', v_kind, 'discount_bps', v_discount_bps));

  return v_order;
end;
$$;

-- Payment confirmed: purchased listings become sold; linked listings are unlisted.
create or replace function public.complete_order_payment(p_order_id uuid, p_charge_id text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  update public.orders
  set status = 'paid', paid_at = now(), stripe_charge_id = coalesce(p_charge_id, stripe_charge_id)
  where id = p_order_id and status in ('pending_payment','processing')
  returning * into v_order;
  if not found then
    return null;
  end if;

  update public.marketplace_listings
  set status = 'sold', sold_at = now(), reserved_until = null
  where id = v_order.listing_id
     or id in (select oi.listing_id from public.order_items oi where oi.order_id = p_order_id and oi.role = 'purchased');

  update public.marketplace_listings
  set status = 'archived', reserved_until = null
  where status in ('active','reserved')
    and id in (select oi.listing_id from public.order_items oi where oi.order_id = p_order_id and oi.role = 'linked');

  return v_order;
end;
$$;

revoke all on function public.release_order_reservation(uuid, text) from public, anon, authenticated;
revoke all on function public.release_expired_reservations(uuid[]) from public, anon, authenticated;
revoke all on function public.reserve_marketplace_cart(uuid[], uuid, jsonb, integer) from public, anon, authenticated;
revoke all on function public.complete_order_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.release_order_reservation(uuid, text) to service_role;
grant execute on function public.release_expired_reservations(uuid[]) to service_role;
grant execute on function public.reserve_marketplace_cart(uuid[], uuid, jsonb, integer) to service_role;
grant execute on function public.complete_order_payment(uuid, text) to service_role;

-- 6. SELL AN OUTFIT (called from the app) ---------------------------------------
-- p_pieces: [{ "closet_item_id": "...", "price_cents": 2500, "package_size": "small", "condition": "good" }]
-- price_cents / package_size are only needed when p_allow_separate_sale is true.
create or replace function public.create_outfit_listing(
  p_outfit_id uuid,
  p_title text,
  p_description text,
  p_condition text,
  p_package_size text,
  p_price_cents integer,
  p_allow_separate_sale boolean,
  p_pieces jsonb
)
returns public.marketplace_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_outfit_owner uuid;
  v_look_image text;
  v_outfit public.marketplace_listings%rowtype;
  v_piece jsonb;
  v_item public.closet_items%rowtype;
  v_existing public.marketplace_listings%rowtype;
  v_piece_listing_id uuid;
  v_position integer := 0;
  v_images text[] := '{}';
  v_piece_count integer;
  v_piece_price integer;
begin
  if v_uid is null then
    raise exception 'Please sign in again.';
  end if;
  if not exists (
    select 1 from public.seller_accounts sa
    where sa.user_id = v_uid and sa.details_submitted and sa.charges_enabled and sa.payouts_enabled
  ) then
    raise exception 'Complete seller payout setup before listing an outfit.';
  end if;

  select user_id, look_image_url into v_outfit_owner, v_look_image
  from public.outfits where id = p_outfit_id;
  if v_outfit_owner is null or v_outfit_owner <> v_uid then
    raise exception 'Outfit not found.';
  end if;

  v_piece_count := coalesce(jsonb_array_length(p_pieces), 0);
  if v_piece_count < 2 then
    raise exception 'An outfit needs at least 2 pieces.';
  end if;
  if v_piece_count > 12 then
    raise exception 'An outfit can have up to 12 pieces.';
  end if;
  if p_price_cents is null or p_price_cents < 100 then
    raise exception 'Enter an outfit price of at least $1.00.';
  end if;

  perform set_config('modtok.creating_outfit', 'on', true);

  -- Collect piece photos first; the outfit photo goes in front when there is one.
  if v_look_image is not null then
    v_images := array[v_look_image];
  end if;

  insert into public.marketplace_listings (
    seller_id, listing_kind, outfit_id, allow_separate_sale, title, description, category,
    condition, image_urls, currency, price_cents, package_size, status
  ) values (
    v_uid, 'outfit', p_outfit_id, coalesce(p_allow_separate_sale, false),
    left(coalesce(nullif(trim(p_title), ''), 'Outfit'), 120), left(coalesce(p_description, ''), 2000), 'Outfits',
    coalesce(p_condition, 'good'), '{}', 'usd', p_price_cents, coalesce(p_package_size, 'large'), 'active'
  ) returning * into v_outfit;

  for v_piece in select * from jsonb_array_elements(p_pieces)
  loop
    select * into v_item from public.closet_items
    where id = (v_piece ->> 'closet_item_id')::uuid and user_id = v_uid;
    if not found then
      raise exception 'A piece in this outfit was not found in your wardrobe.';
    end if;
    if coalesce(v_item.image_url, '') = '' then
      raise exception '"%" needs a photo before it can be sold.', v_item.name;
    end if;
    if exists (
      select 1 from public.marketplace_outfit_pieces p
      join public.marketplace_listings o on o.id = p.outfit_listing_id
      where p.closet_item_id = v_item.id and o.id <> v_outfit.id and o.status in ('draft','active','reserved')
    ) then
      raise exception '"%" is already part of another outfit listing.', v_item.name;
    end if;

    v_piece_listing_id := null;
    select * into v_existing from public.marketplace_listings
    where closet_item_id = v_item.id and status in ('draft','active','reserved')
    order by created_at desc limit 1;

    if found then
      if not coalesce(p_allow_separate_sale, false) then
        raise exception '"%" is already listed on its own. Unlist it first, or let pieces also sell separately.', v_item.name;
      end if;
      if v_existing.status <> 'active' then
        raise exception '"%" is in someone''s checkout right now. Try again in a few minutes.', v_item.name;
      end if;
      v_piece_listing_id := v_existing.id;
    elsif coalesce(p_allow_separate_sale, false) then
      v_piece_price := (v_piece ->> 'price_cents')::integer;
      if v_piece_price is null or v_piece_price < 100 then
        raise exception 'Enter a price of at least $1.00 for "%".', v_item.name;
      end if;
      insert into public.marketplace_listings (
        closet_item_id, seller_id, listing_kind, title, description, category, brand, size,
        condition, image_urls, currency, price_cents, package_size, status
      ) values (
        v_item.id, v_uid, 'item', left(v_item.name, 120), '', v_item.category, v_item.brand, v_item.size,
        coalesce(v_piece ->> 'condition', p_condition, 'good'), array[v_item.image_url], 'usd', v_piece_price,
        coalesce(v_piece ->> 'package_size', 'small'), 'active'
      ) returning id into v_piece_listing_id;
    end if;

    insert into public.marketplace_outfit_pieces (
      outfit_listing_id, position, closet_item_id, piece_listing_id, title, category, brand, size, image_url
    ) values (
      v_outfit.id, v_position, v_item.id, v_piece_listing_id, v_item.name, v_item.category, v_item.brand, v_item.size, v_item.image_url
    );
    v_images := v_images || v_item.image_url;
    v_position := v_position + 1;
  end loop;

  update public.marketplace_listings
  set image_urls = v_images[1:10]
  where id = v_outfit.id
  returning * into v_outfit;

  perform set_config('modtok.creating_outfit', 'off', true);
  return v_outfit;
end;
$$;

revoke all on function public.create_outfit_listing(uuid, text, text, text, text, integer, boolean, jsonb) from public, anon;
grant execute on function public.create_outfit_listing(uuid, text, text, text, text, integer, boolean, jsonb) to authenticated;

comment on table public.order_items is 'Listings each order buys (purchased) or holds back and unlists after sale (linked).';
comment on table public.marketplace_outfit_pieces is 'Pieces of an outfit listing; piece_listing_id is set when the piece also sells on its own.';
comment on table public.shipping_rates is 'Buyer shipping price per package size. ModTok buys the label with this money.';
