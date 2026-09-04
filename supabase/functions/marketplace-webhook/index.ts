import Stripe from 'npm:stripe@22.0.0';
import { stripe, supabaseAdmin } from '../_shared/clients.ts';

const cryptoProvider = Stripe.createSubtleCryptoProvider();

async function addOrderEvent(orderId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  const { error } = await supabaseAdmin.from('order_events').insert({
    order_id: orderId,
    event_type: eventType,
    metadata,
  });
  if (error) throw error;
}

async function releaseListing(orderId: string, reason: string) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, listing_id, status')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order || order.status !== 'pending_payment') return;

  const now = new Date().toISOString();
  const { error: orderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'canceled', canceled_at: now })
    .eq('id', order.id)
    .eq('status', 'pending_payment');
  if (orderError) throw orderError;

  const { error: listingError } = await supabaseAdmin
    .from('marketplace_listings')
    .update({ status: 'active', reserved_until: null })
    .eq('id', order.listing_id)
    .eq('status', 'reserved');
  if (listingError) throw listingError;
  await addOrderEvent(order.id, reason);
}

async function findOrderByPaymentIntent(paymentIntentId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.modtok_user_id;
      const ready = Boolean(account.details_submitted && account.charges_enabled && account.payouts_enabled);
      const update = {
        country: (account.country ?? 'US').toUpperCase(),
        default_currency: (account.default_currency ?? 'usd').toLowerCase(),
        details_submitted: Boolean(account.details_submitted),
        charges_enabled: Boolean(account.charges_enabled),
        payouts_enabled: Boolean(account.payouts_enabled),
        requirements: account.requirements ?? {},
        onboarding_completed_at: ready ? new Date().toISOString() : null,
      };
      const query = supabaseAdmin.from('seller_accounts').update(update);
      const { error } = userId
        ? await query.eq('user_id', userId)
        : await query.eq('stripe_account_id', account.id);
      if (error) throw error;
      break;
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.modtok_order_id;
      if (!orderId) break;
      const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
      const now = new Date().toISOString();
      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'paid', paid_at: now, stripe_charge_id: chargeId ?? null })
        .eq('id', orderId)
        .in('status', ['pending_payment', 'processing'])
        .select('id, listing_id')
        .maybeSingle();
      if (error) throw error;
      if (!order) break;

      const { error: listingError } = await supabaseAdmin
        .from('marketplace_listings')
        .update({ status: 'sold', sold_at: now, reserved_until: null })
        .eq('id', order.listing_id);
      if (listingError) throw listingError;
      await addOrderEvent(order.id, 'payment_succeeded', { stripe_event_id: event.id });
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.modtok_order_id;
      if (orderId) await releaseListing(orderId, 'payment_failed');
      break;
    }

    case 'payment_intent.canceled': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.modtok_order_id;
      if (orderId) await releaseListing(orderId, 'payment_canceled');
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (!paymentIntentId) break;
      const order = await findOrderByPaymentIntent(paymentIntentId);
      if (!order) break;
      const isFullRefund = charge.amount_refunded >= charge.amount;
      const refundId = charge.refunds?.data?.[0]?.id ?? null;
      const { error } = await supabaseAdmin
        .from('orders')
        .update({
          status: isFullRefund ? 'refunded' : 'partially_refunded',
          stripe_refund_id: refundId,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      if (error) throw error;
      await addOrderEvent(order.id, isFullRefund ? 'refund_completed' : 'partial_refund_completed', {
        amount_refunded: charge.amount_refunded,
        stripe_event_id: event.id,
      });
      break;
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute;
      const charge = await stripe.charges.retrieve(typeof dispute.charge === 'string' ? dispute.charge : dispute.charge.id);
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (!paymentIntentId) break;
      const order = await findOrderByPaymentIntent(paymentIntentId);
      if (!order) break;
      const { error } = await supabaseAdmin.from('orders').update({ status: 'disputed' }).eq('id', order.id);
      if (error) throw error;
      await addOrderEvent(order.id, 'dispute_opened', { stripe_dispute_id: dispute.id, stripe_event_id: event.id });
      break;
    }

    default:
      break;
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = request.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');
  if (!signature || !webhookSecret) return new Response('Webhook is not configured', { status: 400 });

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret, undefined, cryptoProvider);
  } catch (error) {
    console.error('Invalid Stripe signature', error);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from('stripe_events')
      .select('processed_at')
      .eq('event_id', event.id)
      .maybeSingle();
    if (existing?.processed_at) return Response.json({ received: true, duplicate: true });

    const { error: ledgerError } = await supabaseAdmin.from('stripe_events').upsert(
      { event_id: event.id, event_type: event.type, payload: event as unknown as Record<string, unknown>, processing_error: null },
      { onConflict: 'event_id' },
    );
    if (ledgerError) throw ledgerError;

    await processEvent(event);

    const { error: completeError } = await supabaseAdmin
      .from('stripe_events')
      .update({ processed_at: new Date().toISOString(), processing_error: null })
      .eq('event_id', event.id);
    if (completeError) throw completeError;

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    console.error('marketplace-webhook error', error);
    await supabaseAdmin
      .from('stripe_events')
      .update({ processing_error: message })
      .eq('event_id', event.id);
    return new Response('Webhook processing failed', { status: 500 });
  }
});
