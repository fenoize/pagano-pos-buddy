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

interface PromoConfig {
  show_title?: boolean;
}

function parsePromoConfig(description: string | null | undefined): PromoConfig {
  if (!description) return { show_title: true };
  try {
    return JSON.parse(description);
  } catch {
    return { show_title: true };
  }
}

export function PromoSlider({ interval = 8000, className, screenConfigId, fallbackScreenId }: PromoSliderProps) {
  const { data: mainPromotions = [] } = useActiveTVScreenContent(screenConfigId);
  const { data: fallbackPromotions = [] } = useActiveTVScreenContent(fallbackScreenId);
  
  const promotions = mainPromotions.length > 0 ? mainPromotions : fallbackPromotions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [cachedUrls, setCachedUrls] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  const FADE_DURATION = 3000;

  // Pre-cache all promotion images when promotions change
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
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(cachedUrls).forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [cacheImages]);

  // Auto-advance slides
  useEffect(() => {
    if (promotions.length <= 1) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % promotions.length);
        setIsTransitioning(false);
      }, FADE_DURATION);
    }, interval);

    return () => clearInterval(timer);
  }, [promotions.length, interval]);

  // Reset video when slide changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  if (promotions.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100", className)}>
        <div className="text-center text-muted-foreground">
          <p className="text-xl">Sin contenido activo</p>
        </div>
      </div>
    );
  }

  const currentPromo = promotions[currentIndex];
  const hasVideo = !!currentPromo?.video_url;
  const hasImage = !!currentPromo?.image_url;
  const config = parsePromoConfig(currentPromo?.description);
  const showTitle = config.show_title !== false;

  // Use cached URL if available, otherwise fall back to original
  const imageUrl = currentPromo?.image_url
    ? (cachedUrls[currentPromo.image_url] || currentPromo.image_url)
    : '';

  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      {/* Background media */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-[3000ms] ease-in-out",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            src={currentPromo.video_url!}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-contain"
          />
        ) : hasImage ? (
          <img
            src={imageUrl}
            alt={currentPromo.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40" />
        )}
      </div>

      {/* Content overlay */}
      {showTitle && (
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 p-6 text-white transition-all duration-[3000ms] ease-in-out",
            isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent -z-10" />
          {currentPromo.title && (
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 drop-shadow-lg">
              {currentPromo.title}
            </h2>
          )}
          {currentPromo.subtitle && (
            <p className="text-xl md:text-2xl text-white/90 drop-shadow">
              {currentPromo.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Slide indicators */}
      {promotions.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          {promotions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setIsTransitioning(false);
                }, FADE_DURATION);
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
