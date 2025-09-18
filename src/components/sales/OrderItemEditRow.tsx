import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderItem } from '@/types';
import { Trash2, Edit } from 'lucide-react';

interface OrderItemEditRowProps {
  item: OrderItem;
  index: number;
  isEditMode: boolean;
  onUpdate: (index: number, updates: Partial<OrderItem>) => void;
  onRemove: (index: number) => void;
}

export function OrderItemEditRow({ item, index, isEditMode, onUpdate, onRemove }: OrderItemEditRowProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const calculateItemTotal = (item: OrderItem) => {
    const extrasTotal = item.extras?.reduce((sum, extra) => sum + extra.price, 0) || 0;
    return (item.basePrice + extrasTotal) * item.quantity;
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium">{item.productName}</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Tamaño: <span className="capitalize">{item.size}</span></div>
            <div>Tipo: <span className="capitalize">{item.priceKind === 'combo' ? 'Combo' : 'Solo hamburguesa'}</span></div>
            {item.extras && item.extras.length > 0 && (
              <div>
                Extras: {item.extras.map((extra: any) => 
                  `${extra.label} ${formatPrice(extra.price)}`
                ).join(', ')}
              </div>
            )}
            {item.modifiers && item.modifiers.length > 0 && (
              <div>
                Modificaciones: {item.modifiers.map((mod: any) => mod.name).join(', ')}
              </div>
            )}
            {item.notes && (
              <div>Notas: {item.notes}</div>
            )}
          </div>
        </div>
        
        <div className="text-right space-y-2">
          {isEditMode ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm">Cant:</span>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onUpdate(index, { quantity: parseInt(e.target.value) || 1 })}
                  className="w-20"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">$ c/u:</span>
                <Input
                  type="number"
                  value={item.basePrice}
                  onChange={(e) => onUpdate(index, { basePrice: parseInt(e.target.value) || 0 })}
                  className="w-28"
                  min="0"
                />
              </div>
              <div className="font-bold">
                {formatPrice(calculateItemTotal(item))}
              </div>
              <div className="flex gap-1 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="font-medium">Cant: {item.quantity}</div>
              <div className="text-sm text-muted-foreground">
                {formatPrice(item.basePrice)} c/u
              </div>
              <div className="font-bold">
                {formatPrice(calculateItemTotal(item))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}