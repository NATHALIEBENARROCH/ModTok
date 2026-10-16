// Prepaid shipping labels through Shippo (https://goshippo.com).
//
// The buyer pays the shipping price for the package size at checkout. When the
// payment succeeds, ModTok buys the cheapest USPS label (or the cheapest label
// overall if USPS has none) from the seller's ship-from address to the buyer.
// The seller just prints it (or shows it at the post office) and drops the parcel off.
//
// Secrets:
//   SHIPPO_API_KEY         shippo_test_... while testing, shippo_live_... for real labels
//   SHIPPO_WEBHOOK_TOKEN   random string added to the tracking webhook URL (see shipping-webhook)
import { supabaseAdmin } from './clients.ts';

const SHIPPO_API = 'https://api.goshippo.com';

export type PackageSize = 'small' | 'medium' | 'large';

export type PostalAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
};

export function shippingConfigured(): boolean {
  return Boolean(Deno.env.get('SHIPPO_API_KEY'));
}

async function shippo(method: 'GET' | 'POST', path: string, body?: unknown): Promise<any> {
  const key = Deno.env.get('SHIPPO_API_KEY');
  if (!key) throw new Error('Shipping labels are not set up yet (SHIPPO_API_KEY is missing).');
  const response = await fetch(`${SHIPPO_API}${path}`, {
    method,
    headers: {
      Authorization: `ShippoToken ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof json === 'object' ? JSON.stringify(json).slice(0, 300) : String(json);
    throw new Error(`Shippo request failed (${response.status}): ${detail}`);
  }
  return json;
}

function toShippoAddress(address: PostalAddress, fallbackPhone?: string) {
  return {
    name: address.name ?? '',
    street1: address.line1 ?? '',
    street2: address.line2 ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    zip: address.postal_code ?? '',
    country: (address.country ?? 'US').toUpperCase(),
    phone: address.phone ?? fallbackPhone ?? '',
  };
}

function messagesText(messages: any): string {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  return messages.map((m: any) => m?.text ?? m?.message ?? '').filter(Boolean).join(' ');
}

function pickRate(rates: any[]): any | null {
  const usable = (rates ?? []).filter((rate) => rate?.object_id && Number.isFinite(Number(rate.amount)));
  if (usable.length === 0) return null;
  const byPrice = (a: any, b: any) => Number(a.amount) - Number(b.amount);
  const usps = usable.filter((rate) => String(rate.provider ?? '').toUpperCase() === 'USPS').sort(byPrice);
  return usps[0] ?? usable.sort(byPrice)[0];
}

async function setLabelFailed(orderId: string, message: string) {
  await supabaseAdmin
    .from('orders')
    .update({ label_status: 'failed', label_error: message.slice(0, 500) })
    .eq('id', orderId);
  await supabaseAdmin.from('order_events').insert({
    order_id: orderId,
    event_type: 'label_failed',
    metadata: { message: message.slice(0, 500) },
  });
}

/**
 * Buys the prepaid label for a paid order. Never throws: on failure the order is
 * marked label_status = 'failed' with a reason, and the seller can tap "Try again"
 * or add tracking by hand.
 */
export async function purchaseLabelForOrder(orderId: string): Promise<void> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, seller_id, status, package_size, label_status, shipping_address, listing_snapshot')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !order) {
    console.error('Label: order not found', orderId, error);
    return;
  }
  if (order.label_status === 'purchased') return;
  if (!['paid', 'processing'].includes(order.status)) return;

  // Claim the order so two webhook deliveries cannot buy two labels.
  const { data: claimed } = await supabaseAdmin
    .from('orders')
    .update({ label_status: 'pending', label_error: null })
    .eq('id', orderId)
    .in('label_status', ['none', 'failed'])
    .select('id')
    .maybeSingle();
  if (!claimed) return;

  try {
    if (!shippingConfigured()) {
      throw new Error('Prepaid labels are not switched on yet. Ship with any carrier and add the tracking number.');
    }

    const { data: settings } = await supabaseAdmin
      .from('seller_settings')
      .select('ship_from')
      .eq('user_id', order.seller_id)
      .maybeSingle();
    const shipFrom = settings?.ship_from as PostalAddress | null;
    if (!shipFrom?.line1 || !shipFrom?.city || !shipFrom?.state || !shipFrom?.postal_code) {
      throw new Error('Add your ship-from address on the Sell page, then tap "Get label" again.');
    }

    const size = (order.package_size ?? order.listing_snapshot?.package_size ?? 'medium') as PackageSize;
    const { data: rate, error: rateError } = await supabaseAdmin
      .from('shipping_rates')
      .select('weight_oz, length_in, width_in, height_in')
      .eq('package_size', size)
      .single();
    if (rateError || !rate) throw new Error('Shipping rates are not set up.');

    const shipment = await shippo('POST', '/shipments/', {
      address_from: toShippoAddress(shipFrom),
      address_to: toShippoAddress(order.shipping_address as PostalAddress, shipFrom.phone),
      parcels: [{
        length: String(rate.length_in),
        width: String(rate.width_in),
        height: String(rate.height_in),
        distance_unit: 'in',
        weight: String(rate.weight_oz),
        mass_unit: 'oz',
      }],
      metadata: `ModTok order ${order.id}`,
      async: false,
    });

    const chosen = pickRate(shipment?.rates);
    if (!chosen) {
      const reason = messagesText(shipment?.messages);
      throw new Error(`No carrier could ship this package. ${reason || 'Check both addresses.'}`.trim());
    }

    const transaction = await shippo('POST', '/transactions/', {
      rate: chosen.object_id,
      label_file_type: 'PDF_4x6',
      metadata: `ModTok order ${order.id}`,
      async: false,
    });
    if (transaction?.status !== 'SUCCESS' || !transaction?.label_url) {
      const reason = messagesText(transaction?.messages);
      throw new Error(`The label could not be created. ${reason}`.trim());
    }

    const carrier = String(chosen.provider ?? 'USPS');
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        label_status: 'purchased',
        label_url: transaction.label_url,
        label_error: null,
        label_cost_cents: Math.round(Number(chosen.amount) * 100),
        label_created_at: now,
        shippo_shipment_id: shipment.object_id ?? null,
        shippo_transaction_id: transaction.object_id ?? null,
        tracking_carrier: carrier,
        tracking_number: transaction.tracking_number ?? null,
        tracking_url: transaction.tracking_url_provider ?? null,
      })
      .eq('id', order.id);
    if (updateError) throw updateError;

    await supabaseAdmin.from('order_events').insert({
      order_id: order.id,
      event_type: 'label_created',
      metadata: {
        carrier,
        service: chosen?.servicelevel?.name ?? chosen?.servicelevel?.token ?? null,
        tracking_number: transaction.tracking_number ?? null,
        cost: chosen.amount,
        test: Boolean(transaction.test ?? shipment.test),
      },
    });
  } catch (labelError) {
    const message = labelError instanceof Error ? labelError.message : String(labelError);
    console.error('Label purchase failed', order.id, message);
    await setLabelFailed(order.id, message);
  }
}

/** Asks Shippo to refund an unused label (used when an order is refunded). Best effort. */
export async function refundLabel(orderId: string): Promise<void> {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, label_status, shippo_transaction_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order?.shippo_transaction_id || order.label_status !== 'purchased' || !shippingConfigured()) return;
  try {
    await shippo('POST', '/refunds/', { transaction: order.shippo_transaction_id, async: true });
    await supabaseAdmin.from('orders').update({ label_status: 'refunded' }).eq('id', order.id);
    await supabaseAdmin.from('order_events').insert({ order_id: order.id, event_type: 'label_refund_requested', metadata: {} });
  } catch (error) {
    console.error('Label refund failed', order.id, error);
  }
}
