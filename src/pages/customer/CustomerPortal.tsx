import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useCustomerLevel } from '@/hooks/useCustomerLevel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Flame, LogOut, ShoppingBag, MapPin, Award, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PWAInstallPrompt } from '@/components/customer/PWAInstallPrompt';

export default function CustomerPortal() {
  const navigate = useNavigate();
  const { user, customer, loading, signOut } = useCustomerAuth();
  const { data: customerLevel } = useCustomerLevel(customer?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="dark-pagano min-h-screen p-4 bg-gradient-to-br from-background via-background to-card">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !customer) {
    return null;
  }

  return (
    <div className="dark-pagano min-h-screen p-4 bg-gradient-to-br from-background via-background to-card">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{customer.name || customer.nombres}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {user.email}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Runas</p>
                  <p className="text-2xl font-bold">{customerLevel?.cantidad_runas || customer.cantidad_runas || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nivel</p>
                  <p className="text-xl font-bold">{customerLevel?.level_name || 'Bronce'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Próximo nivel</p>
                  <p className="text-sm font-bold">{customerLevel?.next_level_points || '—'} pts</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accesos rápidos */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card 
            className="border-border/50 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigate('/my-orders')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Mis Pedidos
              </CardTitle>
              <CardDescription>
                Ver historial y estado de pedidos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="border-border/50 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigate('/my-addresses')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Mis Direcciones
              </CardTitle>
              <CardDescription>
                Gestionar direcciones de entrega
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="border-border/50 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigate('/my-runes')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                Mis Runas
              </CardTitle>
              <CardDescription>
                Historial y canje de runas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="border-border/50 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => navigate('/my-badges')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Mis Insignias
              </CardTitle>
              <CardDescription>
                Colección y progreso de insignias
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
      
      {/* PWA Install Prompt - Solo para portal de clientes */}
      <PWAInstallPrompt />
    </div>
  );
}
