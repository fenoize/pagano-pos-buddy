import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Settings, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ComboProduct, ComboItem, Category, Product, PricingMode } from "@/types";

interface ComboManagementProps {
  productId?: string;
}

const ComboManagement: React.FC<ComboManagementProps> = ({ productId }) => {
  const [isCombo, setIsCombo] = useState(false);
  const [comboConfig, setComboConfig] = useState<ComboProduct | null>(null);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryVariants, setCategoryVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (productId) {
      fetchComboData();
    }
    fetchCategories();
    fetchProducts();
    fetchCategoryVariants();
  }, [productId]);

  const fetchComboData = async () => {
    if (!productId) return;

    try {
      // Check if product is a combo
      const { data: comboData, error: comboError } = await supabase
        .from('combo_products')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (comboError) throw comboError;

      if (comboData) {
        setIsCombo(true);
        setComboConfig(comboData as ComboProduct);

        // Fetch combo items
        const { data: itemsData, error: itemsError } = await supabase
          .from('combo_items')
          .select(`
            *,
            category:categories(*),
            default_product:products(*),
            default_variant:category_variants(*)
          `)
          .eq('combo_product_id', comboData.id)
          .order('display_order');

        if (itemsError) throw itemsError;
        setComboItems((itemsData || []) as unknown as ComboItem[]);
      } else {
        setIsCombo(false);
        setComboConfig(null);
        setComboItems([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar la configuración de combo",
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:product_categories(
            category:categories(*)
          )
        `)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedProducts = (data || []).map(product => ({
        ...product,
        categories: product.categories?.map((pc: any) => pc.category).filter(Boolean) || []
      }));
      
      setProducts(transformedProducts as unknown as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const toggleCombo = async (enabled: boolean) => {
    if (!productId) return;

    setLoading(true);
    try {
      if (enabled) {
        // Create combo configuration
        const { data, error } = await supabase
          .from('combo_products')
          .insert({
            product_id: productId,
            pricing_mode: 'fixed',
            base_price: 0,
            combo_discount: 0,
            included_variants: false,
            active: true,
          })
          .select()
          .single();

        if (error) throw error;
        setComboConfig(data as ComboProduct);
        setIsCombo(true);
      } else {
        // Remove combo configuration
        if (comboConfig) {
          const { error } = await supabase
            .from('combo_products')
            .delete()
            .eq('id', comboConfig.id);

          if (error) throw error;
        }
        setComboConfig(null);
        setComboItems([]);
        setIsCombo(false);
      }

      toast({
        title: "Éxito",
        description: enabled ? "Combo habilitado" : "Combo deshabilitado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar configuración de combo",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const updateComboConfig = async (field: keyof ComboProduct, value: any) => {
    if (!comboConfig) return;

    try {
      const { error } = await supabase
        .from('combo_products')
        .update({ [field]: value })
        .eq('id', comboConfig.id);

      if (error) throw error;

      setComboConfig({ ...comboConfig, [field]: value });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar configuración",
        variant: "destructive",
      });
    }
  };

  const addComboItem = async () => {
    if (!comboConfig || categories.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('combo_items')
        .insert({
          combo_product_id: comboConfig.id,
          category_id: categories[0].id,
          quantity: 1,
          allow_customization: true,
          allow_variant_change: true,
          display_order: comboItems.length,
        })
        .select(`
          *,
          category:categories(*),
          default_product:products(*),
          default_variant:category_variants(*)
        `)
        .single();

      if (error) throw error;
      setComboItems([...comboItems, data as unknown as ComboItem]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al agregar slot de combo",
        variant: "destructive",
      });
    }
  };

  const updateComboItem = async (itemId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('combo_items')
        .update({ [field]: value })
        .eq('id', itemId);

      if (error) throw error;

      setComboItems(items => 
        items.map(item => 
          item.id === itemId ? { ...item, [field]: value } : item
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar slot",
        variant: "destructive",
      });
    }
  };

  const removeComboItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('combo_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setComboItems(items => items.filter(item => item.id !== itemId));
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar slot",
        variant: "destructive",
      });
    }
  };

  const fetchCategoryVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('category_variants')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCategoryVariants(data || []);
    } catch (error) {
      console.error('Error fetching category variants:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getVariantsForCategory = (categoryId: string) => {
    return categoryVariants.filter(variant => variant.category_id === categoryId);
  };

  if (!productId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Guarda el producto primero para configurar combos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle Combo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Configuración de Combo
            <Switch
              checked={isCombo}
              onCheckedChange={toggleCombo}
              disabled={loading}
            />
          </CardTitle>
        </CardHeader>
        {isCombo && comboConfig && (
          <CardContent className="space-y-4">
            {/* Validación de precio base - solo en modo fijo */}
            {comboConfig.pricing_mode === 'fixed' && comboConfig.base_price <= 0 && (
              <div className="flex items-center space-x-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">El precio base debe ser mayor a $0 en modo precio fijo</span>
              </div>
            )}
            {comboConfig.pricing_mode === 'individual' && (
              <div className="flex items-center space-x-2 p-3 bg-primary/10 text-primary rounded-lg">
                <Settings className="h-4 w-4" />
                <span className="text-sm">Modo dinámico: el precio será la suma de los productos seleccionados en cada slot, menos el descuento configurado. El precio base es opcional y se suma al total.</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Modo de Precio</Label>
                <RadioGroup
                  value={comboConfig.pricing_mode}
                  onValueChange={(value: PricingMode) => updateComboConfig('pricing_mode', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">Precio Fijo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="dynamic" />
                    <Label htmlFor="dynamic">Precio Dinámico (suma de productos)</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>{comboConfig.pricing_mode === 'fixed' ? 'Precio Base *' : 'Precio Base (opcional)'}</Label>
                <Input
                  type="number"
                  value={comboConfig.base_price}
                  onChange={(e) => updateComboConfig('base_price', parseInt(e.target.value) || 0)}
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatPrice(comboConfig.base_price)}
                  {comboConfig.pricing_mode === 'individual' && comboConfig.base_price === 0 && ' (solo suma de productos)'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Descuento del Combo</Label>
                <Input
                  type="number"
                  value={comboConfig.combo_discount}
                  onChange={(e) => updateComboConfig('combo_discount', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Solo aplica en modo dinámico
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={comboConfig.included_variants}
                  onCheckedChange={(checked) => updateComboConfig('included_variants', checked)}
                />
                <Label>Variantes incluidas en precio base</Label>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Combo Items */}
      {isCombo && comboConfig && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Slots del Combo</CardTitle>
              <Button onClick={addComboItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Slot
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {comboItems.length === 0 ? (
              <p className="text-muted-foreground">
                No hay slots configurados. Agrega al menos uno para definir el combo.
              </p>
            ) : (
              <div className="space-y-4">
                {comboItems.map((item, index) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="outline">Slot {index + 1}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeComboItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Categoría</Label>
                          <Select
                            value={item.category_id}
                            onValueChange={(value) => {
                              updateComboItem(item.id, 'category_id', value);
                              // Reset product and variant when category changes
                              updateComboItem(item.id, 'default_product_id', null);
                              updateComboItem(item.id, 'default_variant_id', null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateComboItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Producto por Defecto</Label>
                          <Select
                            value={item.default_product_id || undefined}
                            onValueChange={(value) => {
                              updateComboItem(item.id, 'default_product_id', value || null);
                              // Reset variant when product changes
                              updateComboItem(item.id, 'default_variant_id', null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar producto (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {products
                                .filter(p => p.categories?.some(c => c.id === item.category_id))
                                .map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Variante por Defecto</Label>
                          <Select
                            value={item.default_variant_id || undefined}
                            onValueChange={(value) => updateComboItem(item.id, 'default_variant_id', value || null)}
                            disabled={!item.default_product_id}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar variante (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {getVariantsForCategory(item.category_id).map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Información del slot configurado */}
                      {item.default_product_id && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm">
                            <strong>Configurado:</strong>{' '}
                            {item.quantity}x{' '}
                            {products.find(p => p.id === item.default_product_id)?.name || 'Producto no encontrado'}
                            {item.default_variant_id && (
                              <>
                                {' - '}
                                {getVariantsForCategory(item.category_id).find(v => v.id === item.default_variant_id)?.name || 'Variante no encontrada'}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="space-y-3 mt-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={item.allow_variant_change !== false}
                            onCheckedChange={(checked) => updateComboItem(item.id, 'allow_variant_change', checked)}
                          />
                          <Label>Permitir cambio de variante</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={item.allow_customization}
                            onCheckedChange={(checked) => updateComboItem(item.id, 'allow_customization', checked)}
                          />
                          <Label>Permitir personalización</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComboManagement;