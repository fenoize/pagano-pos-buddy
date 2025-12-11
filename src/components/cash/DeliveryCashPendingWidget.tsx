import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDeliveryCashPending, DeliveryPersonPendingCash, DeliveryCashPending } from '@/hooks/useDeliveryCashPending';
import { useCashSession } from '@/hooks/useCashSession';
import { formatCurrency } from '@/lib/utils';
import { Truck, Wallet, AlertTriangle, ChevronDown, ChevronUp, Clock, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper: check if date is from a previous day
const isFromPreviousDay = (dateString: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const itemDate = new Date(dateString);
  itemDate.setHours(0, 0, 0, 0);
  return itemDate < today;
};

// Group items by today vs previous days
const groupItemsByDate = (items: DeliveryCashPending[]) => {
  const today: DeliveryCashPending[] = [];
  const previous: DeliveryCashPending[] = [];
  
  items.forEach(item => {
    if (isFromPreviousDay(item.collected_at)) {
      previous.push(item);
    } else {
      today.push(item);
    }
  });
  
  return { today, previous };
};

export function DeliveryCashPendingWidget() {
  const { pendingByPerson, loading, depositCash, refetch } = useDeliveryCashPending();
  const { currentSession, addCashMovement } = useCashSession();
  
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<DeliveryPersonPendingCash | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [depositNotes, setDepositNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const totalPending = pendingByPerson.reduce((sum, p) => sum + p.total_pending, 0);
  
  // Check if there's any cash from previous days
  const hasPendingFromPreviousDays = pendingByPerson.some(person => 
    person.pending_items.some(item => isFromPreviousDay(item.collected_at))
  );

  const handleOpenDepositModal = (person: DeliveryPersonPendingCash) => {
    setSelectedPerson(person);
    setSelectedItems(new Set(person.pending_items.map(item => item.id)));
    setDepositNotes('');
    setDepositModalOpen(true);
  };

  const toggleItem = (itemId: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItems(newSet);
  };

  const getSelectedTotal = () => {
    if (!selectedPerson) return 0;
    return selectedPerson.pending_items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + item.amount, 0);
  };

  const handleDeposit = async () => {
    if (!currentSession || !selectedPerson || selectedItems.size === 0) return;

    setProcessing(true);
    try {
      const depositAmount = getSelectedTotal();
      
      // Check how many items are from previous days
      const selectedItemsList = selectedPerson.pending_items.filter(item => selectedItems.has(item.id));
      const fromPreviousDays = selectedItemsList.filter(item => isFromPreviousDay(item.collected_at));
      
      // Marcar los items como depositados
      const success = await depositCash(
        Array.from(selectedItems),
        currentSession.id,
        depositNotes || undefined
      );

      if (success) {
        // Crear ingreso en la sesión de caja con nota sobre origen
        let noteText = `Depósito de efectivo - ${selectedPerson.delivery_person_name} (${selectedItems.size} pedidos)`;
        if (fromPreviousDays.length > 0) {
          noteText += ` [${fromPreviousDays.length} de turnos anteriores]`;
        }
        
        await addCashMovement(
          'ingreso',
          depositAmount,
          noteText
        );

        setDepositModalOpen(false);
        setSelectedPerson(null);
        setSelectedItems(new Set());
        await refetch();
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingByPerson.length === 0) {
    return null; // No mostrar widget si no hay efectivo pendiente
  }

  return (
    <>
      <Card className={`border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 ${hasPendingFromPreviousDays ? 'ring-2 ring-amber-400' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Efectivo en Tránsito</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {hasPendingFromPreviousDays && (
                <Badge variant="destructive" className="text-xs">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  Hay de otros turnos
                </Badge>
              )}
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {formatCurrency(totalPending)}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Efectivo cobrado por repartidores pendiente de depositar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingByPerson.map((person) => {
            const { today, previous } = groupItemsByDate(person.pending_items);
            const hasPreviousItems = previous.length > 0;
            
            return (
              <div key={person.delivery_person_id} className={`border rounded-lg bg-background ${hasPreviousItems ? 'border-amber-400' : ''}`}>
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedPerson(
                    expandedPerson === person.delivery_person_id ? null : person.delivery_person_id
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasPreviousItems ? 'bg-amber-100' : 'bg-primary/10'}`}>
                      <Truck className={`h-4 w-4 ${hasPreviousItems ? 'text-amber-600' : 'text-primary'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{person.delivery_person_name}</p>
                        {hasPreviousItems && (
                          <Badge variant="outline" className="text-xs text-amber-700 border-amber-400">
                            {previous.length} de otro turno
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {person.pending_count} pedido{person.pending_count !== 1 ? 's' : ''} pendiente{person.pending_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-700">
                      {formatCurrency(person.total_pending)}
                    </span>
                    {expandedPerson === person.delivery_person_id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {expandedPerson === person.delivery_person_id && (
                  <div className="border-t p-3 space-y-2 bg-muted/20">
                    {/* Items from previous days */}
                    {previous.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          De turnos anteriores:
                        </p>
                        {previous.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm bg-amber-50 dark:bg-amber-900/30 p-2 rounded border border-amber-200">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              <span>Pedido #{item.order?.order_number || '—'}</span>
                              <span className="text-amber-600 text-xs font-medium">
                                {format(new Date(item.collected_at), 'd MMM, HH:mm', { locale: es })}
                              </span>
                            </div>
                            <span className="font-medium text-amber-700">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Items from today */}
                    {today.length > 0 && (
                      <div className="space-y-2">
                        {previous.length > 0 && (
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            De hoy:
                          </p>
                        )}
                        {today.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>Pedido #{item.order?.order_number || '—'}</span>
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(item.collected_at), 'HH:mm', { locale: es })}
                              </span>
                            </div>
                            <span className="font-medium">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {currentSession && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDepositModal(person);
                        }}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Recibir depósito
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!currentSession && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Abre un turno de caja para recibir depósitos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal de depósito */}
      <Dialog open={depositModalOpen} onOpenChange={setDepositModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recibir Depósito de Efectivo</DialogTitle>
            <DialogDescription>
              {selectedPerson?.delivery_person_name} - Selecciona los pedidos a depositar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {selectedPerson?.pending_items.map((item) => {
                const isPrevDay = isFromPreviousDay(item.collected_at);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 ${
                      isPrevDay ? 'bg-amber-50 border-amber-200' : ''
                    }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Pedido #{item.order?.order_number || '—'}</span>
                          {isPrevDay && (
                            <Badge variant="outline" className="text-xs text-amber-700 border-amber-400">
                              Otro turno
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.collected_at), isPrevDay ? "d MMM, HH:mm" : "HH:mm", { locale: es })}
                      </p>
                    </Label>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="Observaciones del depósito..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Total a depositar:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(getSelectedTotal())}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDepositModalOpen(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={processing || selectedItems.size === 0}
            >
              {processing ? 'Procesando...' : 'Confirmar Depósito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
