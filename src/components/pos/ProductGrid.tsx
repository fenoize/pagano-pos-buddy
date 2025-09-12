import React, { useState, useEffect } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export default function ProductGrid({ products, onProductClick }: ProductGridProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    // Get unique categories from products
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    setCategories(['all', ...uniqueCategories]);
    
    if (uniqueCategories.length > 0) {
      setActiveCategory(uniqueCategories[0]);
    }
  }, [products]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getMinPrice = (product: Product) => {
    const comboPrices = Object.values(product.prices.combo);
    const onlyPrices = Object.values(product.prices.only);
    const allPrices = [...comboPrices, ...onlyPrices].filter(p => p > 0);
    return Math.min(...allPrices);
  };

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

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
      {/* Category Filters */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="text-sm">
              {getCategoryDisplayName(category)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
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
                  {/* Product Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryDisplayName(product.category)}
                      </Badge>
                      
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Desde</div>
                        <div className="font-bold text-primary">
                          {formatPrice(getMinPrice(product))}
                        </div>
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
                No hay productos en la categoría "{getCategoryDisplayName(activeCategory)}"
              </div>
              <Button 
                variant="outline" 
                onClick={() => setActiveCategory('all')}
              >
                Ver todos los productos
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}