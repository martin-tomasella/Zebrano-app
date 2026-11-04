// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl  = Constants.expoConfig?.extra?.supabaseUrl  ?? '';
const supabaseAnon = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

// Auth storage usando SecureStore en vez de AsyncStorage
const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refrescar el token solo con la app en primer plano (recomendado por Supabase para RN)
AppState.addEventListener('change', (st) => {
  if (st === 'active') supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh();
});

// Empleado activo del usuario logueado, o null (RLS: cada uno ve su propia fila)
export async function empleadoActual() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('empleados').select('id, nombre, rol, activo').eq('auth_user_id', user.id).maybeSingle();
  return data && data.activo !== false ? { id: data.id as string, nombre: data.nombre as string, rol: data.rol as string } : null;
}

// Llama a una edge function con el JWT del empleado (nunca con una API key).
export async function llamarFuncion(nombre: string, body: BodyInit, json = true): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(`${supabaseUrl}/functions/v1/${nombre}`, {
    method: 'POST',
    headers: { apikey: supabaseAnon, Authorization: `Bearer ${session?.access_token ?? ''}`, ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body,
  });
}

// ── STORAGE: subir archivo a Supabase Storage ─────────────
export async function uploadFile(
  bucket: string,
  path: string,
  uri: string,
  mimeType = 'image/jpeg'
): Promise<string | null> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) { console.error('Upload error:', error); return null; }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── DB HELPERS ────────────────────────────────────────────
export const db = {

  // CLIENTES
  clientes: {
    list: () => supabase.from('clientes').select('*').eq('activo', true).order('nombre'),
    get:  (id: string) => supabase.from('clientes').select('*').eq('id', id).single(),
    insert: (data: Record<string, unknown>) => supabase.from('clientes').insert(data).select().single(),
    update: (id: string, data: Record<string, unknown>) => supabase.from('clientes').update(data).eq('id', id),
  },

  // PROYECTOS
  proyectos: {
    list:   () => supabase.from('proyectos').select('*, clientes(nombre,telefono)').order('created_at', { ascending: false }),
    get:    (id: string) => supabase.from('proyectos').select('*, clientes(*), modulos(*)').eq('id', id).single(),
    insert: (data: Record<string, unknown>) => supabase.from('proyectos').insert(data).select().single(),
    update: (id: string, data: Record<string, unknown>) => supabase.from('proyectos').update(data).eq('id', id),
  },

  // SESIONES COTIZADOR
  sesiones: {
    list:   (limite = 20) => supabase.from('cotizacion_sesiones').select('*, cotizacion_resumen(precio_sugerido,precio_final)').order('created_at', { ascending: false }).limit(limite),
    get:    (id: string) => supabase.from('cotizacion_sesiones').select('*, cotizacion_piezas(*), cotizacion_hojas(*), cotizacion_herrajes(*), cotizacion_mano_obra(*), cotizacion_resumen(*)').eq('id', id).single(),
    update: (id: string, data: Record<string, unknown>) => supabase.from('cotizacion_sesiones').update(data).eq('id', id),
  },

  // MENSAJES DE SESIÓN
  mensajes: {
    bySesion: (sesionId: string) => supabase.from('cotizacion_mensajes').select('*').eq('sesion_id', sesionId).order('created_at', { ascending: true }),
  },

  // OT
  ot: {
    activas: () => supabase.from('ordenes_trabajo').select('id, numero_ot, avance_pct, proyectos(nombre, tipo_trabajo, clientes(nombre))').eq('estado', 'en_proceso').order('iniciada_at'),
    get: (id: string) => supabase.from('ordenes_trabajo').select('*, ot_piezas(*), ot_empleados(*, empleados(*))').eq('id', id).single(),
    updateAvance: (id: string, pct: number) => supabase.from('ordenes_trabajo').update({ avance_pct: pct }).eq('id', id),
  },

  // CONOCIMIENTO
  conocimiento: {
    list: () => supabase.from('conocimiento_cotizaciones').select('id,titulo,tipo_trabajo,procesado,created_at').order('created_at', { ascending: false }),
    insert: (data: Record<string, unknown>) => supabase.from('conocimiento_cotizaciones').insert(data).select().single(),
  },
};
