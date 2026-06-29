import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, ComboProduct, ComboItem, Category, ProductVariantOption } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, ChevronRight, X } from 'lucide-react';
import VariantSelector from './VariantSelector';
import { ExtrasModal } from './ExtrasModal';
import { toast } from "sonner";

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
  selectedVariants?: ProductVariantOption[]; // For multi-select slots
  quantity: number;
  extras?: Record<string, number>; // extra_id -> quantity
  modifiers?: string[]; // modifier_ids
}

const isPerUnitVariantMode = (slot: ComboItem | any) =>
  !!(slot as any)?.allow_multiple_variants && (slot?.quantity || 1) > 1;

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

            const isOptional = (slot as any).is_optional === true;
            return {
              comboSlot: slot,
              selectedProduct: isOptional ? undefined : defaultProduct,
              selectedVariant: isOptional ? undefined : defaultVariant,
              selectedVariants: isOptional ? undefined : (isPerUnitVariantMode(slot) && defaultVariant
                ? Array(slot.quantity).fill(defaultVariant)
                : ((slot as any).allow_multiple_variants && defaultVariant ? [defaultVariant] : undefined)),
              quantity: slot.quantity,
              extras: {},
              modifiers: []
            };
          });
        }

        setSelections(computedSelections);

        // Use preloaded variant groups if available, otherwise fetch
        const groupsMap = preloadedComboData.productVariantGroups 
          ? (() => {
              // Transform preloaded format to match fetchProductVariantGroups output
              const map: Record<string, VariantGroupWithOptions[]> = {};
              Object.entries(preloadedComboData.productVariantGroups).forEach(([productId, groups]: [string, any]) => {
                map[productId] = (groups || []).map((g: any) => ({
                  group_id: g.group_id,
                  group_name: g.name || g.group_name,
                  options: (g.options || []).filter((o: any) => o.active !== false).sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
                }));
              });
              setProductVariantGroups(map);
              return map;
            })()
          : await (async () => {
              const selectedProductIds = computedSelections
                .map(s => s.selectedProduct?.id)
                .filter(Boolean) as string[];
              return await fetchProductVariantGroups(selectedProductIds);
            })();
        
        // Initialize default group selections per slot and re-resolve variants
        if (groupsMap) {
          const defaultSlotGroups: Record<number, Record<string, string>> = {};
          computedSelections.forEach((sel, idx) => {
            if (sel.selectedProduct?.id && groupsMap[sel.selectedProduct.id]) {
              const defaults: Record<string, string> = {};
              groupsMap[sel.selectedProduct.id].forEach(g => {
                const def = g.options.find(o => o.is_default) || g.options[0];
                if (def) defaults[g.group_id] = def.id;
              });
              if (Object.keys(defaults).length > 0) defaultSlotGroups[idx] = defaults;
            }
          });
          setSlotGroupSelections(defaultSlotGroups);

          // Modelo ortogonal: las variantes (tamaños) son independientes de los grupos (proteína).
          // No se requiere re-resolver selectedVariant por grupo; los defaults de tamaño bastan.
        }

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

        const isOptional = (slot as any).is_optional === true;
        return {
          comboSlot: slot,
          selectedProduct: isOptional ? undefined : defaultProduct,
          selectedVariant: isOptional ? undefined : defaultVariant,
          selectedVariants: isOptional ? undefined : (isPerUnitVariantMode(slot) && defaultVariant
            ? Array(slot.quantity).fill(defaultVariant)
            : ((slot as any).allow_multiple_variants && defaultVariant ? [defaultVariant] : undefined)),
          quantity: slot.quantity,
          extras: {},
          modifiers: []
        };
      });

      setSelections(defaultSelections);

      // Fetch variant groups for fallback path too
      const fallbackProductIds = defaultSelections
        .map(s => s.selectedProduct?.id)
        .filter(Boolean) as string[];
      const groupsMap = await fetchProductVariantGroups(fallbackProductIds);
      if (groupsMap) {
        const defaultSlotGroups: Record<number, Record<string, string>> = {};
        defaultSelections.forEach((sel, idx) => {
          if (sel.selectedProduct?.id && groupsMap[sel.selectedProduct.id]) {
            const defaults: Record<string, string> = {};
            groupsMap[sel.selectedProduct.id].forEach(g => {
              const def = g.options.find(o => o.is_default) || g.options[0];
              if (def) defaults[g.group_id] = def.id;
            });
            if (Object.keys(defaults).length > 0) defaultSlotGroups[idx] = defaults;
          }
        });
        setSlotGroupSelections(defaultSlotGroups);

        // Modelo ortogonal: tamaño y grupos son independientes; no se filtra variante por grupo.
      }

    } catch (error) {
      console.error('Error fetching combo data:', error);
      toast.error("Error", { description: "Error al cargar la configuración del combo" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch variant groups for all products in the combo
  const fetchProductVariantGroups = async (productIds: string[]) => {
    if (productIds.length === 0) return;
    try {
      const { data: pvgData } = await supabase
        .from('product_variant_groups')
        .select('product_id, group_id, group:variant_groups(id, name, options:variant_group_options(id, name, display_order, is_default, image_url, active))')
        .in('product_id', productIds);

      const grouped: Record<string, VariantGroupWithOptions[]> = {};
      (pvgData || []).forEach((pvg: any) => {
        if (!pvg.group) return;
        if (!grouped[pvg.product_id]) grouped[pvg.product_id] = [];
        grouped[pvg.product_id].push({
          group_id: pvg.group.id,
          group_name: pvg.group.name,
          options: (pvg.group.options || [])
            .filter((o: any) => o.active)
            .sort((a: any, b: any) => a.display_order - b.display_order),
        });
      });
      setProductVariantGroups(grouped);

      // Set default group selections for each slot
      return grouped;
    } catch (error) {
      console.error('Error fetching product variant groups:', error);
      return {};
    }
  };

  // Modelo ortogonal: las variantes (tamaño) ya no se filtran por grupo (proteína).
  const filterVariantsByGroup = (variants: ProductVariantOption[], _groupSelections: Record<string, string>) => variants;

  const handleSlotGroupOptionChange = (slotIndex: number, groupId: string, optionId: string) => {
    const newSelections = { ...slotGroupSelections };
    newSelections[slotIndex] = { ...(newSelections[slotIndex] || {}), [groupId]: optionId };
    setSlotGroupSelections(newSelections);

    // Re-filter variants for this slot and update selected variant
    const selection = selections[slotIndex];
    if (!selection?.selectedProduct) return;
    const allVariants = productVariants[selection.selectedProduct.id!] || [];
    const categoryFiltered = allVariants.filter(v => v.variant?.category_id === selection.comboSlot.category_id);
    const filtered = filterVariantsByGroup(categoryFiltered, newSelections[slotIndex]);
    
    if (filtered.length > 0) {
      const currentName = selection.selectedVariant?.variant?.name;
      const sameNameVariant = filtered.find(v => v.variant?.name === currentName);
      updateSelection(slotIndex, { selectedVariant: sameNameVariant || filtered.find(v => v.is_default) || filtered[0] });
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

  const selectProduct = async (slotIndex: number, productId: string) => {
    const selection = selections[slotIndex];
    const categoryProducts = slotProducts[selection.comboSlot.category_id] || [];
    const product = categoryProducts.find((p) => p.id === productId);

    if (product) {
      // Fetch variant groups for this product if not already loaded
      if (!productVariantGroups[productId]) {
        await fetchProductVariantGroups([productId]);
      }

      const groups = productVariantGroups[productId] || [];
      const allVariants = productVariants[productId] || [];
      const variants = allVariants.filter((v) => v.variant?.category_id === selection.comboSlot.category_id);
      
      // Set default group selections for this slot
      const defaults: Record<string, string> = {};
      groups.forEach(g => {
        const def = g.options.find(o => o.is_default) || g.options[0];
        if (def) defaults[g.group_id] = def.id;
      });
      if (Object.keys(defaults).length > 0) {
        setSlotGroupSelections(prev => ({ ...prev, [slotIndex]: defaults }));
      } else {
        setSlotGroupSelections(prev => { const next = { ...prev }; delete next[slotIndex]; return next; });
      }

      // Filter by group if applicable
      const filteredVariants = Object.keys(defaults).length > 0
        ? filterVariantsByGroup(variants, defaults)
        : variants;
      const defaultVariant = filteredVariants.find((v) => v.is_default) || filteredVariants[0] || variants[0];

      updateSelection(slotIndex, {
        selectedProduct: product,
        selectedVariant: defaultVariant
      });
    }
  };

  const enableOptionalSlot = async (slotIndex: number) => {
    const selection = selections[slotIndex];
    const slot = selection?.comboSlot;
    if (!slot) return;
    const categoryProducts = slotProducts[slot.category_id] || [];
    const defaultProduct = slot.default_product_id
      ? categoryProducts.find((p) => p.id === slot.default_product_id)
      : categoryProducts[0];
    if (!defaultProduct?.id) return;
    if (!productVariantGroups[defaultProduct.id]) {
      await fetchProductVariantGroups([defaultProduct.id]);
    }
    const allVariants = productVariants[defaultProduct.id] || [];
    const variants = allVariants.filter((v) => v.variant?.category_id === slot.category_id);
    const defaultVariant = slot.default_variant_id
      ? variants.find((v) => v.category_variant_id === slot.default_variant_id)
      : variants.find((v) => v.is_default) || variants[0];
    updateSelection(slotIndex, {
      selectedProduct: defaultProduct,
      selectedVariant: defaultVariant,
      selectedVariants: isPerUnitVariantMode(slot) && defaultVariant
        ? Array(slot.quantity).fill(defaultVariant)
        : ((slot as any).allow_multiple_variants && defaultVariant ? [defaultVariant] : undefined),
    });
  };

  const disableOptionalSlot = (slotIndex: number) => {
    updateSelection(slotIndex, {
      selectedProduct: undefined,
      selectedVariant: undefined,
      selectedVariants: undefined,
      extras: {},
      modifiers: [],
    });
  };



  const selectVariant = (slotIndex: number, variant: ProductVariantOption, unitIndex?: number) => {
    const slot = selections[slotIndex]?.comboSlot;
    if (isPerUnitVariantMode(slot)) {
      const current = [...(selections[slotIndex]?.selectedVariants || [])];
      const idx = typeof unitIndex === 'number' ? unitIndex : 0;
      while (current.length < (slot?.quantity || 1)) current.push(variant);
      current[idx] = variant;
      updateSelection(slotIndex, {
        selectedVariants: current,
        selectedVariant: current[0],
      });
    } else if ((slot as any)?.allow_multiple_variants) {
      const current = selections[slotIndex]?.selectedVariants || [];
      const exists = current.find(v => v.id === variant.id);
      const newVariants = exists
        ? current.filter(v => v.id !== variant.id)
        : [...current, variant];
      updateSelection(slotIndex, { 
        selectedVariants: newVariants,
        selectedVariant: newVariants[0]
      });
    } else {
      updateSelection(slotIndex, { selectedVariant: variant });
    }
  };

  const addVariantUnit = (slotIndex: number, variant: ProductVariantOption) => {
    const slot = selections[slotIndex]?.comboSlot;
    if (!slot) return;
    const current = [...(selections[slotIndex]?.selectedVariants || [])];
    if (current.length >= (slot.quantity || 1)) return;
    current.push(variant);
    updateSelection(slotIndex, {
      selectedVariants: current,
      selectedVariant: current[0],
    });
  };

  const removeVariantUnit = (slotIndex: number, variant: ProductVariantOption) => {
    const current = [...(selections[slotIndex]?.selectedVariants || [])];
    const idx = current.findIndex(v => v.id === variant.id);
    if (idx < 0) return;
    current.splice(idx, 1);
    updateSelection(slotIndex, {
      selectedVariants: current,
      selectedVariant: current[0],
    });
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

      if (!config.included_variants) {
        selections.forEach((selection) => {
          const slot = selection.comboSlot;
          const allVariants = selection.selectedProduct ? variantsData[selection.selectedProduct.id!] || [] : [];
          const availableVariants = allVariants.filter((v) => v.variant?.category_id === slot.category_id);
          const defaultVariant = slot.default_variant_id ?
            availableVariants.find((v) => v.category_variant_id === slot.default_variant_id) :
            availableVariants.find((v) => v.is_default);
          if (isPerUnitVariantMode(slot) && selection.selectedVariants && selection.selectedVariants.length > 0) {
            selection.selectedVariants.forEach(v => {
              if (defaultVariant && v.id !== defaultVariant.id) {
                const diff = (v.price || 0) - (defaultVariant.price || 0);
                if (diff > 0) total += diff;
              }
            });
          } else if (selection.selectedVariant && defaultVariant && selection.selectedVariant.id !== defaultVariant.id) {
            const diff = (selection.selectedVariant.price || 0) - (defaultVariant.price || 0);
            if (diff > 0) total += diff * selection.quantity;
          }
        });
      }
    } else {
      total = config.base_price;

      selections.forEach((selection) => {
        const discount = (1 - (config.combo_discount || 0) / 100);
        if (isPerUnitVariantMode(selection.comboSlot) && selection.selectedVariants && selection.selectedVariants.length > 0) {
          // Per-unit: array length equals quantity, don't multiply
          selection.selectedVariants.forEach(v => {
            total += v.price * discount;
          });
        } else if ((selection.comboSlot as any).allow_multiple_variants && selection.selectedVariants && selection.selectedVariants.length > 0) {
          selection.selectedVariants.forEach(v => {
            total += v.price * discount * selection.quantity;
          });
        } else if (selection.selectedVariant) {
          total += selection.selectedVariant.price * discount * selection.quantity;
        } else if (selection.selectedProduct) {
          const basePrice = getProductBasePrice(selection.selectedProduct);
          total += basePrice * discount * selection.quantity;
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

      if (!comboConfig.included_variants) {
        selections.forEach((selection) => {
          const slot = selection.comboSlot;
          const allVariants = selection.selectedProduct ? productVariants[selection.selectedProduct.id!] || [] : [];
          const availableVariants = allVariants.filter((v) => v.variant?.category_id === slot.category_id);
          const defaultVariant = slot.default_variant_id ?
            availableVariants.find((v) => v.category_variant_id === slot.default_variant_id) :
            availableVariants.find((v) => v.is_default);
          if (isPerUnitVariantMode(slot) && selection.selectedVariants && selection.selectedVariants.length > 0) {
            selection.selectedVariants.forEach(v => {
              if (defaultVariant && v.id !== defaultVariant.id) {
                const diff = (v.price || 0) - (defaultVariant.price || 0);
                if (diff > 0) total += diff;
              }
            });
          } else if (selection.selectedVariant && defaultVariant && selection.selectedVariant.id !== defaultVariant.id) {
            const diff = (selection.selectedVariant.price || 0) - (defaultVariant.price || 0);
            if (diff > 0) total += diff * selection.quantity;
          }
        });
      }
    } else {
      total = comboConfig.base_price;

      selections.forEach((selection) => {
        const discount = (1 - (comboConfig.combo_discount || 0) / 100);
        if (isPerUnitVariantMode(selection.comboSlot) && selection.selectedVariants && selection.selectedVariants.length > 0) {
          selection.selectedVariants.forEach(v => {
            total += v.price * discount;
          });
        } else if ((selection.comboSlot as any).allow_multiple_variants && selection.selectedVariants && selection.selectedVariants.length > 0) {
          selection.selectedVariants.forEach(v => {
            total += v.price * discount * selection.quantity;
          });
        } else if (selection.selectedVariant) {
          total += selection.selectedVariant.price * discount * selection.quantity;
        } else if (selection.selectedProduct) {
          const basePrice = getProductBasePrice(selection.selectedProduct);
          total += basePrice * discount * selection.quantity;
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
          const categoryVariants = allProductVariants.filter((v) => v.variant?.category_id === slot.category_id);
          // Get variant groups for this product
          const slotVariantGroups = selection.selectedProduct?.id ? productVariantGroups[selection.selectedProduct.id] || [] : [];
          const slotGroupSels = slotGroupSelections[index] || {};
          // Filter variants by group selection if groups exist
          const availableVariants = slotVariantGroups.length > 0 && Object.keys(slotGroupSels).length > 0
            ? filterVariantsByGroup(categoryVariants, slotGroupSels)
            : categoryVariants;
          const availableExtras = productExtras[slot.category_id] || [];
          const availableModifiers = selection.selectedProduct ?
          productModifiers[selection.selectedProduct.id!] || [] :
          [];

          const isOptional = (slot as any).is_optional === true;
          const isOptionalAdded = isOptional && !!selection.selectedProduct;

          return (
            <div key={slot.id} className="border-border rounded-lg p-3 space-y-2 border-4">
              {/* Header: category + quantity + locked product inline */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-xl">
                  {selection.selectedProduct?.name || getCategoryName(slot.category_id)}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {slot.quantity}x
                </Badge>
                {isOptional && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Opcional
                  </Badge>
                )}
                {(slot as any).lock_product && selection.selectedProduct &&
                <span className="ml-auto text-xs text-muted-foreground">
                    {selection.selectedProduct.name} <span className="opacity-60">· fijo</span>
                  </span>
                }
                {isOptional && isOptionalAdded && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-auto text-xs border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => disableOptionalSlot(index)}
                  >
                    <X className="h-3 w-3 mr-1" /> Quitar
                  </Button>
                )}
              </div>

              {isOptional && !isOptionalAdded ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => enableOptionalSlot(index)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar {getCategoryName(slot.category_id)}
                </Button>
              ) : (
              <>
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

              {/* Variant Group Selectors (e.g., Proteína: Carne / Pollo) */}
              {slotVariantGroups.length > 0 && slotVariantGroups.map(group => (
                <div key={group.group_id} className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {group.group_name} *
                  </h4>
                  <div className={`grid gap-3 ${group.options.length <= 2 ? 'grid-cols-2' : group.options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
                    {group.options.map(option => {
                      const isSelected = slotGroupSels[group.group_id] === option.id;
                      return (
                        <Card
                          key={option.id}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? 'ring-2 ring-primary bg-primary/5'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => handleSlotGroupOptionChange(index, group.group_id, option.id)}
                        >
                          <CardContent className="p-3">
                            <div className="text-center">
                              <span className="font-medium text-sm">{option.name}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Variant Selection */}
              {availableVariants.length > 0 &&
              <>
                  
                  {slot.allow_variant_change !== false ? (
                    isPerUnitVariantMode(slot) ? (
                      /* Per-unit selection: single grid with quantity counters */
                      (() => {
                        const selectedArr = selection.selectedVariants || [];
                        const filledCount = selectedArr.length;
                        const remaining = (slot.quantity || 1) - filledCount;
                        const countMap: Record<string, number> = {};
                        selectedArr.forEach(v => { countMap[v.id] = (countMap[v.id] || 0) + 1; });
                        return (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground">
                              Selecciona hasta {slot.quantity} • {filledCount} de {slot.quantity}
                            </h4>
                            <div className={`grid gap-2 ${availableVariants.length <= 2 ? 'grid-cols-2' : availableVariants.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
                              {availableVariants.map((variant) => {
                                const count = countMap[variant.id] || 0;
                                const canAdd = remaining > 0;
                                return (
                                  <Card
                                    key={variant.id}
                                    className={`transition-all ${count > 0 ? 'ring-2 ring-primary bg-primary/5' : ''} ${canAdd ? 'cursor-pointer hover:bg-accent/50' : count === 0 ? 'opacity-50' : ''}`}
                                    onClick={() => canAdd && addVariantUnit(index, variant)}
                                  >
                                    <CardContent className="p-2">
                                      <div className="text-center space-y-1">
                                        <span className="font-medium text-sm">{variant.variant?.name}</span>
                                        <div className="text-primary font-semibold text-xs">
                                          {formatPrice(variant.price)}
                                        </div>
                                        {count > 0 && (
                                          <div
                                            className="flex items-center justify-center gap-2 pt-1"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="h-6 w-6 p-0 border-destructive text-destructive hover:bg-destructive/10"
                                              onClick={() => removeVariantUnit(index, variant)}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                            <span className="text-sm font-bold w-5 text-center">{count}</span>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              className="h-6 w-6 p-0"
                                              disabled={!canAdd}
                                              onClick={() => addVariantUnit(index, variant)}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()

                    ) : (slot as any).allow_multiple_variants ? (
                      /* Multi-select mode (quantity=1): checkboxes */
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Selecciona variantes (múltiple)
                        </h4>
                        <div className={`grid gap-3 ${availableVariants.length <= 2 ? 'grid-cols-2' : availableVariants.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
                          {availableVariants.map((variant) => {
                            const isChecked = (selection.selectedVariants || []).some(v => v.id === variant.id);
                            return (
                              <Card
                                key={variant.id}
                                className={`cursor-pointer transition-all ${
                                  isChecked
                                    ? 'ring-2 ring-primary bg-primary/5'
                                    : 'hover:bg-accent/50'
                                }`}
                                onClick={() => selectVariant(index, variant)}
                              >
                                <CardContent className="p-3">
                                  <div className="text-center space-y-1">
                                    <div className="flex items-center justify-center gap-2">
                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                        isChecked ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                                      }`}>
                                        {isChecked && <span className="text-primary-foreground text-xs">✓</span>}
                                      </div>
                                      <span className="font-medium text-sm">{variant.variant?.name}</span>
                                    </div>
                                    <div className="text-primary font-semibold">
                                      {formatPrice(variant.price)}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Single-select mode: existing VariantSelector */
                      <VariantSelector
                        variants={availableVariants}
                        selectedVariantId={selection.selectedVariant?.id}
                        onVariantSelect={(variant) => selectVariant(index, variant)}
                        disabled={false}
                        defaultVariantId={slot.default_variant_id}
                        showExtraCost={comboConfig?.pricing_mode === 'fixed'}
                        showStockCount={showVariantStock} />
                    )
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                      {selection.selectedVariant?.variant?.name || 'Variante fija'}
                    </div>
                  )}
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

              </>)}
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