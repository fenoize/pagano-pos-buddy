import { useState, useRef, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';

interface OptimizedProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
}

/**
 * Imagen de producto optimizada con:
 * - Thumbnail via Supabase transforms (320px por defecto)
 * - IntersectionObserver para lazy loading real
 * - Fade-in al cargar
 */
export function OptimizedProductImage({ 
  src, 
  alt, 
  className = 'w-full h-full object-cover',
  width = 320
}: OptimizedProductImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Pre-cargar 200px antes de entrar en viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!src || error) {
    return (
      <div ref={ref} className="w-full h-full flex items-center justify-center bg-muted">
        <Flame className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  const optimizedSrc = getOptimizedImageUrl(src, width);

  return (
    <div ref={ref} className="w-full h-full bg-muted relative overflow-hidden">
      {inView && (
        <img
          src={optimizedSrc}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          decoding="async"
        />
      )}
    </div>
  );
}
