import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductVariantOption } from "@/types";

interface VariantSelectorProps {
  variants: ProductVariantOption[];
  selectedVariantId?: string;
  onVariantSelect: (variant: ProductVariantOption) => void;
  disabled?: boolean;
  defaultVariantId?: string;
  showExtraCost?: boolean;
  hideOutOfStockBadge?: boolean;
  showStockCount?: boolean;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariantId,
  onVariantSelect,
  disabled = false,
  defaultVariantId,
  showExtraCost = false,
  hideOutOfStockBadge = false,
  showStockCount = false
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

  const hasAnyImage = variants.some(v => v.variant?.image_url);

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
          const isDefault = defaultVariantId ? variant.id === defaultVariantId : variant.is_default;
          const hasExtraCost = showExtraCost && defaultVariantId && !isDefault;
          const imageUrl = variant.variant?.image_url;
          
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
                  {imageUrl && (
                    <div className="w-full aspect-square rounded-md overflow-hidden border mb-1">
                      <img
                        src={imageUrl}
                        alt={variant.variant?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {!imageUrl && hasAnyImage && (
                    <div className="w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/20 flex items-center justify-center mb-1">
                      <span className="text-muted-foreground text-xs">Sin imagen</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <span className="font-medium text-sm text-center">
                      {variant.variant?.name}
                    </span>
                    {isDefault && (
                      <Badge variant="secondary" className="text-xs px-1">
                        Predeterminado
                      </Badge>
                    )}
                    {hasExtraCost && (
                      <Badge variant="outline" className="text-xs px-1 border-orange-500 text-orange-600">
                        +{formatPrice(variant.price)}
                      </Badge>
                    )}
                  </div>
                  {!hasExtraCost && (
                    <div className="text-primary font-semibold">
                      {showExtraCost && isDefault ? "Incluido" : formatPrice(variant.price)}
                    </div>
                  )}
                  {variant.stock !== undefined && (
                    variant.stock <= 0 ? (
                      !hideOutOfStockBadge && (
                        <Badge variant="destructive" className="text-xs">
                          Agotado
                        </Badge>
                      )
                    ) : (
                      showStockCount && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Stock: {variant.stock}
                        </Badge>
                      )
                    )
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
