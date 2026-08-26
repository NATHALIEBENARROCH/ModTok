import { supabase } from './supabase';

/** Upload a local Expo image URI to the existing ModTok clothing-photos bucket. */
export async function uploadImageToSupabase(localUri: string, purpose = 'outfit-look'): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const response = await fetch(localUri);
    if (!response.ok) throw new Error(`Unable to read selected image (${response.status}).`);
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error('The selected image was empty.');

    const extension = localUri.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/)?.[1] ?? 'jpg';
    const path = `${user.id}/${purpose}-${Date.now()}.${extension}`;
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const { error } = await supabase.storage
      .from('clothing-photos')
      .upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from('clothing-photos').getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Outfit look photo upload failed:', error);
    return null;
  }
}
