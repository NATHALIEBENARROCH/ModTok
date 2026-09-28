#!/usr/bin/env bash
# ModTok — switch the marketplace from Stripe Sandbox to LIVE (real money).
# Keys are pasted hidden and saved only in Supabase secrets, never in this folder.
set -euo pipefail

DEFAULT_PROJECT_REF="nfklspshcnthsoholtjc"

printf '\nModTok Marketplace — Switch Stripe to LIVE payments\n'
printf '%s\n' '----------------------------------------------------'
printf 'After this, buyers are charged real money and sellers receive real payouts.\n'
printf 'Only continue once your Stripe account is activated for Live mode and\n'
printf 'Stripe Connect is approved in Live mode.\n\n'
read -r -p "Type LIVE to continue: " CONFIRM
if [[ "$CONFIRM" != "LIVE" ]]; then
  printf 'Stopped. Nothing was changed.\n'
  exit 1
fi

read -r -p "Supabase project reference [${DEFAULT_PROJECT_REF}]: " PROJECT_REF
PROJECT_REF="${PROJECT_REF:-$DEFAULT_PROJECT_REF}"

printf '\nStep 1 of 4: Sign in to Supabase and link this folder.\n'
npx --yes supabase@latest login
npx --yes supabase@latest link --project-ref "$PROJECT_REF"

printf '\nStep 2 of 4: Paste your LIVE Stripe keys (Stripe Dashboard, Live mode > Developers > API keys).\n'
read -r -s -p "Live secret key (sk_live_...): " STRIPE_SECRET_KEY
printf '\n'
if [[ "$STRIPE_SECRET_KEY" != sk_live_* && "$STRIPE_SECRET_KEY" != rk_live_* ]]; then
  printf 'Stopped: the key must begin with sk_live_. Nothing was changed.\n'
  exit 1
fi
read -r -s -p "Live publishable key (pk_live_...): " STRIPE_PUBLISHABLE_KEY
printf '\n'
if [[ "$STRIPE_PUBLISHABLE_KEY" != pk_live_* ]]; then
  printf 'Stopped: the key must begin with pk_live_. Nothing was changed.\n'
  exit 1
fi

printf '\nStep 3 of 4: Paste the LIVE webhook signing secret(s).\n'
printf 'Use the secret from the Live endpoint that listens to "Your account" events.\n'
read -r -s -p "Live webhook signing secret (whsec_...): " STRIPE_WEBHOOK_SIGNING_SECRET
printf '\n'
if [[ "$STRIPE_WEBHOOK_SIGNING_SECRET" != whsec_* ]]; then
  printf 'Stopped: the signing secret must begin with whsec_. Nothing was changed.\n'
  exit 1
fi

npx --yes supabase@latest secrets set \
  --project-ref "$PROJECT_REF" \
  STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY" \
  STRIPE_WEBHOOK_SIGNING_SECRET="$STRIPE_WEBHOOK_SIGNING_SECRET" \
  PLATFORM_FEE_BPS="1000" \
  APP_SCHEME="modtok"
unset STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SIGNING_SECRET

printf '\nStep 4 of 4: Redeploy the marketplace functions so they use the Live keys.\n'
npx --yes supabase@latest functions deploy marketplace-connect --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-connect-redirect --project-ref "$PROJECT_REF" --no-verify-jwt
npx --yes supabase@latest functions deploy marketplace-checkout --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-order-action --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-webhook --project-ref "$PROJECT_REF" --no-verify-jwt
npx --yes supabase@latest functions deploy delete-account --project-ref "$PROJECT_REF"

printf '\nDone. ModTok now takes LIVE payments.\n'
printf 'Next: run supabase/go_live_clear_sandbox_data.sql in the Supabase SQL Editor (once).\n'
