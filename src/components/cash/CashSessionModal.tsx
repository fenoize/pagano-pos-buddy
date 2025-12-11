import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useCashSession } from '@/hooks/useCashSession';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Wallet } from 'lucide-react';

interface CashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'open' | 'close' | 'movement';
  sessionSummary?: any;
}

const EXPENSE_CATEGORIES = [
  { value: 'caja_insumos', label: 'Insumos / Compras menores' },
  { value: 'caja_delivery', label: 'Gastos de delivery' },
  { value: 'caja_propinas', label: 'Propinas' },
  { value: 'caja_servicios', label: 'Servicios / Mantención' },
  { value: 'caja_otros', label: 'Otros gastos de caja' },
];

export function CashSessionModal({ isOpen, onClose, type, sessionSummary }: CashSessionModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [movementType, setMovementType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [acceptAppOrders, setAcceptAppOrders] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [syncToFinance, setSyncToFinance] = useState(true);
  
  const { openSession, closeSession, addCashMovement } = useCashSession();
  const { accounts } = useFinanceAccounts();
  const { toast } = useToast();

  // Filtrar cuentas activas tipo efectivo/caja
  const cashAccounts = accounts.filter(
    acc => acc.is_active && acc.type === 'Efectivo'
  );

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setMovementType('ingreso');
      setSelectedCategory('');
      setSelectedAccountId('');
      setSyncToFinance(true);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto válido.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      switch (type) {
        case 'open':
          await openSession(amountValue, acceptAppOrders);
          toast({
            title: "Turno abierto",
            description: `Turno iniciado con ${formatCurrency(amountValue)} en caja.${acceptAppOrders ? ' Recibiendo pedidos desde app.' : ''}`
          });
          break;
        
        case 'close':
          try {
            await closeSession(amountValue);
            
            toast({
              title: "✅ Turno cerrado",
              description: "El turno ha sido cerrado correctamente."
            });
            
            setAmount('');
            setNote('');
            onClose();
          } catch (error: any) {
            console.error('Error cerrando turno:', error);
            toast({
              title: "❌ Error al cerrar turno",
              description: error.message || "No se pudo cerrar el turno. Intenta nuevamente.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
          break;
        
        case 'movement':
          // Validar que egresos tengan categoría si se sincroniza a finanzas
          if (movementType === 'egreso' && syncToFinance && !selectedCategory) {
            toast({
              title: "Error",
              description: "Selecciona una categoría para el egreso.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }

          await addCashMovement(
            movementType,
            amountValue,
            note,
            movementType === 'egreso' ? selectedCategory : undefined,
            movementType === 'egreso' && syncToFinance ? selectedAccountId || undefined : undefined,
            movementType === 'egreso' ? syncToFinance : false
          );
          
          toast({
            title: "Movimiento registrado",
            description: `${movementType === 'ingreso' ? 'Ingreso' : 'Egreso'} de ${formatCurrency(amountValue)} registrado.${
              movementType === 'egreso' && syncToFinance ? ' Sincronizado a Finanzas.' : ''
            }`
          });
          break;
      }

      setAmount('');
      setNote('');
      onClose();
    } catch (error: any) {
      console.error('Error in cash session operation:', error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'open':
        return 'Abrir Turno de Caja';
      case 'close':
        return 'Cerrar Turno de Caja';
      case 'movement':
        return 'Registrar Movimiento de Caja';
      default:
        return 'Caja';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'open':
        return 'Ingresa el monto inicial en efectivo para abrir el turno.';
      case 'close':
        return 'Ingresa el monto final contado en caja para cerrar el turno.';
      case 'movement':
        return 'Registra ingresos o egresos de efectivo adicionales.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {type === 'close' && sessionSummary && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Resumen del Turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Efectivo inicial:</span>
                <span className="font-medium">{formatCurrency(sessionSummary.session.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas en efectivo:</span>
                <span className="font-medium">{formatCurrency(sessionSummary.summary.totalCash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ingresos adicionales:</span>
                <span className="font-medium text-green-600">{formatCurrency(sessionSummary.summary.ingresos)}</span>
              </div>
              <div className="flex justify-between">
                <span>Egresos:</span>
                <span className="font-medium text-red-600">-{formatCurrency(sessionSummary.summary.egresos)}</span>
              </div>
              {sessionSummary.summary.totalCashDeliveryPending > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>⚠️ Efectivo con repartidores:</span>
                  <span className="font-medium">{formatCurrency(sessionSummary.summary.totalCashDeliveryPending)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Efectivo esperado en caja:</span>
                <span>{formatCurrency(sessionSummary.summary.expectedCash)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'movement' && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={movementType === 'ingreso' ? 'default' : 'outline'}
                onClick={() => setMovementType('ingreso')}
                className="flex-1"
              >
                Ingreso
              </Button>
              <Button
                type="button"
                variant={movementType === 'egreso' ? 'default' : 'outline'}
                onClick={() => setMovementType('egreso')}
                className="flex-1"
              >
                Egreso
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">
              {type === 'open' && 'Monto Inicial'}
              {type === 'close' && 'Monto Final Contado'}
              {type === 'movement' && 'Monto'}
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              disabled={loading}
              required
            />
          </div>

          {type === 'open' && (
            <div className="flex items-center space-x-2 p-4 border rounded-md bg-muted/30">
              <Checkbox
                id="accept_app_orders"
                checked={acceptAppOrders}
                onCheckedChange={(checked) => setAcceptAppOrders(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="accept_app_orders" className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="h-4 w-4" />
                  Recibir pedidos desde la App Cliente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Permite que los clientes hagan pedidos desde sus dispositivos durante este turno
                </p>
              </div>
            </div>
          )}

          {/* Campos adicionales para egresos */}
          {type === 'movement' && movementType === 'egreso' && (
            <>
              <div className="space-y-2">
                <Label>Categoría del egreso</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/30">
                <Checkbox
                  id="sync_to_finance"
                  checked={syncToFinance}
                  onCheckedChange={(checked) => setSyncToFinance(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="sync_to_finance" className="flex items-center gap-2 cursor-pointer">
                    <Wallet className="h-4 w-4" />
                    Sincronizar a Finanzas / Egresos
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Registra automáticamente este egreso en el módulo de Finanzas
                  </p>
                </div>
              </div>

              {syncToFinance && cashAccounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Cuenta contable (opcional)</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {(type === 'movement' || type === 'close') && (
            <div className="space-y-2">
              <Label htmlFor="note">
                {type === 'close' ? 'Observaciones (opcional)' : 'Concepto'}
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  type === 'close' 
                    ? "Observaciones sobre el cierre..." 
                    : "Describe el concepto del movimiento..."
                }
                disabled={loading}
                rows={3}
                required={type === 'movement'}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Procesando...' : (
                type === 'open' ? 'Abrir Turno' : 
                type === 'close' ? 'Cerrar Turno' : 
                'Registrar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
