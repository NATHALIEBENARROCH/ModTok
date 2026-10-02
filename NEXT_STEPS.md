# ModTok: where we are and what's next

## Done (as of Oct 2)
- App on your iPhone through TestFlight (build 4)
- Supabase project resumed (it had paused; that caused "Network request failed")
- Database permissions fixed (seller setup, checkout and orders were all blocked)
- Seller setup rewritten for Stripe's current method; tested: **"Payouts ready"** works
- "Outfit saved" message with a link to saved outfits (in the next build)
- Real error messages instead of "Edge Function returned a non-2xx status code" (in the next build)
- Website live, App Store text and privacy answers filled in
- Decision: **launch US-only first (Option A)**, add Canada in the next update

## Next session, in this order
1. **Build the new version.** In Terminal:
   ```bash
   cd ~/Desktop/modtok
   npx eas-cli@latest build --platform ios --profile production --auto-submit
   ```
   About 30 minutes. It arrives in TestFlight as 1.0.0 (5). Update the app on your iPhone.
2. **Test one full sale in test mode** (10 minutes): list an item for $20; with a second account buy it
   using card `4242 4242 4242 4242`, any future date, any 3 digits, a US address; mark it shipped.
3. **Take 3–5 screenshots** on your iPhone: closet, Style, Saved, marketplace, Sell. Send them to Claude.
4. **Create the reviewer account** in the app (e.g. nb26+review@me.com), add a few clothes.
5. With Claude: upload screenshots, select build 5, enter the reviewer login, choose
   **Manually release this version**, then **Add for Review**.

## Before the app is public (while Apple reviews)
- Stripe **Live**: finish Connect setup, then run `bash scripts/go_live_stripe.sh` (see GO_LIVE_PAYMENTS.md)
- Supabase **Pro** plan, so the project never pauses again
- Open the app every few days until then, to keep the free Supabase project awake

## After approval
- Add **Canada** (sellers and buyers) as version 1.1
- New visual website from your pitch deck, and the editable investor deck
