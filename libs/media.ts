import { supabase } from './superbase';

/**
 * Devuelve:
 * - si 'value' ya es http(s) -> 'value'
 * - si es una ruta de storage -> publicUrl del bucket indicado
 * - si viene vacío -> undefined
 */
export function resolveImageUrl(value?: string | null, bucket = 'restaurants') {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value; // ya es URL completa
  // asumimos ruta dentro del bucket
  const { data } = supabase.storage.from(bucket).getPublicUrl(value);
  return data?.publicUrl || undefined;
}
