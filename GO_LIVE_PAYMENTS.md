# ModTok — Switching to Real Payments (Stripe Live)

Your app never contains Stripe keys; the Supabase server functions hold them. So going live
does **not** need a new app build. You switch the keys on the server, and the app already on
people's phones starts taking real payments.

Do these in order. Steps A–C are in Stripe and can take a few days for Stripe to approve.

## Before you start: finish one Sandbox test sale

Do this first: in Sandbox mode, complete one full sale from start to finish. That means a seller
sets up payouts, lists an item, a second account buys it with test card `4242 4242 4242 4242`,
the seller marks it shipped, and the buyer confirms delivery. If that works, going live is only
a key swap.

## A. Activate your Stripe account for Live payments
Stripe Dashboard → turn **off** Sandbox/Test mode → follow **Activate payments**. Stripe asks
for your business details, a Canadian bank account for your 10% platform fee, and your ID.

## B. Turn on Stripe Connect in Live mode
Stripe Dashboard (Live) → **Connect** → complete the platform profile. Describe ModTok as:
*"Marketplace where individuals sell used clothing to other individuals in the U.S.;
the platform takes a 10% fee."* Choose **Express** accounts and **destination charges**.
Stripe must approve a Canadian platform paying U.S. sellers; if Stripe asks questions, answer
them here.

## C. Create the Live webhook
Stripe Dashboard (Live) → **Developers → Webhooks → Add destination** → events from
**Your account** → endpoint:

```
https://nfklspshcnthsoholtjc.supabase.co/functions/v1/marketplace-webhook
```

Select these 5 events:

```
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.canceled
charge.refunded
charge.dispute.created
```

Open the new endpoint and click **Reveal** on the signing secret (`whsec_...`). You will paste
it in step D.

## D. Switch the server to Live
In **Terminal** on your Mac:

```bash
cd ~/Desktop/modtok
chmod +x scripts/go_live_stripe.sh
./scripts/go_live_stripe.sh
```

Type `LIVE`, then paste your **Live** secret key, **Live** publishable key and the Live webhook
secret when asked. They stay hidden and are saved only in Supabase.
**Never paste these keys into a chat, email or GitHub.**

## E. Clear the Sandbox test data (once)
Supabase → **SQL Editor → New query** → paste all of `supabase/go_live_clear_sandbox_data.sql`
→ **Run**. This removes test orders and test seller links, and keeps all users, closets and
listings.

## F. Real check
Each seller taps **Set up payouts** on the Sell tab once to connect a real Stripe account.
Then make one small real purchase (e.g. a $1 listing) between two of your own accounts and
refund it from **My Sales**.

## Before launch: things to confirm with an accountant or lawyer
- **U.S. sales tax:** many U.S. states make marketplaces collect sales tax for their sellers.
  ModTok currently charges **$0 tax**. Ask your accountant whether you must collect it.
  Stripe Tax can add it later.
- **Seller fee disclosure:** sellers must be told about the 10% fee before they list.
  Put it in the Terms and on the Sell screen.
- **Terms and Privacy Policy:** the drafts in `legal/` must be finalised and put online.
  Apple also requires this.
