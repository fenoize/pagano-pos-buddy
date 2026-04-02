/**
 * Utilidades para optimizar la carga de imágenes de productos.
 * Usa Supabase Storage Image Transformations para servir thumbnails.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

/**
 * Genera una URL de thumbnail optimizada usando Supabase Storage transforms.
 * Si la URL no es de Supabase Storage, devuelve la URL original.
 * 
 * @param url URL original de la imagen
 * @param width Ancho deseado del thumbnail (default 320px)
 * @param quality Calidad JPEG (default 75)
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  width = 320,
  quality = 75
): string {
  if (!url) return '';

  // Solo transformar URLs de Supabase Storage
  if (!url.includes('/storage/v1/object/public/')) {
    return url;
  }

  // Convertir URL pública a URL de render con transformaciones
  // De: .../storage/v1/object/public/bucket/path
  // A:  .../storage/v1/render/image/public/bucket/path?width=X&quality=Y
  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const separator = transformed.includes('?') ? '&' : '?';
  return `${transformed}${separator}width=${width}&quality=${quality}&resize=contain`;
}

/**
 * Genera un placeholder de baja resolución para blur-up effect.
 */
export function getPlaceholderUrl(url: string | undefined | null): string {
  return getOptimizedImageUrl(url, 20, 20);
}
