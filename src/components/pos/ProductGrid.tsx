import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductVariantOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePOSConfig } from '@/hooks/usePOSConfig';

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
  onProductClick: (product: Product) => void;
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

      const [productsRes, variantsRes, extrasRes, modifiersRes, stockBalancesRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            product_categories!inner(category_id)
          `)
          .in('product_categories.category_id', categoryIds)
          .eq('active', true)
          .eq('show_in_pos', true),
        
        supabase
          .from('product_variant_options')
          .select(`
            *,
            variant:category_variants(*)
          `)
          .eq('active', true),
        
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
          .select('raw_material_id, qty_on_hand')
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
          // Calculate real stock from linked raw material
          let realStock = variant.stock ?? 0;
          if (variant.raw_material_id && stockByMaterial[variant.raw_material_id] !== undefined) {
            realStock = stockByMaterial[variant.raw_material_id];
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

        comboDataByProduct[config.product_id] = {
          config,
          slots: comboSlots,
          categories,
          slotProducts,
          productVariants,
          productExtras,
          productModifiers
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
            variant:category_variants(*)
          `)
          .in('product_id', productIds)
          .eq('active', true)
          .eq('is_enabled', true)
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
        
        // Calculate real stock: if variant has raw_material_id, use material stock; otherwise use variant.stock
        let realStock = variant.stock ?? 0;
        if (variant.raw_material_id && stockByMaterial[variant.raw_material_id] !== undefined) {
          realStock = stockByMaterial[variant.raw_material_id];
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
    if (comboData?.config?.base_price) {
      return comboData.config.base_price;
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

    // Filtrar por búsqueda si hay término de búsqueda (mínimo 2 caracteres)
    if (searchTerm.trim().length >= 2) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por categoría solo si no hay búsqueda activa
    if (searchTerm.trim().length < 2 && activeCategory !== 'all') {
      // Filter by category ID - check if product has this category assigned
      filtered = filtered.filter(p => 
        p.categories?.some(cat => cat.id === activeCategory)
      );
    }

    return filtered;
  }, [products, searchTerm, activeCategory]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Si hay búsqueda activa, cambiar a "all" para mostrar resultados de todas las categorías
    if (e.target.value.trim().length >= 2) {
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
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10 pr-4 py-2 text-base"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            ✕
          </Button>
        )}
      </div>

      {/* Search Results Info */}
      {searchTerm.trim().length >= 2 && (
        <div className="text-sm text-muted-foreground">
          {filteredProducts.length > 0 
            ? `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''} encontrado${filteredProducts.length !== 1 ? 's' : ''} para "${searchTerm}"`
            : `No se encontraron productos para "${searchTerm}"`
          }
        </div>
      )}

      {/* Category Filters - Solo mostrar si no hay búsqueda activa */}
      {searchTerm.trim().length < 2 && categories.length > 0 && (
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
          gridTemplateColumns: `repeat(${config.gridColumns}, minmax(0, 1fr))`
        }}
      >
        {filteredProducts.map((product) => (
          <Card 
            key={product.id} 
            className="pos-card cursor-pointer hover:shadow-lg transition-all duration-200 group"
            onClick={() => onProductClick(product)}
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
            {searchTerm.trim().length >= 2 
              ? `No se encontraron productos que coincidan con "${searchTerm}"`
              : `No hay productos en la categoría "${getCategoryDisplayName(activeCategory)}"`
            }
          </div>
          <Button 
            variant="outline" 
            onClick={searchTerm.trim().length >= 2 ? clearSearch : () => setActiveCategory('all')}
          >
            {searchTerm.trim().length >= 2 ? 'Limpiar búsqueda' : 'Ver todos los productos'}
          </Button>
        </div>
      )}
    </div>
  );
}