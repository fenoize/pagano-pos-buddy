import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CategoryVariant, ProductVariantOption } from "@/types";

interface ProductVariantsManagementProps {
  productId?: string;
  categoryIds?: string[];
}

const ProductVariantsManagement: React.FC<ProductVariantsManagementProps> = ({ 
  productId, 
  categoryIds = [] 
}) => {
  const [categoryVariants, setCategoryVariants] = useState<CategoryVariant[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (productId && categoryIds.length > 0) {
      fetchData();
    }
  }, [productId, categoryIds]);

  const fetchData = async () => {
    if (!productId || categoryIds.length === 0) return;

    setLoading(true);
    try {
      // Fetch available variants for the product's categories
      const { data: variantsData, error: variantsError } = await supabase
        .from('category_variants')
        .select('*')
        .in('category_id', categoryIds)
        .eq('active', true)
        .order('category_id, display_order');

      if (variantsError) throw variantsError;

      // Fetch existing product variant options
      const { data: productVariantsData, error: productVariantsError } = await supabase
        .from('product_variant_options')
        .select(`
          *,
          variant:category_variants(*)
        `)
        .eq('product_id', productId);

      if (productVariantsError) throw productVariantsError;

      setCategoryVariants(variantsData || []);
      setProductVariants(productVariantsData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar las variantes",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const toggleVariant = async (categoryVariantId: string, enabled: boolean) => {
    if (!productId) return;

    try {
      if (enabled) {
        // Create product variant option
        const { error } = await supabase
          .from('product_variant_options')
          .insert({
            product_id: productId,
            category_variant_id: categoryVariantId,
            price: 0,
            is_default: false,
            active: true,
          });

        if (error) throw error;
      } else {
        // Remove product variant option
        const { error } = await supabase
          .from('product_variant_options')
          .delete()
          .eq('product_id', productId)
          .eq('category_variant_id', categoryVariantId);

        if (error) throw error;
      }

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la variante",
        variant: "destructive",
      });
    }
  };

  const updateVariantOption = async (
    variantOptionId: string,
    field: string,
    value: any
  ) => {
    try {
      const { error } = await supabase
        .from('product_variant_options')
        .update({ [field]: value })
        .eq('id', variantOptionId);

      if (error) throw error;

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la variante",
        variant: "destructive",
      });
    }
  };

  const setDefaultVariant = async (variantOptionId: string) => {
    if (!productId) return;

    try {
      // First, unset all defaults for this product
      await supabase
        .from('product_variant_options')
        .update({ is_default: false })
        .eq('product_id', productId);

      // Then set the selected one as default
      const { error } = await supabase
        .from('product_variant_options')
        .update({ is_default: true })
        .eq('id', variantOptionId);

      if (error) throw error;

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al establecer variante por defecto",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!productId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Selecciona un producto para gestionar sus variantes.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (categoryIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Este producto no tiene categorías asignadas. Asigna categorías primero.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variantes del Producto</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Cargando variantes...</p>
        ) : categoryVariants.length === 0 ? (
          <p className="text-muted-foreground">
            No hay variantes disponibles para las categorías de este producto.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Default Variant Selection */}
            {productVariants.length > 0 && (
              <div>
                <Label className="text-base font-medium">Variante por Defecto</Label>
                <RadioGroup
                  value={productVariants.find(pv => pv.is_default)?.id || ''}
                  onValueChange={(value) => setDefaultVariant(value)}
                  className="mt-2"
                >
                  {productVariants.map((pv) => (
                    <div key={pv.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={pv.id} id={`default-${pv.id}`} />
                      <Label htmlFor={`default-${pv.id}`}>
                        {pv.variant?.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Variants Configuration */}
            <div className="space-y-4">
              {categoryVariants.map((variant) => {
                const productVariant = productVariants.find(
                  pv => pv.category_variant_id === variant.id
                );
                const isEnabled = !!productVariant;

                return (
                  <Card key={variant.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => toggleVariant(variant.id, checked)}
                          />
                          <div>
                            <p className="font-medium">{variant.name}</p>
                            {productVariant?.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                Por defecto
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {isEnabled && productVariant && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`price-${variant.id}`}>Precio</Label>
                            <Input
                              id={`price-${variant.id}`}
                              type="number"
                              value={productVariant.price}
                              onChange={(e) => updateVariantOption(
                                productVariant.id,
                                'price',
                                parseInt(e.target.value) || 0
                              )}
                              min="0"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatPrice(productVariant.price)}
                            </p>
                          </div>
                          <div>
                            <Label htmlFor={`sku-${variant.id}`}>SKU (Opcional)</Label>
                            <Input
                              id={`sku-${variant.id}`}
                              value={productVariant.sku || ''}
                              onChange={(e) => updateVariantOption(
                                productVariant.id,
                                'sku',
                                e.target.value
                              )}
                              placeholder="Código de producto"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`stock-${variant.id}`}>Stock</Label>
                            <Input
                              id={`stock-${variant.id}`}
                              type="number"
                              value={productVariant.stock}
                              onChange={(e) => updateVariantOption(
                                productVariant.id,
                                'stock',
                                parseInt(e.target.value) || 0
                              )}
                              min="0"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Para uso futuro con inventario
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductVariantsManagement;