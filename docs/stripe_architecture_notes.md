# ModTok Stripe Architecture Notes

## Verified direction

ModTok should use Stripe Connect destination charges for the first marketplace release. The platform creates the charge, transfers the seller portion to the connected seller account, and retains an application fee. Stripe states that the platform balance is responsible for Stripe fees, refunds, and chargebacks under this model. Because ModTok is a Canada-based platform and sellers or buyers may be in another region, the payment creation logic must support Stripe's `on_behalf_of` requirement where applicable.

The mobile client should use Stripe's React Native PaymentSheet. Only the publishable key belongs in the mobile environment. PaymentIntent creation, amount calculation, seller destination selection, application-fee calculation, connected-account creation, Account Link creation, refunds, and webhook verification must execute in Supabase Edge Functions with the Stripe secret key stored only as a Supabase secret.

Stripe-hosted onboarding should be launched using a short-lived Account Link created server-side. Both refresh and return URLs are required. Returning from the hosted flow does not prove onboarding is complete; the backend must retrieve the connected account or process `account.updated`, then persist `charges_enabled`, `payouts_enabled`, `details_submitted`, and any outstanding requirements.

Orders must be created server-side from the canonical listing price, not from a client-supplied amount. The webhook must be the authoritative path for moving an order to `paid`, and should handle payment success/failure, refunds, disputes, and connected-account updates idempotently.

## Sources

1. Stripe, “Create destination charges”: https://docs.stripe.com/connect/destination-charges?platform=react-native
2. Stripe, “Stripe-hosted onboarding”: https://docs.stripe.com/connect/hosted-onboarding

## Supabase webhook and Expo integration requirements

Supabase's current Stripe webhook example requires signature verification against the exact raw request body (`await req.text()`), uses the `Stripe-Signature` header and a webhook signing secret, and deploys the webhook without Supabase JWT verification because Stripe—not a signed-in app user—is the caller. The handler must still reject any event whose Stripe signature cannot be verified.

Expo's official Stripe package documentation confirms that `@stripe/stripe-react-native` is the supported SDK and that EAS builds use its Expo config plugin. The marketplace payment screen therefore requires a native development build/TestFlight build rather than relying on a generic web-only flow. The project will retain a clear fallback message when running on unsupported environments.

3. Supabase, “Handling Stripe Webhooks”: https://supabase.com/docs/guides/functions/examples/stripe-webhooks
4. Expo, “@stripe/stripe-react-native”: https://docs.expo.dev/versions/latest/sdk/stripe/

## Apple marketplace review requirements

Apple's current App Review Guidelines require apps with user-generated content to provide objectionable-content filtering, reporting with timely response, user blocking, and published support contact information. ModTok now includes report and block controls for listings and stories, but the operator must still establish and publish a moderation/support process.

Apple's account-deletion guidance requires account deletion to be easy to find in Settings and to remove the account and associated personal data, subject to legally required retention. Confirmation and reauthentication are permitted as long as deletion is not made unnecessarily difficult. ModTok now includes an in-app deletion action; unfinished paid orders, refunds, or disputes are identified before deletion so the user can resolve them first, while completed order records can be retained in anonymized form.

5. Apple, “App Review Guidelines”: https://developer.apple.com/app-store/review/guidelines/
6. Apple, “Offering account deletion in your app”: https://developer.apple.com/support/offering-account-deletion-in-your-app/
