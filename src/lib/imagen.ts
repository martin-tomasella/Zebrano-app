// src/lib/imagen.ts — fotos comprimidas (lado mayor ≤ 1600 px, JPEG) antes de subirlas o mandarlas a la IA
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const MAX = 1600;

export interface Foto { uri: string; base64: string }

export async function comprimir(a: { uri: string; width: number; height: number }): Promise<Foto> {
  const resize = Math.max(a.width, a.height) > MAX ? [{ resize: a.width >= a.height ? { width: MAX } : { height: MAX } }] : [];
  const r = await manipulateAsync(a.uri, resize, { compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return { uri: r.uri, base64: r.base64 ?? '' };
}

// Cámara o galería; null si el usuario cancela o no da permiso.
export async function tomarFoto(origen: 'camara' | 'galeria'): Promise<Foto | null> {
  const perm = origen === 'camara' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const res = origen === 'camara' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return null;
  return comprimir(res.assets[0]);
}

export function base64ABytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Varias de la galería, comprimidas (planos, bosquejos, fotos del lugar)
export async function elegirFotos(max: number): Promise<Foto[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted || max <= 0) return [];
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: true, selectionLimit: max });
  if (res.canceled) return [];
  return Promise.all(res.assets.slice(0, max).map(comprimir));
}
