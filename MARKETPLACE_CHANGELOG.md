# ModTok Marketplace Update

**Release status:** Sandbox-ready integration build  
**Prepared by:** Manus AI  
**Target:** Expo SDK 54, iOS bundle `com.modtok.app`, Supabase, Stripe Connect

## Included Product Features

| Area | Included capability |
|---|---|
| Buyer discovery | Cross-user active listings, search, category filters, tall portrait cards, listing details, seller identity, and secure buy flow. |
| Seller onboarding | Stripe Connect Express account creation, hosted onboarding, readiness status, and Express dashboard access. |
| Listing creation | Category-first wardrobe selection with condition, description, USD item price, USD shipping charge, and persistent bottom Cancel/List controls. |
| Checkout | U.S. shipping-address validation, authoritative server pricing, one-of-a-kind reservation, Stripe PaymentSheet, and cancellation cleanup. |
| Money movement | Destination charges, configurable 10% platform fee, seller transfer, transfer-reversing refunds, and signed webhook reconciliation. |
| Orders | My Purchases and My Sales, processing, carrier/tracking entry, shipment, buyer delivery confirmation, and pre-delivery full refunds. |
| Social commerce | Active marketplace listings can be shared to stories and opened from a shoppable tag. |
| Trust and safety | Listing/story reports, user blocking, hidden blocked-user content, dispute state handling, and in-app account deletion. |
| App readiness | Correct square app icons, Stripe native configuration, iOS/Android/web bundling, and one-copy setup instructions. |

## Secure Backend Components

The package includes six Supabase Edge Functions: `marketplace-connect`, `marketplace-connect-redirect`, `marketplace-checkout`, `marketplace-order-action`, `marketplace-webhook`, and `delete-account`. Stripe secret keys and webhook secrets are read only from Supabase project secrets and are never stored in the mobile app.

The database script creates seller accounts, public marketplace listings, protected orders, idempotent webhook events, reports, blocks, and short-lived onboarding sessions. Row-level security separates public listing discovery from private order, shipping, seller, report, and block data.

## Validation Completed

| Check | Result |
|---|---|
| Expo application TypeScript | Passed |
| Deno type checking for all Edge Functions | Passed |
| PostgreSQL syntax parse for one-copy SQL | Passed |
| Expo SDK and native dependency diagnostics | 18/18 passed |
| Web production bundle | Passed |
| iOS production JavaScript bundle | Passed |
| Android production JavaScript bundle | Passed |
| Browser render and runtime console | Passed; no blocking errors |
| Stripe secret scan | Passed; no secret or webhook key included |

## Remaining Before Live App Store Release

Sandbox payment testing must be completed with separate buyer and seller accounts. The legal drafts must be reviewed, finalized, and published at stable HTTPS URLs. A monitored support and moderation process must be established. The platform’s Live Stripe verification, Live API keys, Live webhook, shipment/refund policy, TestFlight build, App Store privacy disclosures, and Apple review submission are separate production steps.
