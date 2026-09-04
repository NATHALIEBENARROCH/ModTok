#!/usr/bin/env bash
set -euo pipefail

DEFAULT_PROJECT_REF="nfklspshcnthsoholtjc"

printf '\nModTok Marketplace — Supabase + Stripe Sandbox setup\n'
printf '%s\n' '----------------------------------------------------'
printf 'This script never saves your Stripe keys in the ModTok project.\n\n'

read -r -p "Supabase project reference [${DEFAULT_PROJECT_REF}]: " PROJECT_REF
PROJECT_REF="${PROJECT_REF:-$DEFAULT_PROJECT_REF}"

printf '\nStep 1 of 4: Sign in to Supabase in the browser if requested.\n'
npx --yes supabase@latest login

printf '\nStep 2 of 4: Link this ModTok folder to Supabase.\n'
npx --yes supabase@latest link --project-ref "$PROJECT_REF"

printf '\nOpen Stripe Dashboard in SANDBOX mode, then go to Developers > API keys.\n'
printf 'Copy the Sandbox secret key that begins with sk_test_. It will be hidden while you paste.\n'
read -r -s -p "Stripe Sandbox secret key: " STRIPE_SECRET_KEY
printf '\n'
if [[ "$STRIPE_SECRET_KEY" != sk_test_* ]]; then
  printf 'Stopped: the key must be a Stripe Sandbox secret key beginning with sk_test_.\n'
  exit 1
fi

printf 'Copy the Sandbox publishable key that begins with pk_test_. It will also be hidden.\n'
read -r -s -p "Stripe Sandbox publishable key: " STRIPE_PUBLISHABLE_KEY
printf '\n'
if [[ "$STRIPE_PUBLISHABLE_KEY" != pk_test_* ]]; then
  printf 'Stopped: the key must be a Stripe Sandbox publishable key beginning with pk_test_.\n'
  exit 1
fi

printf '\nStep 3 of 4: Store the keys securely in Supabase.\n'
npx --yes supabase@latest secrets set \
  --project-ref "$PROJECT_REF" \
  STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY" \
  PLATFORM_FEE_BPS="1000" \
  APP_SCHEME="modtok"
unset STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY

printf '\nStep 4 of 4: Deploy the secure marketplace functions.\n'
npx --yes supabase@latest functions deploy marketplace-connect --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-connect-redirect --project-ref "$PROJECT_REF" --no-verify-jwt
npx --yes supabase@latest functions deploy marketplace-checkout --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-order-action --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-webhook --project-ref "$PROJECT_REF" --no-verify-jwt
npx --yes supabase@latest functions deploy delete-account --project-ref "$PROJECT_REF"

printf '\nBackend deployment complete.\n'
printf '\nYour Stripe webhook URL is:\nhttps://%s.supabase.co/functions/v1/marketplace-webhook\n' "$PROJECT_REF"
printf '\nNow follow STEP 3 in START_HERE_MARKETPLACE.md to add that webhook in Stripe and save its signing secret.\n'
