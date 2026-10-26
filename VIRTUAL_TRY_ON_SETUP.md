# AI virtual try-on (ModTok 1.1)

Shoppers tap **Try it on** on a marketplace item or a piece in their closet, then pick
**Try on you** (their own photo), **Try on a female model**, or **Try on a male model**.
The AI is [FASHN](https://fashn.ai), which is made for clothing try-on.

Works for tops, sweaters, jackets, coats, pants, skirts, shorts and dresses. The button is
hidden for shoes, bags, jewelry, accessories and whole-outfit listings, which the AI can't do.

## Cost

About **$0.075 per try-on**, paid to FASHN from prepaid credits. Two caps keep the bill safe:

- Each shopper gets **3 free try-ons per day** (`TRYON_DAILY_LIMIT`).
- All of ModTok together gets **500 per day** (`TRYON_GLOBAL_DAILY_LIMIT`), so at most about $37.50 a day.
- Guests need a free account first. A try-on that fails doesn't count.

## Privacy

- The shopper's photo goes from the app to the `virtual-try-on` server function and straight to FASHN.
  ModTok never saves it in storage or the database.
- FASHN deletes the uploaded photo when the try-on finishes and the result after 60 minutes,
  and does not train on it ([FASHN data retention](https://docs.fashn.ai/api-overview/data-retention-privacy)).
- ModTok only records that a try-on happened (who, when, own photo or model) in `try_on_usage`, for the daily limits.
- The privacy policy (`docs/privacy.html`, `legal/PRIVACY_POLICY_DRAFT.md`) has a new section 1.8 that explains this.

## Setup (once, when you get ready to ship 1.1)

1. **FASHN account.** Sign up at https://app.fashn.ai, add some credits (for example $20 = about 260 try-ons),
   then go to **Developer API** and create an API key. Copy it.
2. **Two model photos.** Pick one full-body photo of a woman and one of a man, standing and facing the
   camera on a plain background, that you have the right to use (your own photo shoot, a paid stock photo,
   or a model made with FASHN's own model generator). In Supabase, go to **Storage → clothing-photos**,
   make a folder `tryon-models`, upload both, and copy each one's public URL.
3. **Database.** In the Supabase SQL Editor, run `supabase/v1_1_virtual_try_on.sql`.
4. **Secrets.** In Terminal, in the modtok folder:
   ```bash
   npx supabase secrets set FASHN_API_KEY=paste-key-here \
     TRYON_FEMALE_MODEL_URL=paste-female-photo-url \
     TRYON_MALE_MODEL_URL=paste-male-photo-url
   ```
5. **Server function.**
   ```bash
   npx supabase functions deploy virtual-try-on
   ```
6. **New app build.** Try-on uses a new photo tool (`expo-image-manipulator`), so it needs a fresh
   EAS build for 1.1. It won't work in an older 1.0 build.

## Apple review note

Add to the 1.1 review notes: "Try it on uses AI (FASHN) to show clothing on the user's own photo or a
stock model. The user's photo is processed only for that request and is not stored."
