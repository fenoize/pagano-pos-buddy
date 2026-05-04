import React, { useState, useEffect } from 'react';
import { configuredSupabase } from '@/lib/supabaseClient';
import { Product, ProductVariantOption, ComboProduct } from '@/types';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Minus, Check, Flame, ShoppingCart, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import CustomerComboSelector from '@/components/customer/CustomerComboSelector';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VariantGroupWithOptions {
  group_id: string;
  group_name: string;
  options: Array<{ id: string; name: string; is_default: boolean; image_url?: string | null; price_delta?: number }>;
}

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

interface CustomerProductCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: any) => void;
  product: Product;
}

export function CustomerProductCustomization({ isOpen, onClose, onAddToCart, product }: CustomerProductCustomizationProps) {
  const isMobile = useIsMobile();
  
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
  
  // Variant groups state (multi-dimensional)
  const [variantGroups, setVariantGroups] = useState<VariantGroupWithOptions[]>([]);
  const [selectedGroupOptions, setSelectedGroupOptions] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  // Get available legacy variants
  const getAvailableVariantsLegacy = () => {
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
  };

  useEffect(() => {
    if (isOpen && product.id) {
      resetForm();
      fetchProductVariantsAndCustomizations();
      fetchComboConfiguration();
    }
  }, [isOpen, product.id]);

  const fetchProductVariantsAndCustomizations = async () => {
    try {
      const { data: productCategories, error: catError } = await configuredSupabase
        .from('product_categories')
        .select('category_id')
        .eq('product_id', product.id);

      if (catError) throw catError;

      const categoryIds = (productCategories || []).map(pc => pc.category_id);

      const { data: variantsData, error: variantsError } = await configuredSupabase
        .from('product_variant_options')
        .select(`
          *,
          variant:category_variants!inner(*)
        `)
        .eq('product_id', product.id)
        .eq('active', true)
        .in('variant.category_id', categoryIds.length > 0 ? categoryIds : ['00000000-0000-0000-0000-000000000000'])
        .order('variant(display_order)');

      if (variantsError) throw variantsError;

      const variants = (variantsData || []) as ProductVariantOption[];
      setAvailableVariants(variants);

      // Fetch variant groups assigned to this product
      const { data: pvgData } = await configuredSupabase
        .from('product_variant_groups')
        .select('group_id, group:variant_groups(id, name, options:variant_group_options(id, name, display_order, is_default, image_url, active, price_delta))')
        .eq('product_id', product.id);

      const fetchedGroups: VariantGroupWithOptions[] = (pvgData || [])
        .filter((pvg: any) => pvg.group)
        .map((pvg: any) => ({
          group_id: pvg.group.id,
          group_name: pvg.group.name,
          options: (pvg.group.options || [])
            .filter((o: any) => o.active)
            .sort((a: any, b: any) => a.display_order - b.display_order),
        }))
        .sort((a, b) => {
          const aIsProtein = a.group_name.toLowerCase().includes('prote');
          const bIsProtein = b.group_name.toLowerCase().includes('prote');
          if (aIsProtein !== bIsProtein) return aIsProtein ? -1 : 1;
          return a.group_name.localeCompare(b.group_name, 'es');
        });
      setVariantGroups(fetchedGroups);

      // Set default group options
      const defaults: Record<string, string> = {};
      fetchedGroups.forEach(g => {
        const def = g.options.find(o => o.is_default) || g.options[0];
        if (def) defaults[g.group_id] = def.id;
      });
      setSelectedGroupOptions(defaults);

      if (variants.length > 0) {
        setUseNewVariantSystem(true);
        const defaultVariant = variants.find(v => v.is_default) || variants[0];
        setSelectedVariantOption(defaultVariant);
      } else {
        setUseNewVariantSystem(false);
      }

      await fetchExtrasAndModifiers();
    } catch (error) {
      console.error('Error fetching product variants:', error);
      setUseNewVariantSystem(false);
      await fetchExtrasAndModifiers();
    }
  };

  const handleGroupOptionChange = (groupId: string, optionId: string) => {
    setSelectedGroupOptions({ ...selectedGroupOptions, [groupId]: optionId });
  };

  const fetchComboConfiguration = async () => {
    try {
      const { data: comboData, error } = await configuredSupabase
        .from('combo_products')
        .select('*')
        .eq('product_id', product.id)
        .eq('active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching combo config:', error);
        return;
      }

      if (comboData) {
        setHasCombo(true);
        setComboConfig(comboData as ComboProduct);
        setUseCombo(true);
      }
    } catch (error) {
      console.error('Error fetching combo configuration:', error);
    }
  };

  const fetchExtrasAndModifiers = async () => {
    try {
      const { data: productCategories } = await configuredSupabase
        .from('product_categories')
        .select('category_id')
        .eq('product_id', product.id);

      const categoryIds = productCategories?.map(pc => pc.category_id) || [];

      const [extrasRes, modifiersRes] = await Promise.all([
        configuredSupabase
          .from('product_extras')
          .select('*')
          .in('category_id', categoryIds.length > 0 ? categoryIds : [''])
          .eq('active', true),
        configuredSupabase
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
    setUseCombo(false);
    setComboSelections([]);
    setComboTotal(0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getGroupDeltaTotal = () => {
    let total = 0;
    variantGroups.forEach(g => {
      const selectedId = selectedGroupOptions[g.group_id];
      if (!selectedId) return;
      const opt = g.options.find(o => o.id === selectedId);
      if (opt?.price_delta) total += opt.price_delta;
    });
    return total;
  };

  const getBasePrice = () => {
    if (useNewVariantSystem && selectedVariantOption) {
      return selectedVariantOption.price + getGroupDeltaTotal();
    }
    
    const prices = product.prices as any;
    const priceType = prices[selectedPriceType] || {};
    
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

  const handleExtraToggle = (extraId: string) => {
    setSelectedExtras(prev => {
      if (prev[extraId]) {
        const { [extraId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [extraId]: 1 };
    });
  };

  const handleExtraQuantityChange = (extraId: string, change: number) => {
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

    const finalBasePrice = useCombo ? comboTotal : getBasePrice();
    const extrasTotal = selectedExtrasArray.reduce((sum, e) => sum + (e.price * (e.quantity || 1)), 0);
    const itemTotal = (finalBasePrice + extrasTotal) * quantity;

    if (itemTotal <= 0) {
      toast({ title: 'No se puede agregar un producto con valor $0', variant: 'destructive' });
      return;
    }

    const orderItem: any = {
      productId: product.id!,
      productName: product.name,
      basePrice: finalBasePrice,
      quantity,
      extras: selectedExtrasArray.length > 0 ? selectedExtrasArray : undefined,
      modifiers: selectedModifiersArray.length > 0 ? selectedModifiersArray : undefined,
      notes: specialNotes.trim() || undefined,
      is_combo_item: useCombo,
      combo_selections: useCombo ? comboSelections : undefined,
      imageUrl: product.image_url,
    };

    if (!useCombo) {
      if (useNewVariantSystem && selectedVariantOption) {
        orderItem.category_variant_id = selectedVariantOption.category_variant_id;
        orderItem.variant_name = selectedVariantOption.variant?.name;
        orderItem.product_variant_option_id = selectedVariantOption.id;
        
        // Add variant group selections
        if (variantGroups.length > 0) {
          orderItem.variant_group_selections = variantGroups
            .filter(g => selectedGroupOptions[g.group_id])
            .map(g => {
              const selectedOption = g.options.find(o => o.id === selectedGroupOptions[g.group_id]);
              return {
                group_id: g.group_id,
                group_name: g.group_name,
                option_id: selectedGroupOptions[g.group_id],
                option_name: selectedOption?.name || '',
              };
            });
        }
      } else {
        orderItem.size = selectedVariant;
        orderItem.priceKind = selectedPriceType;
      }
    }

    console.log('[CustomerProductCustomization] Adding item to cart:', JSON.stringify(orderItem, null, 2));

    onAddToCart(orderItem);
    resetForm();
    onClose();
  };

  const legacyVariants = getAvailableVariantsLegacy();
  const proteinGroups = variantGroups.filter(group =>
    group.group_name.toLowerCase().includes('prote')
  );
  const otherVariantGroups = variantGroups.filter(group =>
    !group.group_name.toLowerCase().includes('prote')
  );

  const renderVariantGroup = (group: VariantGroupWithOptions) => (
    <div key={group.group_id}>
      <div className="mb-1">
        <h3 className="text-lg font-bold text-white">Elige tu {group.group_name.toLowerCase()}</h3>
        <p className="text-sm text-muted-foreground">Obligatorio • Elegir 1</p>
      </div>
      <RadioGroup
        value={selectedGroupOptions[group.group_id] || ''}
        onValueChange={(value) => handleGroupOptionChange(group.group_id, value)}
        className="gap-0"
      >
        {group.options.map((option, idx) => (
          <div
            key={option.id}
            className={`flex items-center justify-between py-4 cursor-pointer ${
              idx < group.options.length - 1 ? 'border-b border-border/50' : ''
            }`}
            onClick={() => handleGroupOptionChange(group.group_id, option.id)}
          >
            <div className="flex-1">
              <span className="font-medium text-white">{option.name}</span>
              <span className={`text-sm font-semibold ml-2 ${(option.price_delta || 0) > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {(option.price_delta || 0) > 0 ? '+' : ''}{formatPrice(option.price_delta || 0)}
              </span>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
              selectedGroupOptions[group.group_id] === option.id
                ? 'border-primary'
                : 'border-muted-foreground/40'
            }`}>
              {selectedGroupOptions[group.group_id] === option.id && (
                <div className="w-3.5 h-3.5 rounded-full bg-primary" />
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  const getLegacyPrice = (variant: string) => {
    const prices = product.prices as any;
    const priceType = prices[selectedPriceType] || {};
    if (variant === 'cuádruple') {
      return priceType['cuádruple'] || priceType['cuadruple'] || 0;
    }
    return priceType[variant] || 0;
  };

  // Shared customization content
  const CustomizationContent = () => (
    <div className="space-y-6">
      {/* Combo Selection */}
      {hasCombo && useCombo ? (
        <CustomerComboSelector
          product={product}
          onComboItemsChange={setComboSelections}
          onComboTotalChange={setComboTotal}
        />
      ) : (
        <>
          {/* PASO 1: Proteína */}
          {proteinGroups.map(renderVariantGroup)}

          {/* PASO 2: Tamaño (precio base) */}
          {useNewVariantSystem && availableVariants.length > 0 && (
            <div>
              <div className="mb-1">
                <h3 className="text-lg font-bold text-white">
                  {availableVariants.length > 1 ? 'Elige tu tamaño' : 'Tamaño'}
                </h3>
                <p className="text-sm text-muted-foreground">Obligatorio • Elegir 1</p>
              </div>
              <RadioGroup
                value={selectedVariantOption?.id || ''}
                onValueChange={(value) => {
                  const variant = availableVariants.find(v => v.id === value);
                  if (variant) setSelectedVariantOption(variant);
                }}
                className="gap-0"
              >
                {availableVariants.map((variant, idx, arr) => (
                  <div
                    key={variant.id}
                    className={`flex items-center justify-between py-4 cursor-pointer ${
                      idx < arr.length - 1 ? 'border-b border-border/50' : ''
                    }`}
                    onClick={() => setSelectedVariantOption(variant)}
                  >
                    <div className="flex-1">
                      <span className="font-medium text-white">{variant.variant?.name}</span>
                      {variant.price > 0 && (
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatPrice(variant.price)}
                        </span>
                      )}
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedVariantOption?.id === variant.id
                        ? 'border-primary'
                        : 'border-muted-foreground/40'
                    }`}>
                      {selectedVariantOption?.id === variant.id && (
                        <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* PASO 3: Otros grupos de variantes */}
          {otherVariantGroups.map(renderVariantGroup)}

          {/* Legacy System - Price Type */}
          {!useNewVariantSystem && (
            <>
              <div>
                <div className="mb-1">
                  <h3 className="text-lg font-bold text-white">Tipo de pedido</h3>
                  <p className="text-sm text-muted-foreground">Obligatorio • Elegir 1</p>
                </div>
                <RadioGroup
                  value={selectedPriceType}
                  onValueChange={(value) => setSelectedPriceType(value as 'combo' | 'only')}
                  className="gap-0"
                >
                  {[
                    { value: 'combo', label: 'Combo (con papas)' },
                    { value: 'only', label: 'Solo hamburguesa' },
                  ].map((option, idx) => (
                    <div
                      key={option.value}
                      className={`flex items-center justify-between py-4 cursor-pointer ${
                        idx < 1 ? 'border-b border-border/50' : ''
                      }`}
                      onClick={() => setSelectedPriceType(option.value as 'combo' | 'only')}
                    >
                      <span className="font-medium text-white">{option.label}</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedPriceType === option.value
                          ? 'border-primary'
                          : 'border-muted-foreground/40'
                      }`}>
                        {selectedPriceType === option.value && (
                          <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Legacy System - Variants */}
              {legacyVariants.length > 1 && (
                <div>
                  <div className="mb-1">
                    <h3 className="text-lg font-bold text-white">Tamaño</h3>
                    <p className="text-sm text-muted-foreground">Obligatorio • Elegir 1</p>
                  </div>
                  <RadioGroup
                    value={selectedVariant}
                    onValueChange={(value) => setSelectedVariant(value as Variant)}
                    className="gap-0"
                  >
                    {legacyVariants.map((variant, idx) => (
                      <div
                        key={variant}
                        className={`flex items-center justify-between py-4 cursor-pointer ${
                          idx < legacyVariants.length - 1 ? 'border-b border-border/50' : ''
                        }`}
                        onClick={() => setSelectedVariant(variant as Variant)}
                      >
                        <div className="flex-1">
                          <span className="font-medium text-white capitalize">{variant}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {formatPrice(getLegacyPrice(variant))}
                          </span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedVariant === variant
                            ? 'border-primary'
                            : 'border-muted-foreground/40'
                        }`}>
                          {selectedVariant === variant && (
                            <div className="w-3.5 h-3.5 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Extras Section */}
      {extras.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-semibold text-white">Extras</Label>
          <div className="space-y-2">
            {extras.map((extra) => {
              const isSelected = !!selectedExtras[extra.id];
              const qty = selectedExtras[extra.id] || 0;
              
              return (
                <div
                  key={extra.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => handleExtraToggle(extra.id)}
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
                        onClick={() => handleExtraQuantityChange(extra.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-medium">{qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleExtraQuantityChange(extra.id, 1)}
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

      {/* Modifiers Section */}
      {!useCombo && modifiers.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-semibold text-white">Modificaciones</Label>
          <div className="space-y-2">
            {modifiers.map((modifier) => {
              const isSelected = selectedModifiers.includes(modifier.id);
              
              return (
                <div
                  key={modifier.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => toggleModifier(modifier.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-primary border-primary' 
                        : 'border-muted-foreground/30'
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

      {/* Special Notes */}
      <div className="space-y-3">
        <Label className="text-base font-semibold text-white">Notas especiales</Label>
        <Textarea
          placeholder="Ej: Sin cebolla, más salsa..."
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
          className="min-h-[80px] rounded-xl resize-none bg-card text-white border-border placeholder:text-muted-foreground"
          style={{ 
            fontSize: '16px',
            WebkitTextSizeAdjust: '100%',
            lineHeight: '1.5'
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck="true"
        />
      </div>
    </div>
  );

  // Action bar content
  const ActionBar = () => (
    <div className="space-y-3">
      {/* Quantity */}
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-white">Cantidad</Label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xl font-bold w-8 text-center text-white">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add to cart button */}
      <Button
        size="lg"
        className="w-full h-12 text-lg font-bold rounded-xl"
        onClick={handleAddToCart}
      >
        <ShoppingCart className="h-5 w-5 mr-2" />
        Agregar • {formatPrice(getTotalPrice())}
      </Button>
    </div>
  );

  // Product image component
  const ProductImage = () => (
    <div className="w-full bg-muted">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center">
          <Flame className="h-16 w-16 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  // Mobile: Drawer with scrollable content including image
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose} repositionInputs={false}>
        <DrawerContent
          className="customer-app flex flex-col bg-background text-white"
          style={{
            height: '90dvh',
            maxHeight: '90dvh',
          }}
        >
          <div className="mx-auto w-full max-w-lg flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable content - includes image, header, customization AND action bar */}
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              <div>
                {/* Product image - square aspect ratio */}
                <ProductImage />

                {/* Header */}
                <div className="px-4 pt-4 pb-2">
                  <h2 className="text-xl font-bold text-white">{product.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {(product as any).description || 'Personaliza tu pedido'}
                  </p>
                </div>

                {/* Customization content */}
                <div className="px-4">
                  {CustomizationContent()}
                </div>

                {/* Action bar - now part of the scrollable flow so the keyboard
                    can never push it out of the viewport in iOS/Android PWA */}
                <div
                  className="border-t border-border bg-background px-4 py-4 mt-4 sticky bottom-0"
                  style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
                >
                  {ActionBar()}
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog with side-by-side layout (image 1:1 aspect ratio)
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="customer-app p-0 overflow-hidden flex flex-row bg-background text-white border-border"
        style={{
          width: 'min(92vw, 880px)',
          height: 'min(calc(92vw - 400px), calc(100vh - 4rem), 480px)',
          maxWidth: 'none',
        }}
      >
        {/* Left side - Product image with 1:1 aspect ratio (square = full height) */}
        <div className="h-full aspect-square flex-shrink-0 bg-muted relative overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Flame className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 bg-background/80 hover:bg-background rounded-full z-10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side - Customization */}
        <div className="w-[400px] max-w-[40vw] min-w-[340px] flex flex-col overflow-hidden">
          {/* Header - fixed */}
          <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <h2 className="text-2xl font-bold text-white">{product.name}</h2>
            <p className="text-muted-foreground mt-1">
              {(product as any).description || 'Personaliza tu pedido'}
            </p>
          </div>

          {/* Scrollable customization content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-4">
              {CustomizationContent()}
            </div>
          </div>

          {/* Fixed bottom action bar - always visible */}
          <div className="flex-shrink-0 border-t border-border bg-background p-4">
            {ActionBar()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
