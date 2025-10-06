import React, { useState, useEffect } from 'react';
import { Customer, OrderItem, FulfillmentType, PaymentMethod } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, Smartphone, Coins, Bike, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryData } from './FulfillmentStep';
import { formatDeliveryAddress } from '@/lib/deliveryHelpers';
import { CouponApplication } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: PaymentData) => void;
  customer: Partial<Customer>;
  items: OrderItem[];
  total: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  orderName?: string;
  deliveryData?: DeliveryData | null;
  appliedCoupons?: CouponApplication[];
  manualDiscount?: { type: 'percentage' | 'fixed'; value: number; amount: number } | null;
}

interface SinglePayment {
  method: string;
  amount: number;
  receiptNumber?: string;
  operationNumber?: string;
  runas?: number;
}

interface PaymentData {
  payments: SinglePayment[];
  fulfillment: FulfillmentType;
  notes?: string;
}

export default function PaymentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  customer, 
  items, 
  total, 
  subtotal, 
  discount, 
  deliveryFee, 
  orderName, 
  deliveryData, 
  appliedCoupons = [], 
  manualDiscount 
}: PaymentModalProps) {
  const [payments, setPayments] = useState<SinglePayment[]>([]);
  const [currentMethod, setCurrentMethod] = useState('Efectivo');
  const [currentAmount, setCurrentAmount] = useState('');
  const [currentReceiptNumber, setCurrentReceiptNumber] = useState('');
  const [currentOperationNumber, setCurrentOperationNumber] = useState('');
  const [currentRunas, setCurrentRunas] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [cashDenominations, setCashDenominations] = useState<number[]>([]);
  const [runaValue, setRunaValue] = useState(1000);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('retiro');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setCurrentMethod('Efectivo');
      setCurrentAmount('');
      setCurrentReceiptNumber('');
      setCurrentOperationNumber('');
      setCurrentRunas('');
      setNotes('');
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('config')
        .select('*')
        .in('key', ['payment_methods', 'runa_value', 'cash_denominations']);

      data?.forEach((config) => {
        if (config.key === 'payment_methods') {
          setPaymentMethods(config.value as string[]);
        } else if (config.key === 'runa_value') {
          setRunaValue(config.value as number);
        } else if (config.key === 'cash_denominations') {
          setCashDenominations(config.value as number[]);
        }
      });
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'Efectivo': return <Banknote className="w-5 h-5" />;
      case 'POS': return <CreditCard className="w-5 h-5" />;
      case 'Transferencia': return <Smartphone className="w-5 h-5" />;
      case 'Aplicación': return <Bike className="w-5 h-5" />;
      case 'Runas': return <Coins className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  const getTotalPaid = () => {
    return payments.reduce((sum, payment) => {
      if (payment.method === 'Runas') {
        return sum + (payment.runas || 0) * runaValue;
      }
      return sum + payment.amount;
    }, 0);
  };

  const getRemainingBalance = () => {
    return Math.max(0, total - getTotalPaid());
  };

  const calculateChange = () => {
    const efectivoPayments = payments.filter(p => p.method === 'Efectivo');
    const totalEfectivo = efectivoPayments.reduce((sum, p) => sum + p.amount, 0);
    const otherPayments = payments.filter(p => p.method !== 'Efectivo');
    const totalOther = otherPayments.reduce((sum, p) => {
      if (p.method === 'Runas') {
        return sum + (p.runas || 0) * runaValue;
      }
      return sum + p.amount;
    }, 0);
    return Math.max(0, totalEfectivo - Math.max(0, total - totalOther));
  };

  const handleAddPayment = () => {
    const amount = parseFloat(currentAmount) || 0;
    
    if (currentMethod !== 'Runas' && amount <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un monto válido",
        variant: "destructive"
      });
      return;
    }

    if (currentMethod === 'POS' && !currentReceiptNumber.trim()) {
      toast({
        title: "Error",
        description: "Ingrese el número de boleta",
        variant: "destructive"
      });
      return;
    }

    if ((currentMethod === 'Transferencia' || currentMethod === 'Aplicación') && !currentOperationNumber.trim()) {
      toast({
        title: "Error",
        description: "Ingrese el número de operación",
        variant: "destructive"
      });
      return;
    }

    if (currentMethod === 'Runas') {
      const runasNum = parseFloat(currentRunas) || 0;
      if (runasNum <= 0) {
        toast({
          title: "Error",
          description: "Ingrese cantidad de runas",
          variant: "destructive"
        });
        return;
      }
      if (runasNum > (customer.cantidad_runas || 0)) {
        toast({
          title: "Error",
          description: "Runas insuficientes",
          variant: "destructive"
        });
        return;
      }
    }

    const newPayment: SinglePayment = {
      method: currentMethod,
      amount: currentMethod === 'Runas' ? 0 : amount,
      receiptNumber: currentMethod === 'POS' ? currentReceiptNumber : undefined,
      operationNumber: (currentMethod === 'Transferencia' || currentMethod === 'Aplicación') ? currentOperationNumber : undefined,
      runas: currentMethod === 'Runas' ? parseFloat(currentRunas) : undefined,
    };

    setPayments([...payments, newPayment]);
    setCurrentAmount('');
    setCurrentReceiptNumber('');
    setCurrentOperationNumber('');
    setCurrentRunas('');
    toast({
      title: "Pago agregado",
      description: `${currentMethod} agregado a la lista`
    });
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (getTotalPaid() < total) {
      toast({
        title: "Error",
        description: "El total pagado es menor al total de la venta",
        variant: "destructive"
      });
      return;
    }

    const paymentData: PaymentData = {
      payments,
      fulfillment: deliveryData?.zone ? 'delivery' : 'retiro',
      notes: notes.trim() || undefined,
    };
    onConfirm(paymentData);
  };

  const isValidPayment = () => {
    return payments.length > 0 && getTotalPaid() >= total;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Procesar Pago {payments.length > 1 ? '(Mixto)' : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Name */}
          {orderName && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nombre del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium text-primary">{orderName}</div>
              </CardContent>
            </Card>
          )}

          {/* Summary with remaining balance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg">
              <span className="text-xs font-medium mb-1">Total a pagar</span>
              <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-secondary/10 rounded-lg">
              <span className="text-xs font-medium mb-1">Saldo pendiente</span>
              <span className="text-xl font-bold text-secondary">{formatPrice(getRemainingBalance())}</span>
            </div>
          </div>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.productName} 
                      {item.variant_name ? (
                        ` (${item.variant_name})`
                      ) : item.size ? (
                        ` (${item.size})`
                      ) : ''}
                    </span>
                    <span className="currency">
                      {formatPrice((item.basePrice + item.extras.reduce((sum, e) => sum + (e.price * (e.quantity || 1)), 0)) * item.quantity)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="currency">{formatPrice(subtotal)}</span>
                  </div>
                  {appliedCoupons.length > 0 && (
                    <>
                      {appliedCoupons.map((coupon, index) => (
                        <div key={index} className="flex justify-between text-sm text-green-600">
                          <span>Cupón {coupon.payload.coupon_code}:</span>
                          <span className="currency">
                            -{formatPrice(Number(coupon.discount_products) + Number(coupon.discount_delivery))}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {manualDiscount && manualDiscount.amount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Descuento Manual ({manualDiscount.type === 'percentage' ? `${manualDiscount.value}%` : formatPrice(manualDiscount.value)}):</span>
                      <span className="currency">-{formatPrice(manualDiscount.amount)}</span>
                    </div>
                  )}
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Delivery:</span>
                      <span className="currency">{formatPrice(deliveryFee)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span className="currency">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          {deliveryFee > 0 && deliveryData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zona:</span>
                    <span className="font-medium">{deliveryData.zone?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="font-medium text-right">
                      {formatDeliveryAddress(
                        deliveryData.addressLine,
                        deliveryData.addressNumber,
                        deliveryData.comunaName,
                        deliveryData.reference
                      )}
                    </span>
                  </div>
                  {deliveryData.repartidorName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repartidor:</span>
                      <span className="font-medium">{deliveryData.repartidorName}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Costo Delivery (no afecto):</span>
                    <span className="currency">{formatPrice(deliveryFee)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payments List */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pagos agregados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.method)}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{payment.method}</span>
                          {payment.method === 'Runas' ? (
                            <span className="text-xs text-muted-foreground">
                              {payment.runas} runas = {formatPrice((payment.runas || 0) * runaValue)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {formatPrice(payment.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePayment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total pagado:</span>
                    <span>{formatPrice(getTotalPaid())}</span>
                  </div>
                  {calculateChange() > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                      <span>Vuelto:</span>
                      <span>{formatPrice(calculateChange())}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Agregar método de pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={currentMethod === method ? 'default' : 'outline'}
                    className="h-16 flex flex-col gap-2"
                    onClick={() => setCurrentMethod(method)}
                  >
                    {getMethodIcon(method)}
                    <span>{method}</span>
                  </Button>
                ))}
              </div>

              {/* Payment Details based on selected method */}
              {currentMethod === 'Efectivo' && (
                <div className="space-y-3">
                  <Label>Billetes Rápidos</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {cashDenominations.map((denomination) => (
                      <Button
                        key={denomination}
                        variant="outline"
                        className="h-12 flex flex-col gap-1 text-sm font-medium"
                        onClick={() => setCurrentAmount(denomination.toString())}
                      >
                        <Banknote className="w-4 h-4" />
                        {formatPrice(denomination)}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="efectivo">Con cuánto paga</Label>
                    <Input
                      id="efectivo"
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentMethod === 'POS' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="pos">Monto POS</Label>
                    <Input
                      id="pos"
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="receiptNumber">N° de boleta</Label>
                    <Input
                      id="receiptNumber"
                      placeholder="Número de boleta"
                      value={currentReceiptNumber}
                      onChange={(e) => setCurrentReceiptNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentMethod === 'Transferencia' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="mp">Monto transferencia</Label>
                    <Input
                      id="mp"
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="operationNumber">N° de operación</Label>
                    <Input
                      id="operationNumber"
                      placeholder="Número de operación"
                      value={currentOperationNumber}
                      onChange={(e) => setCurrentOperationNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentMethod === 'Aplicación' && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="aplicacion">Monto aplicación</Label>
                    <Input
                      id="aplicacion"
                      type="number"
                      placeholder="$0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="operationNumberApp">N° de pedido (Uber/PedidosYa)</Label>
                    <Input
                      id="operationNumberApp"
                      placeholder="Número de pedido"
                      value={currentOperationNumber}
                      onChange={(e) => setCurrentOperationNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {currentMethod === 'Runas' && (
                <div className="space-y-3">
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        Cliente tiene <strong>{customer.cantidad_runas || 0} runas</strong> disponibles
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Valor: 1 runa = {formatPrice(runaValue)}
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="runas">Cantidad de runas a usar</Label>
                    <Input
                      id="runas"
                      type="number"
                      placeholder="0"
                      max={customer.cantidad_runas || 0}
                      value={currentRunas}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        if (val <= (customer.cantidad_runas || 0)) {
                          setCurrentRunas(e.target.value);
                          setCurrentAmount((val * runaValue).toString());
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleAddPayment}
                disabled={!currentAmount && !currentRunas}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar este pago
              </Button>
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Comentarios del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="order-notes">Comentarios (opcional)</Label>
                <Textarea
                  id="order-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregar comentarios especiales para el pedido..."
                  className="min-h-[80px] mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!isValidPayment()}
              className="flex-1"
            >
              Confirmar Pago
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
