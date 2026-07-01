import React, { useState, useEffect, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Banknote,
  CreditCard,
  Smartphone,
  AppWindow,
  Sparkles,
  Coins,
  DollarSign,
  Wallet,
  Clock,
  Package,
  CircleDollarSign,
  Bike,
  Plus,
  X,
  CheckCircle,
} from 'lucide-react';
import { PendingPaymentOrder } from '@/hooks/usePendingPaymentOrders';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useSalesChannels, type SalesChannel } from '@/hooks/useSalesChannels';

export interface CollectPaymentEntry {
  methodName: string;
  displayName: string;
  amount: number;
  cashGiven?: number;
  receiptNumber?: string;
  operationNumber?: string;
  salesChannelSlug?: string;
  externalOrderId?: string;
}

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PendingPaymentOrder;
  onCollectPayment: (orderId: string, payments: CollectPaymentEntry[]) => Promise<boolean>;
}

const ICONS: Record<string, React.ReactNode> = {
  Banknote: <Banknote className="w-5 h-5" />,
  CreditCard: <CreditCard className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
  AppWindow: <AppWindow className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Coins: <Coins className="w-5 h-5" />,
  DollarSign: <DollarSign className="w-5 h-5" />,
  Wallet: <Wallet className="w-5 h-5" />,
  Clock: <Clock className="w-5 h-5" />,
};

