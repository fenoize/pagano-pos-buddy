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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { useCashSession } from '@/hooks/useCashSession';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useDeliveryCashPending } from '@/hooks/useDeliveryCashPending';
import { usePendingPaymentOrders } from '@/hooks/usePendingPaymentOrders';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Wallet, AlertTriangle, CircleDollarSign, Building2 } from 'lucide-react';
import { DeliveryCashPreview } from './DeliveryCashPreview';
import { useBranchContext } from '@/contexts/BranchContext';

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
  const [movementType, setMovementType] = useState<'ingreso' | 'egreso' | 'transferencia'>('ingreso');
  const [acceptAppOrders, setAcceptAppOrders] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [acknowledgedPendingPayments, setAcknowledgedPendingPayments] = useState(false);
  
  
  const { openSession, closeSession, addCashMovement, registerAccountTransfer } = useCashSession();
  const { accounts } = useFinanceAccounts();
  const { pendingByPerson, loading: pendingLoading } = useDeliveryCashPending();
  const { count: pendingPaymentsCount, totalAmount: pendingPaymentsTotal, inheritedOrders } = usePendingPaymentOrders();
  const { activeBranch } = useBranchContext();
  const { toast } = useToast();

  // Filtrar cuentas activas tipo efectivo/caja para egresos
  const cashAccounts = accounts.filter(
    acc => acc.is_active && acc.type === 'Efectivo'
  );

  // Para transferencias entre cuentas: cualquier cuenta activa
  const transferAccounts = accounts.filter(acc => acc.is_active);

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setMovementType('ingreso');
      setAcceptAppOrders(true);
      setSelectedCategory('');
      setSelectedAccountId('');
      setTransferFromId('');
      setTransferToId('');
      setAcknowledgedPendingPayments(false);
      
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
          if (!activeBranch) {
            toast({
              title: 'Selecciona un local',
              description: 'Debes elegir un local antes de abrir caja.',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          if (!activeBranch.cash_account_id) {
            toast({
              title: 'Caja no configurada',
              description: `El local "${activeBranch.name}" no tiene caja registradora asignada. Configúrala en Configuración → Locales.`,
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          await openSession(amountValue, acceptAppOrders, activeBranch.id);
          toast({
            title: "Turno abierto",
            description: `Turno iniciado en ${activeBranch.name} con ${formatCurrency(amountValue)} en caja.${acceptAppOrders ? ' Recibiendo pedidos desde app.' : ''}`
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
          // Validar campos obligatorios
          if (!note.trim()) {
            toast({
              title: "Error",
              description: "El concepto es obligatorio.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }

          // Validaciones específicas para egresos
          if (movementType === 'egreso') {
            if (!selectedCategory) {
              toast({
                title: "Error",
                description: "Selecciona una categoría para el egreso.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
            
            if (!selectedAccountId && cashAccounts.length > 0) {
              toast({
                title: "Error",
                description: "Selecciona una cuenta contable para el egreso.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
          }

          // Validaciones específicas para transferencias
          if (movementType === 'transferencia') {
            if (!transferFromId || !transferToId) {
              toast({
                title: "Error",
                description: "Selecciona la cuenta origen y la cuenta destino.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
            if (transferFromId === transferToId) {
              toast({
                title: "Error",
                description: "La cuenta origen y la cuenta destino deben ser distintas.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }

            await registerAccountTransfer(
              transferFromId,
              transferToId,
              amountValue,
              note.trim()
            );

            const fromName = transferAccounts.find(a => a.id === transferFromId)?.name || 'origen';
            const toName = transferAccounts.find(a => a.id === transferToId)?.name || 'destino';
            toast({
              title: "Transferencia registrada",
              description: `${formatCurrency(amountValue)} de ${fromName} → ${toName}.`
            });
            break;
          }

          await addCashMovement(
            movementType as 'ingreso' | 'egreso',
            amountValue,
            note.trim(),
            movementType === 'egreso' ? selectedCategory : undefined,
            movementType === 'egreso' ? selectedAccountId || undefined : undefined,
            movementType === 'egreso' // Siempre sincronizar egresos a finanzas
          );
          
          toast({
            title: "Movimiento registrado",
            description: `${movementType === 'ingreso' ? 'Ingreso' : 'Egreso'} de ${formatCurrency(amountValue)} registrado.${
              movementType === 'egreso' ? ' Sincronizado a Finanzas.' : ''
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

        {/* Preview de efectivo pendiente al abrir turno */}
        {type === 'open' && (
          <>
            {activeBranch && (
              <Alert className="border-primary/30 bg-primary/5">
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  Vas a abrir caja en <strong>{activeBranch.name}</strong>
                  {activeBranch.cash_account_id ? (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Caja registradora vinculada — los movimientos se reflejarán en su saldo.
                    </span>
                  ) : (
                    <span className="block text-xs text-destructive mt-0.5">
                      ⚠ Este local no tiene caja registradora asignada. Configúrala en Configuración → Locales.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <DeliveryCashPreview pendingByPerson={pendingByPerson} loading={pendingLoading} />
            
            {/* Alerta de pedidos heredados pendientes de pago */}
            {inheritedOrders.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                <CircleDollarSign className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  <strong>📋 {inheritedOrders.length} pedido(s) pendiente(s) de pago</strong> de turnos anteriores 
                  por un total de <strong>{formatCurrency(inheritedOrders.reduce((sum, o) => sum + o.total, 0))}</strong>.
                  Podrás cobrarlos desde el indicador de "Pagos Pendientes".
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {type === 'close' && sessionSummary && (
          <>
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
                  <span className="font-medium text-emerald-600">{formatCurrency(sessionSummary.summary.ingresos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Egresos:</span>
                  <span className="font-medium text-destructive">-{formatCurrency(sessionSummary.summary.egresos)}</span>
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

            {/* Alerta de pedidos pendientes de pago */}
            {pendingPaymentsCount > 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 mb-4">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400 space-y-2">
                  <p>
                    <strong>⚠️ Hay {pendingPaymentsCount} pedido(s) sin pagar</strong> por un total de{' '}
                    <strong>{formatCurrency(pendingPaymentsTotal)}</strong>.
                  </p>
                  <p className="text-sm">
                    Estos pedidos pasarán al siguiente turno si cierras ahora.
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="acknowledge_pending"
                      checked={acknowledgedPendingPayments}
                      onCheckedChange={(checked) => setAcknowledgedPendingPayments(checked as boolean)}
                    />
                    <Label htmlFor="acknowledge_pending" className="text-sm cursor-pointer">
                      Entiendo que estos pedidos pasarán al siguiente turno
                    </Label>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'movement' && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={movementType === 'ingreso' ? 'default' : 'outline'}
                onClick={() => setMovementType('ingreso')}
              >
                Ingreso
              </Button>
              <Button
                type="button"
                variant={movementType === 'egreso' ? 'default' : 'outline'}
                onClick={() => setMovementType('egreso')}
              >
                Egreso
              </Button>
              <Button
                type="button"
                variant={movementType === 'transferencia' ? 'default' : 'outline'}
                onClick={() => setMovementType('transferencia')}
              >
                Movimiento
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
            <div className="space-y-2">
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
              {!acceptAppOrders && (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                    <strong>⚠️ App Cliente desactivada:</strong> Los clientes no podrán realizar pedidos desde la app mientras este turno esté abierto.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Campos adicionales para egresos */}
          {type === 'movement' && movementType === 'egreso' && (
            <>
              <div className="space-y-2">
                <Label>Categoría del egreso <span className="text-destructive">*</span></Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                  <SelectTrigger className={!selectedCategory ? "border-destructive/50" : ""}>
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

              {/* Info de sincronización automática - ya no es opcional */}
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-primary/5 border-primary/20">
                <Wallet className="h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sincronización automática a Finanzas</p>
                  <p className="text-xs text-muted-foreground">
                    Todos los egresos se registran automáticamente en el módulo de Finanzas
                  </p>
                </div>
              </div>

              {cashAccounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Cuenta contable <span className="text-destructive">*</span></Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId} required>
                    <SelectTrigger className={!selectedAccountId ? "border-destructive/50" : ""}>
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

          {/* Campos para transferencia entre cuentas */}
          {type === 'movement' && movementType === 'transferencia' && (
            <>
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                Mueve dinero entre cuentas (ej: Caja Chica ↔ Caja Grande, Caja → Banco). 
                Si la cuenta involucrada es de tipo Efectivo, el monto esperado al cierre del turno se ajustará automáticamente.
              </div>

              <div className="space-y-2">
                <Label>Cuenta origen <span className="text-destructive">*</span></Label>
                <Select value={transferFromId} onValueChange={setTransferFromId} required>
                  <SelectTrigger className={!transferFromId ? "border-destructive/50" : ""}>
                    <SelectValue placeholder="Desde qué cuenta sale el dinero" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cuenta destino <span className="text-destructive">*</span></Label>
                <Select value={transferToId} onValueChange={setTransferToId} required>
                  <SelectTrigger className={!transferToId ? "border-destructive/50" : ""}>
                    <SelectValue placeholder="A qué cuenta entra el dinero" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferAccounts
                      .filter(acc => acc.id !== transferFromId)
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {(type === 'movement' || type === 'close') && (
            <div className="space-y-2">
              <Label htmlFor="note">
                {type === 'close' ? 'Observaciones (opcional)' : (
                  <>Concepto <span className="text-destructive">*</span></>
                )}
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
                className={type === 'movement' && !note.trim() ? "border-destructive/50" : ""}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (type === 'close' && pendingPaymentsCount > 0 && !acknowledgedPendingPayments)}
            >
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
