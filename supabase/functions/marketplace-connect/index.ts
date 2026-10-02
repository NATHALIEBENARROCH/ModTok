import { stripe, supabaseAdmin, requireUser } from '../_shared/clients.ts';
import { errorResponse, handleCors, jsonResponse } from '../_shared/http.ts';
import { createOnboardingLink, createSellerAccount, getSellerState } from '../_shared/sellers.ts';

interface ConnectRequest {
  action?: 'start' | 'status' | 'dashboard';
}

async function syncAccount(userId: string, stripeAccountId: string) {
  const state = await getSellerState(stripeAccountId);
  const { error } = await supabaseAdmin
    .from('seller_accounts')
    .update(state)
    .eq('user_id', userId);
  if (error) throw error;
  return state;
}

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as ConnectRequest;
    const action = body.action ?? 'status';

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('seller_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (action === 'status') {
      if (!existing) {
        return jsonResponse({
          connected: false,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
        });
      }
      const state = await syncAccount(user.id, existing.stripe_account_id);
      return jsonResponse({ connected: true, ...state });
    }

    let stripeAccountId = existing?.stripe_account_id as string | undefined;
    if (!stripeAccountId) {
      const state = await createSellerAccount(user);
      stripeAccountId = state.stripe_account_id;

      const { error: insertError } = await supabaseAdmin.from('seller_accounts').insert({
        user_id: user.id,
        onboarding_started_at: new Date().toISOString(),
        ...state,
      });
      if (insertError) throw insertError;
    }

    if (action === 'dashboard') {
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
      return jsonResponse({ url: loginLink.url });
    }

    if (action !== 'start') return errorResponse('Unsupported action', 400);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('seller_onboarding_sessions')
      .insert({ user_id: user.id, stripe_account_id: stripeAccountId })
      .select('token')
      .single();
    if (sessionError) throw sessionError;

    const functionBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/marketplace-connect-redirect`;
    const token = encodeURIComponent(session.token);
    const url = await createOnboardingLink(
      stripeAccountId,
      `${functionBase}?action=refresh&token=${token}`,
      `${functionBase}?action=return&token=${token}`,
    );

    return jsonResponse({ url });
  } catch (error) {
    console.error('marketplace-connect error', error);
    const message = error instanceof Error ? error.message : 'Could not connect seller account.';
    const status = message.includes('signed in') || message.includes('session') ? 401 : 400;
    return errorResponse(message, status);
  }
});
