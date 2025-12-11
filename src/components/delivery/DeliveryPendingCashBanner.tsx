import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDeliveryPersonCash } from '@/hooks/useDeliveryPersonCash';
import { formatCurrency } from '@/lib/utils';
import { Wallet, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function DeliveryPendingCashBanner() {
  const { 
    pendingCash, 
    totalPending, 
    hasPendingFromPreviousDays, 
    loading,
    isFromPreviousDay 
  } = useDeliveryPersonCash();

  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingCash.length === 0) {
    return null;
  }

  return (
    <Card className={`border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 ${hasPendingFromPreviousDays ? 'ring-2 ring-amber-400' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Efectivo por Depositar</CardTitle>
              <CardDescription>
                Dinero cobrado pendiente de entregar a caja
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className="bg-amber-100 text-amber-800 border-amber-300 text-lg px-3 py-1"
          >
            {formatCurrency(totalPending)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {pendingCash.map((item) => {
            const isPrevDay = isFromPreviousDay(item.collected_at);
            return (
              <div 
                key={item.id} 
                className={`flex items-center justify-between text-sm p-2 rounded-lg ${
                  isPrevDay 
                    ? 'bg-amber-100 dark:bg-amber-900/50 border border-amber-300' 
                    : 'bg-background'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isPrevDay && (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">Pedido #{item.order_number || '—'}</span>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(item.collected_at), isPrevDay ? "d MMM, HH:mm" : "HH:mm", { locale: es })}
                  </span>
                  {isPrevDay && (
                    <Badge variant="outline" className="text-xs text-amber-700 border-amber-400">
                      Día anterior
                    </Badge>
                  )}
                </div>
                <span className={`font-semibold ${isPrevDay ? 'text-amber-700' : ''}`}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            );
          })}
        </div>

        {hasPendingFromPreviousDays && (
          <p className="text-xs text-amber-700 mt-3 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Tienes efectivo de días anteriores. Deposítalo lo antes posible.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
