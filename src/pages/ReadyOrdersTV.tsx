import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Maximize, Minimize, Volume2, VolumeX, RefreshCw, Settings, LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadyOrders } from "@/hooks/useReadyOrders";
import { useTVScreenConfig, TVScreenConfig } from "@/hooks/useTVScreenConfigs";
import { ReadyOrdersSounds } from "@/components/tv/ReadyOrdersSounds";
import { TVLayoutFull } from "@/components/tv/TVLayoutFull";
import { TVLayoutSplitHorizontal } from "@/components/tv/TVLayoutSplitHorizontal";
import { TVLayoutSplitVertical } from "@/components/tv/TVLayoutSplitVertical";
import { TVLayoutPromoOnly } from "@/components/tv/TVLayoutPromoOnly";
import { TVConfigModal } from "@/components/tv/TVConfigModal";
import { cn } from "@/lib/utils";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clearTVImageCache } from "@/lib/imageCache";

export default function ReadyOrdersTV() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Resolve screenId: URL param > localStorage > undefined (will load default)
  const urlScreenId = searchParams.get('screen') || undefined;
  const storedScreenId = localStorage.getItem(STORAGE_KEYS.TV_SCREEN_ID) || undefined;
  const screenId = urlScreenId || storedScreenId || undefined;

  const { data: savedConfig, isLoading: configLoading } = useTVScreenConfig(screenId);
  const configReady = !configLoading;

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
    visible_statuses: ['En preparación', 'Listo'],
  });

  // Cargar configuración de pantalla de espera (idle screen)
  const idleScreenId = localConfig.idle_screen_config_id;
  const { data: idleScreenConfig } = useTVScreenConfig(idleScreenId || undefined);

  // Usar estados visibles de la configuración — solo cuando config está lista
  const visibleStatuses = localConfig.visible_statuses || ['En preparación', 'Listo', 'Entregado'];
  const { readyOrders, loading, refetch } = useReadyOrders({ visibleStatuses, enabled: configReady });

  const [recentlyReady, setRecentlyReady] = useState<Set<string>>(new Set());
  const [recentlyDelivered, setRecentlyDelivered] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTopBar, setShowTopBar] = useState(false);

  // Load saved config when available & persist screenId
  useEffect(() => {
    if (savedConfig) {
      setLocalConfig(savedConfig);
      // Persist screen ID to localStorage
      if (savedConfig.id) {
        localStorage.setItem(STORAGE_KEYS.TV_SCREEN_ID, savedConfig.id);
      }
    }
  }, [savedConfig]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
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
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle new orders - mark as recent for animation
  const handleNewOrder = useCallback((orderId: string) => {
    setRecentlyReady(prev => new Set(prev).add(orderId));
    setTimeout(() => {
      setRecentlyReady(prev => { const next = new Set(prev); next.delete(orderId); return next; });
    }, 10000);
  }, []);

  // Handle delivered orders - mark for green highlight
  const handleDelivered = useCallback((orderId: string) => {
    setRecentlyDelivered(prev => new Set(prev).add(orderId));
    setTimeout(() => {
      setRecentlyDelivered(prev => { const next = new Set(prev); next.delete(orderId); return next; });
    }, 15000);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  // Force full refresh: config + content + orders + image cache
  const handleForceRefresh = useCallback(async () => {
    await clearTVImageCache();
    queryClient.invalidateQueries({ queryKey: ['tv-screen-config'] });
    queryClient.invalidateQueries({ queryKey: ['tv-screen-configs'] });
    queryClient.invalidateQueries({ queryKey: ['active-tv-screen-content'] });
    refetch();
    toast.success('Actualización completa forzada (caché de imágenes limpiada)');
  }, [queryClient, refetch]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const soundEnabled = localConfig.sound_enabled ?? true;
  const showLogo = localConfig.show_logo ?? true;
  const showClock = localConfig.show_clock ?? true;
  const hideHeaderFullscreen = localConfig.hide_header_fullscreen ?? false;
  const showHeader = !(isFullscreen && hideHeaderFullscreen);

  // Idle screen logic
  const hasOrders = readyOrders.length > 0;
  const useIdleScreen = !hasOrders && !!idleScreenConfig;

  const activeConfig = useMemo(() => {
    if (useIdleScreen && idleScreenConfig) return idleScreenConfig;
    return localConfig;
  }, [useIdleScreen, idleScreenConfig, localConfig]);

  const template = activeConfig.template || 'full';
  const sliderInterval = (activeConfig.slider_interval_seconds || 8) * 1000;
  const columns = activeConfig.columns || 4;
  const fontSize = activeConfig.font_size || 'medium';
  const theme = activeConfig.theme || 'light';

  const activeScreenId = useIdleScreen
    ? (idleScreenConfig?.id || localConfig.id)
    : (localConfig.id || undefined);
  const mainScreenId = localConfig.id;

  const renderLayout = () => {
    // Show spinner while config is loading
    if (configLoading || (configReady && loading)) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    const layoutProps = {
      orders: readyOrders,
      recentlyReady,
      recentlyDelivered,
      columns,
      fontSize,
      screenConfigId: activeScreenId,
      fallbackScreenId: useIdleScreen ? mainScreenId : undefined,
    };

    switch (template) {
      case 'promo_only':
        return (
          <TVLayoutPromoOnly
            sliderInterval={sliderInterval}
            screenConfigId={activeScreenId}
            fallbackScreenId={useIdleScreen ? mainScreenId : undefined}
          />
        );
      case 'split_horizontal':
        return <TVLayoutSplitHorizontal {...layoutProps} sliderInterval={sliderInterval} />;
      case 'split_vertical':
        return <TVLayoutSplitVertical {...layoutProps} sliderInterval={sliderInterval} />;
      default:
        return <TVLayoutFull {...layoutProps} />;
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col overflow-hidden",
        theme === 'dark'
          ? "bg-black text-white"
          : "bg-gradient-to-br from-orange-50 to-amber-50 text-foreground"
      )}
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
      data-theme={theme}
    >
      <ReadyOrdersSounds
        orders={readyOrders}
        soundEnabled={soundEnabled}
        onNewOrder={handleNewOrder}
        onDelivered={handleDelivered}
      />

      <TVConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        currentConfig={localConfig}
        onConfigChange={setLocalConfig}
      />

      {showHeader && (
        <header className={cn(
          "px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b shrink-0",
          theme === 'dark'
            ? "bg-neutral-900/80 border-neutral-800"
            : "bg-white/50 border-border"
        )}>
          {showLogo ? (
            <div className="flex items-center gap-3">
              <img src="/icons/paganos-192.png" alt="Paganos" className="h-12 w-12 rounded-lg object-contain" />
              <span className={cn("text-xl font-bold hidden sm:inline", theme === 'dark' ? "text-white" : "text-foreground")}>
                Paganos
              </span>
            </div>
          ) : <div />}

          <h1 className={cn("text-2xl md:text-3xl font-bold", theme === 'dark' ? "text-white" : "text-foreground")}>
            🔔 Pedidos Listos
          </h1>

          <div className="flex items-center gap-2">
            {showClock && (
              <span className={cn("text-lg font-mono hidden md:inline", theme === 'dark' ? "text-gray-300" : "text-muted-foreground")}>
                {formatTime(currentTime)}
              </span>
            )}

            <Button variant="ghost" size="icon" onClick={refetch} title="Actualizar pedidos"
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}>
              <RefreshCw className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleForceRefresh} title="Forzar actualización completa"
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}>
              <RotateCcw className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon"
              onClick={() => setLocalConfig(prev => ({ ...prev, sound_enabled: !soundEnabled }))}
              title={soundEnabled ? "Silenciar" : "Activar sonido"}
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}>
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className={cn("h-5 w-5", theme === 'dark' ? "text-gray-500" : "text-muted-foreground")} />}
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}>
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setConfigModalOpen(true)} title="Configuración"
              className={theme === 'dark' ? "text-white hover:bg-gray-700" : ""}>
              <Settings className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={() => navigate('/pos')} title="Salir"
              className={cn(theme === 'dark' ? "text-white hover:bg-gray-700" : "", "text-destructive hover:text-destructive")}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      {!showHeader && (
        <div className="absolute top-0 left-0 right-0 h-16 z-40"
          onMouseEnter={() => setShowTopBar(true)} onMouseLeave={() => setShowTopBar(false)} />
      )}

      {!showHeader && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 z-50 flex justify-center gap-2 py-3 px-4 transition-all duration-300",
            "bg-black/70 backdrop-blur-sm",
            showTopBar ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
          )}
          onMouseEnter={() => setShowTopBar(true)} onMouseLeave={() => setShowTopBar(false)}
        >
          <Button variant="secondary" size="sm" onClick={handleForceRefresh} className="bg-white/20 hover:bg-white/30 text-white">
            <RotateCcw className="h-4 w-4 mr-2" /> Forzar actualización
          </Button>
          <Button variant="secondary" size="sm" onClick={toggleFullscreen} className="bg-white/20 hover:bg-white/30 text-white">
            <Minimize className="h-4 w-4 mr-2" /> Salir de pantalla completa
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfigModalOpen(true)} className="bg-white/20 hover:bg-white/30 text-white">
            <Settings className="h-4 w-4 mr-2" /> Configuración
          </Button>
          <Button variant="secondary" size="sm"
            onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(console.error); navigate('/pos'); }}
            className="bg-red-500/80 hover:bg-red-500 text-white">
            <LogOut className="h-4 w-4 mr-2" /> Salir
          </Button>
        </div>
      )}

      {renderLayout()}
    </div>
  );
}
