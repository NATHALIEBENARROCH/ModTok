import { stripe, supabaseAdmin } from '../_shared/clients.ts';

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
      const accountLink = await stripe.accountLinks.create({
        account: session.stripe_account_id,
        refresh_url: `${functionBase}?action=refresh&token=${safeToken}`,
        return_url: `${functionBase}?action=return&token=${safeToken}`,
        type: 'account_onboarding',
        collection_options: { fields: 'eventually_due' },
      });
      return redirect(accountLink.url);
    }

    const account = await stripe.accounts.retrieve(session.stripe_account_id);
    const ready = Boolean(account.details_submitted && account.charges_enabled && account.payouts_enabled);

    const { error: updateError } = await supabaseAdmin
      .from('seller_accounts')
      .update({
        country: (account.country ?? 'US').toUpperCase(),
        default_currency: (account.default_currency ?? 'usd').toLowerCase(),
        details_submitted: Boolean(account.details_submitted),
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        requirements: account.requirements ?? {},
        onboarding_completed_at: ready ? new Date().toISOString() : null,
      })
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
