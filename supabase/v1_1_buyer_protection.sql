-- ============================================================
-- ModTok 1.1: No seller fees + Buyer Protection (like Vinted)
--
-- Run ONCE in the Supabase SQL Editor, AFTER
-- v1_1_shipping_outfits_bundles.sql, and BEFORE deploying the
-- updated marketplace-checkout server function. Safe to re-run.
--
-- Sellers keep 100% of their item price. The buyer pays a
-- Buyer Protection fee at checkout: $0.70 + 5% of the items
-- (after any bundle discount, never on shipping). The amounts are
-- set by the server (BUYER_PROTECTION_FIXED_CENTS and
-- BUYER_PROTECTION_BPS), so they can change without an app update.
--
-- Older orders are not changed: they keep their 10% seller fee.
-- ============================================================

-- How much of an order was the buyer's Buyer Protection fee (0 on older orders).
alter table public.orders add column if not exists buyer_protection_cents integer not null default 0;
do $$
declare
  v_name text;
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_buyer_protection_check') then
    alter table public.orders add constraint orders_buyer_protection_check
      check (buyer_protection_cents >= 0 and buyer_protection_cents <= platform_fee_cents);
  end if;

  -- The buyer now pays the fee on top, so the total rule becomes:
  -- items + shipping + tax + Buyer Protection.
  if not exists (select 1 from pg_constraint where conname = 'orders_total_check') then
    for v_name in
      select conname from pg_constraint
      where conrelid = 'public.orders'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) like '%(total_amount_cents = %'
    loop
      execute format('alter table public.orders drop constraint %I', v_name);
    end loop;
    alter table public.orders add constraint orders_total_check
      check (total_amount_cents = item_amount_cents + shipping_amount_cents + tax_amount_cents + buyer_protection_cents);
  end if;
end $$;

-- Same as reserve_marketplace_cart, but the fee is paid by the buyer on top of the
-- price instead of being taken from the seller. ModTok's share is still recorded in
-- platform_fee_cents, so payouts, refunds and the seller-net check work unchanged.
-- The old function is left in place so checkout keeps working until the new server
-- function is deployed.
create or replace function public.reserve_marketplace_cart_with_buyer_fee(
  p_listing_ids uuid[],
  p_buyer_id uuid,
  p_shipping_address jsonb,
  p_buyer_fee_fixed_cents integer default 70,
  p_buyer_fee_bps integer default 500
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
  if p_buyer_fee_fixed_cents < 0 or p_buyer_fee_fixed_cents > 1000
     or p_buyer_fee_bps < 0 or p_buyer_fee_bps > 2000 then
    raise exception 'Invalid Buyer Protection fee configuration';
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
  -- Buyer Protection: a fixed amount plus a percentage of the items (not shipping).
  -- The buyer pays it on top; the seller keeps the full item price.
  v_fee := p_buyer_fee_fixed_cents + round(v_items_total * p_buyer_fee_bps / 10000.0);

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
    platform_fee_cents, buyer_protection_cents, platform_shipping_cents, seller_net_cents, total_amount_cents,
    shipping_address, listing_snapshot, reserved_expires_at
  ) values (
    case when v_count = 1 then v_ids[1] else null end, p_buyer_id, v_seller, 'pending_payment', 'usd', v_kind, v_size,
    v_items_total, v_discount, v_shipping, 0,
    v_fee, v_fee, v_shipping, v_items_total, v_items_total + v_shipping + v_fee,
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
          jsonb_build_object('listing_ids', to_jsonb(v_ids), 'kind', v_kind, 'discount_bps', v_discount_bps,
                             'buyer_protection_cents', v_fee));

  return v_order;
end;
$$;

revoke all on function public.reserve_marketplace_cart_with_buyer_fee(uuid[], uuid, jsonb, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_marketplace_cart_with_buyer_fee(uuid[], uuid, jsonb, integer, integer) to service_role;
