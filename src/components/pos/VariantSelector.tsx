import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductVariantOption } from "@/types";

interface VariantSelectorProps {
  variants: ProductVariantOption[];
  selectedVariantId?: string;
  onVariantSelect: (variant: ProductVariantOption) => void;
  disabled?: boolean;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariantId,
  onVariantSelect,
  disabled = false
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (variants.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">
            No hay variantes disponibles para este producto
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine grid layout based on number of variants
  const getGridCols = () => {
    if (variants.length <= 2) return 'grid-cols-2';
    if (variants.length <= 3) return 'grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3';
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-muted-foreground">
        Selecciona variante *
      </h4>
      <div className={`grid gap-3 ${getGridCols()}`}>
        {variants.map((variant) => {
          const isSelected = selectedVariantId === variant.id;
          const isDefault = variant.is_default;
          
          return (
            <Card
              key={variant.id}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-accent/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onVariantSelect(variant)}
            >
              <CardContent className="p-3">
                <div className="text-center space-y-2">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <span className="font-medium text-sm text-center">
                      {variant.variant?.name}
                    </span>
                    {isDefault && (
                      <Badge variant="secondary" className="text-xs px-1">
                        Predeterminado
                      </Badge>
                    )}
                  </div>
                  <div className="text-primary font-semibold">
                    {formatPrice(variant.price)}
                  </div>
                  {variant.stock !== undefined && variant.stock <= 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Agotado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default VariantSelector;