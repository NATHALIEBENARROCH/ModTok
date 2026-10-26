import { requireUser, supabaseAdmin } from '../_shared/clients.ts';
import { errorResponse, handleCors, jsonResponse } from '../_shared/http.ts';

// AI virtual try-on, powered by FASHN (https://fashn.ai).
//
// Privacy: the shopper's own photo arrives here as a data URI, is passed straight to FASHN and
// is never written to ModTok storage or the database. We ask FASHN for a base64 result, which
// it keeps for 60 minutes only, and FASHN does not train on customer images.
//
// Server secrets (supabase secrets set ...):
//   FASHN_API_KEY             required
//   TRYON_FEMALE_MODEL_URL    public https photo used by "Try on a female model"
//   TRYON_MALE_MODEL_URL      public https photo used by "Try on a male model"
//   TRYON_DAILY_LIMIT         try-ons per shopper per 24 hours (default 10)
//   TRYON_GLOBAL_DAILY_LIMIT  try-ons across all of ModTok per 24 hours (default 500), a spending cap

const FASHN_BASE = 'https://api.fashn.ai/v1';
const MAX_IMAGE_CHARS = 8_000_000; // about 6 MB of image once decoded
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 100_000;

type Person = 'self' | 'female' | 'male';
type Category = 'auto' | 'tops' | 'bottoms' | 'one-pieces';

function intEnv(name: string, fallback: number): number {
  const value = Number(Deno.env.get(name) ?? fallback);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function checkImage(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${label} is missing.`);
  if (value.length > MAX_IMAGE_CHARS) throw new Error(`${label} is too large. Please use a smaller photo.`);
  if (!value.startsWith('https://') && !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(value)) {
    throw new Error(`${label} must be a photo.`);
  }
  return value;
}

function personImage(person: Person, selfImage: unknown): string {
  if (person === 'self') return checkImage(selfImage, 'Your photo');
  const url = Deno.env.get(person === 'female' ? 'TRYON_FEMALE_MODEL_URL' : 'TRYON_MALE_MODEL_URL');
  if (!url) throw new Error('Model try-on is not set up yet. Please try on with your own photo.');
  return url;
}

async function fashn(path: string, init?: RequestInit): Promise<any> {
  const apiKey = Deno.env.get('FASHN_API_KEY');
  if (!apiKey) throw new Error('Virtual try-on is not set up yet.');
  const response = await fetch(`${FASHN_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('FASHN error', response.status, body);
    if (response.status === 429) throw new Error('Try-on is very busy right now. Please try again in a minute.');
    throw new Error('Try-on is not available right now. Please try again later.');
  }
  return body;
}

// FASHN returns errors as { name, message }: https://docs.fashn.ai/api-overview/api-fundamentals
function friendlyFashnError(error: any): string {
  const name = String(error?.name ?? '');
  if (name === 'PoseError') return 'We could not see a person clearly in that photo. Try a well-lit, full-body photo facing the camera.';
  if (name === 'ImageLoadError') return 'The photo could not be opened. Please try another one.';
  if (name === 'ContentModerationError') return 'That photo could not be used. Please try another one.';
  return 'The try-on did not work this time. Please try another photo.';
}

async function runTryOn(modelImage: string, garmentImage: string, category: Category): Promise<string> {
  const started = await fashn('/run', {
    method: 'POST',
    body: JSON.stringify({
      model_name: 'tryon-v1.6',
      inputs: {
        model_image: modelImage,
        garment_image: garmentImage,
        category,
        mode: 'balanced',
        moderation_level: 'permissive',
        output_format: 'jpeg',
        return_base64: true,
      },
    }),
  });
  if (!started?.id) throw new Error(friendlyFashnError(started?.error));

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const status = await fashn(`/status/${started.id}`);
    if (status.status === 'completed' && status.output?.[0]) return status.output[0];
    if (status.status === 'failed' || status.status === 'canceled') {
      console.error('FASHN prediction failed', status.error);
      throw new Error(friendlyFashnError(status.error));
    }
  }
  throw new Error('The try-on took too long. Please try again.');
}

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  let usageId: number | null = null;
  try {
    const user = await requireUser(request);
    // Each try-on costs ModTok money, so guests (anonymous profiles) need a free account first.
    if (user.is_anonymous) return errorResponse('Create a free account to try clothes on.', 403);

    const body = await request.json().catch(() => ({}));
    const person: Person = ['self', 'female', 'male'].includes(body?.person) ? body.person : 'self';
    const category: Category = ['tops', 'bottoms', 'one-pieces'].includes(body?.category) ? body.category : 'auto';
    const garmentImage = checkImage(body?.garment_image, 'The clothing photo');
    const modelImage = personImage(person, body?.person_image);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: mine, error: mineError }, { count: everyone, error: everyoneError }] = await Promise.all([
      supabaseAdmin.from('try_on_usage').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since),
      supabaseAdmin.from('try_on_usage').select('id', { count: 'exact', head: true }).gte('created_at', since),
    ]);
    if (mineError) throw mineError;
    if (everyoneError) throw everyoneError;
    const dailyLimit = intEnv('TRYON_DAILY_LIMIT', 10);
    if ((mine ?? 0) >= dailyLimit) {
      return errorResponse(`You've used your ${dailyLimit} try-ons for today. Come back tomorrow for more.`, 429);
    }
    if ((everyone ?? 0) >= intEnv('TRYON_GLOBAL_DAILY_LIMIT', 500)) {
      return errorResponse('Try-on is very popular today. Please come back tomorrow.', 429);
    }

    // Only the fact that a try-on happened is recorded, never the photos.
    const { data: usage, error: usageError } = await supabaseAdmin
      .from('try_on_usage')
      .insert({ user_id: user.id, person })
      .select('id')
      .single();
    if (usageError) throw usageError;
    usageId = usage.id;

    const image = await runTryOn(modelImage, garmentImage, category);
    return jsonResponse({ image, remaining_today: Math.max(0, dailyLimit - (mine ?? 0) - 1) });
  } catch (error) {
    console.error('virtual-try-on error', error);
    // A try-on that failed should not use up one of the shopper's daily try-ons.
    if (usageId !== null) await supabaseAdmin.from('try_on_usage').delete().eq('id', usageId);
    const message = typeof (error as any)?.message === 'string' ? (error as any).message : 'Try-on did not work.';
    const status = message.includes('signed in') || message.includes('session') ? 401 : 400;
    return errorResponse(message, status);
  }
});
