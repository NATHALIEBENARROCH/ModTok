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
- **Edit Outfit redesign**: show only the outfit's pieces, one row each; swipe a row sideways to swap
  for another piece of the same category; "See all" opens that category's grid; ✕ removes a piece;
  "+ Add a piece". Based on Nathalie's mockup of Oct 4.
- New visual website from the pitch deck, and the editable investor deck
