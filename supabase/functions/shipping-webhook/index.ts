// Receives Shippo tracking updates, so orders move to "Shipped" when the carrier
// scans the parcel and to "Delivered" when it arrives, without anyone tapping anything.
//
// In Shippo: Settings → Webhooks → add
//   https://<project>.supabase.co/functions/v1/shipping-webhook?token=<SHIPPO_WEBHOOK_TOKEN>
// with the event type "track_updated".
import { supabaseAdmin } from '../_shared/clients.ts';

function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expected = Deno.env.get('SHIPPO_WEBHOOK_TOKEN');
  const provided = new URL(request.url).searchParams.get('token') ?? '';
  if (!expected || !sameToken(provided, expected)) return new Response('Unauthorized', { status: 401 });

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (payload?.event !== 'track_updated') return Response.json({ received: true, ignored: true });

  const trackingNumber = String(payload?.data?.tracking_number ?? '').trim();
  const status = String(payload?.data?.tracking_status?.status ?? '').toUpperCase();
  if (!trackingNumber || !status) return Response.json({ received: true, ignored: true });

  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, status, shipped_at')
      .eq('tracking_number', trackingNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!order) return Response.json({ received: true, unknown: true });

    const now = new Date().toISOString();
    if (status === 'TRANSIT' && ['paid', 'processing'].includes(order.status)) {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'shipped', shipped_at: now })
        .eq('id', order.id)
        .in('status', ['paid', 'processing']);
      if (updateError) throw updateError;
      await supabaseAdmin.from('order_events').insert({ order_id: order.id, event_type: 'carrier_in_transit', metadata: { status } });
    } else if (status === 'DELIVERED' && ['paid', 'processing', 'shipped'].includes(order.status)) {
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'delivered', delivered_at: now, shipped_at: order.shipped_at ?? now })
        .eq('id', order.id)
        .in('status', ['paid', 'processing', 'shipped']);
      if (updateError) throw updateError;
      await supabaseAdmin.from('order_events').insert({ order_id: order.id, event_type: 'carrier_delivered', metadata: { status } });
    } else if (['RETURNED', 'FAILURE'].includes(status)) {
      await supabaseAdmin.from('order_events').insert({
        order_id: order.id,
        event_type: 'carrier_problem',
        metadata: { status, details: payload?.data?.tracking_status?.status_details ?? null },
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('shipping-webhook error', error);
    return new Response('Processing failed', { status: 500 });
  }
});
