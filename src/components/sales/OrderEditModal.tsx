import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Order, OrderItem } from '@/types';
import { useOrderEdit, OrderEditData } from '@/hooks/useOrderEdit';
import { useCustomers } from '@/hooks/useCustomers';
import { OrderItemEditRow } from './OrderItemEditRow';
import { ProductSelector } from './ProductSelector';
import { OrderHistoryModal } from './OrderHistoryModal';
import { Edit, Save, X, History, Plus } from 'lucide-react';

interface OrderEditModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: Order) => void;
}

export function OrderEditModal({ order, isOpen, onClose, onOrderUpdated }: OrderEditModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<OrderEditData | null>(null);
  const [reason, setReason] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const { updateOrder, calculateTotals, isLoading } = useOrderEdit();
  const { customers } = useCustomers();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  useEffect(() => {
    if (order && isEditMode && !editData) {
      setEditData({
        items: [...(Array.isArray(order.items) ? order.items : [])],
        delivery_fee: order.delivery_fee || 0,
        payment_method: order.payment_method,
        payment_efectivo: order.payment_efectivo || 0,
        payment_mp: order.payment_mp || 0,
        payment_pos: order.payment_pos || 0,
        subtotal: order.subtotal,
        discount: order.discount || 0,
        total: order.total
      });
    }
  }, [order, isEditMode, editData]);

  useEffect(() => {
    if (editData) {
      const totals = calculateTotals(editData.items, editData.delivery_fee, editData.discount);
      setEditData(prev => prev ? { ...prev, ...totals } : null);
    }
  }, [editData?.items, editData?.delivery_fee, editData?.discount, calculateTotals]);

  const handleSave = async () => {
    if (!order || !editData) return;

    try {
      const updatedOrder = await updateOrder(order.id, editData, reason);
      onOrderUpdated(updatedOrder as Order);
      setIsEditMode(false);
      setEditData(null);
      setReason('');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditData(null);
    setReason('');
  };

  const handleItemUpdate = (index: number, updates: Partial<OrderItem>) => {
    if (!editData) return;
    
    const newItems = [...editData.items];
    newItems[index] = { ...newItems[index], ...updates };
    setEditData({ ...editData, items: newItems });
  };

  const handleItemRemove = (index: number) => {
    if (!editData) return;
    
    const newItems = editData.items.filter((_, i) => i !== index);
    setEditData({ ...editData, items: newItems });
  };

  const handleAddProduct = (item: OrderItem) => {
    if (!editData) return;
    
    setEditData({
      ...editData,
      items: [...editData.items, item]
    });
    setShowProductSelector(false);
  };

  const handlePaymentUpdate = (field: string, value: number) => {
    if (!editData) return;
    
    setEditData({
      ...editData,
      [field]: value
    });
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalle de Orden #{order.order_number}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="w-4 h-4 mr-2" />
                  Historial
                </Button>
                {!isEditMode ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar pedido
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {isEditMode && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-sm text-primary">
                    Modo Edición - Los cambios se aplicarán al guardar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo del cambio (opcional)</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Describe el motivo del cambio..."
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">N° Orden:</Label>
                    <div className="font-medium">#{order.order_number}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Estado:</Label>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Tipo de Entrega:</Label>
                    <div className="capitalize">{order.fulfillment}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Cliente:</Label>
                    <div>
                      {order.customer_id ? (
                        (() => {
                          // Cliente registrado - buscar en BD
                          const customer = customers.find(c => c.id === order.customer_id);
                          if (customer) {
                            return (
                              <button
                                className="text-primary hover:underline text-left"
                                onClick={() => {
                                  // TODO: Implementar modal de información de cliente
                                  console.log('Ver cliente:', customer.id);
                                }}
                              >
                                {`${customer.name} ${customer.apellido || ''}`.trim()}
                              </button>
                            );
                          }
                          return <span>Cliente no encontrado</span>;
                        })()
                      ) : (
                        // Cliente no registrado - extraer de notes
                        (() => {
                          try {
                            const notes = JSON.parse(order.notes || '{}');
                            const guestName = notes.customerInfo?.name || 'Cliente';
                            return <span className="text-muted-foreground">{guestName}</span>;
                          } catch {
                            return <span className="text-muted-foreground">Cliente</span>;
                          }
                        })()
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Productos</span>
                  {isEditMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProductSelector(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar producto
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(isEditMode ? editData?.items || [] : order.items).map((item: OrderItem, index: number) => (
                    <OrderItemEditRow
                      key={index}
                      item={item}
                      index={index}
                      isEditMode={isEditMode}
                      onUpdate={handleItemUpdate}
                      onRemove={handleItemRemove}
                    />
                  ))}
                </div>

                {/* Order Totals */}
                <div className="border-t mt-6 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(isEditMode ? editData?.subtotal || 0 : order.subtotal)}</span>
                  </div>
                  
                  {/* Delivery Fee */}
                  <div className="flex justify-between items-center">
                    <span>Costo Delivery:</span>
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editData?.delivery_fee || 0}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, delivery_fee: parseInt(e.target.value) || 0 } : null)}
                          className="w-32 text-right"
                          min="0"
                        />
                      </div>
                    ) : (
                      <span>{formatPrice(order.delivery_fee || 0)}</span>
                    )}
                  </div>

                  {(order.discount > 0 || (isEditMode && editData?.discount && editData.discount > 0)) && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento:</span>
                      <span>-{formatPrice(isEditMode ? editData?.discount || 0 : order.discount)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatPrice(isEditMode ? editData?.total || 0 : order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="payment-method">Método de Pago</Label>
                      <Select
                        value={editData?.payment_method || ''}
                        onValueChange={(value: any) => setEditData(prev => prev ? { ...prev, payment_method: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="mp">Transferencia</SelectItem>
                          <SelectItem value="pos">POS</SelectItem>
                          <SelectItem value="mixto">Mixto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editData?.payment_method === 'mixto' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="efectivo">Efectivo</Label>
                          <Input
                            id="efectivo"
                            type="number"
                            value={editData.payment_efectivo}
                            onChange={(e) => handlePaymentUpdate('payment_efectivo', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transferencia">Transferencia</Label>
                          <Input
                            id="transferencia"
                            type="number"
                            value={editData.payment_mp}
                            onChange={(e) => handlePaymentUpdate('payment_mp', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pos">POS</Label>
                          <Input
                            id="pos"
                            type="number"
                            value={editData.payment_pos}
                            onChange={(e) => handlePaymentUpdate('payment_pos', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Método:</span>
                      <span className="capitalize">{order.payment_method}</span>
                    </div>
                    {order.payment_efectivo > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Efectivo:</span>
                        <span>{formatPrice(order.payment_efectivo)}</span>
                      </div>
                    )}
                    {order.payment_pos > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">POS:</span>
                        <span>{formatPrice(order.payment_pos)}</span>
                      </div>
                    )}
                    {order.payment_mp > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transferencia:</span>
                        <span>{formatPrice(order.payment_mp)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatPrice(order.total)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <ProductSelector
        isOpen={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        onProductSelected={handleAddProduct}
      />

      <OrderHistoryModal
        orderId={order.id}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}