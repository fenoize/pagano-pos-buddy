import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface ProductExtra {
  id: string;
  name: string;
  price: number;
}

interface ExtrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  extras: ProductExtra[];
  selectedExtras: Record<string, number>;
  onExtrasChange: (extras: Record<string, number>) => void;
}

export function ExtrasModal({
  isOpen,
  onClose,
  extras,
  selectedExtras,
  onExtrasChange,
}: ExtrasModalProps) {
  const [localExtras, setLocalExtras] = useState<Record<string, number>>(selectedExtras);

  useEffect(() => {
    setLocalExtras(selectedExtras);
  }, [selectedExtras, isOpen]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const handleChange = (extraId: string, change: number) => {
    setLocalExtras(prev => {
      const newQty = Math.max(0, (prev[extraId] || 0) + change);
      if (newQty === 0) {
        const { [extraId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [extraId]: newQty };
    });
  };

  const getExtrasTotal = () => {
    return Object.entries(localExtras).reduce((total, [extraId, qty]) => {
      const extra = extras.find(e => e.id === extraId);
      return total + (extra ? extra.price * qty : 0);
    }, 0);
  };

  const handleApply = () => {
    onExtrasChange(localExtras);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Extras Disponibles</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {extras.map((extra) => (
            <div
              key={extra.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-card"
            >
              <div className="flex-1">
                <p className="font-medium">{extra.name}</p>
                <p className="text-sm text-muted-foreground">
                  +{formatPrice(extra.price)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleChange(extra.id, -1)}
                  disabled={!localExtras[extra.id]}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">
                  {localExtras[extra.id] || 0}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleChange(extra.id, 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Extras:</span>
            <span className="font-bold text-lg">
              {formatPrice(getExtrasTotal())}
            </span>
          </div>
          <Button className="w-full" onClick={handleApply}>
            Aplicar Extras
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
