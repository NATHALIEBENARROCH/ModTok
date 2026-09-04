import { requireUser, stripe, supabaseAdmin } from '../_shared/clients.ts';
import { errorResponse, handleCors, jsonResponse } from '../_shared/http.ts';

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const user = await requireUser(request);

    const { data: openOrders, error: openError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .in('status', ['paid', 'processing', 'shipped', 'refund_pending', 'disputed'])
      .limit(1);
    if (openError) throw openError;
    if (openOrders?.length) {
      return errorResponse(
        'Your account has an unfinished purchase, sale, refund, or dispute. Finish it or contact ModTok support before deleting your account.',
        409,
      );
    }

    const { data: pendingOrders, error: pendingError } = await supabaseAdmin
      .from('orders')
      .select('id, listing_id, stripe_payment_intent_id')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .eq('status', 'pending_payment');
    if (pendingError) throw pendingError;

    for (const order of pendingOrders ?? []) {
      if (order.stripe_payment_intent_id) {
        try {
          const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
          if (!['succeeded', 'canceled'].includes(intent.status)) await stripe.paymentIntents.cancel(intent.id);
        } catch (error) {
          console.warn('Could not cancel pending PaymentIntent during account deletion', error);
        }
      }
      await supabaseAdmin
        .from('orders')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('status', 'pending_payment');
      if (order.listing_id) {
        await supabaseAdmin
          .from('marketplace_listings')
          .update({ status: 'archived', reserved_until: null })
          .eq('id', order.listing_id)
          .eq('status', 'reserved');
      }
    }

    await supabaseAdmin
      .from('marketplace_listings')
      .update({ status: 'archived', reserved_until: null })
      .eq('seller_id', user.id)
      .in('status', ['draft', 'active', 'reserved']);

    const { data: seller } = await supabaseAdmin
      .from('seller_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (seller?.stripe_account_id) {
      try {
        await stripe.accounts.del(seller.stripe_account_id);
      } catch (error) {
        console.warn('Stripe account could not be deleted automatically', error);
      }
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('delete-account error', error);
    const message = error instanceof Error ? error.message : 'Account could not be deleted.';
    const status = message.includes('signed in') || message.includes('session') ? 401 : 400;
    return errorResponse(message, status);
  }
});
