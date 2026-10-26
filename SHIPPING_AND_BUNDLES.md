# ModTok 1.1: Prepaid shipping labels, outfit sales, bundles

Built Oct 16, 2026 on the branch `feature/shipping-labels-outfit-bundles`.
**Do not switch anything on until Apple has approved 1.0.**

## What's new

**1. Vinted-style shipping**
- Sellers pick a package size instead of typing a shipping price:
  Small $5.99 · Medium $9.99 · Large $14.99 (edit prices in the `shipping_rates` table).
- The buyer pays shipping at checkout. ModTok keeps that money and uses it to buy the label.
- When the payment goes through, ModTok buys the cheapest USPS label (Shippo) from the
  seller's address to the buyer. The seller sees **Open label** in My Sales, prints it,
  drops the package off, and taps **I dropped it off**.
- When the carrier scans the package, the order turns **Shipped**; on arrival, **Delivered**.
- If a label can't be made (no address, Shippo not set up), the seller sees why, can tap
  **Get label** again, or ship another way and add tracking by hand (the old way still works).
- Refunding an order that hasn't shipped also refunds the unused label.

**2. Sell a whole outfit** (Sell → **Sell an Outfit**)
- Pick a saved outfit, set one price, condition, and package size.
- Switch **Pieces can also sell separately** on or off:
  - **Off:** buyers can only buy the full look; the pieces can't be listed alone.
  - **On:** each piece also gets its own listing (or reuses one that already exists).
    During a checkout, the outfit and its pieces are held together, and when one sells the
    other comes off the marketplace automatically.

**3. Buyer bundles** (like Vinted)
- On any item: **Add to bundle**. Keep shopping that seller's closet, then **Review**.
- One checkout, one package, one label. The box size grows with the number of pieces.
- Sellers set their bundle discount in **Sell → Shipping & bundles** (default 10% for 2 items,
  15% for 3–4, 20% for 5+; can be turned off).

**Also new:** Sell → **Shipping & bundles**, where the seller adds the ship-from address
(required before listing) and bundle discounts.

## Money per order (example: $50 outfit, Large box)
| | |
|---|---|
| Buyer pays | $50.00 + $14.99 shipping + $3.20 Buyer Protection ($0.70 + 5%) = **$68.19** |
| ModTok keeps | $3.20 Buyer Protection + $14.99 shipping (pays the label) |
| Seller receives | **$50.00** (no seller fees) |

ModTok's profit or loss on shipping = shipping charged − actual label cost (saved on each order
as `label_cost_cents`). Check these after the first sales and adjust `shipping_rates` if needed.

## Turning it on — in this order, after Apple approves 1.0

1. **Shippo account** — sign up at goshippo.com (free, pay per label). Settings → API →
   copy the **test** token (`shippo_test_...`). Labels made with it are free test labels.
2. **Database** — Supabase → SQL Editor → paste all of
   `supabase/v1_1_shipping_outfits_bundles.sql` → Run. Safe to run more than once.
3. **Server secrets** — Supabase → Edge Functions → Secrets:
   - `SHIPPO_API_KEY` = the Shippo token
   - `SHIPPO_WEBHOOK_TOKEN` = any long random text (e.g. from a password generator)
4. **Deploy the functions** (Terminal, in the modtok folder):
   ```
   npx supabase functions deploy marketplace-checkout marketplace-webhook marketplace-order-action shipping-webhook
   ```
5. **Tracking updates** — Shippo → Settings → Webhooks → add
   `https://nfklspshcnthsoholtjc.supabase.co/functions/v1/shipping-webhook?token=<SHIPPO_WEBHOOK_TOKEN>`
   for the event **track_updated**.
6. **Test in Sandbox** (Stripe test mode + Shippo test token): seller adds address → lists an
   item, an outfit, and two single items → second account buys the outfit (check the pieces
   disappear), then buys a 2-item bundle (check the discount) with card `4242 4242 4242 4242`
   → seller sees **Open label** in My Sales.
7. **Build 1.1** — `eas build -p ios` then `eas submit -p ios` (version is now 1.1.0).
8. **Go live with labels** — replace `SHIPPO_API_KEY` with the live token (`shippo_live_...`)
   and add a payment method in Shippo. Labels are then charged to ModTok's Shippo account.

### Safe with the 1.0 app
The new server functions still accept the 1.0 app's checkout, so updating the server before
everyone has 1.1 is fine. Listings made from 1.0 get the Medium shipping price automatically.

## Not included yet (ideas for later)
- Canada shipping (Shippo supports Canada Post; needs the Canada rollout first).
- QR-code labels without a printer (USPS supports this; can be added to the label request).
- Letting the seller change the package size on an existing listing from the app.
