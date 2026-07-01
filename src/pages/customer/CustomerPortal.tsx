import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useCustomerLevel } from '@/hooks/useCustomerLevel';
import { useActivePromotions } from '@/hooks/useMarketingPromotions';
import { trackPromoView, trackPromoClick } from '@/hooks/usePromoAnalytics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Flame, ShoppingBag, Award, QrCode, UtensilsCrossed, ArrowRight, RefreshCw, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PWAInstallPrompt } from '@/components/customer/PWAInstallPrompt';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { CustomerQRModal } from '@/components/customer/CustomerQRModal';
import { ClanOnboardingModal } from '@/components/customer/ClanOnboardingModal';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { toast } from 'sonner';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
export default function CustomerPortal() {
  const navigate = useNavigate();
  const { user, customer, loading, signOut, refreshCustomerData } = useCustomerAuth();
  const { data: customerLevel, isLoading: levelLoading, refetch: refetchLevel } = useCustomerLevel(customer?.id);
  const { data: activePromos = [], isLoading: promoLoading } = useActivePromotions();
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  // Track promo views when they appear
  useEffect(() => {
    if (activePromos.length > 0 && customer?.id) {
      activePromos.forEach(promo => {
        trackPromoView(promo.id, customer.id);
      });
    }
  }, [activePromos, customer?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Pull-to-refresh
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshCustomerData(),
        refetchLevel(),
      ]);
      toast.success('Datos actualizados');
    } catch (error) {
      toast.error('No se pudo actualizar. Intenta de nuevo.');
    }
  };

  const { containerRef, isRefreshing, pullDistance, indicatorStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  if (loading || levelLoading) {
    return (
      <div className="customer-app min-h-screen pb-20 bg-background">
        <div className="max-w-screen-xl mx-auto p-4 space-y-6">
          {/* Skeleton para header */}
          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="w-10 h-10 rounded" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>

          {/* Skeleton para botón principal */}
          <Skeleton className="h-16 w-full rounded-lg" />

          {/* Skeleton para promoción */}
          <Card>
            <Skeleton className="aspect-video w-full" />
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>

          {/* Skeleton para accesos rápidos */}
          <div className="grid gap-3 grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-8 w-8 mx-auto" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <CustomerBottomNav />
      </div>
    );
  }

  if (!user || !customer) {
    return null;
  }

  const runas = customerLevel?.cantidad_runas || customer.cantidad_runas || 0;
  const puntos = customerLevel?.puntos || customer.puntos || 0;
  const levelName = customerLevel?.level_name || 'Iniciado';
  const nextLevelPoints = customerLevel?.next_level_points;
  const minPoints = customerLevel?.min_points || 0;
  const progressPercent = nextLevelPoints
    ? Math.min(100, ((puntos - minPoints) / (nextLevelPoints - minPoints)) * 100)
    : 100;

  const handlePromoAction = async (promo: any, event?: React.MouseEvent) => {
    if (!promo) return;
    
    // Prevenir propagación del evento
    if (event) {
      event.stopPropagation();
    }

    // Track the click
    await trackPromoClick(promo.id, promo.cta_type, customer?.id);

    switch (promo.cta_type) {
      case 'open_menu':
        navigate('/menu');
        break;
      case 'open_cart':
        navigate('/cart');
        break;
      case 'open_orders':
        navigate('/my-orders');
        break;
      case 'open_benefits':
        navigate('/benefits');
        break;
      case 'open_product':
        if (promo.product_id) {
          navigate(`/menu?product=${promo.product_id}`);
        }
        break;
      case 'open_custom_url':
        if (promo.cta_url) {
          if (promo.cta_url.startsWith('http')) {
            // Usar window.location.href para evitar bloqueo de popups
            window.location.href = promo.cta_url;
          } else {
            navigate(promo.cta_url);
          }
        }
        break;
      case 'none':
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className="customer-app min-h-screen pb-20 bg-background relative"
    >
      {/* Indicador de pull-to-refresh */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-40"
          style={indicatorStyle}
        >
          <div className="bg-card border border-border rounded-full p-2 shadow-lg">
            <RefreshCw
              className="h-5 w-5 text-primary"
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </div>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        {/* Header con perfil */}
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* QR Button - replaces user icon */}
                <button 
                  className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30 hover:bg-primary/30 transition-colors"
                  onClick={() => setShowQRModal(true)}
                  aria-label="Mostrar mi código QR"
                >
                  <QrCode className="h-8 w-8 text-primary" />
                </button>
                <button 
                  className="text-left hover:opacity-80 transition-opacity"
                  onClick={() => navigate('/profile')}
                >
                  <h2 className="text-2xl font-bold text-foreground">{customer.name || customer.nombres}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-primary font-medium mt-1">Ver mi perfil →</p>
                </button>
              </div>
            </div>

            {/* Runas y Nivel */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Flame className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Runas</p>
                  <p className="text-xl font-bold text-foreground">{runas.toLocaleString('es-CL')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Nivel</p>
                  <p className="text-base font-bold text-foreground truncate">{levelName}</p>
                </div>
              </div>
            </div>

            {/* Puntos y progreso al siguiente nivel */}
            <div className="mt-4 bg-background/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Puntos</span>
                </div>
                <span className="text-lg font-bold text-foreground">{puntos.toLocaleString('es-CL')}</span>
              </div>
              {nextLevelPoints ? (
                <>
                  <Progress value={progressPercent} className="h-2 bg-muted" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      <span className="text-primary font-semibold">{Math.max(0, nextLevelPoints - puntos).toLocaleString('es-CL')}</span> puntos para {customerLevel?.next_level_name}
                    </span>
                    <span className="text-primary font-semibold">{Math.round(progressPercent)}%</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Nivel máximo alcanzado 🎉</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botón principal de acción - CTA destacado */}
        <Button
          size="lg"
          className="w-full h-16 text-lg shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          onClick={() => navigate('/menu')}
        >
          <UtensilsCrossed className="h-6 w-6 mr-3" />
          Armar Pedido
          <ArrowRight className="h-5 w-5 ml-auto" />
        </Button>

        {/* Promociones destacadas - Slider */}
        {!promoLoading && activePromos.length > 0 && (
          <Carousel className="w-full">
            <CarouselContent>
              {activePromos.map((promo) => (
                <CarouselItem key={promo.id}>
                  <Card className="overflow-hidden border-border bg-card">
                    <CardContent className="p-0">
                      {promo.image_url ? (
                        <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-b border-border">
                          <img 
                            src={promo.image_url} 
                            alt={promo.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-b border-border">
                          <Flame className="h-24 w-24 text-primary" />
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-foreground mb-2">{promo.title}</h3>
                        {promo.subtitle && (
                          <p className="text-muted-foreground mb-4">
                            {promo.subtitle}
                          </p>
                        )}
                        {promo.description && (
                          <p className="text-sm text-muted-foreground mb-4">
                            {promo.description}
                          </p>
                        )}
                        {promo.cta_type !== 'none' && (
                          <Button 
                            variant="outline" 
                            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground" 
                            onClick={(e) => handlePromoAction(promo, e)}
                          >
                            {promo.cta_label || 'Ver más'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            {activePromos.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        )}

        {/* Accesos rápidos - Simplificados */}
        <div className="grid gap-3 grid-cols-2">
          <Card 
            className="bg-card border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate('/my-orders')}
          >
            <CardContent className="p-4 text-center">
              <ShoppingBag className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm text-foreground">Mis Pedidos</h3>
            </CardContent>
          </Card>

          <Card 
            className="bg-card border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate('/benefits')}
          >
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm text-foreground">Beneficios</h3>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <PWAInstallPrompt />
      <CustomerBottomNav />
      
      {/* QR Modal */}
      <CustomerQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        customerId={customer.id}
        customerName={customer.name || customer.nombres || undefined}
      />
    </div>
  );
}
