#!/usr/bin/env bash
# ModTok: update the two seller-setup server functions (Stripe Accounts v2).
# No Stripe keys are needed; the saved keys stay as they are.
set -euo pipefail
PROJECT_REF="nfklspshcnthsoholtjc"
cd "$(dirname "$0")/.."
npx --yes supabase@latest functions deploy marketplace-connect --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-connect-redirect --project-ref "$PROJECT_REF" --no-verify-jwt
printf '\nDone. Seller setup now uses the current Stripe method.\n'
