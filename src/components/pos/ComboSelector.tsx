import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, ComboProduct, ComboItem, Category, ProductVariantOption } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import VariantSelector from './VariantSelector';
import { ExtrasModal } from './ExtrasModal';

interface VariantGroupWithOptions {
  group_id: string;
  group_name: string;
  options: Array<{ id: string; name: string; is_default: boolean; image_url?: string | null }>;
}

interface ComboSelectorProps {
  product: Product;
  onComboItemsChange: (items: ComboItemSelection[]) => void;
  onComboTotalChange: (total: number) => void;
  preloadedComboData?: any;
  initialSelections?: ComboItemSelection[];
  showVariantStock?: boolean;
}

interface ComboItemSelection {
  comboSlot: ComboItem;
  selectedProduct?: Product;
  selectedVariant?: ProductVariantOption;
  quantity: number;
  extras?: Record<string, number>; // extra_id -> quantity
  modifiers?: string[]; // modifier_ids
}

const ComboSelector: React.FC<ComboSelectorProps> = ({
  product,
  onComboItemsChange,
  onComboTotalChange,
  preloadedComboData = null,
  initialSelections = [],
  showVariantStock = false
}) => {
  const [comboConfig, setComboConfig] = useState<ComboProduct | null>(null);
  const [comboSlots, setComboSlots] = useState<ComboItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slotProducts, setSlotProducts] = useState<Record<string, Product[]>>({});
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariantOption[]>>({});
  const [productExtras, setProductExtras] = useState<Record<string, any[]>>({});
  const [productModifiers, setProductModifiers] = useState<Record<string, any[]>>({});
  const [selections, setSelections] = useState<ComboItemSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [extrasModalSlotIndex, setExtrasModalSlotIndex] = useState<number | null>(null);
  // Variant groups per product: productId -> VariantGroupWithOptions[]
  const [productVariantGroups, setProductVariantGroups] = useState<Record<string, VariantGroupWithOptions[]>>({});
  // Selected group options per slot: slotIndex -> { groupId: optionId }
  const [slotGroupSelections, setSlotGroupSelections] = useState<Record<number, Record<string, string>>>({});
  const { toast } = useToast();

  // Track initialization to prevent re-fetching
  const isInitialized = useRef(false);
  const lastProductId = useRef<string | null>(null);

  useEffect(() => {
    // Reset if product changes
    if (product.id !== lastProductId.current) {
      isInitialized.current = false;
      lastProductId.current = product.id || null;
    }

    if (product.id && !isInitialized.current) {
      isInitialized.current = true;
      fetchComboData();
    }
  }, [product.id]);

  // Separate effect to handle when initialSelections change (for editing mode)
  useEffect(() => {
    if (initialSelections && initialSelections.length > 0 && selections.length > 0 && comboConfig) {
      console.log('[ComboSelector] Detected initialSelections change, updating selections');

      // Transform enriched format back to internal format
      const transformedSelections = initialSelections.map((selection: any) => {
        // Convert extras from array back to Record<string, number>
        let transformedExtras: Record<string, number> = {};
        if (Array.isArray(selection.extras)) {
          selection.extras.forEach((extra: any) => {
            const extraId = extra.key || extra.id;
            const quantity = extra.quantity || 1;
            if (extraId) {
              transformedExtras[extraId] = quantity;
            }
          });
        } else if (selection.extras && typeof selection.extras === 'object') {
          transformedExtras = selection.extras;
        }

        // Convert modifiers from array of objects back to array of IDs
        let transformedModifiers: string[] = [];
        if (Array.isArray(selection.modifiers)) {
          transformedModifiers = selection.modifiers.map((mod: any) =>
          typeof mod === 'string' ? mod : mod.id || mod.key
          ).filter(Boolean);
        }

        return {
          ...selection,
          extras: transformedExtras,
          modifiers: transformedModifiers
        };
      });

      setSelections(transformedSelections);
      const total = calculateComboTotalFromSelections(transformedSelections, comboConfig, productExtras, productVariants);
      onComboTotalChange(total);
      onComboItemsChange(transformedSelections);
    }
  }, [initialSelections?.length]);

  // Remove auto-notification effect - let parent handle when to update

  const fetchComboData = async () => {
    try {
      setLoading(true);

      // Use preloaded data if available
      if (preloadedComboData) {
        console.log('[ComboSelector] Using preloaded combo data');

        setComboConfig(preloadedComboData.config);
        setComboSlots(preloadedComboData.slots);
        setCategories(preloadedComboData.categories);
        setSlotProducts(preloadedComboData.slotProducts);
        setProductVariants(preloadedComboData.productVariants);
        setProductExtras(preloadedComboData.productExtras);
        setProductModifiers(preloadedComboData.productModifiers);

        // Initialize selections - use initialSelections prop if provided (editing mode)
        let computedSelections: ComboItemSelection[];

        if (initialSelections && initialSelections.length > 0) {
          console.log('[ComboSelector] Using provided initialSelections (editing mode) on initial load');

          // Transform enriched format back to internal format
          computedSelections = initialSelections.map((selection: any) => {
            let transformedExtras: Record<string, number> = {};
            if (Array.isArray(selection.extras)) {
              selection.extras.forEach((extra: any) => {
                const extraId = extra.key || extra.id;
                const quantity = extra.quantity || 1;
                if (extraId) {
                  transformedExtras[extraId] = quantity;
                }
              });
            } else if (selection.extras && typeof selection.extras === 'object') {
              transformedExtras = selection.extras;
            }

            let transformedModifiers: string[] = [];
            if (Array.isArray(selection.modifiers)) {
              transformedModifiers = selection.modifiers.map((mod: any) =>
              typeof mod === 'string' ? mod : mod.id || mod.key
              ).filter(Boolean);
            }

            return {
              ...selection,
              extras: transformedExtras,
              modifiers: transformedModifiers
            };
          });
        } else {
          console.log('[ComboSelector] Creating default selections');
          computedSelections = (preloadedComboData.slots || []).map((slot: ComboItem) => {
            const categoryProducts = preloadedComboData.slotProducts[slot.category_id] || [];
            const defaultProduct = slot.default_product_id ?
            categoryProducts.find((p: Product) => p.id === slot.default_product_id) :
            categoryProducts[0];

            const allVariants = defaultProduct ? preloadedComboData.productVariants[defaultProduct.id!] || [] : [];
            // Filter variants to only those belonging to the slot's category
            const productVariants = allVariants.filter((v: ProductVariantOption) => v.variant?.category_id === slot.category_id);
            const defaultVariant = slot.default_variant_id ?
            productVariants.find((v: ProductVariantOption) => v.category_variant_id === slot.default_variant_id) :
            productVariants.find((v: ProductVariantOption) => v.is_default) || productVariants[0];

            console.log('[ComboSelector] Default selection for slot:', {
              slotId: slot.id,
              product: defaultProduct?.name,
              variant: defaultVariant?.name || defaultVariant
            });

            return {
              comboSlot: slot,
              selectedProduct: defaultProduct,
              selectedVariant: defaultVariant,
              quantity: slot.quantity,
              extras: {},
              modifiers: []
            };
          });
        }

        setSelections(computedSelections);

        // Notify parent immediately with computed selections
        const total = calculateComboTotalFromSelections(computedSelections, preloadedComboData.config, preloadedComboData.productExtras, preloadedComboData.productVariants);
        onComboTotalChange(total);
        onComboItemsChange(computedSelections);

        setLoading(false);
        return;
      }

      // Fallback: fetch data if not preloaded
      console.log('[ComboSelector] Fetching combo data (no preload available)');

      // Fetch combo configuration
      const { data: comboData, error: comboError } = await supabase.
      from('combo_products').
      select('*').
      eq('product_id', product.id).
      eq('active', true).
      single();

      if (comboError) {
        if (comboError.code !== 'PGRST116') {
          throw comboError;
        }
        // No combo configuration found
        setLoading(false);
        return;
      }

      setComboConfig(comboData as ComboProduct);

      // Fetch combo slots
      const { data: slotsData, error: slotsError } = await supabase.
      from('combo_items').
      select('*').
      eq('combo_product_id', comboData.id).
      order('display_order');

      if (slotsError) throw slotsError;

      setComboSlots(slotsData || []);

      // Fetch categories
      const categoryIds = [...new Set(slotsData?.map((slot) => slot.category_id) || [])];
      const { data: categoriesData, error: categoriesError } = await supabase.
      from('categories').
      select('*').
      in('id', categoryIds);

      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);

      // Fetch products for each category
      const { data: productsData, error: productsError } = await supabase.
      from('products').
      select(`
          *,
          product_categories!inner(category_id)
        `).
      in('product_categories.category_id', categoryIds).
      eq('active', true);

      if (productsError) throw productsError;

      // Group products by category
      const groupedProducts: Record<string, Product[]> = {};
      productsData?.forEach((dbProduct: any) => {
        const productWithPrices = {
          ...dbProduct,
          prices: dbProduct.prices as any
        } as Product;

        dbProduct.product_categories?.forEach((pc: any) => {
          const categoryId = pc.category_id;
          if (!groupedProducts[categoryId]) {
            groupedProducts[categoryId] = [];
          }
          groupedProducts[categoryId].push(productWithPrices);
        });
      });

      setSlotProducts(groupedProducts);

      // Fetch product variants and stock balances
      const productIds = productsData?.map((p) => p.id) || [];
      const [variantsRes, stockBalancesRes] = await Promise.all([
      supabase.
      from('product_variant_options').
      select(`
            *,
            variant:category_variants(*)
          `).
      in('product_id', productIds).
      eq('active', true).
      order('variant(display_order)'),
      supabase.
      from('stock_balances').
      select('raw_material_id, qty_on_hand')]
      );

      if (variantsRes.error) throw variantsRes.error;

      // Create a map of raw_material_id -> total stock
      const stockByMaterial: Record<string, number> = {};
      stockBalancesRes.data?.forEach((balance: any) => {
        const materialId = balance.raw_material_id;
        stockByMaterial[materialId] = (stockByMaterial[materialId] || 0) + (balance.qty_on_hand || 0);
      });

      // Group variants by product with calculated stock
      const groupedVariants: Record<string, ProductVariantOption[]> = {};
      variantsRes.data?.forEach((variant) => {
        if (!groupedVariants[variant.product_id]) {
          groupedVariants[variant.product_id] = [];
        }
        // Calculate real stock:
        // - If variant has raw_material_id, use material stock from stock_balances
        // - If no raw_material_id, set stock as undefined (no inventory control = unlimited)
        let realStock: number | undefined = undefined;
        if (variant.raw_material_id) {
          realStock = stockByMaterial[variant.raw_material_id] ?? 0;
        }
        groupedVariants[variant.product_id].push({
          ...variant,
          stock: realStock
        });
      });

      setProductVariants(groupedVariants);

      // Fetch extras and modifiers for each category
      const { data: extrasData, error: extrasError } = await supabase.
      from('product_extras').
      select('*').
      in('category_id', categoryIds).
      eq('active', true);

      if (extrasError) throw extrasError;

      const { data: modifiersData, error: modifiersError } = await supabase.
      from('product_modifiers').
      select('*').
      in('product_id', productIds).
      eq('active', true);

      if (modifiersError) throw modifiersError;

      // Group extras by category
      const groupedExtras: Record<string, any[]> = {};
      extrasData?.forEach((extra) => {
        if (!groupedExtras[extra.category_id]) {
          groupedExtras[extra.category_id] = [];
        }
        groupedExtras[extra.category_id].push(extra);
      });

      setProductExtras(groupedExtras);

      // Group modifiers by product
      const groupedModifiers: Record<string, any[]> = {};
      modifiersData?.forEach((modifier) => {
        if (!groupedModifiers[modifier.product_id]) {
          groupedModifiers[modifier.product_id] = [];
        }
        groupedModifiers[modifier.product_id].push(modifier);
      });

      setProductModifiers(groupedModifiers);

      // Initialize selections with defaults
      const defaultSelections: ComboItemSelection[] = (slotsData || []).map((slot) => {
        const categoryProducts = groupedProducts[slot.category_id] || [];
        const defaultProduct = slot.default_product_id ?
        categoryProducts.find((p) => p.id === slot.default_product_id) :
        categoryProducts[0];

        const allVariants = defaultProduct ? groupedVariants[defaultProduct.id!] || [] : [];
        // Filter variants to only those belonging to the slot's category
        const productVariants = allVariants.filter((v) => v.variant?.category_id === slot.category_id);
        const defaultVariant = slot.default_variant_id ?
        productVariants.find((v) => v.category_variant_id === slot.default_variant_id) :
        productVariants.find((v) => v.is_default) || productVariants[0];

        return {
          comboSlot: slot,
          selectedProduct: defaultProduct,
          selectedVariant: defaultVariant,
          quantity: slot.quantity,
          extras: {},
          modifiers: []
        };
      });

      setSelections(defaultSelections);

    } catch (error) {
      console.error('Error fetching combo data:', error);
      toast({
        title: "Error",
        description: "Error al cargar la configuración del combo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Recalcular total automáticamente cuando cambian las selecciones o extras
  useEffect(() => {
    if (selections.length > 0 && comboConfig) {
      const total = calculateComboTotal();
      console.log('[ComboSelector] Total recalculated:', total, 'selections:', selections);
      onComboTotalChange(total);
    }
  }, [selections, productExtras, comboConfig]);

  const updateSelection = (slotIndex: number, updates: Partial<ComboItemSelection>) => {
    const newSelections = selections.map((selection, index) =>
    index === slotIndex ?
    { ...selection, ...updates } :
    selection
    );
    setSelections(newSelections);

    // Notify parent of changes
    const total = calculateComboTotal();
    onComboTotalChange(total);
    onComboItemsChange(newSelections);
  };

  const selectProduct = (slotIndex: number, productId: string) => {
    const selection = selections[slotIndex];
    const categoryProducts = slotProducts[selection.comboSlot.category_id] || [];
    const product = categoryProducts.find((p) => p.id === productId);

    if (product) {
      const allVariants = productVariants[productId] || [];
      // Filter variants to only those belonging to the slot's category
      const variants = allVariants.filter((v) => v.variant?.category_id === selection.comboSlot.category_id);
      const defaultVariant = variants.find((v) => v.is_default) || variants[0];

      updateSelection(slotIndex, {
        selectedProduct: product,
        selectedVariant: defaultVariant
      });
    }
  };

  const selectVariant = (slotIndex: number, variant: ProductVariantOption) => {
    updateSelection(slotIndex, { selectedVariant: variant });
  };

  const calculateComboTotalFromSelections = (
  selections: ComboItemSelection[],
  config: ComboProduct,
  extrasData: Record<string, any[]>,
  variantsData: Record<string, ProductVariantOption[]>)
  : number => {
    if (!config) return 0;

    let total = 0;

    if (config.pricing_mode === 'fixed') {
      total = config.base_price;

      // Only charge for variant changes if included_variants is false
      if (!config.included_variants) {
        selections.forEach((selection) => {
          if (selection.selectedVariant) {
            const slot = selection.comboSlot;
            const allVariants = selection.selectedProduct ? variantsData[selection.selectedProduct.id!] || [] : [];
            const availableVariants = allVariants.filter((v) => v.variant?.category_id === slot.category_id);
            const defaultVariant = slot.default_variant_id ?
            availableVariants.find((v) => v.category_variant_id === slot.default_variant_id) :
            availableVariants.find((v) => v.is_default);

            if (defaultVariant && selection.selectedVariant.id !== defaultVariant.id) {
              total += selection.selectedVariant.price * selection.quantity;
            }
          }
        });
      }
    } else {
      total = config.base_price;

      selections.forEach((selection) => {
        if (selection.selectedVariant) {
          const discountedPrice = selection.selectedVariant.price * (1 - (config.combo_discount || 0) / 100);
          total += discountedPrice * selection.quantity;
        } else if (selection.selectedProduct) {
          const basePrice = getProductBasePrice(selection.selectedProduct);
          const discountedPrice = basePrice * (1 - (config.combo_discount || 0) / 100);
          total += discountedPrice * selection.quantity;
        }
      });
    }

    selections.forEach((selection) => {
      if (selection.extras) {
        Object.entries(selection.extras).forEach(([extraId, qty]) => {
          const categoryExtras = extrasData[selection.comboSlot.category_id] || [];
          const extra = categoryExtras.find((e) => e.id === extraId);
          if (extra) {
            total += extra.price * qty * selection.quantity;
          }
        });
      }
    });

    return Math.max(0, total);
  };

  const calculateComboTotal = (): number => {
    if (!comboConfig) return 0;

    let total = 0;

    if (comboConfig.pricing_mode === 'fixed') {
      total = comboConfig.base_price;

      // Only charge for variant changes if included_variants is false
      if (!comboConfig.included_variants) {
        selections.forEach((selection) => {
          if (selection.selectedVariant) {
            const slot = selection.comboSlot;
            const allVariants = selection.selectedProduct ? productVariants[selection.selectedProduct.id!] || [] : [];
            const availableVariants = allVariants.filter((v) => v.variant?.category_id === slot.category_id);
            const defaultVariant = slot.default_variant_id ?
            availableVariants.find((v) => v.category_variant_id === slot.default_variant_id) :
            availableVariants.find((v) => v.is_default);

            if (defaultVariant && selection.selectedVariant.id !== defaultVariant.id) {
              total += selection.selectedVariant.price * selection.quantity;
            }
          }
        });
      }
    } else {
      // Individual pricing mode
      total = comboConfig.base_price;

      selections.forEach((selection) => {
        if (selection.selectedVariant) {
          const discountedPrice = selection.selectedVariant.price * (1 - (comboConfig.combo_discount || 0) / 100);
          total += discountedPrice * selection.quantity;
        } else if (selection.selectedProduct) {
          // Fallback to legacy pricing if no variants
          const basePrice = getProductBasePrice(selection.selectedProduct);
          const discountedPrice = basePrice * (1 - (comboConfig.combo_discount || 0) / 100);
          total += discountedPrice * selection.quantity;
        }
      });
    }

    // Add extras from all selections
    selections.forEach((selection) => {
      if (selection.extras) {
        Object.entries(selection.extras).forEach(([extraId, qty]) => {
          const categoryExtras = productExtras[selection.comboSlot.category_id] || [];
          const extra = categoryExtras.find((e) => e.id === extraId);

          console.log('[ComboSelector] Processing extra:', {
            extraId,
            qty,
            categoryId: selection.comboSlot.category_id,
            availableExtras: categoryExtras.length,
            found: !!extra,
            extraPrice: extra?.price
          });

          if (extra) {
            total += extra.price * qty * selection.quantity;
          }
        });
      }
    });

    console.log('[ComboSelector] Final combo total:', total);
    return Math.max(0, total);
  };

  const getProductBasePrice = (product: Product): number => {
    if (!product || !product.prices) return 0;

    const prices = product.prices;
    const comboPrices = Object.values(prices.combo || {}).filter((p): p is number => typeof p === 'number' && p > 0);
    const onlyPrices = Object.values(prices.only || {}).filter((p): p is number => typeof p === 'number' && p > 0);
    const allPrices = [...comboPrices, ...onlyPrices];
    return allPrices.length > 0 ? Math.min(...allPrices) : 0;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Categoría';
  };

  const handleExtraChange = (slotIndex: number, extraId: string, change: number) => {
    const selection = selections[slotIndex];
    const currentExtras = selection.extras || {};
    const newQty = Math.max(0, (currentExtras[extraId] || 0) + change);

    console.log('[ComboSelector] handleExtraChange:', {
      slotIndex,
      extraId,
      change,
      newQty,
      availableExtras: productExtras[selection.comboSlot.category_id]
    });

    let newExtras: Record<string, number>;
    if (newQty === 0) {
      const { [extraId]: _, ...rest } = currentExtras;
      newExtras = rest;
    } else {
      newExtras = { ...currentExtras, [extraId]: newQty };
    }

    updateSelection(slotIndex, { extras: newExtras });
  };

  const toggleModifier = (slotIndex: number, modifierId: string) => {
    const selection = selections[slotIndex];
    const currentModifiers = selection.modifiers || [];
    const newModifiers = currentModifiers.includes(modifierId) ?
    currentModifiers.filter((id) => id !== modifierId) :
    [...currentModifiers, modifierId];

    updateSelection(slotIndex, { modifiers: newModifiers });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Cargando configuración del combo...
          </div>
        </CardContent>
      </Card>);

  }

  if (!comboConfig || comboSlots.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Este producto no tiene configuración de combo.
          </div>
        </CardContent>
      </Card>);

  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        {selections.map((selection, index) => {
          const slot = selection.comboSlot;
          const availableProducts = slotProducts[slot.category_id] || [];
          const allProductVariants = selection.selectedProduct ?
          productVariants[selection.selectedProduct.id!] || [] :
          [];
          const availableVariants = allProductVariants.filter((v) => v.variant?.category_id === slot.category_id);
          const availableExtras = productExtras[slot.category_id] || [];
          const availableModifiers = selection.selectedProduct ?
          productModifiers[selection.selectedProduct.id!] || [] :
          [];

          return (
            <div key={slot.id} className="border-border rounded-lg p-3 space-y-2 border-4">
              {/* Header: category + quantity + locked product inline */}
              <div className="flex items-center gap-2">
                <span className="font-medium text-xl">
                  {selection.selectedProduct?.name || getCategoryName(slot.category_id)}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {slot.quantity}x
                </Badge>
                {(slot as any).lock_product && selection.selectedProduct &&
                <span className="ml-auto text-xs text-muted-foreground">
                    {selection.selectedProduct.name} <span className="opacity-60">· fijo</span>
                  </span>
                }
              </div>

              {/* Product Selection - only if NOT locked */}
              {!((slot as any).lock_product && selection.selectedProduct) &&
              <Select
                value={selection.selectedProduct?.id || ''}
                onValueChange={(productId) => selectProduct(index, productId)}>

                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) =>
                  <SelectItem key={product.id} value={product.id!}>
                        {product.name}
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              }

              {/* Variant Selection */}
              {availableVariants.length > 0 &&
              <>
                  
                  {slot.allow_variant_change !== false ?
                <VariantSelector
                  variants={availableVariants}
                  selectedVariantId={selection.selectedVariant?.id}
                  onVariantSelect={(variant) => selectVariant(index, variant)}
                  disabled={false}
                  defaultVariantId={slot.default_variant_id}
                  showExtraCost={comboConfig?.pricing_mode === 'fixed'}
                  showStockCount={showVariantStock} /> :


                <div className="text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                      {selection.selectedVariant?.variant?.name || 'Variante fija'}
                    </div>
                }
                </>
              }

              {/* Extras - compact button */}
              {availableExtras.length > 0 &&
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between h-8 text-base mx-0 px-[5px] py-[20px] my-[10px]"
                onClick={() => setExtrasModalSlotIndex(index)}>

                  <div className="flex items-center gap-1.5">
                    <Plus className="h-3 w-3" />
                    <span>Agregar Extras</span>
                    {Object.keys(selection.extras || {}).length > 0 &&
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {Object.keys(selection.extras || {}).length}
                      </Badge>
                  }
                  </div>
                  <div className="flex items-center gap-1">
                    {(() => {
                    const extrasTotal = Object.entries(selection.extras || {}).reduce((total, [extraId, qty]) => {
                      const extra = availableExtras.find((e) => e.id === extraId);
                      return total + (extra ? extra.price * qty : 0);
                    }, 0);
                    return extrasTotal > 0 ?
                    <span className="text-xs font-semibold">+{formatPrice(extrasTotal)}</span> :
                    null;
                  })()}
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </Button>
              }

              {/* Extras summary badges */}
              {Object.keys(selection.extras || {}).length > 0 &&
              <div className="flex flex-wrap gap-1">
                  {Object.entries(selection.extras || {}).map(([extraId, qty]) => {
                  const extra = availableExtras.find((e) => e.id === extraId);
                  if (!extra) return null;
                  return (
                    <Badge key={extraId} variant="outline" className="text-[10px] py-0">
                        {extra.name} x{qty}
                      </Badge>);

                })}
                </div>
              }

              {/* Modifiers - inline compact */}
              {availableModifiers.length > 0 &&
              <div className="flex flex-wrap gap-1.5">
                  {availableModifiers.map((modifier) => {
                  const isSelected = (selection.modifiers || []).includes(modifier.id);
                  return (
                    <button
                      key={modifier.id}
                      type="button"
                      onClick={() => toggleModifier(index, modifier.id)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      isSelected ?
                      'bg-primary/10 border-primary text-primary' :
                      'bg-muted/50 border-border text-muted-foreground hover:bg-muted'}`
                      }>

                        {isSelected ? '✓ ' : ''}{modifier.name}
                      </button>);

                })}
                </div>
              }

            </div>);

        })}

        <Separator />
        
        



      </CardContent>

      {/* Modal de Extras para el slot activo */}
      {extrasModalSlotIndex !== null && selections[extrasModalSlotIndex] &&
      <ExtrasModal
        isOpen={true}
        onClose={() => setExtrasModalSlotIndex(null)}
        extras={productExtras[selections[extrasModalSlotIndex].comboSlot.category_id] || []}
        selectedExtras={selections[extrasModalSlotIndex].extras || {}}
        onExtrasChange={(newExtras) => {
          updateSelection(extrasModalSlotIndex, { extras: newExtras });
          setExtrasModalSlotIndex(null);
        }} />

      }
    </Card>);

};

export default ComboSelector;