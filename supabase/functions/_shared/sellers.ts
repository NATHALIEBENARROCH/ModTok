// Seller (connected account) helpers.
//
// Stripe no longer lets new platforms create connected accounts with the v1 Accounts API,
// so sellers are created with Accounts v2 (POST /v2/core/accounts). v2 accounts work with
// the v1 payment APIs used elsewhere (PaymentIntents with transfer_data / on_behalf_of).
//
// v2 calls go through fetch with an explicit API version so they do not depend on which
// v2 helpers a given stripe-node release happens to ship.
import { stripe } from './clients.ts';

const STRIPE_V2_VERSION = '2026-03-25.dahlia';

function secretKey(): string {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('Missing required server secret: STRIPE_SECRET_KEY');
  return key;
}

async function stripeV2(method: 'GET' | 'POST', path: string, body?: unknown): Promise<any> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Stripe-Version': STRIPE_V2_VERSION,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = json?.error?.code ? ` (${json.error.code})` : '';
    throw new Error(`Stripe: ${json?.error?.message ?? `request failed with ${response.status}`}${code}`);
  }
  return json;
}

export interface SellerState {
  stripe_account_id: string;
  country: string;
  default_currency: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: Record<string, unknown>;
  onboarding_completed_at: string | null;
}

function finish(state: Omit<SellerState, 'onboarding_completed_at'>): SellerState {
  const ready = state.details_submitted && state.charges_enabled && state.payouts_enabled;
  return { ...state, onboarding_completed_at: ready ? new Date().toISOString() : null };
}

function stateFromV2(account: any): SellerState {
  const cardPayments = account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active';
  const transfers =
    account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === 'active';
  return finish({
    stripe_account_id: account.id,
    country: String(account?.identity?.country ?? 'US').toUpperCase(),
    default_currency: String(account?.defaults?.currency ?? 'usd').toLowerCase(),
    // v2 has no single "details submitted" flag; both capabilities being active means
    // Stripe has everything it needs.
    details_submitted: cardPayments && transfers,
    charges_enabled: cardPayments,
    payouts_enabled: transfers,
    requirements: account?.requirements ?? {},
  });
}

const V2_INCLUDES =
  'include=configuration.merchant&include=configuration.recipient&include=requirements&include=identity&include=defaults';

/** Creates the Stripe account for a new seller and returns its current state. */
export async function createSellerAccount(user: { id: string; email?: string | null }): Promise<SellerState> {
  const account = await stripeV2('POST', '/v2/core/accounts', {
    ...(user.email ? { contact_email: user.email } : {}),
    identity: { country: 'us' },
    configuration: {
      // Lets buyers' card payments be made on the seller's behalf.
      merchant: { capabilities: { card_payments: { requested: true } } },
      // Lets the platform transfer the seller's share to them.
      recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
    },
    defaults: {
      currency: 'usd',
      // Required pairing for destination charges and for the Express dashboard.
      responsibilities: { fees_collector: 'application', losses_collector: 'application' },
    },
    dashboard: 'express',
    metadata: { modtok_user_id: user.id },
    include: ['configuration.merchant', 'configuration.recipient', 'requirements', 'identity', 'defaults'],
  });
  return stateFromV2(account);
}

/** Reads the seller's current Stripe status. */
export async function getSellerState(stripeAccountId: string): Promise<SellerState> {
  try {
    const account = await stripeV2('GET', `/v2/core/accounts/${encodeURIComponent(stripeAccountId)}?${V2_INCLUDES}`);
    return stateFromV2(account);
  } catch (v2Error) {
    // Accounts created before the v2 switch can still be read with the v1 API.
    console.warn('v2 account read failed, trying v1', v2Error);
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return finish({
      stripe_account_id: account.id,
      country: (account.country ?? 'US').toUpperCase(),
      default_currency: (account.default_currency ?? 'usd').toLowerCase(),
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      requirements: (account.requirements ?? {}) as Record<string, unknown>,
    });
  }
}

/** Returns a single-use Stripe-hosted onboarding URL for the seller. */
export async function createOnboardingLink(
  stripeAccountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<string> {
  try {
    const link = await stripeV2('POST', '/v2/core/account_links', {
      account: stripeAccountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['merchant', 'recipient'],
          refresh_url: refreshUrl,
          return_url: returnUrl,
        },
      },
    });
    return link.url as string;
  } catch (v2Error) {
    console.warn('v2 account link failed, trying v1', v2Error);
    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
      collection_options: { fields: 'eventually_due' },
    });
    return link.url;
  }
}
