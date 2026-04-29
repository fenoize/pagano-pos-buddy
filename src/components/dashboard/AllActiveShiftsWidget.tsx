import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAllActiveShifts } from '@/hooks/useAllActiveShifts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Users, Clock, DollarSign, ShoppingCart, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export function AllActiveShiftsWidget() {
  const { shifts, loading, error, refresh, hasActiveShifts } = useAllActiveShifts();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Turnos Activos del Equipo
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Turnos Activos del Equipo
          </CardTitle>
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

  if (!hasActiveShifts) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Turnos Activos del Equipo
            </CardTitle>
            <CardDescription>
              {shifts.length} turno{shifts.length !== 1 ? 's' : ''} abierto{shifts.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={refresh}
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shifts.map((shift) => (
            <div 
              key={shift.id} 
              className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {shift.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{shift.userName}</h4>
                    <p className="text-sm text-muted-foreground">{shift.userRole}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shift.acceptAppOrders ? (
                    <Badge variant="default" className="flex items-center gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Acepta App
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Sin App
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Inicio</p>
                    <p className="font-medium">{formatDate(shift.openedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Ventas</p>
                    <p className="font-medium">{formatCurrency(shift.totalSales)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Pedidos</p>
                    <p className="font-medium">{shift.salesCount}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
