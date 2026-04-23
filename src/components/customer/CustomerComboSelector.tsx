import React, { useState, useEffect, useRef } from 'react';
import { configuredSupabase } from '@/lib/supabaseClient';
import { Product, ComboProduct, ComboItem, Category, ProductVariantOption } from '@/types';
import { Plus, Minus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface ComboItemSelection {
  comboSlot: ComboItem;
  selectedProduct?: Product;
  selectedVariant?: ProductVariantOption;
  selectedVariants?: ProductVariantOption[];
  variant_group_selections?: Array<{ group_id: string; group_name: string; option_id: string; option_name: string; price_delta?: number }>;
  quantity: number;
  extras?: Record<string, number>;
  modifiers?: string[];
}

interface VariantGroupWithOptions {
  group_id: string;
  group_name: string;
  options: Array<{ id: string; name: string; is_default: boolean; image_url?: string | null; price_delta?: number; active: boolean; display_order: number }>;
}

interface CustomerComboSelectorProps {
  product: Product;
  onComboItemsChange: (items: ComboItemSelection[]) => void;
  onComboTotalChange: (total: number) => void;
}

interface ExtraItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

interface ModifierItem {
  id: string;
  name: string;
  price: number;
  product_id: string;
}

const CustomerComboSelector: React.FC<CustomerComboSelectorProps> = ({
  product,
  onComboItemsChange,
  onComboTotalChange,
}) => {
  const [comboConfig, setComboConfig] = useState<ComboProduct | null>(null);
  const [comboSlots, setComboSlots] = useState<ComboItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slotProducts, setSlotProducts] = useState<Record<string, Product[]>>({});
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariantOption[]>>({});
  const [productVariantGroups, setProductVariantGroups] = useState<Record<string, VariantGroupWithOptions[]>>({});
  const [productExtras, setProductExtras] = useState<Record<string, ExtraItem[]>>({});
  const [productModifiers, setProductModifiers] = useState<Record<string, ModifierItem[]>>({});
  const [selections, setSelections] = useState<ComboItemSelection[]>([]);
  const [loading, setLoading] = useState(true);

  const isInitialized = useRef(false);
  const lastProductId = useRef<string | null>(null);

  useEffect(() => {
    if (product.id !== lastProductId.current) {
      isInitialized.current = false;
      lastProductId.current = product.id || null;
    }
    if (product.id && !isInitialized.current) {
      isInitialized.current = true;
      fetchComboData();
    }
  }, [product.id]);

  useEffect(() => {
    if (selections.length > 0 && comboConfig) {
      const total = calculateComboTotal();
      onComboTotalChange(total);
    }
  }, [selections, productExtras, comboConfig, productVariantGroups]);

  const buildDefaultGroupSelections = (groups: VariantGroupWithOptions[] = []) =>
    groups
      .map((group) => {
        const option = group.options.find((o) => o.is_default) || group.options[0];
        if (!option) return null;
        return {
          group_id: group.group_id,
          group_name: group.group_name,
          option_id: option.id,
          option_name: option.name,
          price_delta: option.price_delta || 0,
        };
      })
      .filter(Boolean) as ComboItemSelection['variant_group_selections'];

  const fetchComboData = async () => {
    try {
      setLoading(true);

      const { data: comboData, error: comboError } = await configuredSupabase
        .from('combo_products')
        .select('*')
        .eq('product_id', product.id)
        .eq('active', true)
        .single();

      if (comboError) {
        if (comboError.code !== 'PGRST116') throw comboError;
        setLoading(false);
        return;
      }

      setComboConfig(comboData as ComboProduct);

      const { data: slotsData, error: slotsError } = await configuredSupabase
        .from('combo_items')
        .select('*')
        .eq('combo_product_id', comboData.id)
        .order('display_order');

      if (slotsError) throw slotsError;
      setComboSlots(slotsData || []);

      const categoryIds = [...new Set(slotsData?.map(s => s.category_id) || [])];

      const { data: categoriesData } = await configuredSupabase
        .from('categories')
        .select('*')
        .in('id', categoryIds);

      setCategories(categoriesData || []);

      const { data: productsData } = await configuredSupabase
        .from('products')
        .select(`*, product_categories!inner(category_id)`)
        .in('product_categories.category_id', categoryIds)
        .eq('active', true);

      const groupedProducts: Record<string, Product[]> = {};
      productsData?.forEach((dbProduct: any) => {
        const p = { ...dbProduct, prices: dbProduct.prices as any } as Product;
        dbProduct.product_categories?.forEach((pc: any) => {
          if (!groupedProducts[pc.category_id]) groupedProducts[pc.category_id] = [];
          groupedProducts[pc.category_id].push(p);
        });
      });
      setSlotProducts(groupedProducts);

      const productIds = productsData?.map(p => p.id) || [];

      const { data: variantsData } = await configuredSupabase
        .from('product_variant_options')
        .select(`*, variant:category_variants(*)`)
        .in('product_id', productIds)
        .eq('active', true)
        .order('variant(display_order)');

      const groupedVariants: Record<string, ProductVariantOption[]> = {};
      variantsData?.forEach((v: any) => {
        if (!groupedVariants[v.product_id]) groupedVariants[v.product_id] = [];
        groupedVariants[v.product_id].push(v);
      });
      setProductVariants(groupedVariants);

      const { data: variantGroupsData } = await configuredSupabase
        .from('product_variant_groups')
        .select('product_id, group_id, group:variant_groups(id, name, options:variant_group_options(id, name, display_order, is_default, image_url, active, price_delta))')
        .in('product_id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000']);

      const groupedVariantGroups: Record<string, VariantGroupWithOptions[]> = {};
      (variantGroupsData || []).forEach((pvg: any) => {
        if (!pvg.group) return;
        if (!groupedVariantGroups[pvg.product_id]) groupedVariantGroups[pvg.product_id] = [];
        groupedVariantGroups[pvg.product_id].push({
          group_id: pvg.group.id,
          group_name: pvg.group.name,
          options: (pvg.group.options || [])
            .filter((option: any) => option.active)
            .sort((a: any, b: any) => a.display_order - b.display_order),
        });
      });
      setProductVariantGroups(groupedVariantGroups);

      const [extrasRes, modifiersRes] = await Promise.all([
        configuredSupabase
          .from('product_extras')
          .select('*')
          .in('category_id', categoryIds)
          .eq('active', true),
        configuredSupabase
          .from('product_modifiers')
          .select('*')
          .in('product_id', productIds)
          .eq('active', true),
      ]);

      const groupedExtras: Record<string, ExtraItem[]> = {};
      extrasRes.data?.forEach((e: any) => {
        if (!groupedExtras[e.category_id]) groupedExtras[e.category_id] = [];
        groupedExtras[e.category_id].push(e);
      });
      setProductExtras(groupedExtras);

      const groupedModifiers: Record<string, ModifierItem[]> = {};
      modifiersRes.data?.forEach((m: any) => {
        if (!groupedModifiers[m.product_id]) groupedModifiers[m.product_id] = [];
        groupedModifiers[m.product_id].push(m);
      });
      setProductModifiers(groupedModifiers);

      // Initialize selections
      const defaultSelections: ComboItemSelection[] = (slotsData || []).map(slot => {
        const catProducts = groupedProducts[slot.category_id] || [];
        const defaultProduct = slot.default_product_id
          ? catProducts.find(p => p.id === slot.default_product_id)
          : catProducts[0];

        const allVars = defaultProduct ? groupedVariants[defaultProduct.id!] || [] : [];
        const slotVars = allVars.filter(v => v.variant?.category_id === slot.category_id);
        const defaultVariant = slot.default_variant_id
          ? slotVars.find(v => v.category_variant_id === slot.default_variant_id)
          : slotVars.find(v => v.is_default) || slotVars[0];

        return {
          comboSlot: slot,
          selectedProduct: defaultProduct,
          selectedVariant: defaultVariant,
          variant_group_selections: defaultProduct ? buildDefaultGroupSelections(groupedVariantGroups[defaultProduct.id!] || []) : [],
          quantity: slot.quantity,
          extras: {},
          modifiers: [],
        };
      });

      setSelections(defaultSelections);

      const total = calcTotalFromSelections(defaultSelections, comboData as ComboProduct, groupedExtras, groupedVariants, groupedVariantGroups);
      onComboTotalChange(total);
      onComboItemsChange(defaultSelections);
    } catch (error) {
      console.error('Error fetching combo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSelection = (slotIndex: number, updates: Partial<ComboItemSelection>) => {
    const newSelections = selections.map((s, i) => (i === slotIndex ? { ...s, ...updates } : s));
    setSelections(newSelections);
    onComboItemsChange(newSelections);
  };

  const selectProduct = (slotIndex: number, productId: string) => {
    const selection = selections[slotIndex];
    const catProducts = slotProducts[selection.comboSlot.category_id] || [];
    const prod = catProducts.find(p => p.id === productId);
    if (!prod) return;

    const allVars = productVariants[productId] || [];
    const vars = allVars.filter(v => v.variant?.category_id === selection.comboSlot.category_id);
    const defaultVar = vars.find(v => v.is_default) || vars[0];

    updateSelection(slotIndex, {
      selectedProduct: prod,
      selectedVariant: defaultVar,
      variant_group_selections: buildDefaultGroupSelections(productVariantGroups[productId] || []),
      extras: {},
      modifiers: []
    });
  };

  const selectGroupOption = (slotIndex: number, group: VariantGroupWithOptions, optionId: string) => {
    const option = group.options.find((o) => o.id === optionId);
    if (!option) return;

    const currentSelections = selections[slotIndex]?.variant_group_selections || [];
    const nextSelections = [
      ...currentSelections.filter((selection) => selection.group_id !== group.group_id),
      {
        group_id: group.group_id,
        group_name: group.group_name,
        option_id: option.id,
        option_name: option.name,
        price_delta: option.price_delta || 0,
      },
    ];

    updateSelection(slotIndex, { variant_group_selections: nextSelections });
  };

  const selectVariant = (slotIndex: number, variant: ProductVariantOption) => {
    const slot = selections[slotIndex]?.comboSlot;
    if ((slot as any)?.allow_multiple_variants) {
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

  const handleExtraToggle = (slotIndex: number, extraId: string) => {
    const current = selections[slotIndex].extras || {};
    if (current[extraId]) {
      const { [extraId]: _, ...rest } = current;
      updateSelection(slotIndex, { extras: rest });
    } else {
      updateSelection(slotIndex, { extras: { ...current, [extraId]: 1 } });
    }
  };

  const handleExtraQtyChange = (slotIndex: number, extraId: string, change: number) => {
    const current = selections[slotIndex].extras || {};
    const newQty = Math.max(0, (current[extraId] || 0) + change);
    if (newQty === 0) {
      const { [extraId]: _, ...rest } = current;
      updateSelection(slotIndex, { extras: rest });
    } else {
      updateSelection(slotIndex, { extras: { ...current, [extraId]: newQty } });
    }
  };

  const toggleModifier = (slotIndex: number, modifierId: string) => {
    const current = selections[slotIndex].modifiers || [];
    const newMods = current.includes(modifierId)
      ? current.filter(id => id !== modifierId)
      : [...current, modifierId];
    updateSelection(slotIndex, { modifiers: newMods });
  };

  const getProductBasePrice = (p: Product): number => {
    if (!p?.prices) return 0;
    const combo = Object.values(p.prices.combo || {}).filter((v): v is number => typeof v === 'number' && v > 0);
    const only = Object.values(p.prices.only || {}).filter((v): v is number => typeof v === 'number' && v > 0);
    const all = [...combo, ...only];
    return all.length > 0 ? Math.min(...all) : 0;
  };

  const calcTotalFromSelections = (
    sels: ComboItemSelection[],
    config: ComboProduct,
    extrasMap: Record<string, ExtraItem[]>,
    variantsMap: Record<string, ProductVariantOption[]>,
    variantGroupsMap: Record<string, VariantGroupWithOptions[]>
  ): number => {
    if (!config) return 0;
    let total = 0;

    if (config.pricing_mode === 'fixed') {
      total = config.base_price;
      if (!config.included_variants) {
        sels.forEach(sel => {
          if (sel.selectedVariant) {
            const allVars = sel.selectedProduct ? variantsMap[sel.selectedProduct.id!] || [] : [];
            const catVars = allVars.filter(v => v.variant?.category_id === sel.comboSlot.category_id);
            const defVar = sel.comboSlot.default_variant_id
              ? catVars.find(v => v.category_variant_id === sel.comboSlot.default_variant_id)
              : catVars.find(v => v.is_default);
            if (defVar && sel.selectedVariant.id !== defVar.id) {
              // Cobra solo el DIFERENCIAL respecto a la variante por defecto
              const diff = (sel.selectedVariant.price || 0) - (defVar.price || 0);
              if (diff > 0) {
                total += diff * sel.quantity;
              }
            }
          }
        });
      }
    } else {
      total = config.base_price;
      sels.forEach(sel => {
        if ((sel.comboSlot as any).allow_multiple_variants && sel.selectedVariants && sel.selectedVariants.length > 0) {
          sel.selectedVariants.forEach(v => {
            total += v.price * (1 - (config.combo_discount || 0) / 100) * sel.quantity;
          });
        } else if (sel.selectedVariant) {
          total += sel.selectedVariant.price * (1 - (config.combo_discount || 0) / 100) * sel.quantity;
        } else if (sel.selectedProduct) {
          total += getProductBasePrice(sel.selectedProduct) * (1 - (config.combo_discount || 0) / 100) * sel.quantity;
        }
      });
    }

    sels.forEach(sel => {
      const assignedGroups = sel.selectedProduct ? variantGroupsMap[sel.selectedProduct.id!] || [] : [];
      const validGroupIds = new Set(assignedGroups.map((group) => group.group_id));
      sel.variant_group_selections?.forEach((selection) => {
        if (validGroupIds.has(selection.group_id)) {
          total += (selection.price_delta || 0) * sel.quantity;
        }
      });

      if (sel.extras) {
        Object.entries(sel.extras).forEach(([extraId, qty]) => {
          const extra = (extrasMap[sel.comboSlot.category_id] || []).find(e => e.id === extraId);
          if (extra) total += extra.price * qty * sel.quantity;
        });
      }
    });

    return Math.max(0, total);
  };

  const calculateComboTotal = (): number => {
    return calcTotalFromSelections(selections, comboConfig!, productExtras, productVariants, productVariantGroups);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(price);

  const getCategoryName = (categoryId: string): string =>
    categories.find(c => c.id === categoryId)?.name || 'Categoría';

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Cargando configuración del combo...
      </div>
    );
  }

  if (!comboConfig || comboSlots.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Este producto no tiene configuración de combo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selections.map((selection, slotIndex) => {
        const slot = selection.comboSlot;
        const availableProducts = slotProducts[slot.category_id] || [];
        const allVars = selection.selectedProduct ? productVariants[selection.selectedProduct.id!] || [] : [];
        const availableVariants = allVars.filter(v => v.variant?.category_id === slot.category_id);
        const availableExtras = productExtras[slot.category_id] || [];
        const availableModifiers = selection.selectedProduct ? productModifiers[selection.selectedProduct.id!] || [] : [];

        const isProductLocked = (slot as any).lock_product && selection.selectedProduct;

        return (
          <div key={slot.id}>
            {/* Product selection (if multiple products and not locked) */}
            {!isProductLocked && availableProducts.length > 1 && (
              <div>
                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white">
                    {getCategoryName(slot.category_id)}
                  </h3>
                  <p className="text-sm text-muted-foreground">Obligatorio • Elegir 1</p>
                </div>
                <div className="gap-0">
                  {availableProducts.map((prod, idx) => {
                    const isSelected = selection.selectedProduct?.id === prod.id;
                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between py-4 cursor-pointer ${
                          idx < availableProducts.length - 1 ? 'border-b border-border/50' : ''
                        }`}
                        onClick={() => selectProduct(slotIndex, prod.id!)}
                      >
                        <span className="font-medium text-white">{prod.name}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-primary' : 'border-muted-foreground/40'
                        }`}>
                          {isSelected && <div className="w-3.5 h-3.5 rounded-full bg-primary" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant selection */}
            {availableVariants.length > 0 && (slot as any).allow_variant_change !== false && (
              <div>
                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white">
                    {isProductLocked || availableProducts.length <= 1
                      ? (selection.selectedProduct?.name || getCategoryName(slot.category_id))
                      : 'Elige tu opción'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {(slot as any).allow_multiple_variants
                      ? 'Opcional • Elegir una o más'
                      : 'Obligatorio • Elegir 1'}
                  </p>
                </div>
                <div className="gap-0">
                  {availableVariants.map((variant, idx) => {
                    const isMulti = (slot as any).allow_multiple_variants;
                    const isSelected = isMulti
                      ? (selection.selectedVariants || []).some(v => v.id === variant.id)
                      : selection.selectedVariant?.id === variant.id;
                    return (
                      <div
                        key={variant.id}
                        className={`flex items-center justify-between py-4 cursor-pointer ${
                          idx < availableVariants.length - 1 ? 'border-b border-border/50' : ''
                        }`}
                        onClick={() => selectVariant(slotIndex, variant)}
                      >
                        <div className="flex-1">
                          <span className="font-medium text-white">{variant.variant?.name}</span>
                          {variant.price > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              {formatPrice(variant.price)}
                            </span>
                          )}
                        </div>
                        {isMulti ? (
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                          }`}>
                            {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                          </div>
                        ) : (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'border-primary' : 'border-muted-foreground/40'
                          }`}>
                            {isSelected && <div className="w-3.5 h-3.5 rounded-full bg-primary" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Locked variant display */}
            {availableVariants.length > 0 && (slot as any).allow_variant_change === false && (
              <div className="py-2">
                <span className="text-sm text-muted-foreground">
                  {selection.selectedVariant?.variant?.name || 'Variante fija'}
                </span>
              </div>
            )}

            {/* Extras */}
            {availableExtras.length > 0 && (
              <div className="mt-4">
                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white">Extras</h3>
                  <p className="text-sm text-muted-foreground">Opcional</p>
                </div>
                <div className="space-y-2">
                  {availableExtras.map(extra => {
                    const isSelected = !!(selection.extras || {})[extra.id];
                    const qty = (selection.extras || {})[extra.id] || 0;

                    return (
                      <div
                        key={extra.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isSelected}
                            onCheckedChange={() => handleExtraToggle(slotIndex, extra.id)}
                          />
                          <div>
                            <p className="font-medium text-white">{extra.name}</p>
                            <p className="text-sm text-primary font-semibold">
                              +{formatPrice(extra.price)}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleExtraQtyChange(slotIndex, extra.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-medium">{qty}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleExtraQtyChange(slotIndex, extra.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modifiers */}
            {availableModifiers.length > 0 && (
              <div className="mt-4">
                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white">Modificaciones</h3>
                  <p className="text-sm text-muted-foreground">Opcional</p>
                </div>
                <div className="space-y-2">
                  {availableModifiers.map(modifier => {
                    const isSelected = (selection.modifiers || []).includes(modifier.id);
                    return (
                      <div
                        key={modifier.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
                        }`}
                        onClick={() => toggleModifier(slotIndex, modifier.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="font-medium text-white">{modifier.name}</span>
                        </div>
                        {modifier.price > 0 && (
                          <span className="text-sm text-primary font-semibold">
                            +{formatPrice(modifier.price)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CustomerComboSelector;
