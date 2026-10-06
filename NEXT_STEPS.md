# ModTok: where we are and what's next

## Status: SUBMITTED TO APPLE on Oct 5, 2026 (version 1.0, build 7)
Apple reviews within about 48 hours and emails nb26@me.com. Release is set to **manual**.

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
- Add **Canada** (sellers and buyers)
- **Edit Outfit redesign**: WRITTEN (Oct 5), not yet tested on a phone. Goes out with the next build.
  Each piece is one row; swipe sideways (or tap the arrows) to swap within its category, "See all"
  opens the category grid, ✕ removes, "+ Add a piece" adds.
- Bigger app icon and bigger, darker tagline: also written, waiting for the next build.
- Do NOT replace build 7 on the App Store version page while Apple is reviewing.

## Investor presentation and website
- **Investor presentation**: first version made Oct 5 as an editable Claude slide deck
  ("ModTok Investor Presentation"), built from the pitch deck `ModTok_gv.pdf` with Nathalie's phone
  photos and real app screenshots. Still to fill in: the amount being raised, and a source for the
  $350B market figure and the "20% of wardrobe" figure.
- **New visual website** from the same pitch deck and images.
