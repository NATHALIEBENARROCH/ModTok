-- ModTok: give the server and signed-in users access to the marketplace tables.
-- Run ONCE in Supabase > SQL Editor. Safe to run again.
--
-- Why: these tables were created without table privileges, so the server functions
-- failed with "permission denied for table seller_accounts" (error 42501).
-- Row-level security stays ON, so users still only see what the policies allow.

-- Server functions (seller setup, checkout, orders, webhook, account deletion)
grant all on table
  public.seller_accounts,
  public.seller_onboarding_sessions,
  public.marketplace_listings,
  public.orders,
  public.order_events,
  public.stripe_events,
  public.marketplace_reports,
  public.user_blocks
to service_role;

-- Signed-in app users, limited to what the row-level security policies permit
grant select on table public.seller_accounts to authenticated;
grant select, insert, update, delete on table public.marketplace_listings to authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_events to authenticated;
grant select, insert on table public.marketplace_reports to authenticated;
grant select, insert, update, delete on table public.user_blocks to authenticated;
