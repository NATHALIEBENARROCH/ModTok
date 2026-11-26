-- Releases items stuck on "Checkout in progress".
--
-- A checkout holds the item for 30 minutes. Until now the hold was only lifted when someone
-- started a new checkout on that same item, but a held item is hidden from the marketplace, so
-- an abandoned checkout kept it hidden forever. This releases every expired hold now, and then
-- every 5 minutes. Safe to run more than once.

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

  update public.marketplace_listings l
  set status = 'active', reserved_until = null
  where l.status = 'reserved'
    and l.reserved_until < now()
    and not exists (
      select 1 from public.orders o
      where o.listing_id = l.id
        and o.status in ('paid', 'processing', 'shipped', 'delivered', 'refund_pending', 'disputed')
    );
$$;

revoke all on function public.release_expired_checkouts() from public, anon, authenticated;

-- Release what is stuck right now.
select public.release_expired_checkouts();

-- Then keep doing it every 5 minutes.
select cron.schedule('release-expired-checkouts', '*/5 * * * *', 'select public.release_expired_checkouts()');
