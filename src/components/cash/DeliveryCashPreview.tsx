import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, AlertTriangle, CalendarDays } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DeliveryPersonPendingCash } from '@/hooks/useDeliveryCashPending';

interface DeliveryCashPreviewProps {
  pendingByPerson: DeliveryPersonPendingCash[];
  loading?: boolean;
}

// Helper: check if date is from a previous day
const isFromPreviousDay = (dateString: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const itemDate = new Date(dateString);
  itemDate.setHours(0, 0, 0, 0);
  return itemDate < today;
};

export function DeliveryCashPreview({ pendingByPerson, loading }: DeliveryCashPreviewProps) {
  if (loading) {
    return (
      <Card className="mb-4 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-6 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingByPerson.length === 0) {
    return null;
  }

  const totalPending = pendingByPerson.reduce((sum, p) => sum + p.total_pending, 0);
  
  // Check if there's any cash from previous days
  const hasPendingFromPreviousDays = pendingByPerson.some(person => 
    person.pending_items.some(item => isFromPreviousDay(item.collected_at))
  );

  const previousDaysTotal = pendingByPerson.reduce((sum, person) => 
    sum + person.pending_items
      .filter(item => isFromPreviousDay(item.collected_at))
      .reduce((itemSum, item) => itemSum + item.amount, 0)
  , 0);

  return (
    <Card className={`mb-4 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 ${hasPendingFromPreviousDays ? 'ring-2 ring-amber-400' : ''}`}>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm">Efectivo en Tránsito</CardTitle>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            {formatCurrency(totalPending)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        {hasPendingFromPreviousDays && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-amber-100 dark:bg-amber-900/50 rounded-md">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              {formatCurrency(previousDaysTotal)} de turnos anteriores pendientes
            </span>
          </div>
        )}
        
        <div className="space-y-1.5">
          {pendingByPerson.map((person) => {
            const previousItems = person.pending_items.filter(item => isFromPreviousDay(item.collected_at));
            const hasPrevious = previousItems.length > 0;
            
            return (
              <div 
                key={person.delivery_person_id} 
                className={`flex items-center justify-between p-2 rounded-md ${hasPrevious ? 'bg-amber-100/50 dark:bg-amber-900/30' : 'bg-background'}`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{person.delivery_person_name}</span>
                  {hasPrevious && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-700 border-amber-400">
                      <CalendarDays className="h-2.5 w-2.5 mr-0.5" />
                      {previousItems.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {person.pending_count} pedido{person.pending_count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-medium text-amber-700">
                    {formatCurrency(person.total_pending)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
