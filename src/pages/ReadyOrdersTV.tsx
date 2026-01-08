import { useState, useEffect, useCallback } from "react";
import { Maximize, Volume2, VolumeX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadyOrders } from "@/hooks/useReadyOrders";
import { ReadyOrderCard } from "@/components/tv/ReadyOrderCard";
import { ReadyOrdersSounds } from "@/components/tv/ReadyOrdersSounds";

export default function ReadyOrdersTV() {
  const { readyOrders, loading, refetch } = useReadyOrders();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentlyReady, setRecentlyReady] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);

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

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-background dark:to-muted overflow-hidden"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
    >
      {/* Sound component */}
      <ReadyOrdersSounds 
        orders={readyOrders} 
        soundEnabled={soundEnabled}
        onNewReady={handleNewReady}
      />

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center bg-white/50 dark:bg-card/50 backdrop-blur-sm border-b">
        {/* Logo */}
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

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          🔔 Pedidos Listos
        </h1>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono text-muted-foreground hidden md:inline">
            {formatTime(currentTime)}
          </span>
          
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
            onClick={() => setSoundEnabled(!soundEnabled)}
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
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 md:p-6 h-[calc(100vh-80px)] overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : readyOrders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
            {readyOrders.map(order => (
              <ReadyOrderCard 
                key={order.id} 
                order={order}
                isRecent={recentlyReady.has(order.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="text-8xl mb-6">🍔</div>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
        ¡Todo entregado!
      </h2>
      <p className="text-xl text-muted-foreground max-w-md">
        Los pedidos listos aparecerán aquí automáticamente
      </p>
    </div>
  );
}
