# ModTok: where we are and what's next

## Done (as of Oct 5)
- Build 6 is in TestFlight with all fixes; a full test sale worked (seller setup, listing, purchase, "Paid")
- App Store Connect: 6 screenshots, description, keywords, URLs, privacy answers, build 6 selected,
  reviewer login (nb26+review@me.com) and review notes entered
- Back button added to the Marketplace screen (in the code, needs a new build)

## From home, in this order
1. **Build the new version** (with the Marketplace back button). In Terminal:
   ```bash
   cd ~/Desktop/modtok
   npx eas-cli@latest build --platform ios --profile production --auto-submit
   ```
   Answer **n** to "Do you want to log in to your Apple account?". About 30 minutes.
2. **While it builds:** in ModTok, sign in as nb26@me.com and list 1–2 items (Sell → List an Item),
   so the marketplace isn't empty for Apple's reviewer.
3. **In App Store Connect** (Apps → ModTok → 1.0 Prepare for Submission):
   - Build: remove 6, add the new build (7)
   - Phone number starts with **+1**
   - Version Release: **Manually release this version**
   - **Save**, then **Add for Review**, then **Submit to App Review**
   - If Apple lists missing items (age rating, category, price), send Claude a screenshot.

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
