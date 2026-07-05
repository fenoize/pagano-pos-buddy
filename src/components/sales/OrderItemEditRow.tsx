import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderItem } from '@/types';
import { Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Module-level cache: single fetch shared across all rows
type ExtraCatalogEntry = { name: string; price: number };
let extrasCatalogPromise: Promise<Record<string, ExtraCatalogEntry>> | null = null;

function loadExtrasCatalog(): Promise<Record<string, ExtraCatalogEntry>> {
  if (!extrasCatalogPromise) {
    extrasCatalogPromise = (async () => {
      const { data, error } = await supabase
        .from('product_extras')
        .select('id, name, price');
      if (error || !data) return {};
      const map: Record<string, ExtraCatalogEntry> = {};
      for (const e of data) map[e.id] = { name: e.name, price: Number(e.price) || 0 };
      return map;
    })();
  }
  return extrasCatalogPromise;
}

function useExtrasCatalog() {
  const [catalog, setCatalog] = useState<Record<string, ExtraCatalogEntry>>({});
  useEffect(() => {
    let alive = true;
    loadExtrasCatalog().then((c) => { if (alive) setCatalog(c); });
    return () => { alive = false; };
  }, []);
  return catalog;
}

interface OrderItemEditRowProps {
  item: OrderItem;
  index: number;
  isEditMode: boolean;
  onUpdate: (index: number, updates: Partial<OrderItem>) => void;
  onRemove: (index: number) => void;
}

export function OrderItemEditRow({ item, index, isEditMode, onUpdate, onRemove }: OrderItemEditRowProps) {
  const extrasCatalog = useExtrasCatalog();

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
            {/* Legacy system fields */}
            {item.size && <div>Tamaño: <span className="capitalize">{item.size}</span></div>}
            {item.priceKind && <div>Tipo: <span className="capitalize">{item.priceKind === 'combo' ? 'Combo' : 'Solo hamburguesa'}</span></div>}
            
            {/* New variant system */}
            {item.variant_name && <div>Variante: <span className="capitalize">{item.variant_name}</span></div>}
            
            {/* Combo details */}
            {item.is_combo_item && item.combo_selections && item.combo_selections.length > 0 && (
              <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted">
                <div className="font-medium text-xs">Combo incluye:</div>
                {item.combo_selections.map((comboItem: any, idx: number) => (
                  <div key={idx} className="text-xs space-y-0.5">
                    <div className="font-medium">
                      {comboItem.quantity}x {comboItem.selectedProduct?.name || 'Producto'}
                      {comboItem.selectedVariant?.variant?.name && ` - ${comboItem.selectedVariant.variant.name}`}
                    </div>
                    {comboItem.extras && (() => {
                      const extrasArray = Array.isArray(comboItem.extras) 
                        ? comboItem.extras 
                        : Object.values(comboItem.extras).filter((e: any) => e);
                      
                      return extrasArray.length > 0 && (
                        <div className="pl-2">
                          Extras: {extrasArray.map((e: any) => 
                            `${e.quantity || 1}x ${e.label || e.name}`
                          ).join(', ')}
                        </div>
                      );
                    })()}
                    {comboItem.modifiers && Array.isArray(comboItem.modifiers) && comboItem.modifiers.length > 0 && (
                      <div className="pl-2">
                        Mods: {comboItem.modifiers.map((m: any) => m.name).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Regular extras and modifiers (for non-combo items) */}
            {!item.is_combo_item && item.extras && item.extras.length > 0 && (
              <div>
                Extras: {item.extras.map((extra: any) => 
                  `${extra.label} ${formatPrice(extra.price)}`
                ).join(', ')}
              </div>
            )}
            {!item.is_combo_item && item.modifiers && item.modifiers.length > 0 && (
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