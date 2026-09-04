# ModTok Marketplace Update — Start Here

This package upgrades ModTok from private listing management to a real peer-to-peer marketplace for physical clothing. It includes public USD listings, U.S. shipping addresses, Stripe Connect seller onboarding, buyer PaymentSheet checkout, seller payouts, orders, shipment tracking, full refunds before delivery, shoppable stories, reporting, blocking, and in-app account deletion.

> **Important:** This release is configured for **Stripe Sandbox testing only**. Do not switch Stripe to Live mode yet. Never paste a Stripe secret key into Manus, email, GitHub, Supabase SQL, or the app’s source files.

## What Changed

| Area | New behavior |
|---|---|
| Sell | Sellers securely complete Stripe onboarding, publish real USD listings, share them to stories, unlist inventory, and open their Stripe Express dashboard. |
| Marketplace | Buyers browse other users’ active listings, search, filter by category, and open tall portrait product pages. |
| Checkout | The server reserves a one-of-a-kind item, recalculates the authoritative amount, collects a U.S. shipping address, and opens Stripe PaymentSheet. |
| Orders | **My Purchases** and **My Sales** show payment, processing, shipping, tracking, delivery, cancellation, and refund status. |
| Safety | Listings and stories have report/block controls. Settings includes permanent account deletion with unfinished-transaction safeguards. |
| Stories | Active marketplace listings can be tagged in stories and opened directly from the story tag. |

The payment architecture uses Stripe Connect destination charges: ModTok creates the charge on the Canadian platform, transfers the seller’s portion to the connected U.S. seller, and retains the configured platform fee.[1] Stripe-hosted onboarding collects seller identity and bank information; those details are not stored inside ModTok.[2] Supabase Edge Functions keep all secret keys server-side, and the signed webhook authoritatively updates payment, refund, and dispute status.[3]

## Before You Start

You need the Mac that contains your current `modtok` folder, access to the existing Supabase project, and access to the Stripe account in **Sandbox** mode. Your computer does not need to stay on after the server functions are deployed.

The package assumes the existing Supabase project reference is `nfklspshcnthsoholtjc`. The setup script displays this value and lets you replace it if your project reference is different.

## Step 1 — Replace the Local App with This Complete Update

Download `modtok_marketplace_update.zip` to your Mac. Open **Terminal**, copy the entire block below, paste it, and press **Enter** once:

```bash
cd ~/Desktop
if [ -d modtok ]; then mv modtok "modtok_backup_$(date +%Y%m%d_%H%M%S)"; fi
unzip -o ~/Downloads/modtok_marketplace_update.zip -d ~/Desktop
cd ~/Desktop/modtok
npm install
```

This keeps the old folder as a dated backup and installs the exact dependencies for the new version. Do not copy individual files into the old folder.

## Step 2 — Run the Marketplace Database Setup in Supabase

