import { useEffect, useState, useRef } from 'react';
import { useActivePromotions } from '@/hooks/useMarketingPromotions';
import { cn } from '@/lib/utils';

interface PromoSliderProps {
  interval?: number; // ms
  className?: string;
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

export function PromoSlider({ interval = 8000, className }: PromoSliderProps) {
  const { data: promotions = [] } = useActivePromotions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-advance slides
  useEffect(() => {
    if (promotions.length <= 1) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % promotions.length);
        setIsTransitioning(false);
      }, 300);
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
          <p className="text-xl">Sin promociones activas</p>
        </div>
      </div>
    );
  }

  const currentPromo = promotions[currentIndex];
  const hasVideo = !!currentPromo?.video_url;
  const hasImage = !!currentPromo?.image_url;
  const config = parsePromoConfig(currentPromo?.description);
  const showTitle = config.show_title !== false;

  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      {/* Background media */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
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
            src={currentPromo.image_url!}
            alt={currentPromo.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40" />
        )}
      </div>

      {/* Content overlay - only show if showTitle is true */}
      {showTitle && (
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 p-6 text-white transition-all duration-300",
            isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}
        >
          {/* Overlay gradient for text readability */}
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
                }, 300);
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
