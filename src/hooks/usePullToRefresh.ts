import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from './use-mobile';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Distancia mínima para activar (px)
  maxPull?: number; // Distancia máxima de pull (px)
}

/**
 * Hook para implementar pull-to-refresh en dispositivos móviles.
 * Solo se activa cuando el scroll está en la parte superior.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const isMobile = useIsMobile();
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile || !containerRef.current) return;

    const container = containerRef.current;
    let scrollTop = 0;

    const handleTouchStart = (e: TouchEvent) => {
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Solo activar si estamos en la parte superior
      if (scrollTop <= 0 && !isRefreshing) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === 0 || isRefreshing) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY.current;

      // Solo proceder si estamos en la parte superior y jalando hacia abajo
      if (diff > 0 && scrollTop <= 0) {
        e.preventDefault();
        
        // Calcular distancia con resistencia (más difícil mientras más jalas)
        const distance = Math.min(diff * 0.5, maxPull);
        setPullDistance(distance);
        
        if (distance > threshold) {
          setIsPulling(true);
        } else {
          setIsPulling(false);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling && !isRefreshing && pullDistance > threshold) {
        setIsRefreshing(true);
        setIsPulling(false);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Error refreshing:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          touchStartY.current = 0;
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
        touchStartY.current = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isPulling, isRefreshing, pullDistance, threshold, maxPull, onRefresh]);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    indicatorStyle: {
      transform: `translateY(${Math.min(pullDistance, maxPull)}px)`,
      opacity: Math.min(pullDistance / threshold, 1),
    },
  };
}
