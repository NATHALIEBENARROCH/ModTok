import { requireUser, stripe, supabaseAdmin } from '../_shared/clients.ts';
import { errorResponse, handleCors, jsonResponse } from '../_shared/http.ts';
import { purchaseLabelForOrder, refundLabel } from '../_shared/shipping.ts';

type OrderAction =
  | 'mark_processing'
  | 'mark_shipped'
  | 'confirm_delivered'
  | 'cancel_checkout'
  | 'refund'
  | 'retry_label';

type ActionRequest = {
  action?: OrderAction;
  order_id?: string;
  tracking_carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
};

async function writeEvent(orderId: string, eventType: string, actorId: string, metadata: Record<string, unknown> = {}) {
  const { error } = await supabaseAdmin.from('order_events').insert({
    order_id: orderId,
    event_type: eventType,
    actor_id: actorId,
    metadata,
  });
  if (error) throw error;
}

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const user = await requireUser(request);
    const body = (await request.json()) as ActionRequest;
    if (!body.order_id || !body.action) throw new Error('Order and action are required.');

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', body.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw new Error('Order not found.');

    const isBuyer = order.buyer_id === user.id;
    const isSeller = order.seller_id === user.id;
    if (!isBuyer && !isSeller) throw new Error('You do not have access to this order.');

    const now = new Date().toISOString();

    if (body.action === 'mark_processing') {
      if (!isSeller) throw new Error('Only the seller can prepare this order.');
      if (order.status !== 'paid') throw new Error('Only paid orders can be marked as processing.');
      const { error } = await supabaseAdmin.from('orders').update({ status: 'processing' }).eq('id', order.id).eq('status', 'paid');
      if (error) throw error;
      await writeEvent(order.id, 'seller_started_processing', user.id);
    } else if (body.action === 'mark_shipped') {
      if (!isSeller) throw new Error('Only the seller can ship this order.');
      if (!['paid', 'processing'].includes(order.status)) throw new Error('Only paid orders can be marked as shipped.');
      // With a ModTok prepaid label the tracking is already known ("I dropped it off").
      const usesLabel = order.label_status === 'purchased' && !body.tracking_number?.trim();
      const carrier = usesLabel ? order.tracking_carrier : body.tracking_carrier?.trim();
      const trackingNumber = usesLabel ? order.tracking_number : body.tracking_number?.trim();
      if (!carrier || !trackingNumber) {
        throw new Error('Carrier and tracking number are required.');
      }
      const { error } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'shipped',
          shipped_at: now,
          tracking_carrier: carrier,
          tracking_number: trackingNumber,
          tracking_url: usesLabel ? order.tracking_url : body.tracking_url?.trim() || null,
        })
        .eq('id', order.id)
        .in('status', ['paid', 'processing']);
      if (error) throw error;
      await writeEvent(order.id, 'seller_marked_shipped', user.id, {
        carrier,
        tracking_number: trackingNumber,
        prepaid_label: usesLabel,
      });
    } else if (body.action === 'confirm_delivered') {
      if (!isBuyer) throw new Error('Only the buyer can confirm delivery.');
      if (order.status !== 'shipped') throw new Error('This order is not marked as shipped.');
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'delivered', delivered_at: now })
        .eq('id', order.id)
        .eq('status', 'shipped');
      if (error) throw error;
      await writeEvent(order.id, 'buyer_confirmed_delivery', user.id);
    } else if (body.action === 'cancel_checkout') {
      if (!isBuyer) throw new Error('Only the buyer can cancel this checkout.');
      if (order.status !== 'pending_payment') throw new Error('This checkout can no longer be canceled.');
      if (order.stripe_payment_intent_id) {
        const intent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        if (intent.status === 'succeeded') throw new Error('This payment already went through.');
        if (intent.status !== 'canceled') {
          await stripe.paymentIntents.cancel(intent.id);
        }
      }
      // Cancels the checkout and puts every listing it held back on sale.
      const { error } = await supabaseAdmin.rpc('release_order_reservation', {
        p_order_id: order.id,
        p_event: 'checkout_canceled',
      });
      if (error) throw error;
      await writeEvent(order.id, 'buyer_canceled_checkout', user.id);
    } else if (body.action === 'refund') {
      if (!isSeller) throw new Error('Only the seller can issue this refund.');
      if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) {
        throw new Error('This order is not eligible for a refund.');
      }
      if (!order.stripe_payment_intent_id) throw new Error('This order has no Stripe payment.');

      const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'refund_pending' })
        .eq('id', order.id)
        .in('status', ['paid', 'processing', 'shipped', 'delivered']);
      if (error) throw error;

      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: order.stripe_payment_intent_id,
            reverse_transfer: true,
            refund_application_fee: true,
            metadata: { modtok_order_id: order.id, requested_by: user.id },
          },
          { idempotencyKey: `modtok-full-refund-${order.id}` },
        );
        await supabaseAdmin.from('orders').update({ stripe_refund_id: refund.id }).eq('id', order.id);
        await writeEvent(order.id, 'seller_requested_refund', user.id, { stripe_refund_id: refund.id });
        // An unused prepaid label is refunded by the carrier too.
        if (!order.shipped_at) await refundLabel(order.id);
      } catch (refundError) {
        await supabaseAdmin.from('orders').update({ status: order.status }).eq('id', order.id);
        throw refundError;
      }
    } else if (body.action === 'retry_label') {
      if (!isSeller) throw new Error('Only the seller can get the shipping label.');
      if (!['paid', 'processing'].includes(order.status)) throw new Error('A label can only be made for a paid order that has not shipped.');
      if (order.label_status === 'purchased') throw new Error('This order already has a label.');
      if (order.label_status === 'pending') throw new Error('The label is being created. Pull down to refresh in a moment.');
      await purchaseLabelForOrder(order.id);
    } else {
      throw new Error('Unsupported order action.');
    }

    const { data: updated, error: updatedError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();
    if (updatedError) throw updatedError;
    return jsonResponse({ order: updated });
  } catch (error) {
    console.error('marketplace-order-action error', error);
    const message = error instanceof Error ? error.message : (error as any)?.message ?? 'Order could not be updated.';
    const status = message.includes('signed in') || message.includes('session') ? 401 : message.includes('access') ? 403 : 400;
    return errorResponse(message, status);
  }
});
