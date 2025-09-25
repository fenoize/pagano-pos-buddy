import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductVariantOption, ComboProduct } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Minus } from 'lucide-react';
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

interface ProductCustomizationModalEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: any) => void;
  product: Product;
  editingItem?: any;
  editingIndex?: number;
}

export function ProductCustomizationModalEnhanced({ 
  isOpen, 
  onClose, 
  onAddToCart, 
  product, 
  editingItem, 
  editingIndex 
}: ProductCustomizationModalEnhancedProps) {
  // Variant system state
  const [availableVariants, setAvailableVariants] = useState<ProductVariantOption[]>([]);
  const [selectedVariantOption, setSelectedVariantOption] = useState<ProductVariantOption | null>(null);
  
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

  useEffect(() => {
    if (isOpen && product.id) {
      fetchProductVariantsAndCustomizations();
      fetchComboConfiguration();
      
      if (editingItem) {
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
        
        // Set combo state
        if (editingItem.is_combo_item) {
          setUseCombo(true);
          setComboSelections(editingItem.combo_selections || []);
        }
      }
    }
  }, [isOpen, product.id, editingItem]);

  // Auto-enable combo if available
  useEffect(() => {
    if (hasCombo) {
      setUseCombo(true);
    }
  }, [hasCombo]);

  const fetchProductVariantsAndCustomizations = async () => {
    try {
      // Fetch product variants (new system)
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variant_options')
        .select(`
          *,
          variant:category_variants(*)
        `)
        .eq('product_id', product.id)
        .eq('active', true)
        .eq('is_enabled', true) // Only enabled variants
        .order('variant(display_order)');

      if (variantsError) throw variantsError;

      const variants = (variantsData || []) as ProductVariantOption[];
      setAvailableVariants(variants);

      // Set default variant
      if (variants.length > 0) {
        const defaultVariant = variants.find(v => v.is_default) || variants[0];
        setSelectedVariantOption(defaultVariant);
        
        // If editing and has variant_id, find and set it
        if (editingItem?.product_variant_option_id) {
          const editingVariant = variants.find(v => v.id === editingItem.product_variant_option_id);
          if (editingVariant) {
            setSelectedVariantOption(editingVariant);
          }
        }
      }

      await fetchExtrasAndModifiers();
    } catch (error) {
      console.error('Error fetching product variants:', error);
      toast({
        title: "Error",
        description: "Error al cargar las variantes del producto",
        variant: "destructive",
      });
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
    setSelectedExtras({});
    setSelectedModifiers([]);
    setSpecialNotes('');
    setQuantity(1);
    setUseCombo(false);
    setComboSelections([]);
    setComboTotal(0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getBasePrice = () => {
    if (useCombo) {
      return comboConfig?.pricing_mode === 'fixed' ? comboConfig.base_price : comboTotal;
    }
    
    return selectedVariantOption?.price || 0;
  };

  const getExtrasTotal = () => {
    return Object.entries(selectedExtras).reduce((total, [extraId, qty]) => {
      const extra = extras.find(e => e.id === extraId);
      return total + (extra ? extra.price * qty : 0);
    }, 0);
  };

  const getModifiersTotal = () => {
    // Modificaciones sin costo según las especificaciones
    return 0;
  };

  const getTotalPrice = () => {
    if (hasCombo) {
      // Para combos, los extras se manejan dentro del combo
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

  const isValidForCart = () => {
    // Si no es combo, debe tener variante seleccionada
    if (!useCombo && !selectedVariantOption) {
      return false;
    }
    
    // Si es combo Invok2, verificar selecciones requeridas
    if (useCombo && product.name?.toLowerCase().includes('invok2')) {
      // Verificar que se hayan seleccionado exactamente 2 bebidas
      const bebidaSelections = comboSelections.filter(sel => 
        sel.category_name?.toLowerCase().includes('bebida')
      );
      return bebidaSelections.length === 2;
    }
    
    return true;
  };

  const handleAddToCart = () => {
    if (!isValidForCart()) {
      if (!selectedVariantOption && !useCombo) {
        toast({
          title: "Variante requerida",
          description: "Debes seleccionar una variante para continuar",
          variant: "destructive",
        });
        return;
      }
      
      if (useCombo && product.name?.toLowerCase().includes('invok2')) {
        toast({
          title: "Selección incompleta",
          description: "Debes seleccionar exactamente 2 bebidas para el combo Invok2",
          variant: "destructive",
        });
        return;
      }
    }

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
        name: modifier?.name || '',
        price: 0 // Modificaciones sin costo
      };
    });

    const orderItem: any = {
      productId: product.id!,
      productName: product.name,
      basePrice: getBasePrice(),
      quantity,
      extras: selectedExtrasArray,
      modifiers: selectedModifiersArray,
      notes: specialNotes.trim() || undefined,
      // Combo data
      is_combo_item: useCombo,
      combo_selections: useCombo ? comboSelections : undefined,
      // Variant data (solo si no es combo)
      category_variant_id: useCombo ? undefined : selectedVariantOption?.category_variant_id,
      variant_name: useCombo ? undefined : selectedVariantOption?.variant?.name,
      product_variant_option_id: useCombo ? undefined : selectedVariantOption?.id,
    };

    if (editingItem && editingIndex !== undefined) {
      onAddToCart({ ...orderItem, editingIndex });
    } else {
      onAddToCart(orderItem);
    }
    
    resetForm();
    onClose();
  };

  const canAddToCart = isValidForCart();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Editar' : 'Personalizar'} {product.name}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Selecciona variante, extras y notas para el producto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Auto-select combo if available */}
          {hasCombo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipo de Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Badge variant="default" className="text-base px-4 py-2">
                    Combo
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Este producto está disponible como combo
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Combo Configuration o Variant Selection */}
          {hasCombo ? (
            <ComboSelector
              product={product}
              onComboItemsChange={setComboSelections}
              onComboTotalChange={setComboTotal}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  Variantes Disponibles
                  <Badge variant="destructive" className="ml-2">Obligatorio</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableVariants.length === 0 ? (
                  <div className="text-center py-4">
                    <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No hay variantes disponibles para este producto.
                      <br />
                      Contacta al administrador para configurar variantes.
                    </p>
                  </div>
                ) : (
                  <VariantSelector
                    variants={availableVariants}
                    selectedVariantId={selectedVariantOption?.id || undefined}
                    onVariantSelect={(variant) => {
                      setSelectedVariantOption(variant);
                    }}
                    disabled={false}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Extras - Solo mostrar para productos individuales */}
          {!hasCombo && extras.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Extras</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Los extras tienen costo adicional
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {extras.map((extra) => (
                    <div key={extra.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{extra.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(extra.price)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtraChange(extra.id, -1)}
                          disabled={(selectedExtras[extra.id] || 0) === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">
                          {selectedExtras[extra.id] || 0}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtraChange(extra.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modificaciones - Solo mostrar para productos individuales */}
          {!hasCombo && modifiers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Modificaciones</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Las modificaciones son gratuitas (ej: sin pepinillos, sin cebolla)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {modifiers.map((modifier) => (
                    <label
                      key={modifier.id}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModifiers.includes(modifier.id)}
                        onChange={() => toggleModifier(modifier.id)}
                        className="rounded"
                      />
                      <span>{modifier.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        Gratis
                      </Badge>
                    </label>
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
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Notas adicionales para la cocina..."
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
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold">{quantity}</span>
                <Button
                  variant="outline"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer with price and actions */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total:</span>
            <span className="text-2xl font-bold text-primary">
              {formatPrice(getTotalPrice())}
            </span>
          </div>
          
          {!canAddToCart && (
            <div className="flex items-center space-x-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {!selectedVariantOption && !useCombo 
                  ? "Selecciona una variante" 
                  : "Completa la configuración del combo"}
              </span>
            </div>
          )}

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleAddToCart} 
              className="flex-1"
              disabled={!canAddToCart}
            >
              {editingItem ? 'Actualizar' : 'Agregar al Carrito'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}