Open [Supabase](https://supabase.com/dashboard), select the existing ModTok project, then select **SQL Editor** in the left sidebar and choose **New query**.

On your Mac, open this file from the new folder:

```text
Desktop/modtok/modtok_marketplace_complete_setup.sql
```

Press **Command+A**, then **Command+C**. Return to the Supabase SQL Editor, paste the entire file, and press **Run** once. Wait for **Success**. The script is idempotent, so running the complete file once will not duplicate the tables.

Do not paste a Stripe key into the SQL Editor.

## Step 3 — Deploy the Secure Backend and Add Sandbox API Keys

In **Terminal**, copy and paste this block and press **Enter**:

```bash
cd ~/Desktop/modtok
./scripts/configure_marketplace_backend.sh
```

The script guides you through four actions. It opens Supabase sign-in if needed, links the correct project, asks for your Stripe **Sandbox secret key** and **Sandbox publishable key**, saves them securely in Supabase, and deploys all six marketplace functions.

When prompted for Stripe keys, open the Stripe Dashboard in **Sandbox**, then go to **Developers → API keys**. Paste the `sk_test_...` secret key and the `pk_test_...` publishable key into the Terminal prompts. The values are hidden while pasted and are not written into the ModTok folder.

The setup stores a platform fee of `1000` basis points, which equals **10% of the item price**. Confirm this commercial policy with legal/accounting advisers and disclose it to sellers before Live launch.

## Step 4 — Add the Stripe Sandbox Webhook

In Stripe **Sandbox**, open **Developers → Webhooks** and add a destination for events from **Your account**. Use this endpoint URL:

```text
https://nfklspshcnthsoholtjc.supabase.co/functions/v1/marketplace-webhook
```

Select these four events:

```text
payment_intent.succeeded
payment_intent.payment_failed
charge.refunded
charge.dispute.created
```

Create the endpoint, open it, reveal the **Signing secret** beginning with `whsec_`, and copy it. Return to **Terminal** and run:

```bash
cd ~/Desktop/modtok
./scripts/set_stripe_webhook_secret.sh
```

Paste the `whsec_...` value into the hidden prompt. Never paste this value into chat, source code, or GitHub. Stripe recommends verifying webhook signatures with the raw request body before trusting events; the supplied function does this server-side.[4]

## Step 5 — Relaunch ModTok

In **Terminal**, run:

```bash
cd ~/Desktop/modtok
npx expo start --clear
```

Scan the QR code with Expo Go. If Terminal is already running an old ModTok server, press **Control+C** once before running the command.

## Step 6 — Test One Complete Sandbox Sale

A real two-sided marketplace test requires two ModTok accounts because a seller cannot buy their own listing.

First, sign in as the seller, open **Sell**, press **Start** under seller payouts, and complete Stripe’s hosted Sandbox onboarding. Return to ModTok and confirm the seller card says **Payouts ready**. Then press **List an Item**, choose a wardrobe category and item, enter the condition, description, USD price, and shipping charge, and press the bottom **List Item** button.

Next, sign in with a different ModTok buyer account, open **Profile → Marketplace**, choose the listing, press **Buy Now**, enter a valid U.S. shipping address, and use Stripe’s Sandbox test card:

```text
Card number: 4242 4242 4242 4242
Expiration: any future date
CVC: any three digits
ZIP: any valid U.S. ZIP code
```

After payment, the order should appear under **Profile → Purchases** for the buyer and **Sell → My Sales** for the seller. The seller marks it processing, adds a carrier and tracking number, and marks it shipped. The buyer can then mark it delivered. A full refund is available to the seller before delivery; the server requests transfer reversal so the seller portion is recovered where Stripe permits it.

## Important Testing Facts

| Question | Answer |
|---|---|
| Do I create products in Stripe’s Product catalog? | **No.** ModTok clothing listings are dynamic database records. Leave Stripe Products at zero. |
| Is this using real money now? | **No.** Sandbox test cards do not move real money. |
| Can a seller buy their own item? | **No.** Use a separate buyer account. |
| Are secret keys stored in the app? | **No.** They are stored only as encrypted Supabase project secrets. |
| Can I switch to Live after this test? | **Not yet.** Production requires Live Stripe verification, Live keys and webhook, finalized policies, support contact, moderation operations, and TestFlight review. |
| Will ordinary Stripe card checkout work in Expo Go? | The Stripe SDK is included for development, but Apple Pay and final native behavior must be tested in a development/TestFlight build.[5] |

## App Store Requirements Already Added

ModTok now includes listing and story reporting, user blocking, and in-app account deletion. Apple requires apps with user-generated content to provide objectionable-content controls, reporting, blocking, and published contact information.[6] Apple also requires account-creation apps to let users initiate complete account deletion inside the app; confirmation is allowed, and legally required records may be retained with disclosure.[7]

Before App Store submission, publish the drafts under `legal/` at stable HTTPS pages, replace all bracketed fields, connect the in-app Privacy Policy, Terms, and Help rows to those URLs, and establish a monitored support/moderation inbox.

## Files You May Need

| File | Purpose |
|---|---|
| `modtok_marketplace_complete_setup.sql` | One-copy Supabase database and security setup. |
| `scripts/configure_marketplace_backend.sh` | Secure key setup and function deployment. |
| `scripts/set_stripe_webhook_secret.sh` | Secure webhook-secret setup. |
| `docs/stripe_architecture_notes.md` | Technical payment decisions and source references. |
| `docs/validation_notes.md` | Completed build and validation checks. |
| `legal/PRIVACY_POLICY_DRAFT.md` | Substantive privacy-policy draft for attorney review. |
| `legal/TERMS_OF_USE_DRAFT.md` | Substantive terms and marketplace rules for attorney review. |
| `legal/SUPPORT_AND_MODERATION_DRAFT.md` | Public support copy and internal response procedure. |

## Production Launch Is a Separate Controlled Step

After the Sandbox purchase passes, the remaining production work is to finalize legal/support URLs, decide the refund and shipment deadlines, complete the platform’s Live Stripe verification, replace Sandbox secrets with Live secrets, create a Live webhook, build a signed iOS app, test through TestFlight, complete App Store privacy disclosures, and submit for review. Do not enable Live payments before those controls and policies are ready.

## References

[1]: https://docs.stripe.com/connect/destination-charges "Stripe — Create destination charges"
[2]: https://docs.stripe.com/connect/hosted-onboarding "Stripe — Connect hosted onboarding"
[3]: https://docs.expo.dev/versions/latest/sdk/stripe/ "Expo — Stripe SDK"
[4]: https://supabase.com/docs/guides/functions/examples/stripe-webhooks "Supabase — Handling Stripe webhooks"
[5]: https://docs.expo.dev/versions/latest/sdk/stripe/ "Expo — Stripe SDK development and configuration"
[6]: https://developer.apple.com/app-store/review/guidelines/ "Apple — App Review Guidelines"
[7]: https://developer.apple.com/support/offering-account-deletion-in-your-app/ "Apple — Offering account deletion in your app"
