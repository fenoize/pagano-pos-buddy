import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useCustomerLevel } from '@/hooks/useCustomerLevel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, LogOut, ShoppingBag, MapPin, Award, User, UtensilsCrossed, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PWAInstallPrompt } from '@/components/customer/PWAInstallPrompt';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';

export default function CustomerPortal() {
  const navigate = useNavigate();
  const { user, customer, loading, signOut } = useCustomerAuth();
  const { data: customerLevel, isLoading: levelLoading } = useCustomerLevel(customer?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading || levelLoading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <div className="max-w-screen-xl mx-auto p-4 space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
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
  const levelName = customerLevel?.level_name || 'Bronce';
  const nextLevelPoints = customerLevel?.next_level_points;
  const minPoints = customerLevel?.min_points || 0;
  const progressPercent = nextLevelPoints
    ? Math.min(100, ((runas - minPoints) / (nextLevelPoints - minPoints)) * 100)
    : 100;

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        {/* Header con perfil */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{customer.name || customer.nombres}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Runas y Nivel */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Runas</p>
                  <p className="text-2xl font-bold">{runas}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nivel</p>
                  <p className="text-lg font-bold">{levelName}</p>
                </div>
              </div>
            </div>

            {/* Progress to next level */}
            {nextLevelPoints && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso al siguiente nivel</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {nextLevelPoints - runas} runas para {customerLevel?.next_level_name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botón principal de acción */}
        <Button
          size="lg"
          className="w-full h-16 text-lg shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => navigate('/menu')}
        >
          <UtensilsCrossed className="h-6 w-6 mr-3" />
          Armar Pedido
          <ArrowRight className="h-5 w-5 ml-auto" />
        </Button>

        {/* Promoción destacada - TODO: hacer configurable */}
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-0">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center">
              <Flame className="h-24 w-24 text-primary" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">¡Promoción Especial!</h3>
              <p className="text-muted-foreground mb-4">
                Descubre nuestras ofertas exclusivas del día
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/menu')}>
                Ver Menú
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Accesos rápidos */}
        <div className="grid gap-3 grid-cols-2">
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/my-orders')}
          >
            <CardContent className="p-4 text-center">
              <ShoppingBag className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Mis Pedidos</h3>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/my-addresses')}
          >
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Direcciones</h3>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/my-runes')}
          >
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Mis Runas</h3>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/my-badges')}
          >
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-sm">Insignias</h3>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <PWAInstallPrompt />
      <CustomerBottomNav />
    </div>
  );
}
