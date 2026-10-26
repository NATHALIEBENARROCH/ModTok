# ModTok — No Seller Fees + Buyer Protection (like Vinted)

ModTok now works the way Vinted does:

- **Sellers pay nothing.** They keep 100% of their price (after any bundle discount they offer).
- **Buyers pay a Buyer Protection fee** on each order: **$0.70 + 5% of the item price**.
  Shipping is not included in the 5%. The fee is shown on the item page and at checkout,
  and tapping it explains what it covers.
- A full refund gives the buyer back everything: item, shipping and the Buyer Protection fee.
- Free AI try-ons are now **3 per person per day** (was 10), to keep costs low.

## Money per order (example: $30 jacket, Medium box)

| | |
|---|---|
| Buyer pays | $30.00 + $9.99 shipping + $2.20 Buyer Protection = **$42.19** |
| Seller receives | **$30.00** |
| ModTok keeps | $2.20 Buyer Protection + $9.99 shipping (pays the label) |

Stripe's card fee (about 2.9% + $0.30 of the whole payment, here about $1.52) comes out of
ModTok's share, so ModTok earns about **$0.70** on this order before label costs. That is less
than the old 10% seller fee, which is the trade-off for "No seller fees". The fee can be raised
later without a new app version (see "Changing the fee").

## Turning it on — in this order

Orders already paid keep the old 10% seller fee. Nothing changes for them.

1. **Database.** Supabase → **SQL Editor → New query** → paste all of
   `supabase/v1_1_buyer_protection.sql` → **Run**. Safe to run again.
2. **Server.** In **Terminal** on your Mac:

   ```bash
   cd ~/Desktop/modtok
   npx --yes supabase@latest secrets set --project-ref nfklspshcnthsoholtjc \
     BUYER_PROTECTION_FIXED_CENTS=70 BUYER_PROTECTION_BPS=500 TRYON_DAILY_LIMIT=3
   npx --yes supabase@latest functions deploy marketplace-checkout --project-ref nfklspshcnthsoholtjc
   npx --yes supabase@latest functions deploy virtual-try-on --project-ref nfklspshcnthsoholtjc
   ```

   From this moment, new checkouts charge the buyer the fee and pay the seller the full price.
3. **App.** Build and submit the new app version. It shows the Buyer Protection line on the
   item page and at checkout, and tells sellers "No seller fees". Until people update, the old
   app shows a total without the fee, but Stripe's payment sheet always shows the real amount
   before anyone pays.
4. **Website.** Rebuild and upload the website so the new Terms and Refund Policy are online.

## Changing the fee

The fee lives on the server, so no app update is needed for the charge itself:

```bash
npx --yes supabase@latest secrets set --project-ref nfklspshcnthsoholtjc \
  BUYER_PROTECTION_FIXED_CENTS=70 BUYER_PROTECTION_BPS=500
```

`70` means $0.70 and `500` means 5%. If you change it, also change the two numbers at the top
of the Buyer Protection section in `src/types/marketplace.ts` (so the app shows the same amount)
and the Terms.

## Coming next: Vinted-style boosts

Vinted also earns from **Bumps** (a listing shown higher in the feed for 3 or 7 days) and
**Closet Spotlight** (a seller's whole closet featured for 7 days, needs 5+ listings). On iPhone,
Apple requires these to be paid with **in-app purchase**, because they are digital features used
inside the app; Apple keeps 15% if ModTok joins the App Store Small Business Program. That needs
products set up in App Store Connect and Google Play, so it is a separate step.
