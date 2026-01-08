import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Maximize, Volume2, VolumeX, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadyOrders } from "@/hooks/useReadyOrders";
import { useTVScreenConfig, TVScreenConfig } from "@/hooks/useTVScreenConfigs";
import { ReadyOrdersSounds } from "@/components/tv/ReadyOrdersSounds";
import { TVLayoutFull } from "@/components/tv/TVLayoutFull";
import { TVLayoutSplitHorizontal } from "@/components/tv/TVLayoutSplitHorizontal";
import { TVLayoutSplitVertical } from "@/components/tv/TVLayoutSplitVertical";
import { TVConfigModal } from "@/components/tv/TVConfigModal";

export default function ReadyOrdersTV() {
  const [searchParams] = useSearchParams();
  const screenId = searchParams.get('screen') || undefined;
  
  const { readyOrders, loading, refetch } = useReadyOrders();
  const { data: savedConfig } = useTVScreenConfig(screenId);
  
  // Local config state (can be modified via modal)
  const [localConfig, setLocalConfig] = useState<Partial<TVScreenConfig>>({
    template: 'full',
    slider_interval_seconds: 8,
    show_logo: true,
    show_clock: true,
    sound_enabled: true,
  });
  
  const [recentlyReady, setRecentlyReady] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Load saved config when available
  useEffect(() => {
    if (savedConfig) {
      setLocalConfig(savedConfig);
    }
  }, [savedConfig]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-hide cursor after 3 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setCursorVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setCursorVisible(false), 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    timeout = setTimeout(() => setCursorVisible(false), 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  // Handle new ready orders - mark as recent for animation
  const handleNewReady = useCallback((orderId: string) => {
    setRecentlyReady(prev => new Set(prev).add(orderId));
    
    // Remove from "recent" after 10 seconds
    setTimeout(() => {
      setRecentlyReady(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }, 10000);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const soundEnabled = localConfig.sound_enabled ?? true;
  const showLogo = localConfig.show_logo ?? true;
  const showClock = localConfig.show_clock ?? true;
  const template = localConfig.template || 'full';
  const sliderInterval = (localConfig.slider_interval_seconds || 8) * 1000;

  const renderLayout = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (template) {
      case 'split_horizontal':
        return (
          <TVLayoutSplitHorizontal
            orders={readyOrders}
            recentlyReady={recentlyReady}
            sliderInterval={sliderInterval}
          />
        );
      case 'split_vertical':
        return (
          <TVLayoutSplitVertical
            orders={readyOrders}
            recentlyReady={recentlyReady}
            sliderInterval={sliderInterval}
          />
        );
      default:
        return (
          <TVLayoutFull
            orders={readyOrders}
            recentlyReady={recentlyReady}
          />
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-background dark:to-muted flex flex-col overflow-hidden"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
    >
      {/* Sound component */}
      <ReadyOrdersSounds 
        orders={readyOrders} 
        soundEnabled={soundEnabled}
        onNewReady={handleNewReady}
      />

      {/* Config Modal */}
      <TVConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        currentConfig={localConfig}
        onConfigChange={setLocalConfig}
      />

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center bg-white/50 dark:bg-card/50 backdrop-blur-sm border-b shrink-0">
        {/* Logo */}
        {showLogo ? (
          <div className="flex items-center gap-3">
            <img 
              src="/icons/paganos-192.png" 
              alt="Paganos" 
              className="h-12 w-12 rounded-lg"
            />
            <span className="text-xl font-bold text-foreground hidden sm:inline">
              Paganos
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          🔔 Pedidos Listos
        </h1>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {showClock && (
            <span className="text-lg font-mono text-muted-foreground hidden md:inline">
              {formatTime(currentTime)}
            </span>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={refetch}
            title="Actualizar"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocalConfig(prev => ({ ...prev, sound_enabled: !soundEnabled }))}
            title={soundEnabled ? "Silenciar" : "Activar sonido"}
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            title="Pantalla completa"
          >
            <Maximize className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfigModalOpen(true)}
            title="Configuración"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content - renders appropriate layout */}
      {renderLayout()}
    </div>
  );
}
