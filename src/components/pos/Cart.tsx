import React from 'react';
import { OrderItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, X, Edit3 } from 'lucide-react';

interface CartProps {
  items: OrderItem[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onEditItem: (index: number) => void;
  onCheckout: () => void;
  subtotal: number;
  discount: number;
  deliveryFee: number;
}

export default function Cart({ items, onUpdateQuantity, onRemoveItem, onEditItem, onCheckout, subtotal, discount, deliveryFee }: CartProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const calculateItemTotal = (item: OrderItem) => {
    const itemTotal = (item.basePrice + item.extras.reduce((sum, extra) => sum + extra.price, 0)) * item.quantity;
    return itemTotal;
  };

  const total = subtotal - discount + deliveryFee;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Pedido ({items.length})
          </div>
          <Badge variant="secondary" className="currency">
            {formatPrice(total)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Carrito vacío
          </p>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="border border-border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{item.productName}</h5>
                      <p className="text-xs text-muted-foreground">
                        {/* Display variant info based on system used */}
                        {item.variant_name ? (
                          // New variant system
                          item.variant_name
                        ) : (
                          // Legacy system
                          `${item.size} • ${item.priceKind === 'combo' ? 'Combo' : 'Solo'}`
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditItem(index)}
                        className="h-6 w-6 p-0"
                        title="Editar item"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(index)}
                        className="h-6 w-6 p-0"
                        title="Eliminar item"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Extras */}
                  {item.extras.length > 0 && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {item.extras.map((extra, extraIndex) => (
                        <div key={extraIndex} className="flex justify-between">
                          <span>+ {extra.label}</span>
                          <span>{formatPrice(extra.price)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="font-medium text-sm currency">
                      {formatPrice(calculateItemTotal(item))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="currency">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuentos:</span>
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
            
            <Button 
              className="w-full" 
              onClick={onCheckout}
              disabled={items.length === 0}
              size="lg"
            >
              Continuar a Entrega {formatPrice(total)}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}