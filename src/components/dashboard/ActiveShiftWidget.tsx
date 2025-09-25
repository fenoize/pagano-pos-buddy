import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveShiftStats } from '@/hooks/useActiveShiftStats';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, ShoppingCart, Truck, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ActiveShiftWidget() {
  const { stats, loading, error, refresh, hasActiveSession } = useActiveShiftStats();
  const navigate = useNavigate();

  const handleViewDetails = () => {
    if (stats.sessionStart && stats.sessionId) {
      navigate(`/ventas?activeShift=${stats.sessionId}&startDate=${stats.sessionStart}`);
    } else {
      navigate('/ventas');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Turno activo</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasActiveSession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Turno activo</CardTitle>
          <CardDescription>No hay un turno abierto.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Para ver estadísticas del turno, debe abrir una sesión de caja.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Turno activo</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    {
      title: 'Ventas totales',
      value: formatCurrency(stats.totalSales),
      description: 'Bruto del turno',
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      title: 'Cantidad de ventas',
      value: stats.salesCount.toString(),
      description: 'Pedidos cerrados',
      icon: ShoppingCart,
      color: 'text-success',
    },
    {
      title: 'Cantidad de deliverys',
      value: stats.deliveryCount.toString(),
      description: 'Pedidos con Delivery',
      icon: Truck,
      color: 'text-warning',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Turno activo</CardTitle>
            <CardDescription>
              Inicio: {stats.sessionStart ? formatDate(stats.sessionStart) : 'No disponible'} — Ahora
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw 
              className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} 
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewDetails}
            >
              Ver detalle
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.map((kpi, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </span>
              </div>
              <div className="text-2xl font-bold currency">
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpi.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}