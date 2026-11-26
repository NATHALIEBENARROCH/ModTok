-- Checkout holds: keep items visible, and never leave them stuck.
--
-- Before: starting checkout marked the item 'reserved', which hid it from the marketplace,
-- and the hold was only lifted when someone started a new checkout on that same item, which
-- nobody could do because it was hidden. So an abandoned checkout hid the item forever.
--
-- Now: the item stays 'active' (visible) while someone is checking out. The 30-minute hold
-- lives on the order instead, so a second buyer is told "Someone is checking out this item
-- right now" and two people can never pay for the same item. Abandoned holds are cleared
-- every 5 minutes. Safe to run more than once.

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

  -- Older checkouts hid the item by marking it 'reserved'; put any such item back on sale.
  update public.marketplace_listings
  set status = 'active'
  where id = p_listing_id and status = 'reserved';

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

  -- A checkout holds the item for 30 minutes but it stays visible in the marketplace.
  -- The same buyer coming back gets their open checkout; anyone else is told to wait.
  select * into v_order
  from public.orders
  where listing_id = p_listing_id
    and status = 'pending_payment'
    and reserved_expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    if v_order.buyer_id = p_buyer_id then
      return v_order;
    end if;
    raise exception 'Someone is checking out this item right now. Please try again in a few minutes.';
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
  set reserved_until = v_order.reserved_expires_at
  where id = v_listing.id;

  insert into public.order_events(order_id, event_type, actor_id, metadata)
  values (v_order.id, 'checkout_started', p_buyer_id, jsonb_build_object('listing_id', v_listing.id));

  return v_order;
end;
$$;

revoke all on function public.reserve_marketplace_listing(uuid, uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.reserve_marketplace_listing(uuid, uuid, jsonb, integer) to service_role;
create extension if not exists pg_cron;

create or replace function public.release_expired_checkouts()
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set status = 'canceled', canceled_at = now()
  where status = 'pending_payment'
    and reserved_expires_at < now();

  -- Items still hidden by an older checkout go back on sale unless they were paid for.
  update public.marketplace_listings l
  set status = 'active'
  where l.status = 'reserved'
    and not exists (
      select 1 from public.orders o
      where o.listing_id = l.id
        and o.status in ('paid', 'processing', 'shipped', 'delivered', 'refund_pending', 'disputed')
    );
$$;

revoke all on function public.release_expired_checkouts() from public, anon, authenticated;

-- Fix what is stuck right now (for example "Perfect pump").
select public.release_expired_checkouts();

-- Then keep doing it every 5 minutes.
select cron.schedule('release-expired-checkouts', '*/5 * * * *', 'select public.release_expired_checkouts()');
