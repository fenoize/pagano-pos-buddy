const CACHE_NAME = 'paganos-tv-images-v1';

/**
 * Obtiene una imagen desde la Cache API o la descarga y almacena.
 * Devuelve un blob URL para uso en <img>.
 */
export async function getCachedImageUrl(originalUrl: string): Promise<string> {
  if (!originalUrl) return '';

  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(originalUrl);

    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }

    // Descargar y cachear
    const response = await fetch(originalUrl, { mode: 'cors' });
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(originalUrl, responseClone);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn('[ImageCache] Error caching image, using original URL:', e);
  }

  return originalUrl;
}

/**
 * Invalida toda la caché de imágenes TV.
 */
export async function clearTVImageCache(): Promise<void> {
  try {
    await caches.delete(CACHE_NAME);
  } catch (e) {
    console.warn('[ImageCache] Error clearing cache:', e);
  }
}
