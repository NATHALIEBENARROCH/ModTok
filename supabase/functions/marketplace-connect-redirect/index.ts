import { supabaseAdmin } from '../_shared/clients.ts';
import { createOnboardingLink, getSellerState } from '../_shared/sellers.ts';

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

function errorPage(message: string, status = 400): Response {
  return new Response(
    `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:32px;background:#F5F0EB;color:#191716"><h1>ModTok</h1><p>${message}</p><p>You can close this page and return to the app.</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const action = url.searchParams.get('action');
    if (!token || !['refresh', 'return'].includes(action ?? '')) {
      return errorPage('This seller onboarding link is invalid.');
    }

    const { data: session, error } = await supabaseAdmin
      .from('seller_onboarding_sessions')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      return errorPage('This seller onboarding link has expired. Start seller setup again in ModTok.', 410);
    }

    const functionBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/marketplace-connect-redirect`;
    const safeToken = encodeURIComponent(token);

    if (action === 'refresh') {
      const url = await createOnboardingLink(
        session.stripe_account_id,
        `${functionBase}?action=refresh&token=${safeToken}`,
        `${functionBase}?action=return&token=${safeToken}`,
      );
      return redirect(url);
    }

    const state = await getSellerState(session.stripe_account_id);
    const ready = Boolean(state.onboarding_completed_at);

    const { stripe_account_id: _ignored, ...update } = state;
    const { error: updateError } = await supabaseAdmin
      .from('seller_accounts')
      .update(update)
      .eq('user_id', session.user_id);
    if (updateError) throw updateError;

    await supabaseAdmin
      .from('seller_onboarding_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('token', token);

    const appScheme = Deno.env.get('APP_SCHEME') ?? 'modtok';
    return redirect(`${appScheme}://seller-onboarding?status=${ready ? 'ready' : 'pending'}`);
  } catch (error) {
    console.error('marketplace-connect-redirect error', error);
    return errorPage('We could not confirm your seller account. Please return to ModTok and try again.', 500);
  }
});