export function CollectPaymentModal({ isOpen, onClose, order, onCollectPayment }: CollectPaymentModalProps) {
  const { paymentMethods: allMethods } = usePaymentMethods();
  const { channels: allChannels } = useSalesChannels({ onlyActive: true });
  const deliveryAppChannels = allChannels.filter((c) => c.type === 'delivery_app');

  // Filter: active, exclude runas (needs customer) and pendiente (order already pendiente)
  const paymentMethods = allMethods.filter(
    (m) => m.is_active && !['runas', 'pendiente'].includes(m.name.toLowerCase())
  );

  const [payments, setPayments] = useState<CollectPaymentEntry[]>([]);
  const [currentMethod, setCurrentMethod] = useState<string>('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [currentReceipt, setCurrentReceipt] = useState('');
  const [currentOperation, setCurrentOperation] = useState('');
  const [selectedAppChannel, setSelectedAppChannel] = useState<SalesChannel | null>(null);
  const [externalOrderId, setExternalOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const appInputRef = useRef<HTMLInputElement>(null);

  const total = order.total;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setCurrentAmount('');
      setCurrentReceipt('');
      setCurrentOperation('');
      setSelectedAppChannel(null);
      setExternalOrderId('');
      setLoading(false);
      const first = paymentMethods.find((m) => m.name === 'efectivo') || paymentMethods[0];
      if (first) setCurrentMethod(first.name);
    }
  }, [isOpen, allMethods.length]);

  // When switching away from aplicacion clear sub-state
  useEffect(() => {
    if (currentMethod !== 'aplicacion') {
      setSelectedAppChannel(null);
      setExternalOrderId('');
    }
  }, [currentMethod]);

  // Auto-fill amount when method changes (except efectivo)
  useEffect(() => {
    if (!isOpen) return;
    if (currentMethod === 'efectivo') {
      setCurrentAmount('');
    } else {
      setCurrentAmount(remaining.toString());
    }
  }, [currentMethod, isOpen]);

  // When app is picked, lock to remaining and focus
  useEffect(() => {
    if (selectedAppChannel) {
      setCurrentAmount(remaining.toString());
      const t = setTimeout(() => appInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [selectedAppChannel]);

  const methodConfig = paymentMethods.find((m) => m.name === currentMethod);
  const isEfectivo = currentMethod === 'efectivo';
  const isApp = currentMethod === 'aplicacion';

  const currentAmountNum = parseFloat(currentAmount) || 0;
  const currentChange = isEfectivo ? Math.max(0, currentAmountNum - remaining) : 0;

  const getMethodIcon = (iconName?: string) => ICONS[iconName || ''] || <CreditCard className="w-5 h-5" />;

  const buildCurrentEntry = (): CollectPaymentEntry | null => {
    if (!methodConfig) return null;

    if (isApp) {
      if (!selectedAppChannel) {
        toast.error('Selecciona la app de delivery');
        return null;
      }
      if (!externalOrderId.trim()) {
        toast.error('Ingresa el N° de pedido de la app');
        return null;
      }
      return {
        methodName: 'aplicacion',
        displayName: methodConfig.display_name,
        amount: remaining,
        salesChannelSlug: selectedAppChannel.slug,
        externalOrderId: externalOrderId.trim(),
        operationNumber: externalOrderId.trim(),
      };
    }

    if (currentAmountNum <= 0) {
      toast.error('Ingrese un monto válido');
      return null;
    }

    if (methodConfig.requires_receipt && !currentReceipt.trim()) {
      toast.error('Ingrese el número de boleta');
      return null;
    }
    if (methodConfig.requires_operation_number && !currentOperation.trim()) {
      toast.error('Ingrese el número de operación');
      return null;
    }

    const amount = isEfectivo ? Math.min(currentAmountNum, remaining) : currentAmountNum;

    return {
      methodName: currentMethod,
      displayName: methodConfig.display_name,
      amount,
      cashGiven: isEfectivo ? currentAmountNum : undefined,
      receiptNumber: currentReceipt.trim() || undefined,
      operationNumber: currentOperation.trim() || undefined,
    };
  };

  const handleAddPayment = () => {
    if (remaining === 0) {
      toast.info('Monto cubierto', { description: 'El total del pedido ya fue cubierto al 100%' });
      return;
    }
    const entry = buildCurrentEntry();
    if (!entry) return;
    setPayments([...payments, entry]);
    setCurrentAmount('');
    setCurrentReceipt('');
    setCurrentOperation('');
    setSelectedAppChannel(null);
    setExternalOrderId('');
    toast.success('Pago agregado', { description: `${entry.displayName} agregado` });
  };

  const handleRemovePayment = (idx: number) => {
    setPayments(payments.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    let finalPayments = [...payments];

    // If no payments queued, build from current
    if (finalPayments.length === 0) {
      const entry = buildCurrentEntry();
      if (!entry) return;
      finalPayments = [entry];
    }

    const sum = finalPayments.reduce((s, p) => s + p.amount, 0);
    if (sum < total) {
      toast.error('Error', { description: 'El total pagado es menor al total del pedido' });
      return;
    }

    setLoading(true);
    const ok = await onCollectPayment(order.id, finalPayments);
    setLoading(false);
    if (ok) onClose();
  };

  const canAddOrConfirm = (() => {
    if (isApp) return !!selectedAppChannel && !!externalOrderId.trim();
    if (currentAmountNum <= 0) return false;
    if (methodConfig?.requires_receipt && !currentReceipt.trim()) return false;
    if (methodConfig?.requires_operation_number && !currentOperation.trim()) return false;
    return true;
  })();

  const willCoverTotal = payments.length > 0
    ? totalPaid >= total
    : (isApp ? !!selectedAppChannel && !!externalOrderId.trim() : currentAmountNum >= remaining && canAddOrConfirm);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            Cobrar Pedido #{order.order_number}
          </DialogTitle>
          <DialogDescription>Registra el pago para este pedido pendiente</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumen */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {order.items.map((item: any, idx: number) => {
                const name = item.product_name || item.productName || item.name || 'Producto';
                const price = item.unit_price ?? item.basePrice ?? item.price ?? 0;
                return (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.quantity}x {name}
                    </span>
                    <span>{formatCurrency(price * item.quantity)}</span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total a cobrar:</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Lista de pagos agregados */}
          {payments.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Pagos agregados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/40 rounded-md">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{p.displayName}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemovePayment(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between text-sm">
                  <span>Total pagado:</span>
                  <span className="font-semibold">{formatCurrency(totalPaid)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
                    <span>Falta:</span>
                    <span className="font-semibold">{formatCurrency(remaining)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Selector de método */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                {remaining === 0
                  ? 'Pago completo'
                  : payments.length > 0
                  ? 'Agregar otro método'
                  : 'Método de pago'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {remaining === 0 && (
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Monto total cubierto al 100%</span>
                </div>
              )}

              {remaining > 0 && !(isApp && selectedAppChannel) && (
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((m) => {
                    const isAppMethod = m.name === 'aplicacion';
                    const noApps = isAppMethod && deliveryAppChannels.length === 0;
                    return (
                      <Button
                        key={m.id}
                        type="button"
                        variant={currentMethod === m.name ? 'default' : 'outline'}
                        className="h-16 flex flex-col gap-1"
                        onClick={() => setCurrentMethod(m.name)}
                        disabled={noApps}
                        title={noApps ? 'No hay apps de delivery configuradas' : undefined}
                      >
                        {getMethodIcon(m.icon)}
                        <span className="text-xs">{m.display_name}</span>
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Efectivo */}
              {remaining > 0 && isEfectivo && (
                <div className="space-y-2">
                  <Label htmlFor="cash">Con cuánto paga</Label>
                  <Input
                    id="cash"
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="$0"
                  />
                  {currentChange > 0 && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex justify-between">
                      <span className="text-sm text-emerald-700 dark:text-emerald-400">Vuelto:</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(currentChange)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Aplicación sub-flow */}
              {remaining > 0 && isApp && (
                <div className="space-y-3">
                  {!selectedAppChannel ? (
                    <div>
                      <Label>Selecciona la app</Label>
                      {deliveryAppChannels.length === 0 ? (
                        <p className="text-sm text-muted-foreground mt-2">
                          No hay apps de delivery configuradas.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {deliveryAppChannels.map((ch) => (
                            <Button
                              key={ch.id}
                              type="button"
                              variant="outline"
                              className="h-16 flex flex-col gap-1 border-2"
                              style={{ borderColor: ch.color || undefined, color: ch.color || undefined }}
                              onClick={() => setSelectedAppChannel(ch)}
                            >
                              <Bike className="w-5 h-5" />
                              <span className="text-xs font-semibold">{ch.name}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div
                        className="flex items-center justify-between p-2 rounded-md border-2"
                        style={{ borderColor: selectedAppChannel.color || undefined }}
                      >
                        <div className="flex items-center gap-2">
                          <Bike className="w-4 h-4" style={{ color: selectedAppChannel.color || undefined }} />
                          <span className="font-semibold">{selectedAppChannel.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAppChannel(null);
                            setExternalOrderId('');
                          }}
                        >
                          Cambiar app
                        </Button>
                      </div>
                      <div>
                        <Label htmlFor="external-order-id">N° de pedido {selectedAppChannel.name}</Label>
                        <Input
                          ref={appInputRef}
                          id="external-order-id"
                          autoFocus
                          placeholder={`Ej: ${selectedAppChannel.slug.toUpperCase().replace(/_/g, '-')}-12345`}
                          value={externalOrderId}
                          onChange={(e) =>
                            setExternalOrderId(e.target.value.replace(/[^A-Za-z0-9\-_ ]/g, '').slice(0, 40))
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          El pedido ya fue pagado por el cliente en la app. No se cobra dinero en caja.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Otros métodos: monto + opcional boleta/operación */}
              {remaining > 0 && !isEfectivo && !isApp && currentMethod && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="amount">Monto {methodConfig?.display_name}</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      placeholder="$0"
                    />
                  </div>
                  {methodConfig?.requires_receipt && (
                    <div>
                      <Label htmlFor="receipt">N° de boleta / comprobante</Label>
                      <Input
                        id="receipt"
                        value={currentReceipt}
                        onChange={(e) => setCurrentReceipt(e.target.value)}
                        placeholder="Número de boleta o comprobante"
                      />
                    </div>
                  )}
                  {methodConfig?.requires_operation_number && (
                    <div>
                      <Label htmlFor="operation">N° de operación / pedido</Label>
                      <Input
                        id="operation"
                        value={currentOperation}
                        onChange={(e) => setCurrentOperation(e.target.value)}
                        placeholder="Número de operación o pedido"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Add another method button (mixed payment) */}
              {remaining > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleAddPayment}
                  disabled={!canAddOrConfirm}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {payments.length > 0 ? 'Agregar otro método de pago' : 'Agregar método de pago (para pago mixto)'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !willCoverTotal}>
            {loading ? 'Procesando...' : `Cobrar ${formatCurrency(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
