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
import ComboSelector from '@/components/pos/ComboSelector';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      // First, get the product's assigned categories
      const { data: productCategories, error: catError } = await configuredSupabase
        .from('product_categories')
        .select('category_id')
        .eq('product_id', product.id);

      if (catError) throw catError;

      const categoryIds = (productCategories || []).map(pc => pc.category_id);

      // Fetch product variants from new system, filtering by product's categories
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

  const getBasePrice = () => {
    if (useNewVariantSystem && selectedVariantOption) {
      return selectedVariantOption.price;
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

    const orderItem: any = {
      productId: product.id!,
      productName: product.name,
      basePrice: useCombo ? comboTotal : getBasePrice(),
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
        <ComboSelector
          product={product}
          onComboItemsChange={setComboSelections}
          onComboTotalChange={setComboTotal}
        />
      ) : (
        <>
          {/* Variant Selection - New System */}
          {useNewVariantSystem && availableVariants.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Elige tu opción</Label>
              <RadioGroup
                value={selectedVariantOption?.id || ''}
                onValueChange={(value) => {
                  const variant = availableVariants.find(v => v.id === value);
                  if (variant) setSelectedVariantOption(variant);
                }}
              >
                {availableVariants.map((variant) => (
                  <div
                    key={variant.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedVariantOption?.id === variant.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setSelectedVariantOption(variant)}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={variant.id} id={variant.id} />
                      <Label htmlFor={variant.id} className="font-medium cursor-pointer">
                        {variant.variant?.name}
                      </Label>
                    </div>
                    <span className="font-semibold text-primary">
                      {formatPrice(variant.price)}
                    </span>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Legacy System - Price Type */}
          {!useNewVariantSystem && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de pedido</Label>
                <RadioGroup
                  value={selectedPriceType}
                  onValueChange={(value) => setSelectedPriceType(value as 'combo' | 'only')}
                >
                  <div
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedPriceType === 'combo'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setSelectedPriceType('combo')}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="combo" id="combo" />
                      <Label htmlFor="combo" className="font-medium cursor-pointer">
                        Combo (con papas)
                      </Label>
                    </div>
                  </div>
                  <div
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedPriceType === 'only'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onClick={() => setSelectedPriceType('only')}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="only" id="only" />
                      <Label htmlFor="only" className="font-medium cursor-pointer">
                        Solo hamburguesa
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Legacy System - Variants */}
              {legacyVariants.length > 1 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Tamaño</Label>
                  <RadioGroup
                    value={selectedVariant}
                    onValueChange={(value) => setSelectedVariant(value as Variant)}
                  >
                    {legacyVariants.map((variant) => (
                      <div
                        key={variant}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedVariant === variant
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setSelectedVariant(variant as Variant)}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={variant} id={variant} />
                          <Label htmlFor={variant} className="font-medium cursor-pointer capitalize">
                            {variant}
                          </Label>
                        </div>
                        <span className="font-semibold text-primary">
                          {formatPrice(getLegacyPrice(variant))}
                        </span>
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
          <Label className="text-base font-semibold">Extras</Label>
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
                      <p className="font-medium">{extra.name}</p>
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
          <Label className="text-base font-semibold">Modificaciones</Label>
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
                    <span className="font-medium">{modifier.name}</span>
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
        <Label className="text-base font-semibold">Notas especiales</Label>
        <Textarea
          placeholder="Ej: Sin cebolla, más salsa..."
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
          className="min-h-[80px] rounded-xl resize-none"
        />
      </div>
    </div>
  );

  // Action bar content
  const ActionBar = () => (
    <div className="space-y-3">
      {/* Quantity */}
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Cantidad</Label>
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
          <span className="text-xl font-bold w-8 text-center">{quantity}</span>
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
  const ProductImage = ({ className = "" }: { className?: string }) => (
    <div className={`bg-muted ${className}`}>
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Flame className="h-16 w-16 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  // Mobile: Drawer with scrollable content including image
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh] h-[90vh] flex flex-col">
          <div className="mx-auto w-full max-w-lg flex flex-col flex-1 overflow-hidden">
            {/* Scrollable content - includes image */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="pb-4">
                {/* Product image - now scrollable */}
                <ProductImage className="h-48 w-full" />
                
                {/* Header */}
                <div className="px-4 pt-4 pb-2">
                  <h2 className="text-xl font-bold">{product.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {(product as any).description || 'Personaliza tu pedido'}
                  </p>
                </div>

                {/* Customization content */}
                <div className="px-4">
                  <CustomizationContent />
                </div>
              </div>
            </div>

            {/* Fixed bottom action bar */}
            <div className="flex-shrink-0 border-t bg-background p-4">
              <ActionBar />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog with side-by-side layout (image 1:1 aspect ratio)
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-row h-[80vh] max-h-[700px]">
        {/* Left side - Product image with 1:1 aspect ratio */}
        <div className="w-[350px] flex-shrink-0 bg-muted relative overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center bg-muted">
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
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header - fixed */}
          <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-muted-foreground mt-1">
              {(product as any).description || 'Personaliza tu pedido'}
            </p>
          </div>

          {/* Scrollable customization content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-6 py-4">
              <CustomizationContent />
            </div>
          </div>

          {/* Fixed bottom action bar - always visible */}
          <div className="flex-shrink-0 border-t bg-background p-4">
            <ActionBar />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
