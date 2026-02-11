import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Award, Star, TrendingUp, Percent } from 'lucide-react';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useCustomerLevel } from '@/hooks/useCustomerLevel';
import { useCustomerDiscountSubscription } from '@/hooks/useCustomerDiscountSubscription';
import { LevelProgress } from '@/components/customer/LevelProgress';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerBenefits() {
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const { data: customerLevel, isLoading } = useCustomerLevel(customer?.id);
  const { discountPercent } = useCustomerDiscountSubscription(customer?.id);

  if (isLoading) {
    return (
      <CustomerLayout title="Beneficios">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const runas = customerLevel?.cantidad_runas || customer?.cantidad_runas || 0;
  const levelName = customerLevel?.level_name || 'Bronce';
  const minPoints = customerLevel?.min_points || 0;
  const nextLevelPoints = customerLevel?.next_level_points;
  const nextLevelName = customerLevel?.next_level_name;

  return (
    <CustomerLayout title="Beneficios">
      <div className="space-y-6">
        {/* Current Level */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Tu nivel actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{levelName}</h2>
                <p className="text-sm text-muted-foreground">
                  {runas} runas acumuladas
                </p>
              </div>
              <Flame className="h-12 w-12 text-primary" />
            </div>
            
            {customerLevel && (
              <LevelProgress
                currentLevel={levelName}
                currentRunas={runas}
                minPoints={minPoints}
                nextLevelPoints={nextLevelPoints}
                nextLevelName={nextLevelName}
              />
            )}
          </CardContent>
        </Card>

        {/* Discount Subscription */}
        {discountPercent > 0 && (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center flex-shrink-0">
                <Percent className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-800 text-lg">{discountPercent}% de descuento</h3>
                <p className="text-sm text-emerald-700">
                  Se aplica automáticamente en todas tus compras
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/my-runes')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                Mis Runas
              </CardTitle>
              <CardDescription>
                Ver historial y canjear runas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{runas}</p>
              <p className="text-sm text-muted-foreground mt-1">runas disponibles</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/my-badges')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Mis Insignias
              </CardTitle>
              <CardDescription>
                Logros desbloqueados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Ver insignias
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ¿Cómo ganar más runas?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Flame className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Compra y acumula</h4>
                  <p className="text-sm text-muted-foreground">
                    Ganas runas con cada compra que realices
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Completa desafíos</h4>
                  <p className="text-sm text-muted-foreground">
                    Desbloquea insignias y gana runas extra
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Sube de nivel</h4>
                  <p className="text-sm text-muted-foreground">
                    Accede a beneficios exclusivos en niveles superiores
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
