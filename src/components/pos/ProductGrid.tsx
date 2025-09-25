import React, { useState, useEffect, useMemo } from 'react';
import { Product, ProductVariantOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export default function ProductGrid({ products, onProductClick }: ProductGridProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariantOption[]>>({});

  useEffect(() => {
    // Get unique categories from products
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    setCategories(['all', ...uniqueCategories]);
    
    if (uniqueCategories.length > 0) {
      setActiveCategory(uniqueCategories[0]);
    }

    // Fetch product variants for all products
    fetchProductVariants();
  }, [products]);

  const fetchProductVariants = async () => {
    if (products.length === 0) return;
    
    try {
      const productIds = products.map(p => p.id!).filter(Boolean);
      const { data: variants, error } = await supabase
        .from('product_variant_options')
        .select(`
          *,
          variant:category_variants(*)
        `)
        .in('product_id', productIds)
        .eq('active', true)
        .order('variant(display_order)');

      if (error) throw error;

      // Group variants by product_id
      const variantsByProduct: Record<string, ProductVariantOption[]> = {};
      variants?.forEach((variant) => {
        const productId = variant.product_id;
        if (!variantsByProduct[productId]) {
          variantsByProduct[productId] = [];
        }
        variantsByProduct[productId].push(variant);
      });

      setProductVariants(variantsByProduct);
    } catch (error) {
      console.error('Error fetching product variants:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getMinPrice = (product: Product) => {
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
        product.name.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por categoría solo si no hay búsqueda activa
    if (searchTerm.trim().length < 2 && activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === activeCategory);
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

  const getCategoryDisplayName = (category: string) => {
    const categoryNames: Record<string, string> = {
      'hamburguesas': 'Hamburguesas',
      'papas': 'Papas Fritas',
      'bebidas': 'Bebidas',
      'sides': 'Acompañamientos',
      'otros': 'Otros',
      'all': 'Todos'
    };
    return categoryNames[category] || category;
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
      {searchTerm.trim().length < 2 && (
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="text-sm">
                {getCategoryDisplayName(category)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Products Grid */}
      <div className="pos-grid">
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
                <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                  {product.name}
                </h3>
                
                {/* Category */}
                <Badge variant="secondary" className="text-xs w-fit">
                  {getCategoryDisplayName(product.category)}
                </Badge>
                
                {/* Price */}
                <div>
                  <div className="text-sm text-muted-foreground">Desde</div>
                  <div className="font-bold text-primary">
                    {formatPrice(getMinPrice(product))}
                  </div>
                </div>

                {/* Quick actions hint */}
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                  Toca para personalizar
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