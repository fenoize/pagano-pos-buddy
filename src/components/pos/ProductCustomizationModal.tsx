import React, { useState, useEffect } from 'react';
import { Product, OrderItem } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProductExtra {
  id: string;
  name: string;
  price: number;
}

interface ProductModifier {
  id: string;
  name: string;
}

interface ProductCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: Omit<OrderItem, 'productId' | 'productName'>) => void;
  product: Product;
}

export default function ProductCustomizationModal({
  isOpen,
  onClose,
  onAddToCart,
  product
}: ProductCustomizationModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>('simple');
  const [priceType, setPriceType] = useState<'combo' | 'only'>('combo');
  const [extras, setExtras] = useState<ProductExtra[]>([]);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<{[key: string]: number}>({});
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && product) {
      fetchProductExtrasAndModifiers();
      resetForm();
    }
  }, [isOpen, product]);

  const resetForm = () => {
    setSelectedVariant('simple');
    setPriceType('combo');
    setSelectedExtras({});
    setSelectedModifiers([]);
    setNotes('');
    setQuantity(1);
  };

  const fetchProductExtrasAndModifiers = async () => {
    try {
      const [extrasRes, modifiersRes] = await Promise.all([
        supabase
          .from('product_extras')
          .select('*')
          .eq('product_id', product.id)
          .eq('active', true),
        supabase
          .from('product_modifiers')
          .select('*')
          .eq('product_id', product.id)
          .eq('active', true)
      ]);

      if (extrasRes.data) setExtras(extrasRes.data);
      if (modifiersRes.data) setModifiers(modifiersRes.data);
    } catch (error) {
      console.error('Error fetching product extras and modifiers:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getVariants = () => {
    if (product.category === 'hamburguesas') {
      return ['simple', 'doble', 'triple', 'cuadruple'];
    } else if (product.category === 'papas') {
      return ['Medium', 'Large'];
    }
    return ['simple', 'doble', 'triple'];
  };

  const getBasePrice = () => {
    const prices = product.prices[priceType];
    return prices[selectedVariant as keyof typeof prices] || 0;
  };

  const getExtrasTotal = () => {
    return Object.entries(selectedExtras).reduce((total, [extraId, quantity]) => {
      const extra = extras.find(e => e.id === extraId);
      return total + (extra ? extra.price * quantity : 0);
    }, 0);
  };

  const getTotalPrice = () => {
    return (getBasePrice() + getExtrasTotal()) * quantity;
  };

  const handleExtraChange = (extraId: string, change: number) => {
    setSelectedExtras(prev => {
      const currentQty = prev[extraId] || 0;
      const newQty = Math.max(0, currentQty + change);
      
      if (newQty === 0) {
        const { [extraId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [extraId]: newQty };
    });
  };

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers(prev => 
      prev.includes(modifierId)
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const handleAddToCart = () => {
    const selectedExtrasArray = Object.entries(selectedExtras).map(([extraId, qty]) => {
      const extra = extras.find(e => e.id === extraId);
      return {
        id: extraId,
        name: extra?.name || '',
        price: extra?.price || 0,
        quantity: qty
      };
    }).filter(extra => extra.quantity > 0);

    const selectedModifiersArray = selectedModifiers.map(modifierId => {
      const modifier = modifiers.find(m => m.id === modifierId);
      return {
        id: modifierId,
        name: modifier?.name || ''
      };
    });

    const orderItem = {
      size: selectedVariant as any,
      priceKind: priceType,
      basePrice: getBasePrice(),
      quantity,
      extras: selectedExtrasArray.map(extra => ({
        key: extra.id,
        label: extra.name,
        price: extra.price,
        quantity: extra.quantity
      })),
      modifiers: selectedModifiersArray,
      notes
    };

    onAddToCart(orderItem);
    onClose();
  };

  const variants = getVariants();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Price Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Tipo de Pedido</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={priceType === 'combo' ? 'default' : 'outline'}
                onClick={() => setPriceType('combo')}
                className="h-12"
              >
                Combo
              </Button>
              <Button
                variant={priceType === 'only' ? 'default' : 'outline'}
                onClick={() => setPriceType('only')}
                className="h-12"
              >
                Solo
              </Button>
            </div>
          </div>

          {/* Variant Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Tamaño/Variante</Label>
            <div className="grid grid-cols-2 gap-3">
              {variants.map((variant) => {
                const price = (product.prices[priceType] as any)[variant];
                if (!price) return null;
                
                return (
                  <Button
                    key={variant}
                    variant={selectedVariant === variant ? 'default' : 'outline'}
                    onClick={() => setSelectedVariant(variant)}
                    className="h-16 flex flex-col gap-1"
                  >
                    <span className="font-medium capitalize">{variant}</span>
                    <Badge variant="secondary" className="text-xs">
                      {formatPrice(price)}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Extras */}
          {extras.length > 0 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Extras</Label>
              <div className="space-y-2">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{extra.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(extra.price)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtraChange(extra.id, -1)}
                        disabled={!selectedExtras[extra.id]}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {selectedExtras[extra.id] || 0}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtraChange(extra.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modifiers */}
          {modifiers.length > 0 && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Modificadores (sin costo)</Label>
              <div className="grid grid-cols-2 gap-2">
                {modifiers.map((modifier) => (
                  <Button
                    key={modifier.id}
                    variant={selectedModifiers.includes(modifier.id) ? 'default' : 'outline'}
                    onClick={() => toggleModifier(modifier.id)}
                    className="h-auto p-3 text-sm"
                  >
                    {modifier.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-base font-semibold mb-3 block">
              Notas Especiales
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Sin sal, extra crocante, etc."
              rows={3}
            />
          </div>

          {/* Quantity */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Cantidad</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
                min="1"
              />
              <Button
                variant="outline"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Total and Actions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span>{formatPrice(getTotalPrice())}</span>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleAddToCart} className="flex-1">
                Agregar al Carrito
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}