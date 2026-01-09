import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Maximize, Minimize, Volume2, VolumeX, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadyOrders } from "@/hooks/useReadyOrders";
import { useTVScreenConfig, TVScreenConfig } from "@/hooks/useTVScreenConfigs";
import { ReadyOrdersSounds } from "@/components/tv/ReadyOrdersSounds";
import { TVLayoutFull } from "@/components/tv/TVLayoutFull";
import { TVLayoutSplitHorizontal } from "@/components/tv/TVLayoutSplitHorizontal";
import { TVLayoutSplitVertical } from "@/components/tv/TVLayoutSplitVertical";
import { TVConfigModal } from "@/components/tv/TVConfigModal";
import { cn } from "@/lib/utils";

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
    columns: 4,
    font_size: 'medium',
    theme: 'light',
    hide_header_fullscreen: false,
  });
  
  const [recentlyReady, setRecentlyReady] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
  const columns = localConfig.columns || 4;
  const fontSize = localConfig.font_size || 'medium';
  const theme = localConfig.theme || 'light';
  const hideHeaderFullscreen = localConfig.hide_header_fullscreen ?? false;

  // Determine if header should be shown
  const showHeader = !(isFullscreen && hideHeaderFullscreen);

  const renderLayout = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    const layoutProps = {
      orders: readyOrders,
      recentlyReady,
      columns,
      fontSize,
    };

    switch (template) {
      case 'split_horizontal':
        return (
          <TVLayoutSplitHorizontal
            {...layoutProps}
            sliderInterval={sliderInterval}
          />
        );
      case 'split_vertical':
        return (
          <TVLayoutSplitVertical
            {...layoutProps}
            sliderInterval={sliderInterval}
          />
        );
      default:
        return (
          <TVLayoutFull
            {...layoutProps}
          />
        );
    }
  };

  return (
    <div 
      className={cn(
        "fixed inset-0 flex flex-col overflow-hidden",
        theme === 'dark' 
          ? "bg-gradient-to-br from-gray-900 to-gray-950 text-white" 
          : "bg-gradient-to-br from-orange-50 to-amber-50 text-foreground"
      )}
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
      data-theme={theme}
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

      {/* Header - conditionally rendered */}
      {showHeader && (
        <header className={cn(
          "px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b shrink-0",
          theme === 'dark' 
            ? "bg-gray-800/50 border-gray-700" 
            : "bg-white/50 border-border"
        )}>
          {/* Logo */}
          {showLogo ? (
            <div className="flex items-center gap-3">
              <img 
                src="/icons/paganos-192.png" 
                alt="Paganos" 
                className="h-12 w-12 rounded-lg object-contain"
              />
              <span className={cn(
                "text-xl font-bold hidden sm:inline",
                theme === 'dark' ? "text-white" : "text-foreground"
              )}>
                Paganos
              </span>
            </div>
          ) : (
            <div />
          )}

          {/* Title */}
          <h1 className={cn(
            "text-2xl md:text-3xl font-bold",
            theme === 'dark' ? "text-white" : "text-foreground"
          )}>
            🔔 Pedidos Listos
          </h1>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {showClock && (
              <span className={cn(
                "text-lg font-mono hidden md:inline",
                theme === 'dark' ? "text-gray-300" : "text-muted-foreground"
              )}>
                {formatTime(currentTime)}
              </span>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              title="Actualizar"
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocalConfig(prev => ({ ...prev, sound_enabled: !soundEnabled }))}
              title={soundEnabled ? "Silenciar" : "Activar sonido"}
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className={cn("h-5 w-5", theme === 'dark' ? "text-gray-500" : "text-muted-foreground")} />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfigModalOpen(true)}
              title="Configuración"
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      {/* Floating controls when header is hidden */}
      {!showHeader && (
        <div className="absolute top-4 right-4 z-50 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFullscreen}
            title="Salir de pantalla completa"
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <Minimize className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setConfigModalOpen(true)}
            title="Configuración"
            className="bg-black/50 hover:bg-black/70 text-white"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main content - renders appropriate layout */}
      {renderLayout()}
    </div>
  );
}