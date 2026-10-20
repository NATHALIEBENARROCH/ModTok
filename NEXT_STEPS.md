# ModTok: where we are and what's next

## Status: SUBMITTED TO APPLE on Oct 5, 2026 (version 1.0, build 7)
Apple reviews within about 48 hours and emails nb26@me.com. Release is set to **manual**.

## What's on `main` (updated Oct 20, 2026)
`main` now holds everything below, on GitHub and on this computer. None of it is submitted to Apple
yet. The app version in `app.json` is **1.1.0**.

- **Prepaid shipping labels (Vinted-style)**: sellers pick Small / Medium / Large instead of typing a
  shipping price; the buyer pays shipping; ModTok buys a USPS label through Shippo; the seller opens
  the label in My Sales, drops off, and the order updates to Shipped / Delivered from tracking.
- **Sell an Outfit**: list a saved outfit at one price, with the option to also sell the pieces
  separately (when one sells, the other comes off the marketplace).
- **Buyer bundles**: buy several items from one seller in one checkout, one package, with the
  seller's bundle discount (default 10% / 15% / 20%).
- **Sell → Shipping & bundles**: ship-from address (required before listing) and bundle discounts.
- **Edit Outfit redesign** (Oct 5): one swipeable row per piece.
- **Sold item no longer shows as for sale** after a purchase (Oct 12).
- **Clear server error messages** instead of "Unexpected error".
- **Bigger app icon and tagline**.

## Branches on GitHub (what each one is)
- **main**: the one that matters. Has everything, including all the 1.1 changes. Version 1.1 will
  be built and submitted from here. Being on main does NOT send anything to Apple.
- **feature/shipping-labels-outfit-bundles**: where the 1.1 work was first written (Oct 16). Now an
  exact copy of main, so it's no longer needed and can be deleted.
- **app-store-fixes**: the old 1.0 code, the same as what Apple is reviewing (on this Mac it is also
  saved as `before-1.1`). Keep it until Apple approves 1.0. If Apple asks for a fix, the fix is made
  here, NOT on main (main would send the unfinished 1.1). Can be deleted after approval.

## Planned next: virtual try-on
"Try on you" / try on a model, like Google's try-on: the buyer sees a listed item on their own
photo or on a model. Needs an AI image service, private photo handling, and a consent note
("only upload a photo of yourself"). Not started; build on its own branch.

## While Apple reviews
- **Open ModTok every day** so the free Supabase project stays awake. If it pauses, the reviewer
  gets "Network request failed" and rejects the app.
- Sign in as nb26@me.com and list 1–2 items, so the marketplace isn't empty for the reviewer.
- If Apple rejects or asks a question, paste their message to Claude.

## Before the app is public (while Apple reviews)
- Stripe **Live**: finish Connect setup, then run `bash scripts/go_live_stripe.sh` (see GO_LIVE_PAYMENTS.md)
- Supabase **Pro** plan, so the project never pauses again
- Open the app every few days until then, to keep the free Supabase project awake

## After approval (version 1.1)
- **Prepaid shipping labels, Sell an Outfit, and buyer bundles**: WRITTEN (Oct 16), merged into
  `main` on Oct 20, not yet tested on a phone. Setup steps, in order, are in
  `SHIPPING_AND_BUNDLES.md` (Shippo account, one SQL script, two secrets, deploy, test).
- Add **Canada** (sellers and buyers)
- **Edit Outfit redesign**: WRITTEN (Oct 5), not yet tested on a phone. Goes out with the next build.
  Each piece is one row; swipe sideways (or tap the arrows) to swap within its category, "See all"
  opens the category grid, ✕ removes, "+ Add a piece" adds.
- Fixed (Oct 12): after a purchase, going back briefly showed the item as still for sale.
- Bigger app icon and bigger, darker tagline: also written, waiting for the next build.
- Do NOT replace build 7 on the App Store version page while Apple is reviewing.

## Investor presentation and website
- **Investor presentation**: first version made Oct 5 as an editable Claude slide deck
  ("ModTok Investor Presentation"), built from the pitch deck `ModTok_gv.pdf` with Nathalie's phone
  photos and real app screenshots. Still to fill in: the amount being raised, and a source for the
  $350B market figure and the "20% of wardrobe" figure.
- **New visual website** from the same pitch deck and images.
