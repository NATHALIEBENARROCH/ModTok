export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: unknown, status = 400): Response {
  // Accept plain strings and error-like objects (Supabase errors are not Error instances),
  // so the app shows the real reason instead of "Unexpected error".
  const message =
    typeof error === 'string' ? error
    : error instanceof Error ? error.message
    : typeof (error as any)?.message === 'string' ? (error as any).message
    : 'Unexpected error';
  return jsonResponse({ error: message }, status);
}
