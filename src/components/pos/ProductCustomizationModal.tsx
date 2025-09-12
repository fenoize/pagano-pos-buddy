import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus } from 'lucide-react';

interface ProductExtra {
  id: string;
  name: string;
  price: number;
}

interface ProductModifier {
  id: string;
  name: string;
  price: number;
}

type Variant = 'simple' | 'doble' | 'triple' | 'cuádruple';

interface ProductCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: any) => void;
  product: Product;
}

export function ProductCustomizationModal({ isOpen, onClose, onAddToCart, product }: ProductCustomizationModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant>('simple');
  const [selectedPriceType, setSelectedPriceType] = useState<'combo' | 'only'>('combo');
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [extras, setExtras] = useState<ProductExtra[]>([]);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);

  useEffect(() => {
    if (isOpen && product.id) {
      fetchProductExtrasAndModifiers();
    }
  }, [isOpen, product.id]);

  const fetchProductExtrasAndModifiers = async () => {
    try {
      // Obtener categorías del producto
      const { data: productCategories } = await supabase
        .from('product_categories')
        .select('category_id')
        .eq('product_id', product.id);

      const categoryIds = productCategories?.map(pc => pc.category_id) || [];

      const [extrasRes, modifiersRes] = await Promise.all([
        supabase
          .from('product_extras')
          .select('*')
          .in('category_id', categoryIds.length > 0 ? categoryIds : [''])
          .eq('active', true),
        supabase
          .from('product_modifiers')
          .select('*')
          .eq('product_id', product.id)
          .eq('active', true),
      ]);

      if (extrasRes.error) throw extrasRes.error;
      if (modifiersRes.error) throw modifiersRes.error;

      setExtras(extrasRes.data || []);
      setModifiers(modifiersRes.data || []);
    } catch (error) {
      console.error('Error fetching product customizations:', error);
    }
  };

  const resetForm = () => {
    setSelectedVariant('simple');
    setSelectedPriceType('combo');
    setSelectedExtras({});
    setSelectedModifiers([]);
    setSpecialNotes('');
    setQuantity(1);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getVariants = (): string[] => {
    const catStr = (product.category || '').toString().toLowerCase();
    const hasHamburguesasCategory =
      product.categories?.some((cat: any) => cat?.name?.toString().toLowerCase().includes('hamburguesa')) ||
      catStr.includes('hamburguesa');

    if (hasHamburguesasCategory) {
      const prices: any = product.prices || {};
      const priceType = prices[selectedPriceType] || {};
      const all = ['simple', 'doble', 'triple', 'cuádruple'];
      const available = all.filter((v) => priceType[v] !== undefined && priceType[v] !== null);
      return available.length > 0 ? available : ['simple'];
    }
    return ['simple'];
  };

  const getBasePrice = () => {
    const prices = product.prices as any;
    return prices[selectedPriceType][selectedVariant] || 0;
  };

  const getExtrasTotal = () => {
    return Object.entries(selectedExtras).reduce((total, [extraId, qty]) => {
      const extra = extras.find(e => e.id === extraId);
      return total + (extra ? extra.price * qty : 0);
    }, 0);
  };

  const getModifiersTotal = () => {
    return selectedModifiers.reduce((total, modifierId) => {
      const modifier = modifiers.find(m => m.id === modifierId);
      return total + (modifier ? modifier.price : 0);
    }, 0);
  };

  const getTotalPrice = () => {
    return (getBasePrice() + getExtrasTotal() + getModifiersTotal()) * quantity;
  };

  const handleExtraChange = (extraId: string, change: number) => {
    setSelectedExtras(prev => {
      const newQty = Math.max(0, (prev[extraId] || 0) + change);
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
        key: extraId,
        label: extra?.name || '',
        price: extra?.price || 0,
        quantity: qty
      };
    });

    const selectedModifiersArray = selectedModifiers.map(modifierId => {
      const modifier = modifiers.find(m => m.id === modifierId);
      return {
        id: modifierId,
        name: modifier?.name || ''
      };
    });

    const orderItem = {
      productId: product.id!,
      productName: product.name,
      size: selectedVariant,
      priceKind: selectedPriceType,
      basePrice: getBasePrice(),
      quantity,
      extras: selectedExtrasArray,
      modifiers: selectedModifiersArray,
      notes: specialNotes.trim() || undefined
    };

    onAddToCart(orderItem);
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar {product.name}</DialogTitle>
          <DialogDescription className="sr-only">Selecciona tamaño, extras y notas para el producto.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="customize" className="w-full">
          <TabsContent value="customize" className="space-y-6">
            {/* Tipo de precio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipo de Precio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={selectedPriceType === 'combo' ? 'default' : 'outline'}
                    onClick={() => setSelectedPriceType('combo')}
                  >
                    Combo (con papas)
                  </Button>
                  <Button
                    variant={selectedPriceType === 'only' ? 'default' : 'outline'}
                    onClick={() => setSelectedPriceType('only')}
                  >
                    Solo hamburguesa
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Variantes */}
            {getVariants().length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tamaño</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {getVariants().map((variant) => (
                      <Button
                        key={variant}
                        variant={selectedVariant === variant ? 'default' : 'outline'}
                        onClick={() => setSelectedVariant(variant as Variant)}
                        className="capitalize"
                      >
                        {variant}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Extras */}
            {extras.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Extras</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {extras.map((extra) => (
                      <div key={extra.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{extra.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {formatPrice(extra.price)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExtraChange(extra.id, -1)}
                            disabled={(selectedExtras[extra.id] || 0) === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center">
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
                </CardContent>
              </Card>
            )}

            {/* Modificadores */}
            {modifiers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Modificaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {modifiers.map((modifier) => (
                      <div
                        key={modifier.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedModifiers.includes(modifier.id)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleModifier(modifier.id)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{modifier.name}</span>
                          {modifier.price > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {formatPrice(modifier.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notas especiales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas Especiales</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Instrucciones especiales para la preparación..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Cantidad */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cantidad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
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
              </CardContent>
            </Card>

            {/* Total y botones */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-xl font-bold">
                Total: {formatPrice(getTotalPrice())}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={handleAddToCart}>
                  Agregar al Carrito
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}