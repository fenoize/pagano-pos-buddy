import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductVariantOption, ComboProduct } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus } from 'lucide-react';
import VariantSelector from './VariantSelector';
import ComboSelector from './ComboSelector';
import { useToast } from '@/hooks/use-toast';

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
  editingItem?: any;
  editingIndex?: number;
  hideComboToggle?: boolean; // Ocultar selector Individual/Combo (para app de cliente)
  showVariantStock?: boolean;
}

export function ProductCustomizationModal({ isOpen, onClose, onAddToCart, product, editingItem, editingIndex, hideComboToggle = false, showVariantStock = false }: ProductCustomizationModalProps) {
  // New variant system state
  const [availableVariants, setAvailableVariants] = useState<ProductVariantOption[]>([]);
  const [selectedVariantOption, setSelectedVariantOption] = useState<ProductVariantOption | null>(null);
  const [useNewVariantSystem, setUseNewVariantSystem] = useState(false);
  
  // Legacy system state
  const [selectedVariant, setSelectedVariant] = useState<Variant>('simple');
  const [selectedPriceType, setSelectedPriceType] = useState<'combo' | 'only'>('combo');
  
  // Common state
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [extras, setExtras] = useState<ProductExtra[]>([]);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  
  // Combo system state
  const [hasCombo, setHasCombo] = useState(false);
  const [comboConfig, setComboConfig] = useState<ComboProduct | null>(null);
  const [comboSelections, setComboSelections] = useState<any[]>([]);
  const [comboTotal, setComboTotal] = useState(0);
  const [useCombo, setUseCombo] = useState(false);
  
  const { toast } = useToast();

  // Memoizar variantes disponibles para evitar recalcular en cada render
  const availableVariantsLegacy = useMemo(() => {
    const prices: any = product.prices || {};
    const priceType = prices[selectedPriceType] || {};
    
    const variantMappings = [
      { key: 'simple', variants: ['simple'] },
      { key: 'doble', variants: ['doble'] },
      { key: 'triple', variants: ['triple'] },
      { key: 'cuádruple', variants: ['cuádruple', 'cuadruple'] }
    ];
    
    return variantMappings
      .filter(({ variants }) => 
        variants.some(v => priceType[v] !== undefined && priceType[v] !== null)
      )
      .map(({ key }) => key);
  }, [product.prices, selectedPriceType]);

  useEffect(() => {
    if (isOpen && product.id) {
      fetchProductVariantsAndCustomizations();
      fetchComboConfiguration();
      // If editing, populate form with existing item data
      if (editingItem) {
        // Handle new system
        if (editingItem.category_variant_id) {
          // This is a new system item
          setUseNewVariantSystem(true);
          // We'll set the selected variant after fetching variants
        } else {
          // This is a legacy system item
          setUseNewVariantSystem(false);
          setSelectedVariant(editingItem.size as Variant);
          setSelectedPriceType(editingItem.priceKind);
        }
        
        setQuantity(editingItem.quantity);
        setSpecialNotes(editingItem.notes || '');
        
        // Set extras
        const extrasMap: Record<string, number> = {};
        editingItem.extras?.forEach((extra: any) => {
          extrasMap[extra.key] = extra.quantity || 1;
        });
        setSelectedExtras(extrasMap);
        
        // Set modifiers
        const modifierIds = editingItem.modifiers?.map((mod: any) => mod.id) || [];
        setSelectedModifiers(modifierIds);
      }
    }
  }, [isOpen, product.id, editingItem]);

  // Reset to valid variant when price type changes
  // Solo resetear si la variante actual NO está disponible en el nuevo tipo
  useEffect(() => {
    // No resetear durante inicialización de edición
    if (editingItem) return;
    
    if (!availableVariantsLegacy.includes(selectedVariant)) {
      console.log(`[Customization] Variant ${selectedVariant} not available in ${selectedPriceType}, resetting to ${availableVariantsLegacy[0]}`);
      setSelectedVariant((availableVariantsLegacy[0] || 'simple') as Variant);
    }
  }, [selectedPriceType, availableVariantsLegacy, selectedVariant, editingItem]);

  const fetchProductVariantsAndCustomizations = async () => {
    try {
      // Fetch product variants from new system
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variant_options')
        .select(`
          *,
          variant:category_variants(*)
        `)
        .eq('product_id', product.id)
        .eq('active', true)
        .order('variant(display_order)');

      if (variantsError) throw variantsError;

      const variants = (variantsData || []) as ProductVariantOption[];
      setAvailableVariants(variants);

      // Determine which system to use
      if (variants.length > 0) {
        setUseNewVariantSystem(true);
        // Set default variant
        const defaultVariant = variants.find(v => v.is_default) || variants[0];
        setSelectedVariantOption(defaultVariant);
        
        // If editing and has variant_id, find and set it
        if (editingItem?.category_variant_id) {
          const editingVariant = variants.find(v => v.category_variant_id === editingItem.category_variant_id);
          if (editingVariant) {
            setSelectedVariantOption(editingVariant);
          }
        }
      } else {
        setUseNewVariantSystem(false);
      }

      // Continue with existing customizations fetch
      await fetchExtrasAndModifiers();
    } catch (error) {
      console.error('Error fetching product variants:', error);
      toast({
        title: "Error",
        description: "Error al cargar las variantes del producto",
        variant: "destructive",
      });
      // Fallback to legacy system
      setUseNewVariantSystem(false);
      await fetchExtrasAndModifiers();
    }
  };

  const fetchComboConfiguration = async () => {
    try {
      const { data: comboData, error } = await supabase
        .from('combo_products')
        .select('*')
        .eq('product_id', product.id)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Error fetching combo config:', error);
        }
        return;
      }

      if (comboData) {
        setHasCombo(true);
        setComboConfig(comboData as ComboProduct);
        // Si estamos en app de cliente y hay combo, usarlo automáticamente
        if (hideComboToggle) {
          setUseCombo(true);
        }
      }
    } catch (error) {
      console.error('Error fetching combo configuration:', error);
    }
  };

  const fetchExtrasAndModifiers = async () => {
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
    return availableVariantsLegacy.length > 0 ? availableVariantsLegacy : ['simple'];
  };

  const getBasePrice = () => {
    // Use new variant system if available
    if (useNewVariantSystem && selectedVariantOption) {
      return selectedVariantOption.price;
    }
    
    // Legacy system
    const prices = product.prices as any;
    const priceType = prices[selectedPriceType] || {};
    
    // Try both spellings for cuádruple
    if (selectedVariant === 'cuádruple') {
      return priceType['cuádruple'] || priceType['cuadruple'] || 0;
    }
    
    return priceType[selectedVariant] || 0;
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
    if (useCombo) {
      return comboTotal * quantity;
    }
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

    const orderItem: any = {
      productId: product.id!,
      productName: product.name,
      basePrice: useCombo ? comboTotal : getBasePrice(),
      quantity,
      extras: selectedExtrasArray,
      modifiers: selectedModifiersArray,
      notes: specialNotes.trim() || undefined,
      // Combo data
      is_combo_item: useCombo,
      combo_selections: useCombo ? comboSelections : undefined,
    };

    // Add variant data based on system used (only if not using combo)
    if (!useCombo) {
      if (useNewVariantSystem && selectedVariantOption) {
        orderItem.category_variant_id = selectedVariantOption.category_variant_id;
        orderItem.variant_name = selectedVariantOption.variant?.name;
        orderItem.product_variant_option_id = selectedVariantOption.id;
      } else {
        // Legacy system
        orderItem.size = selectedVariant;
        orderItem.priceKind = selectedPriceType;
      }
    }

    if (editingItem && editingIndex !== undefined) {
      // Include the editing index for updating
      onAddToCart({ ...orderItem, editingIndex });
    } else {
      onAddToCart(orderItem);
    }
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Editar' : 'Personalizar'} {product.name}
          </DialogTitle>
          <DialogDescription className="sr-only">Selecciona tamaño, extras y notas para el producto.</DialogDescription>
        </DialogHeader>

        {/* Scrollable customization area */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Combo Selection - Solo visible en POS, no en app de cliente */}
          {hasCombo && !hideComboToggle && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipo de Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={!useCombo ? 'default' : 'outline'}
                    onClick={() => setUseCombo(false)}
                  >
                    Individual
                  </Button>
                  <Button
                    variant={useCombo ? 'default' : 'outline'}
                    onClick={() => setUseCombo(true)}
                  >
                    Combo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Combo Configuration */}
          {hasCombo && useCombo ? (
            <ComboSelector
              product={product}
              onComboItemsChange={setComboSelections}
              onComboTotalChange={setComboTotal}
            />
          ) : (
            <>
              {/* Variant Selection - New or Legacy System */}
              {useNewVariantSystem && availableVariants.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Variantes Disponibles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VariantSelector
                      variants={availableVariants}
                      selectedVariantId={selectedVariantOption?.id || undefined}
                      onVariantSelect={(variant) => {
                        setSelectedVariantOption(variant);
                      }}
                      disabled={false}
                      hideOutOfStockBadge={hideComboToggle}
                      showStockCount={showVariantStock}
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Legacy System - Tipo de precio */}
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

                  {/* Legacy System - Variantes */}
                  {getVariants().length > 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Tamaño</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {getVariants().map((variant) => {
                            const prices = product.prices as any;
                            const priceType = prices[selectedPriceType] || {};
                            let variantPrice = 0;
                            
                            // Handle cuádruple spelling variations
                            if (variant === 'cuádruple') {
                              variantPrice = priceType['cuádruple'] || priceType['cuadruple'] || 0;
                            } else {
                              variantPrice = priceType[variant] || 0;
                            }
                            
                            return (
                              <Button
                                key={variant}
                                variant={selectedVariant === variant ? 'default' : 'outline'}
                                onClick={() => setSelectedVariant(variant as Variant)}
                                className="capitalize h-auto flex flex-col py-3 px-4"
                              >
                                <span className="font-medium">{variant}</span>
                                <span className="text-xs mt-1 opacity-80">
                                  {formatPrice(variantPrice)}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* Extras - Only show if not using combo or combo allows extras */}
          {(!useCombo || (comboConfig && comboConfig.included_variants)) && extras.length > 0 && (
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

          {/* Modificadores - Only show if not using combo */}
          {!useCombo && modifiers.length > 0 && (
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
        </div>

        {/* Fixed bottom action bar */}
        <div className="border-t bg-background pt-4 space-y-4">
          {/* Cantidad */}
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Cantidad</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center"
                min="1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Total y botones */}
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold">
              Total: {formatPrice(getTotalPrice())}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleAddToCart}>
                {editingItem ? 'Actualizar Item' : 'Agregar al Carrito'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}