-- ModTok — run ONCE in the Supabase SQL Editor right after switching Stripe to LIVE.
--
-- Why: seller Stripe accounts and orders created during Sandbox testing only exist
-- in Stripe's test environment. Live Stripe cannot see them, so they must be cleared.
-- What stays: all users, closets, outfits, stories and marketplace listings.
-- After this, each seller taps "Set up payouts" on the Sell tab once to connect
-- a real Stripe account. Until they do, their listings cannot be bought.

begin;

-- Test orders and their history
delete from public.order_events;
delete from public.orders;

-- Listings that were "reserved" or "sold" in test purchases go back on sale
update public.marketplace_listings
   set status = 'active', reserved_until = null, sold_at = null, updated_at = now()
 where status in ('reserved', 'sold');

-- Test-mode Stripe seller links and onboarding sessions
delete from public.seller_onboarding_sessions;
delete from public.seller_accounts;

-- Test webhook log
delete from public.stripe_events;

commit;
