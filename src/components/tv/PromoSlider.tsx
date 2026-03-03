import { useEffect, useState, useRef, useCallback } from 'react';
import { useActiveTVScreenContent } from '@/hooks/useTVScreenContent';
import { cn } from '@/lib/utils';
import { getCachedImageUrl } from '@/lib/imageCache';

interface PromoSliderProps {
  interval?: number; // ms — used for images only
  className?: string;
  screenConfigId?: string;
  fallbackScreenId?: string;
}

export function PromoSlider({ interval = 8000, className, screenConfigId, fallbackScreenId }: PromoSliderProps) {
  const { data: mainPromotions = [] } = useActiveTVScreenContent(screenConfigId);
  const { data: fallbackPromotions = [] } = useActiveTVScreenContent(fallbackScreenId);

  const promotions = mainPromotions.length > 0 ? mainPromotions : fallbackPromotions;

  // Two layers (A and B) that alternate — we never unmount/remount during crossfade
  const [layerAIndex, setLayerAIndex] = useState(0);
  const [layerBIndex, setLayerBIndex] = useState(-1); // -1 = not loaded yet
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A'); // which layer is currently visible
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({});

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const crossfadeTriggered = useRef(false);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CROSSFADE_MS = 1500;

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

  const currentIndex = activeLayer === 'A' ? layerAIndex : layerBIndex;

  const startCrossfade = useCallback(() => {
    if (isCrossfading || promotions.length <= 1) return;

    const nextIdx = (currentIndex + 1) % promotions.length;
    crossfadeTriggered.current = true;
    setIsCrossfading(true);

    // Load the next slide into the inactive layer
    if (activeLayer === 'A') {
      setLayerBIndex(nextIdx);
    } else {
      setLayerAIndex(nextIdx);
    }

    // Prepare next video: reset and play
    const nextVideoRef = activeLayer === 'A' ? videoBRef : videoARef;
    setTimeout(() => {
      if (nextVideoRef.current) {
        nextVideoRef.current.currentTime = 0;
        nextVideoRef.current.play().catch(() => {});
      }
    }, 50);

    // After crossfade duration, commit the switch
    setTimeout(() => {
      setActiveLayer(prev => prev === 'A' ? 'B' : 'A');
      setIsCrossfading(false);
      crossfadeTriggered.current = false;
    }, CROSSFADE_MS);
  }, [isCrossfading, promotions.length, currentIndex, activeLayer]);

  // Video timeupdate handler: trigger crossfade CROSSFADE_MS before video ends
  const handleTimeUpdate = useCallback((e: Event) => {
    const video = e.target as HTMLVideoElement;
    if (!video.duration || video.duration === Infinity) return;
    if (crossfadeTriggered.current) return;

    const remaining = (video.duration - video.currentTime) * 1000;
    if (remaining <= CROSSFADE_MS) {
      startCrossfade();
    }
  }, [startCrossfade]);

  // Attach timeupdate to the active video
  useEffect(() => {
    const activeVideoRef = activeLayer === 'A' ? videoARef : videoBRef;
    const video = activeVideoRef.current;
    if (!video) return;

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [activeLayer, handleTimeUpdate]);

  // For images: use interval-based advance (trigger crossfade after `interval - CROSSFADE_MS`)
  useEffect(() => {
    if (promotions.length <= 1) return;
    const promo = promotions[currentIndex];
    if (!promo || promo.video_url) return; // skip for videos

    if (imageTimerRef.current) clearTimeout(imageTimerRef.current);

    imageTimerRef.current = setTimeout(() => {
      startCrossfade();
    }, Math.max(interval - CROSSFADE_MS, 2000));

    return () => {
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
    };
  }, [currentIndex, promotions, interval, startCrossfade]);

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
    if (promoIndex < 0 || promoIndex >= promotions.length) return null;
    const promo = promotions[promoIndex];
    if (!promo) return null;

    if (promo.video_url) {
      return (
        <video
          ref={ref}
          src={promo.video_url}
          autoPlay muted playsInline
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

  const layerAVisible = activeLayer === 'A' ? !isCrossfading : isCrossfading;
  const layerBVisible = activeLayer === 'B' ? !isCrossfading : isCrossfading;

  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      {/* Layer A */}
      <div
        className="absolute inset-0 transition-opacity ease-in-out"
        style={{
          transitionDuration: `${CROSSFADE_MS}ms`,
          opacity: layerAVisible ? 1 : 0,
          zIndex: activeLayer === 'A' ? 1 : 0,
        }}
      >
        {layerAIndex >= 0 && renderMedia(layerAIndex, videoARef)}
      </div>

      {/* Layer B */}
      <div
        className="absolute inset-0 transition-opacity ease-in-out"
        style={{
          transitionDuration: `${CROSSFADE_MS}ms`,
          opacity: layerBVisible ? 1 : 0,
          zIndex: activeLayer === 'B' ? 1 : 0,
        }}
      >
        {layerBIndex >= 0 && renderMedia(layerBIndex, videoBRef)}
      </div>

      {/* Slide indicators */}
      {promotions.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-2 z-10">
          {promotions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (isCrossfading) return;
                if (activeLayer === 'A') {
                  setLayerBIndex(idx);
                } else {
                  setLayerAIndex(idx);
                }
                setIsCrossfading(true);
                const nextVideoRef = activeLayer === 'A' ? videoBRef : videoARef;
                setTimeout(() => {
                  if (nextVideoRef.current) {
                    nextVideoRef.current.currentTime = 0;
                    nextVideoRef.current.play().catch(() => {});
                  }
                }, 50);
                setTimeout(() => {
                  setActiveLayer(prev => prev === 'A' ? 'B' : 'A');
                  setIsCrossfading(false);
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
