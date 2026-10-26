# After Apple approves 1.0: turning on 1.1

Written Oct 26, 2026. **Start only after Apple has approved ModTok 1.0 (build 9).**

Follow the steps in order. Each step that changes the server must come before the step after it,
or checkout can break. All Terminal commands are run on your Mac.

---

## Step 1. Get the latest 1.1 code on your Mac

```
cd ~/Developer/modtok
git checkout main
git pull origin main
```

The Terminal prompt should show `modtok git:(main)`.

## Step 2. Accounts to set up first (in your browser)

1. **Shippo** (shipping labels): sign up at goshippo.com → Settings → API → copy the **test**
   token (starts with `shippo_test_`).
2. **FASHN** (AI try-on): sign up at app.fashn.ai → add credits (for example $20) →
   Developer API → create a key and copy it.
3. **Two try-on model photos**: in Supabase → Storage → `clothing-photos`, make a folder
   `tryon-models`, upload one full-body photo of a woman and one of a man, and copy each
   photo's public URL.

## Step 3. Update the database (Supabase → SQL Editor → New query)

Run these three files **one at a time, in this order**. For each one, open the file in the
modtok folder, copy everything, paste it into a new query, and click **Run**:

1. `supabase/v1_1_shipping_outfits_bundles.sql` (shipping labels, outfits, bundles)
2. `supabase/v1_1_buyer_protection.sql` (no seller fees and the Buyer Protection fee)
3. `supabase/v1_1_virtual_try_on.sql` (try-on limits)

Each one is safe to run again if you're not sure it worked.

## Step 4. Save the server settings (Terminal)

Replace each `paste-...` with your own value. Keep the `\` at the ends of the lines.

```
cd ~/Developer/modtok
npx --yes supabase@latest secrets set --project-ref nfklspshcnthsoholtjc \
  SHIPPO_API_KEY=paste-shippo-test-token \
  SHIPPO_WEBHOOK_TOKEN=paste-any-long-random-text \
  BUYER_PROTECTION_FIXED_CENTS=70 \
  BUYER_PROTECTION_BPS=500 \
  FASHN_API_KEY=paste-fashn-key \
  TRYON_FEMALE_MODEL_URL=paste-female-photo-url \
  TRYON_MALE_MODEL_URL=paste-male-photo-url \
  TRYON_DAILY_LIMIT=3
```

For `SHIPPO_WEBHOOK_TOKEN`, use a password generator and **write it down**, because you need it in Step 6.

## Step 5. Deploy the 1.1 server (Terminal)

```
npx --yes supabase@latest functions deploy marketplace-checkout marketplace-webhook marketplace-order-action virtual-try-on --project-ref nfklspshcnthsoholtjc
npx --yes supabase@latest functions deploy shipping-webhook --project-ref nfklspshcnthsoholtjc --no-verify-jwt
```

From this moment, new checkouts add the Buyer Protection fee ($0.70 + 5%) for the buyer, and
sellers receive their full price. People still on 1.0 can keep buying, and Stripe's payment
screen always shows the real amount.

## Step 6. Shipping tracking updates (Shippo website)

Shippo → Settings → Webhooks → add this address for the event **track_updated**
(put your token from Step 4 at the end):

```
https://nfklspshcnthsoholtjc.supabase.co/functions/v1/shipping-webhook?token=YOUR-SHIPPO-WEBHOOK-TOKEN
```

## Step 7. Test one sale (Stripe still in test mode)

With two of your accounts: the seller adds a ship-from address and lists an item. The buyer
opens it and checks that the **Buyer Protection** line shows (for example $2.20 on a $30 item),
then pays with test card `4242 4242 4242 4242`. The seller should see **Open label** in
My Sales and receive the full $30. Also try one **Try it on**.

## Step 8. Build and send 1.1 to Apple (Terminal)

```
eas build -p ios
eas submit -p ios
```

In App Store Connect, update the description: replace "ModTok keeps a 10% fee" with
"No seller fees". In the review notes, add: "Try it on uses AI (FASHN) to show clothing on the
user's own photo or a stock model. The user's photo is processed only for that request and is
not stored."

## Step 9. Put the new Terms and Refund Policy online

The website files in `website/content/` now say "no seller fees" and describe Buyer Protection.
Rebuild and upload the website the same way you did for 1.0.

## Later, when real payments start

- Switch Stripe to Live: follow `GO_LIVE_PAYMENTS.md` in the modtok folder.
- Switch Shippo to Live: replace `SHIPPO_API_KEY` with the `shippo_live_...` token and add
  a payment method in Shippo.
- Ask your accountant whether U.S. sales tax applies to the Buyer Protection fee.

## More detail if you need it (in the modtok folder)

- `BUYER_PROTECTION.md`: the fee, with an example
- `SHIPPING_AND_BUNDLES.md`: labels, outfits and bundles
- `VIRTUAL_TRY_ON_SETUP.md`: AI try-on
