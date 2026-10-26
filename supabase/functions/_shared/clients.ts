import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@22.0.0';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required server secret: ${name}`);
  return value;
}

export const supabaseAdmin = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
  httpClient: Stripe.createFetchHttpClient(),
});

export async function requireUser(request: Request): Promise<User> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('You must be signed in.');
  }

  const token = authorization.slice('Bearer '.length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error('Your session has expired. Please sign in again.');
  return data.user;
}

export function appUrl(path = ''): string {
  const base = requireEnv('APP_URL').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function intSetting(name: string, fallback: number, max: number): number {
  const raw = Number(Deno.env.get(name) ?? String(fallback));
  if (!Number.isInteger(raw) || raw < 0 || raw > max) {
    throw new Error(`${name} must be an integer from 0 to ${max}.`);
  }
  return raw;
}

// Buyer Protection, paid by the buyer on top of the price (sellers pay no fee):
// a fixed amount plus a percentage of the items. Default $0.70 + 5%, like Vinted.
export function buyerProtectionFee(): { fixedCents: number; bps: number } {
  return {
    fixedCents: intSetting('BUYER_PROTECTION_FIXED_CENTS', 70, 1000),
    bps: intSetting('BUYER_PROTECTION_BPS', 500, 2000),
  };
}
