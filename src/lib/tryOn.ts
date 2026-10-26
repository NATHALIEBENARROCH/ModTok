import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';
import { functionError } from '../context/MarketplaceContext';

export type TryOnPerson = 'self' | 'female' | 'male';
export type TryOnCategory = 'tops' | 'bottoms' | 'one-pieces';

// ModTok wardrobe categories the try-on AI can dress someone in. Shoes, bags, jewelry and
// accessories are not supported, so the Try it on button is hidden for them.
const CATEGORY_MAP: Record<string, TryOnCategory> = {
  coats: 'tops',
  jackets: 'tops',
  cardigans: 'tops',
  sweaters: 'tops',
  tops: 'tops',
  blouses: 'tops',
  't shirts': 'tops',
  activewear: 'tops',
  pants: 'bottoms',
  skirts: 'bottoms',
  shorts: 'bottoms',
  dresses: 'one-pieces',
};

export function tryOnCategory(category?: string | null): TryOnCategory | null {
  return CATEGORY_MAP[(category ?? '').trim().toLowerCase()] ?? null;
}

/** Shrinks a photo and returns it as a JPEG data URI, so it uploads quickly. */
async function toDataUri(uri: string, maxHeight = 1280): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ height: maxHeight });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG, base64: true });
  if (!result.base64) throw new Error('Could not read that photo.');
  return `data:image/jpeg;base64,${result.base64}`;
}

/**
 * Puts a piece of clothing on the shopper (from their own photo) or on a ModTok model.
 * The shopper's photo is sent for this one try-on only and is never saved by ModTok.
 * Returns the result as an image URI that can be shown in an <Image>.
 */
export async function runTryOn(options: {
  garmentImage: string;
  category: TryOnCategory;
  person: TryOnPerson;
  personPhotoUri?: string;
}): Promise<{ image: string; remainingToday?: number }> {
  const garment_image = options.garmentImage.startsWith('https://')
    ? options.garmentImage
    : await toDataUri(options.garmentImage);
  const person_image = options.person === 'self' && options.personPhotoUri
    ? await toDataUri(options.personPhotoUri)
    : undefined;

  const { data, error } = await supabase.functions.invoke('virtual-try-on', {
    body: { garment_image, person_image, person: options.person, category: options.category },
  });
  if (error) throw await functionError(error, 'Try-on did not work. Please try again.');
  if (!data?.image) throw new Error('Try-on did not work. Please try again.');
  return { image: data.image, remainingToday: data.remaining_today };
}
