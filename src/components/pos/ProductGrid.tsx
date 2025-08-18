import React from 'react';
import { Product, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, variant: string, priceType: 'combo' | 'only') => void;
}

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getVariantsByCategory = (category: string) => {
    if (category === 'hamburguesas') {
      return ['simple', 'doble', 'triple', 'cuadruple'];
    } else if (category === 'BoxFries') {
      return ['Medium', 'Large'];
    }
    return ['simple', 'doble', 'triple'];
  };

  return (
    <div className="pos-grid">
      {products.map((product) => {
        const category = (product.prices as any).category || 'hamburguesas';
        const variants = getVariantsByCategory(category);
        
        return (
          <Card key={product.id} className="pos-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <Badge variant="secondary" className="w-fit">
                {category}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Combo options */}
              <div>
                <h4 className="font-medium text-sm mb-2 text-primary">Combo</h4>
                <div className="space-y-1">
                  {variants.map((variant) => {
                    const comboPrice = (product.prices as any).combo[variant];
                    if (!comboPrice) return null;
                    
                    return (
                      <Button
                        key={`combo-${variant}`}
                        variant="outline"
                        size="sm"
                        className="w-full justify-between h-8"
                        onClick={() => onAddToCart(product, variant, 'combo')}
                      >
                        <span className="capitalize text-xs">{variant}</span>
                        <span className="text-xs font-mono">
                          {formatPrice(comboPrice)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Solo options */}
              <div>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">Solo</h4>
                <div className="space-y-1">
                  {variants.map((variant) => {
                    const onlyPrice = (product.prices as any).only[variant];
                    if (!onlyPrice) return null;
                    
                    return (
                      <Button
                        key={`only-${variant}`}
                        variant="outline"
                        size="sm"
                        className="w-full justify-between h-8"
                        onClick={() => onAddToCart(product, variant, 'only')}
                      >
                        <span className="capitalize text-xs">{variant}</span>
                        <span className="text-xs font-mono">
                          {formatPrice(onlyPrice)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}