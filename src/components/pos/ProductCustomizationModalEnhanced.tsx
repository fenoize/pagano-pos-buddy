import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductVariantOption, ComboProduct } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Badge, Label used in variant/extras sections
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Minus, ChevronRight } from 'lucide-react';
import VariantSelector from './VariantSelector';
import ComboSelector from './ComboSelector';
import { ExtrasModal } from './ExtrasModal';
import { toast } from "sonner";
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
  // Preloaded data
  preloadedVariants?: ProductVariantOption[];
  preloadedExtras?: ProductExtra[];
  preloadedModifiers?: ProductModifier[];
  preloadedComboData?: any;
  showVariantStock?: boolean;
  preselectedVariantId?: string;
}

export function ProductCustomizationModalEnhanced({
  isOpen,
  onClose,
  onAddToCart,
  product,
  editingItem,
  editingIndex,
  preloadedVariants = [],
  preloadedExtras = [],
  preloadedModifiers = [],
  preloadedComboData = null,
  showVariantStock = false,
  preselectedVariantId
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

  // Track initialization to prevent variant reset
  const isInitialized = useRef(false);
  const lastProductId = useRef<string | null>(null);

  // Debug: Log when comboTotal updates
  useEffect(() => {
    console.log('[ProductCustomization] comboTotal updated:', comboTotal);
  }, [comboTotal]);

  // Extras modal state
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  // Reset initialization when modal closes or product changes
  useEffect(() => {
    if (!isOpen) {
      isInitialized.current = false;
      lastProductId.current = null;
    } else if (product.id !== lastProductId.current) {
      isInitialized.current = false;
      lastProductId.current = product.id || null;
    }
  }, [isOpen, product.id]);

  // Consolidated initialization effect with preloaded data
  useEffect(() => {
    if (!isOpen || !product.id) return;

    // Always update available variants
    setAvailableVariants(preloadedVariants);

    // Only set default variant on first initialization (not on every render)
    if (!isInitialized.current) {
      isInitialized.current = true;

      // Set default variant
      if (preloadedVariants.length > 0) {
        // If editing and has variant_id, use that
        if (editingItem?.product_variant_option_id) {
          const editingVariant = preloadedVariants.find((v) => v.id === editingItem.product_variant_option_id);
          if (editingVariant) {
            setSelectedVariantOption(editingVariant);
          } else {
            const defaultVariant = preloadedVariants.find((v) => v.is_default) || preloadedVariants[0];
            setSelectedVariantOption(defaultVariant);
          }
        } else if (preselectedVariantId) {
          // If a variant was matched from search, pre-select it
          const matchedVariant = preloadedVariants.find((v) => v.id === preselectedVariantId);
          setSelectedVariantOption(matchedVariant || preloadedVariants.find((v) => v.is_default) || preloadedVariants[0]);
        } else {
          const defaultVariant = preloadedVariants.find((v) => v.is_default) || preloadedVariants[0];
          setSelectedVariantOption(defaultVariant);
        }
      }

      // Use preloaded extras and modifiers
      setExtras(preloadedExtras);
      setModifiers(preloadedModifiers);

      // Use preloaded combo data if available
      if (preloadedComboData) {
        setHasCombo(true);
        setComboConfig(preloadedComboData.config);
      } else {
        // Fallback: load combo config if not preloaded
        loadComboConfig();
      }

      // Initialize form if editing
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
          // Set the combo total from editing item
          setComboTotal(editingItem.basePrice || 0);
        }
      }
    }
  }, [isOpen, product.id, editingItem, preloadedVariants, preloadedExtras, preloadedModifiers, preloadedComboData]);

  // Auto-enable combo if available
  useEffect(() => {
    if (hasCombo) {
      setUseCombo(true);
    }
  }, [hasCombo]);

  const loadComboConfig = async () => {
    try {
      const { data: comboData, error } = await supabase.
      from('combo_products').
      select('*').
      eq('product_id', product.id).
      eq('active', true).
      maybeSingle();

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
      const extra = extras.find((e) => e.id === extraId);
      return total + (extra ? extra.price * qty : 0);
    }, 0);
  };

  const getModifiersTotal = () => {
    // Modificaciones sin costo según las especificaciones
    return 0;
  };

  const getTotalPrice = () => {
    if (hasCombo) {
      console.log('[ProductCustomization] Combo total:', comboTotal, 'quantity:', quantity);
      // Para combos, los extras se manejan dentro del combo
      return comboTotal * quantity;
    }
    const total = (getBasePrice() + getExtrasTotal() + getModifiersTotal()) * quantity;
    console.log('[ProductCustomization] Regular total:', total);
    return total;
  };

  const handleExtraChange = (extraId: string, change: number) => {
    setSelectedExtras((prev) => {
      const newQty = Math.max(0, (prev[extraId] || 0) + change);
      if (newQty === 0) {
        const { [extraId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [extraId]: newQty };
    });
  };

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers((prev) =>
    prev.includes(modifierId) ?
    prev.filter((id) => id !== modifierId) :
    [...prev, modifierId]
    );
  };

  const isValidForCart = () => {
    // Si no es combo, debe tener variante seleccionada
    if (!useCombo && !selectedVariantOption) {
      return false;
    }

    // Si es combo, verificar que todas las selecciones tengan producto
    if (useCombo) {
      // Si no hay selecciones aún, no es válido
      if (comboSelections.length === 0) {
        return false;
      }

      // Validar que todas las selecciones tengan al menos producto seleccionado
      // La variante puede ser undefined si el producto no tiene variantes configuradas
      return comboSelections.every((sel) => sel.selectedProduct || sel.comboSlot?.is_optional);
    }

    return true;
  };

  const handleAddToCart = () => {
    if (!isValidForCart()) {
      if (!selectedVariantOption && !useCombo) {
        toast.error("Variante requerida", { description: "Debes seleccionar una variante para continuar" });
        return;
      }

      if (useCombo) {
        toast.error("Selección incompleta", { description: "Debes completar todas las selecciones del combo" });
        return;
      }
    }

    const selectedExtrasArray = Object.entries(selectedExtras).map(([extraId, qty]) => {
      const extra = extras.find((e) => e.id === extraId);
      return {
        key: extraId,
        label: extra?.name || '',
        price: extra?.price || 0,
        quantity: qty
      };
    });

    const selectedModifiersArray = selectedModifiers.map((modifierId) => {
      const modifier = modifiers.find((m) => m.id === modifierId);
      return {
        id: modifierId,
        name: modifier?.name || '',
        price: 0 // Modificaciones sin costo
      };
    });

    // Transform combo selections to include extra names
    const enrichedComboSelections = useCombo ? comboSelections.filter((sel: any) => sel.selectedProduct).map((selection: any) => {
      // Transform extras from Record<string, number> to array with names
      const enrichedExtras: any[] = [];
      if (selection.extras && typeof selection.extras === 'object') {
        Object.entries(selection.extras).forEach(([extraId, qty]) => {
          const qtyNum = qty as number;
          // Find extra in preloaded data
          const categoryExtras = preloadedComboData?.productExtras?.[selection.comboSlot.category_id] || [];
          const extra = categoryExtras.find((e: any) => e.id === extraId);
          if (extra && qtyNum > 0) {
            enrichedExtras.push({
              key: extraId,
              label: extra.name,
              name: extra.name,
              price: extra.price,
              quantity: qtyNum
            });
          }
        });
      }

      // Transform modifiers to include names
      const enrichedModifiers: any[] = [];
      if (selection.modifiers && Array.isArray(selection.modifiers)) {
        const categoryModifiers = preloadedComboData?.productModifiers?.[selection.selectedProduct?.id] || [];
        selection.modifiers.forEach((modifierId: string) => {
          const modifier = categoryModifiers.find((m: any) => m.id === modifierId);
          if (modifier) {
            enrichedModifiers.push({
              id: modifierId,
              name: modifier.name,
              price: 0
            });
          }
        });
      }

      // Enrich comboSlot with category info
      const enrichedComboSlot = {
        ...selection.comboSlot,
        category: preloadedComboData?.categories?.find((c: any) => c.id === selection.comboSlot.category_id)
      };

      // Modelo ortogonal: las selecciones de grupo (proteína) se manejan aparte de la variante (tamaño).
      // Si en el futuro se necesita persistirlas en combos, se leerán desde slotGroupSelections.
      const variantGroupSelections: any[] = [];

      return {
        ...selection,
        comboSlot: enrichedComboSlot,
        extras: enrichedExtras,
        modifiers: enrichedModifiers,
        variant_group_selections: variantGroupSelections.length > 0 ? variantGroupSelections : undefined,
        // Preserve selectedVariants for multi-select slots
        selectedVariants: selection.selectedVariants,
      };
    }) : undefined;

    const orderItem: any = {
      productId: product.id!,
      productName: product.name,
      basePrice: useCombo ? comboTotal : getBasePrice(),
      quantity,
      extras: useCombo ? [] : selectedExtrasArray,
      modifiers: selectedModifiersArray,
      notes: specialNotes.trim() || undefined,
      // Combo data
      is_combo_item: useCombo,
      combo_selections: enrichedComboSelections,
      // Variant data
      category_variant_id: useCombo ? undefined : selectedVariantOption?.category_variant_id,
      variant_name: useCombo ? 'Combo' : selectedVariantOption?.variant?.name,
      product_variant_option_id: useCombo ? undefined : selectedVariantOption?.id
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

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Combo Configuration o Variant Selection */}
          {hasCombo ?
          <ComboSelector
            product={product}
            onComboItemsChange={setComboSelections}
            onComboTotalChange={setComboTotal}
            preloadedComboData={preloadedComboData}
            initialSelections={editingItem?.combo_selections}
            showVariantStock={showVariantStock} /> :


          <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center">
                  Variantes Disponibles
                  <Badge variant="destructive" className="ml-2 text-[10px]">Obligatorio</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableVariants.length === 0 ?
              <div className="text-center py-4">
                    <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No hay variantes disponibles para este producto.
                      <br />
                      Contacta al administrador para configurar variantes.
                    </p>
                  </div> :

              <VariantSelector
                variants={availableVariants}
                selectedVariantId={selectedVariantOption?.id || undefined}
                onVariantSelect={(variant) => {
                  setSelectedVariantOption(variant);
                }}
                disabled={false}
                showStockCount={showVariantStock} />

              }
              </CardContent>
            </Card>
          }

          {/* Extras - Solo mostrar para productos individuales */}
          {!hasCombo && extras.length > 0 &&
          <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">Extras</label>
                </div>
                <Button
                variant="outline"
                className="w-full justify-between h-auto py-2.5"
                onClick={() => setShowExtrasModal(true)}>

                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Agregar Extras</span>
                    {Object.keys(selectedExtras).length > 0 &&
                  <Badge variant="secondary">
                        {Object.keys(selectedExtras).length}
                      </Badge>
                  }
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatPrice(getExtrasTotal())}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Button>

                {/* Resumen de extras seleccionados */}
                {Object.keys(selectedExtras).length > 0 &&
              <div className="space-y-0.5">
                    {Object.entries(selectedExtras).map(([extraId, qty]) => {
                  const extra = extras.find((e) => e.id === extraId);
                  if (!extra) return null;
                  return (
                    <div key={extraId} className="flex justify-between text-xs px-1">
                          <span className="text-muted-foreground">
                            {extra.name} × {qty}
                          </span>
                          <span className="font-medium">
                            {formatPrice(extra.price * qty)}
                          </span>
                        </div>);

                })}
                  </div>
              }
              </div>

              {/* Modal secundario de extras */}
              <ExtrasModal
              isOpen={showExtrasModal}
              onClose={() => setShowExtrasModal(false)}
              extras={extras}
              selectedExtras={selectedExtras}
              onExtrasChange={setSelectedExtras} />

            </>
          }

          {/* Modificaciones - Solo mostrar para productos individuales */}
          {!hasCombo && modifiers.length > 0 &&
          <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Modificaciones <span className="text-xs font-normal">(gratis)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {modifiers.map((modifier) => {
                const isSelected = selectedModifiers.includes(modifier.id);
                return (
                  <button
                    key={modifier.id}
                    type="button"
                    onClick={() => toggleModifier(modifier.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    isSelected ?
                    'bg-primary/10 border-primary text-primary' :
                    'bg-muted/50 border-border text-muted-foreground hover:bg-muted'}`
                    }>

                      {isSelected ? '✓ ' : ''}{modifier.name}
                    </button>);

              })}
              </div>
            </div>
          }

          {/* Notas especiales - compact */}
          <div className="space-y-1.5">
            <label className="font-medium text-muted-foreground text-base">Notas especiales</label>
            <Textarea
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="Notas adicionales para la cocina..."
              rows={2}
              className="text-sm resize-none" />

          </div>

        </div>

        {/* Footer with price and actions */}
        <div className="border-t pt-4 space-y-4">
          {/* Fila con Total y Cantidad */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            {/* Total a la izquierda */}
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(getTotalPrice())}
              </span>
            </div>
            
            {/* Controles de cantidad a la derecha */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">Cantidad:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-9 w-9 p-0">

                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-bold w-8 text-center">{quantity}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuantity(quantity + 1)}
                className="h-9 w-9 p-0">

                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!canAddToCart &&
          <div className="flex items-center space-x-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>
                {!selectedVariantOption && !useCombo ?
              "Selecciona una variante" :
              "Completa la configuración del combo"}
              </span>
            </div>
          }

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleAddToCart}
              className="flex-1"
              disabled={!canAddToCart}>

              {editingItem ? 'Actualizar' : 'Agregar al Carrito'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}