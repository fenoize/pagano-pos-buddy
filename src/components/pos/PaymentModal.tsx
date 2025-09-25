import React, { useState, useEffect } from 'react';
import { Customer, OrderItem, FulfillmentType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, Smartphone, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
}

interface PaymentData {
  method: string;
  amount: number;
  change?: number;
  receiptNumber?: string;
  operationNumber?: string;
  runas?: number;
  fulfillment: FulfillmentType;
  notes?: string;
}

export default function PaymentModal({ isOpen, onClose, onConfirm, customer, items, total, subtotal, discount, deliveryFee, orderName }: PaymentModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [cashDenominations, setCashDenominations] = useState<number[]>([]);
  const [runaValue, setRunaValue] = useState(1000);
  const [orderTiming, setOrderTiming] = useState('after_payment');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(total);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [runas, setRunas] = useState(0);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('retiro');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset volatile payment states when modal opens
      setSelectedMethod('Efectivo');  
      setPaymentAmount(total);
      setReceiptNumber('');
      setOperationNumber('');
      setRunas(0);
      setNotes('');
      // Don't reset fulfillment as it comes from previous steps

      fetchConfig();
    }
  }, [isOpen, total]);

  useEffect(() => {
    setPaymentAmount(total);
  }, [total]);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('config')
        .select('*')
        .in('key', ['payment_methods', 'runa_value', 'order_timing', 'cash_denominations']);

      data?.forEach((config) => {
        if (config.key === 'payment_methods') {
          setPaymentMethods(config.value as string[]);
          setSelectedMethod('Efectivo');
        } else if (config.key === 'runa_value') {
          setRunaValue(config.value as number);
        } else if (config.key === 'order_timing') {
          setOrderTiming(config.value as string);
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
      case 'Runas': return <Coins className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  const calculateChange = () => {
    if (selectedMethod === 'Efectivo') {
      return Math.max(0, paymentAmount - total);
    }
    return 0;
  };

  const calculateRunasTotal = () => {
    return runas * runaValue;
  };

  const handleConfirm = () => {
    const paymentData: PaymentData = {
      method: selectedMethod,
      amount: selectedMethod === 'Runas' ? calculateRunasTotal() : paymentAmount,
      fulfillment,
      notes: notes.trim() || undefined,
    };

    if (selectedMethod === 'Efectivo') {
      paymentData.change = calculateChange();
    } else if (selectedMethod === 'POS') {
      paymentData.receiptNumber = receiptNumber;
    } else if (selectedMethod === 'Transferencia') {
      paymentData.operationNumber = operationNumber;
    } else if (selectedMethod === 'Runas') {
      paymentData.runas = runas;
    }

    onConfirm(paymentData);
  };

  const isValidPayment = () => {
    if (selectedMethod === 'Efectivo') {
      return paymentAmount >= total;
    } else if (selectedMethod === 'POS') {
      return receiptNumber.trim().length > 0;
    } else if (selectedMethod === 'Transferencia') {
      return operationNumber.trim().length > 0;
    } else if (selectedMethod === 'Runas') {
      return runas > 0 && calculateRunasTotal() >= total;
    }
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
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
                      {/* Display variant info based on system used */}
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
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Descuento:</span>
                      <span className="currency">-{formatPrice(discount)}</span>
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

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <Button
                    key={method}
                    variant={selectedMethod === method ? 'default' : 'outline'}
                    className="h-16 flex flex-col gap-2"
                    onClick={() => setSelectedMethod(method)}
                  >
                    {getMethodIcon(method)}
                    <span>{method}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          {selectedMethod && (
            <Card>
              <CardHeader>
                <CardTitle>Detalles de Pago - {selectedMethod}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedMethod === 'Efectivo' && (
                  <>
                    <div className="space-y-3">
                      <Label>Billetes Rápidos</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {cashDenominations.map((denomination) => (
                          <Button
                            key={denomination}
                            variant="outline"
                            className="h-12 flex flex-col gap-1 text-sm font-medium"
                            onClick={() => setPaymentAmount(denomination)}
                          >
                            <Banknote className="w-4 h-4" />
                            {formatPrice(denomination)}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          className="h-12 flex flex-col gap-1 text-xs"
                          onClick={() => {
                            const input = document.getElementById('manual-amount') as HTMLInputElement;
                            input?.focus();
                          }}
                        >
                          <span className="text-lg">+</span>
                          Otro
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="manual-amount">Con cuánto paga</Label>
                      <Input
                        id="manual-amount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        placeholder="Monto recibido"
                      />
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span>Vuelto:</span>
                      <span className="font-bold currency">{formatPrice(calculateChange())}</span>
                    </div>
                  </>
                )}

                {selectedMethod === 'POS' && (
                  <div>
                    <Label>Número de Boleta</Label>
                    <Input
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="Ingrese número de boleta"
                    />
                  </div>
                )}

                {selectedMethod === 'Transferencia' && (
                  <div>
                    <Label>Número de Operación</Label>
                    <Input
                      value={operationNumber}
                      onChange={(e) => setOperationNumber(e.target.value)}
                      placeholder="Ingrese número de operación"
                    />
                  </div>
                )}

                {selectedMethod === 'Runas' && (
                  <>
                    <div>
                      <Label>Cantidad de Runas</Label>
                      <Input
                        type="number"
                        value={runas}
                        onChange={(e) => setRunas(Number(e.target.value))}
                        placeholder="Cantidad de runas"
                        max={customer.cantidad_runas || 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Valor por Runa:</span>
                        <span className="currency">{formatPrice(runaValue)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>Total en CLP:</span>
                        <span className="font-bold currency">{formatPrice(calculateRunasTotal())}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

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

          {/* Fulfillment */}
          {orderTiming === 'after_payment' && (
            <Card>
              <CardHeader>
                <CardTitle>Modalidad de Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={fulfillment} onValueChange={(value: FulfillmentType) => setFulfillment(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retiro">Retiro en Local</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="servir">Para Servir</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

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