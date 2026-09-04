import { platformFeeBps, requireUser, stripe, supabaseAdmin } from '../_shared/clients.ts';
import { errorResponse, handleCors, jsonResponse } from '../_shared/http.ts';

type ShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
};

type CheckoutRequest = {
  listing_id?: string;
  shipping_address?: ShippingAddress;
};

function validateAddress(value?: ShippingAddress): Required<Omit<ShippingAddress, 'line2' | 'phone'>> & Pick<ShippingAddress, 'line2' | 'phone'> {
  const address = value ?? {};
  const required = ['name', 'line1', 'city', 'state', 'postal_code'] as const;
  for (const field of required) {
    if (!address[field]?.trim()) throw new Error(`Shipping ${field.replace('_', ' ')} is required.`);
  }
  if ((address.country ?? 'US').toUpperCase() !== 'US') {
    throw new Error('ModTok currently ships within the United States only.');
  }
  return {
    name: address.name!.trim(),
    line1: address.line1!.trim(),
    line2: address.line2?.trim() || undefined,
    city: address.city!.trim(),
    state: address.state!.trim().toUpperCase(),
    postal_code: address.postal_code!.trim(),
    country: 'US',
    phone: address.phone?.trim() || undefined,
  };
}

async function releaseReservation(orderId: string, listingId: string) {
  await supabaseAdmin
    .from('orders')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pending_payment');
  await supabaseAdmin
    .from('marketplace_listings')
    .update({ status: 'active', reserved_until: null })
    .eq('id', listingId)
    .eq('status', 'reserved');
}

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let reservedOrder: any = null;
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as CheckoutRequest;
    if (!body.listing_id) throw new Error('A listing is required.');
    const shipping = validateAddress(body.shipping_address);

    const { data: order, error: reserveError } = await supabaseAdmin.rpc('reserve_marketplace_listing', {
      p_listing_id: body.listing_id,
      p_buyer_id: user.id,
      p_shipping_address: shipping,
      p_platform_fee_bps: platformFeeBps(),
    });
    if (reserveError) throw reserveError;
    reservedOrder = order;

    const { data: sellerAccount, error: sellerError } = await supabaseAdmin
      .from('seller_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('user_id', order.seller_id)
      .single();
    if (sellerError) throw sellerError;
    if (!sellerAccount.charges_enabled || !sellerAccount.payouts_enabled) {
      throw new Error('This seller is not ready to accept payments.');
    }

    let paymentIntent;
    if (order.stripe_payment_intent_id) {
      paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
    } else {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: order.total_amount_cents,
          currency: 'usd',
          automatic_payment_methods: { enabled: true },
          application_fee_amount: order.platform_fee_cents,
          transfer_data: { destination: sellerAccount.stripe_account_id },
          on_behalf_of: sellerAccount.stripe_account_id,
          description: `ModTok order ${order.id}`,
          metadata: {
            modtok_order_id: order.id,
            modtok_listing_id: order.listing_id,
            modtok_buyer_id: order.buyer_id,
            modtok_seller_id: order.seller_id,
          },
          shipping: {
            name: shipping.name,
            phone: shipping.phone,
            address: {
              line1: shipping.line1,
              line2: shipping.line2,
              city: shipping.city,
              state: shipping.state,
              postal_code: shipping.postal_code,
              country: 'US',
            },
          },
        },
        { idempotencyKey: `modtok-order-${order.id}` },
      );

      const { error: paymentUpdateError } = await supabaseAdmin
        .from('orders')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', order.id);
      if (paymentUpdateError) throw paymentUpdateError;
    }

    if (!paymentIntent.client_secret) throw new Error('Stripe did not return a payment secret.');

    return jsonResponse({
      order_id: order.id,
      payment_intent_client_secret: paymentIntent.client_secret,
      publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      amount_cents: order.total_amount_cents,
      currency: 'usd',
    });
  } catch (error) {
    console.error('marketplace-checkout error', error);
    if (reservedOrder?.id && !reservedOrder?.stripe_payment_intent_id) {
      await releaseReservation(reservedOrder.id, reservedOrder.listing_id);
    }
    const message = error instanceof Error ? error.message : 'Checkout could not be started.';
    const status = message.includes('signed in') || message.includes('session') ? 401 : 400;
    return errorResponse(message, status);
  }
});
