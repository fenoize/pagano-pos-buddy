import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductVariantOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePOSConfig } from '@/hooks/usePOSConfig';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductExtra {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

interface ProductModifier {
  id: string;
  name: string;
  price: number;
  product_id: string;
}

interface ProductExtra {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

interface ProductModifier {
  id: string;
  name: string;
  price: number;
  product_id: string;
}

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product, matchedVariantId?: string) => void;
  onDataPreloaded?: (data: {
    variants: Record<string, ProductVariantOption[]>;
    extras: ProductExtra[];
    modifiers: ProductModifier[];
    combos: Record<string, any>;
  }) => void;
}

export default function ProductGrid({ products, onProductClick, onDataPreloaded }: ProductGridProps) {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; is_default?: boolean }>>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariantOption[]>>({});
  const [productExtras, setProductExtras] = useState<ProductExtra[]>([]);
  const [productModifiers, setProductModifiers] = useState<ProductModifier[]>([]);
  const [productCombos, setProductCombos] = useState<Record<string, any>>({});
  const { config } = usePOSConfig();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Load categories from database
    fetchCategories();
    // Preload all data for products
    preloadAllData();
  }, [products]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, is_default')
        .eq('active', true)
        .eq('show_in_pos', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      setCategories(data || []);
      
      // Buscar la categoría marcada como default
      const defaultCategory = data?.find(cat => cat.is_default);
      
      if (defaultCategory) {
        setActiveCategory(defaultCategory.id);
      } else if (data && data.length > 0) {
        setActiveCategory(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const preloadComboData = async (productIds: string[]) => {
    try {
      const { data: comboConfigs } = await supabase
        .from('combo_products')
        .select('*')
        .in('product_id', productIds)
        .eq('active', true);

      if (!comboConfigs || comboConfigs.length === 0) {
        return {};
      }

      const comboIds = comboConfigs.map(c => c.id);

      const [slotsRes, categoriesRes] = await Promise.all([
        supabase
          .from('combo_items')
          .select('*')
          .in('combo_product_id', comboIds)
          .order('display_order'),
        
        supabase
          .from('combo_items')
          .select('category_id')
          .in('combo_product_id', comboIds)
          .then(async (res) => {
            const categoryIds = [...new Set(res.data?.map(s => s.category_id) || [])];
            return supabase
              .from('categories')
              .select('*')
              .in('id', categoryIds);
          })
      ]);

      const slots = slotsRes.data || [];
      const categories = categoriesRes.data || [];
      const categoryIds = categories.map(c => c.id);

      if (categoryIds.length === 0) {
        return {};
      }

      // Para combos, NO filtrar por show_in_pos - los productos dentro de combos
      // pueden existir solo como parte del combo sin estar visibles individualmente en POS
      const [productsRes, variantsRes, extrasRes, modifiersRes, stockBalancesRes, variantGroupsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            product_categories!inner(category_id)
          `)
          .in('product_categories.category_id', categoryIds)
          .eq('active', true),
        
        supabase
          .from('product_variant_options')
          .select(`
            *,
            variant:category_variants!inner(*)
          `)
          .eq('active', true)
          .eq('variant.active', true)
          .order('variant(display_order)'),
        
        supabase
          .from('product_extras')
          .select('*')
          .in('category_id', categoryIds)
          .eq('active', true),
        
        supabase
          .from('product_modifiers')
          .select('*')
          .eq('active', true),
        
        // Fetch stock balances for raw materials
        supabase
          .from('stock_balances')
          .select('raw_material_id, qty_on_hand'),
        
        // Fetch variant groups for combo products
        supabase
          .from('product_variant_groups')
          .select('product_id, group_id, group:variant_groups(id, name, options:variant_group_options(id, name, display_order, is_default, image_url, active))')
      ]);

      // Create a map of raw_material_id -> total stock
      const stockByMaterial: Record<string, number> = {};
      stockBalancesRes.data?.forEach((balance: any) => {
        const materialId = balance.raw_material_id;
        stockByMaterial[materialId] = (stockByMaterial[materialId] || 0) + (balance.qty_on_hand || 0);
      });

      const comboDataByProduct: Record<string, any> = {};
      
      comboConfigs.forEach(config => {
        const comboSlots = slots.filter(s => s.combo_product_id === config.id);
        
        const slotProducts: Record<string, any[]> = {};
        productsRes.data?.forEach((dbProduct: any) => {
          dbProduct.product_categories?.forEach((pc: any) => {
            if (!slotProducts[pc.category_id]) {
              slotProducts[pc.category_id] = [];
            }
            slotProducts[pc.category_id].push({
              ...dbProduct,
              prices: dbProduct.prices as any
            });
          });
        });

        const productVariants: Record<string, any[]> = {};
        variantsRes.data?.forEach((variant) => {
          if (!productVariants[variant.product_id]) {
            productVariants[variant.product_id] = [];
          }
          // Calculate real stock:
          // - If variant has raw_material_id, use material stock from stock_balances
          // - If no raw_material_id, set stock as undefined (no inventory control = unlimited)
          let realStock: number | undefined = undefined;
          if (variant.raw_material_id) {
            realStock = stockByMaterial[variant.raw_material_id] ?? 0;
          }
          productVariants[variant.product_id].push({
            ...variant,
            stock: realStock
          });
        });

        const productExtras: Record<string, any[]> = {};
        extrasRes.data?.forEach((extra) => {
          if (!productExtras[extra.category_id]) {
            productExtras[extra.category_id] = [];
          }
          productExtras[extra.category_id].push(extra);
        });

        const productModifiers: Record<string, any[]> = {};
        modifiersRes.data?.forEach((modifier) => {
          if (!productModifiers[modifier.product_id]) {
            productModifiers[modifier.product_id] = [];
          }
          productModifiers[modifier.product_id].push(modifier);
        });

        // Build variant groups by product
        const productVariantGroupsMap: Record<string, any[]> = {};
        variantGroupsRes.data?.forEach((pvg: any) => {
          if (!productVariantGroupsMap[pvg.product_id]) {
            productVariantGroupsMap[pvg.product_id] = [];
          }
          productVariantGroupsMap[pvg.product_id].push({
            group_id: pvg.group_id,
            name: pvg.group?.name,
            options: pvg.group?.options || []
          });
        });

        comboDataByProduct[config.product_id] = {
          config,
          slots: comboSlots,
          categories,
          slotProducts,
          productVariants,
          productExtras,
          productModifiers,
          productVariantGroups: productVariantGroupsMap
        };
      });

      return comboDataByProduct;
    } catch (error) {
      console.error('Error preloading combo data:', error);
      return {};
    }
  };

  const preloadAllData = async () => {
    if (products.length === 0) return;
    
    try {
      const productIds = products.map(p => p.id!).filter(Boolean);
      
      const categoryIds = new Set<string>();
      products.forEach(p => {
        p.categories?.forEach(cat => {
          if (cat?.id) categoryIds.add(cat.id);
        });
      });

      const [variantsRes, extrasRes, modifiersRes, combos, stockBalancesRes] = await Promise.all([
        supabase
          .from('product_variant_options')
          .select(`
            *,
            variant:category_variants!inner(*)
          `)
          .in('product_id', productIds)
          .eq('active', true)
          .eq('is_enabled', true)
          .eq('show_in_pos', true)
          .eq('variant.active', true)
          .order('variant(display_order)'),
        supabase
          .from('product_extras')
          .select('*')
          .in('category_id', categoryIds.size > 0 ? Array.from(categoryIds) : [''])
          .eq('active', true)
          .order('display_order'),
        supabase
          .from('product_modifiers')
          .select('*')
          .in('product_id', productIds)
          .eq('active', true),
        preloadComboData(productIds),
        // Fetch stock balances for all raw materials to calculate real stock for variants
        supabase
          .from('stock_balances')
          .select('raw_material_id, qty_on_hand')
      ]);

      if (variantsRes.error) throw variantsRes.error;
      if (extrasRes.error) throw extrasRes.error;
      if (modifiersRes.error) throw modifiersRes.error;

      // Create a map of raw_material_id -> total stock
      const stockByMaterial: Record<string, number> = {};
      stockBalancesRes.data?.forEach((balance: any) => {
        const materialId = balance.raw_material_id;
        stockByMaterial[materialId] = (stockByMaterial[materialId] || 0) + (balance.qty_on_hand || 0);
      });

      const variantsByProduct: Record<string, ProductVariantOption[]> = {};
      variantsRes.data?.forEach((variant) => {
        const productId = variant.product_id;
        if (!variantsByProduct[productId]) {
          variantsByProduct[productId] = [];
        }
        
        // Calculate real stock:
        // - If variant has raw_material_id, use material stock from stock_balances
        // - If no raw_material_id, set stock as undefined (no inventory control = unlimited)
        let realStock: number | undefined = undefined;
        if (variant.raw_material_id) {
          realStock = stockByMaterial[variant.raw_material_id] ?? 0;
        }
        
        variantsByProduct[productId].push({
          ...variant,
          stock: realStock
        });
      });

      setProductVariants(variantsByProduct);
      setProductExtras(extrasRes.data || []);
      setProductModifiers(modifiersRes.data || []);
      setProductCombos(combos);

      if (onDataPreloaded) {
        onDataPreloaded({
          variants: variantsByProduct,
          extras: extrasRes.data || [],
          modifiers: modifiersRes.data || [],
          combos
        });
      }
    } catch (error) {
      console.error('Error preloading product data:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

   const getMinPrice = (product: Product) => {
    // Check if product has combo configuration
    const comboData = productCombos[product.id!];
    if (comboData?.config) {
      if (comboData.config.pricing_mode === 'fixed' && comboData.config.base_price > 0) {
        return comboData.config.base_price;
      }
      // For dynamic combos, sum default slot prices
      if (comboData.config.pricing_mode === 'dynamic') {
        let total = comboData.config.base_price || 0;
        const slots = comboData.slots || [];
        for (const slot of slots) {
          // Skip optional slots (don't count toward base "desde" price)
          if (slot.is_optional) continue;
          // Skip self-referencing slots
          if (slot.default_product_id === product.id) {
            console.warn(`Combo ${product.name}: slot auto-referenciado detectado, ignorando`);
            continue;
          }
          const slotProductId = slot.default_product_id;
          if (!slotProductId) continue;
          
          const slotVariants = comboData.productVariants?.[slotProductId] || [];
          if (slotVariants.length > 0) {
            // Use the default variant price if specified, otherwise use minimum
            if (slot.default_variant_id) {
              const defaultVar = slotVariants.find((v: any) => v.category_variant_id === slot.default_variant_id);
              if (defaultVar) {
                total += defaultVar.price || 0;
                continue;
              }
            }
            const minSlotPrice = Math.min(...slotVariants.map((v: any) => v.price).filter((p: number) => p > 0));
            if (minSlotPrice > 0 && minSlotPrice < Infinity) {
              total += minSlotPrice;
            }
          }
        }
        const discount = comboData.config.combo_discount || 0;
        return Math.max(0, total - discount);
      }
    }

    const variants = productVariants[product.id!] || [];
    
    // If product has new variant system, use variant prices
    if (variants.length > 0) {
      const prices = variants.map(v => v.price).filter(p => p > 0);
      return prices.length > 0 ? Math.min(...prices) : 0;
    }
    
    // Fallback to legacy system
    const comboPrices = Object.values(product.prices.combo || {});
    const onlyPrices = Object.values(product.prices.only || {});
    const allPrices = [...comboPrices, ...onlyPrices].filter(p => p > 0);
    return allPrices.length > 0 ? Math.min(...allPrices) : 0;
  };

  // Filtrado avanzado con búsqueda y categorías
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchTerm.trim().length >= 1) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => {
        if (product.name.toLowerCase().includes(searchLower)) return true;
        const variants = productVariants[product.id!] || [];
        return variants.some(v =>
          v.variant?.name?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (searchTerm.trim().length < 1 && activeCategory !== 'all') {
      filtered = filtered.filter(p => 
        p.categories?.some(cat => cat.id === activeCategory)
      );
    }

    return filtered;
  }, [products, searchTerm, activeCategory, productVariants]);

  const getMatchingVariants = (product: Product): string[] => {
    if (searchTerm.trim().length < 1) return [];
    const searchLower = searchTerm.toLowerCase().trim();
    if (product.name.toLowerCase().includes(searchLower)) return [];
    const variants = productVariants[product.id!] || [];
    return variants
      .filter(v => v.variant?.name?.toLowerCase().includes(searchLower))
      .map(v => v.variant?.name)
      .filter(Boolean) as string[];
  };

  const getFirstMatchingVariantId = (product: Product): string | undefined => {
    if (searchTerm.trim().length < 1) return undefined;
    const searchLower = searchTerm.toLowerCase().trim();
    if (product.name.toLowerCase().includes(searchLower)) return undefined;
    const variants = productVariants[product.id!] || [];
    const match = variants.find(v => v.variant?.name?.toLowerCase().includes(searchLower));
    return match?.id;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.trim().length >= 1) {
      setActiveCategory('all');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getCategoryDisplayName = (categoryId: string) => {
    if (categoryId === 'all') return 'Todos';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  if (products.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          No hay productos disponibles
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder="Buscar productos o variantes..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10 pr-10 py-2 text-base"
          autoFocus={!isMobile}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results Info */}
      {searchTerm.trim().length >= 1 && (
        <div className="text-sm text-muted-foreground">
          {filteredProducts.length > 0 
            ? `${filteredProducts.length} resultado${filteredProducts.length !== 1 ? 's' : ''} para "${searchTerm}"`
            : `No se encontraron resultados para "${searchTerm}"`
          }
        </div>
      )}

      {/* Category Filters - Solo mostrar si no hay búsqueda activa */}
      {searchTerm.trim().length < 1 && categories.length > 0 && (
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="inline-flex h-auto flex-wrap gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="h-10 rounded-full px-6 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:bg-secondary data-[state=inactive]:text-secondary-foreground data-[state=inactive]:hover:bg-secondary/80"
            >
              Todos
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id} 
                value={category.id} 
                className="h-10 rounded-full px-6 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=inactive]:bg-secondary data-[state=inactive]:text-secondary-foreground data-[state=inactive]:hover:bg-secondary/80"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Products Grid */}
      <div 
        className="grid gap-4"
        style={{
          gridTemplateColumns: isMobile 
            ? 'repeat(2, minmax(0, 1fr))' 
            : `repeat(${config.gridColumns}, minmax(0, 1fr))`
        }}
      >
        {filteredProducts.map((product) => (
          <Card 
            key={product.id} 
            className="pos-card cursor-pointer hover:shadow-lg transition-all duration-200 group"
            onClick={() => onProductClick(product, getFirstMatchingVariantId(product))}
          >
            {/* Product Image */}
            <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-4xl opacity-50">🍔</span>
                </div>
              )}
            </div>

            <CardContent className="p-4 pt-0">
              {/* Product Info - Responsive Layout */}
              <div className="space-y-3">
                {/* Categories */}
                {product.categories && product.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.categories.map((cat: any) => (
                      <Badge key={cat.id} variant="secondary" className="text-xs">
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                  {product.name}
                </h3>

                {getMatchingVariants(product).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {getMatchingVariants(product).map((name, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-primary/10 text-primary">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Price */}
                <div>
                  <div className="text-sm text-muted-foreground">Desde</div>
                  <div className="font-bold text-primary">
                    {formatPrice(getMinPrice(product))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No products message */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {searchTerm.trim().length >= 1 
              ? `No se encontraron productos que coincidan con "${searchTerm}"`
              : `No hay productos en la categoría "${getCategoryDisplayName(activeCategory)}"`
            }
          </div>
          <Button 
            variant="outline" 
            onClick={searchTerm.trim().length >= 1 ? clearSearch : () => setActiveCategory('all')}
          >
            {searchTerm.trim().length >= 1 ? 'Limpiar búsqueda' : 'Ver todos los productos'}
          </Button>
        </div>
      )}
    </div>
  );
}