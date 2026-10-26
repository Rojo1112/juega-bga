import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type Bucket = 'chat-images' | 'post-images';

export async function pickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  return result.canceled ? null : result.assets[0];
}

/**
 * Sube la imagen a `<folder>/<archivo>` y devuelve esa ruta.
 * chat-images usa el id del chat como carpeta; post-images, el id del usuario.
 */
export async function uploadImage(bucket: Bucket, folder: string, asset: ImagePicker.ImagePickerAsset) {
  const contentType = asset.mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] ?? 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const body = await (await fetch(asset.uri)).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType });
  if (error) throw error;
  return path;
}

export function publicImageUrl(path: string) {
  return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
}

export async function signedChatImageUrl(path: string) {
  const { data, error } = await supabase.storage.from('chat-images').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
