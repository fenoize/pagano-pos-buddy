import { useState, useEffect, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getCachedImageUrl } from '@/lib/imageCache';

interface TVPreloaderProps {
  imageUrls: string[];
  videoUrls: string[];
  onComplete: () => void;
  theme?: 'light' | 'dark';
}

export function TVPreloader({ imageUrls, videoUrls, onComplete, theme = 'light' }: TVPreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Preparando pantalla…');
  const [fadeOut, setFadeOut] = useState(false);

  const preload = useCallback(async () => {
    const totalAssets = imageUrls.length + videoUrls.length;
    let loaded = 0;

    const tick = () => {
      loaded++;
      setProgress(Math.round((loaded / Math.max(totalAssets, 1)) * 100));
    };

    // 1. Pre-cache & preload images
    if (imageUrls.length > 0) {
      setStatus('Cargando imágenes…');
      await Promise.allSettled(
        imageUrls.map(async (url) => {
          try {
            const cachedUrl = await getCachedImageUrl(url);
            // Force browser decode
            await new Promise<void>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => reject();
              img.src = cachedUrl;
            });
          } catch { /* skip broken images */ }
          tick();
        })
      );
    }

    // 2. Preload videos (just fetch metadata)
    if (videoUrls.length > 0) {
      setStatus('Cargando videos…');
      await Promise.allSettled(
        videoUrls.map(async (url) => {
          try {
            await new Promise<void>((resolve, reject) => {
              const video = document.createElement('video');
              video.preload = 'auto';
              video.oncanplaythrough = () => { video.src = ''; resolve(); };
              video.onerror = () => reject();
              video.src = url;
            });
          } catch { /* skip */ }
          tick();
        })
      );
    }

    // 3. If no assets, still show brief loading
    if (totalAssets === 0) {
      setProgress(100);
    }

    setStatus('¡Listo!');

    // Small delay for the "100%" to be visible, then fade out
    await new Promise(r => setTimeout(r, 400));
    setFadeOut(true);
    await new Promise(r => setTimeout(r, 600));
    onComplete();
  }, [imageUrls, videoUrls, onComplete]);

  useEffect(() => {
    preload();
  }, [preload]);

  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 transition-opacity duration-500',
        isDark ? 'bg-black' : 'bg-gradient-to-br from-orange-50 to-amber-50',
        fadeOut && 'opacity-0 pointer-events-none'
      )}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <img
          src="/icons/paganos-192.png"
          alt="Paganos"
          className="h-24 w-24 rounded-2xl object-contain"
        />
        <h1 className={cn('text-3xl font-bold', isDark ? 'text-white' : 'text-foreground')}>
          Paganos TV
        </h1>
      </div>

      {/* Progress */}
      <div className="w-64 space-y-3 animate-fade-in">
        <Progress value={progress} className="h-2" />
        <p className={cn('text-center text-sm', isDark ? 'text-gray-400' : 'text-muted-foreground')}>
          {status}
        </p>
      </div>
    </div>
  );
}
