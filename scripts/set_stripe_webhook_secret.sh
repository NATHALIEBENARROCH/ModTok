#!/usr/bin/env bash
set -euo pipefail

DEFAULT_PROJECT_REF="nfklspshcnthsoholtjc"

printf '\nModTok — Save Stripe Sandbox webhook signing secret\n'
printf '%s\n' '----------------------------------------------------'
read -r -p "Supabase project reference [${DEFAULT_PROJECT_REF}]: " PROJECT_REF
PROJECT_REF="${PROJECT_REF:-$DEFAULT_PROJECT_REF}"

printf 'In Stripe Sandbox, open Developers > Webhooks > the ModTok endpoint.\n'
printf 'Reveal and copy the signing secret beginning with whsec_. It will be hidden while you paste.\n'
read -r -s -p "Webhook signing secret: " STRIPE_WEBHOOK_SIGNING_SECRET
printf '\n'

if [[ "$STRIPE_WEBHOOK_SIGNING_SECRET" != whsec_* ]]; then
  printf 'Stopped: the signing secret must begin with whsec_.\n'
  exit 1
fi

npx --yes supabase@latest secrets set \
  --project-ref "$PROJECT_REF" \
  STRIPE_WEBHOOK_SIGNING_SECRET="$STRIPE_WEBHOOK_SIGNING_SECRET"
unset STRIPE_WEBHOOK_SIGNING_SECRET

printf '\nWebhook signing secret saved securely. ModTok Sandbox payments are ready for testing.\n'
