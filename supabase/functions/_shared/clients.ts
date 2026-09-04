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

export function platformFeeBps(): number {
  const raw = Number(Deno.env.get('PLATFORM_FEE_BPS') ?? '1000');
  if (!Number.isInteger(raw) || raw < 0 || raw > 5000) {
    throw new Error('PLATFORM_FEE_BPS must be an integer from 0 to 5000.');
  }
  return raw;
}
