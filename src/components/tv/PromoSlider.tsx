import { useEffect, useState, useRef, useCallback } from 'react';
import { useActiveTVScreenContent } from '@/hooks/useTVScreenContent';
import { cn } from '@/lib/utils';
import { getCachedImageUrl } from '@/lib/imageCache';

interface PromoSliderProps {
  interval?: number; // ms
  className?: string;
  screenConfigId?: string;
  fallbackScreenId?: string;
}

export function PromoSlider({ interval = 8000, className, screenConfigId, fallbackScreenId }: PromoSliderProps) {
  const { data: mainPromotions = [] } = useActiveTVScreenContent(screenConfigId);
  const { data: fallbackPromotions = [] } = useActiveTVScreenContent(fallbackScreenId);

  const promotions = mainPromotions.length > 0 ? mainPromotions : fallbackPromotions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<'showing' | 'crossfading'>('showing');
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);

  const CROSSFADE_MS = 1500; // 1.5s each side = 3s total overlap

  // Pre-cache all promotion images
  const cacheImages = useCallback(async () => {
    const urlMap: Record<string, string> = {};
    for (const promo of promotions) {
      if (promo.image_url) {
        urlMap[promo.image_url] = await getCachedImageUrl(promo.image_url);
      }
    }
    setCachedUrls(urlMap);
  }, [promotions]);

  useEffect(() => {
    cacheImages();
    return () => {
      Object.values(cachedUrls).forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [cacheImages]);

  // Auto-advance with crossfade
  useEffect(() => {
    if (promotions.length <= 1) return;

    const timer = setInterval(() => {
      const next = (currentIndex + 1) % promotions.length;
      setNextIndex(next);
      setPhase('crossfading');

      // After crossfade completes, commit the new slide
      setTimeout(() => {
        setCurrentIndex(next);
        setNextIndex(null);
        setPhase('showing');
      }, CROSSFADE_MS);
    }, interval);

    return () => clearInterval(timer);
  }, [promotions.length, interval, currentIndex]);

  // No reset needed — the next video already started playing during crossfade

  if (promotions.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100", className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-xl">Sin contenido activo</p>
        </div>
      </div>
    );
  }

  const getImageUrl = (originalUrl?: string | null) => {
    if (!originalUrl) return '';
    return cachedUrls[originalUrl] || originalUrl;
  };

  const renderMedia = (promoIndex: number, ref: React.RefObject<HTMLVideoElement>) => {
    const promo = promotions[promoIndex];
    if (!promo) return null;

    if (promo.video_url) {
      return (
        <video
          ref={ref}
          src={promo.video_url}
          autoPlay muted loop playsInline
          className="w-full h-full object-contain"
        />
      );
    }
    if (promo.image_url) {
      return (
        <img
          src={getImageUrl(promo.image_url)}
          alt={promo.title || ''}
          className="w-full h-full object-contain"
        />
      );
    }
    return <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40" />;
  };

  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      {/* Current slide */}
      <div
        className="absolute inset-0 transition-opacity ease-in-out"
        style={{
          transitionDuration: `${CROSSFADE_MS}ms`,
          opacity: phase === 'crossfading' ? 0 : 1,
        }}
      >
        {renderMedia(currentIndex, videoRef)}
      </div>

      {/* Next slide (only during crossfade) */}
      {nextIndex !== null && (
        <div
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            transitionDuration: `${CROSSFADE_MS}ms`,
            opacity: phase === 'crossfading' ? 1 : 0,
          }}
        >
          {renderMedia(nextIndex, nextVideoRef)}
        </div>
      )}

      {/* Slide indicators */}
      {promotions.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
          {promotions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (phase === 'crossfading') return;
                setNextIndex(idx);
                setPhase('crossfading');
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setNextIndex(null);
                  setPhase('showing');
                }, CROSSFADE_MS);
              }}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                idx === currentIndex
                  ? "bg-white scale-125"
                  : "bg-white/50 hover:bg-white/75"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
