#!/usr/bin/env bash
# ModTok: update all server functions so error messages show their real reason.
# No Stripe keys are needed; the saved keys stay as they are.
set -euo pipefail
PROJECT_REF="nfklspshcnthsoholtjc"
cd "$(dirname "$0")/.."
npx --yes supabase@latest functions deploy marketplace-connect --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-connect-redirect --project-ref "$PROJECT_REF" --no-verify-jwt
npx --yes supabase@latest functions deploy marketplace-checkout --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-order-action --project-ref "$PROJECT_REF"
npx --yes supabase@latest functions deploy marketplace-webhook --project-ref "$PROJECT_REF" --no-verify-jwt
npx --yes supabase@latest functions deploy delete-account --project-ref "$PROJECT_REF"
printf '\nDone. The server now shows clear error messages.\n'
