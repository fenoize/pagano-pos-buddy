import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from './ImageUpload';
import { CategoryManagement } from './CategoryManagement';
import { ExtrasManagement } from './ExtrasManagement';
import { ModifiersManagement } from './ModifiersManagement';
import ProductVariantsManagementEnhanced from './ProductVariantsManagementEnhanced';
import ComboManagement from './ComboManagement';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onProductUpdated: () => void;
}

export function ProductEditModal({ isOpen, onClose, product, onProductUpdated }: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    active: true,
    image_url: ''
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [isComboProduct, setIsComboProduct] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        active: product.active,
        image_url: product.image_url || ''
      });
      
      // Cargar categorías del producto
      if (product.id) {
        fetchProductCategories(product.id);
        checkIfComboProduct(product.id);
      }
    } else {
      resetForm();
    }
  }, [product, isOpen]);

  const checkIfComboProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('combo_products')
        .select('id')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) throw error;
      setIsComboProduct(!!data);
    } catch (error) {
      console.error('Error checking combo product:', error);
      setIsComboProduct(false);
    }
  };

  const fetchProductCategories = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('category_id')
        .eq('product_id', productId);

      if (error) throw error;
      setSelectedCategories(data?.map(pc => pc.category_id) || []);
    } catch (error) {
      console.error('Error fetching product categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos una categoría",
        variant: "destructive"
      });
      return;
    }

    try {
      let productId = product?.id;

      if (product) {
        // Actualizar producto existente
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            active: formData.active,
            image_url: formData.image_url || null,
            prices: { combo: {}, only: {} } // Default empty prices for backward compatibility
          })
          .eq('id', product.id);

        if (error) throw error;
      } else {
        // Crear nuevo producto
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            active: formData.active,
            image_url: formData.image_url || null,
            prices: { combo: {}, only: {} } // Default empty prices for backward compatibility
          })
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Actualizar categorías del producto
      if (productId) {
        // Eliminar categorías existentes
        await supabase
          .from('product_categories')
          .delete()
          .eq('product_id', productId);

        // Insertar nuevas categorías
        if (selectedCategories.length > 0) {
          const categoryInserts = selectedCategories.map(categoryId => ({
            product_id: productId,
            category_id: categoryId
          }));

          const { error: categoryError } = await supabase
            .from('product_categories')
            .insert(categoryInserts);

          if (categoryError) throw categoryError;
        }
      }

      toast({
        title: "Éxito",
        description: product ? "Producto actualizado correctamente" : "Producto creado correctamente"
      });

      onProductUpdated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el producto",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      active: true,
      image_url: ''
    });
    setSelectedCategories([]);
    setActiveTab('general');
    setIsComboProduct(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    // Solo cerrar si explícitamente se cambia a false
    // Ignorar cambios automáticos causados por re-renders
    if (!open) {
      console.log('Dialog closing triggered by user interaction');
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
            <TabsTrigger value="variants">Variantes</TabsTrigger>
            <TabsTrigger value="combos">Combos</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
            <TabsTrigger value="modifiers">Modificadores</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="general" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <ImageUpload
                imageUrl={formData.image_url}
                onImageChange={(url) => setFormData({ ...formData, image_url: url || '' })}
                productName={formData.name}
              />

              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Los precios ahora se configuran por variante en la pestaña "Variantes". 
                  Primero selecciona las categorías del producto, luego ve a la pestaña "Variantes" para configurar los precios específicos.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Producto activo</Label>
              </div>
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagement
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
              />
            </TabsContent>

            <TabsContent value="variants">
              {isComboProduct && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                        Producto configurado como Combo
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Este producto está configurado como combo. Los precios se gestionan desde la configuración de combo, 
                        no desde las variantes individuales. Ve a la pestaña "Combos" para modificar la configuración de precios.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <ProductVariantsManagementEnhanced
                productId={product?.id}
                categoryIds={selectedCategories}
              />
            </TabsContent>

            <TabsContent value="combos">
              <ComboManagement
                productId={product?.id}
              />
            </TabsContent>

            <TabsContent value="extras">
              <ExtrasManagement
                selectedCategories={selectedCategories}
              />
            </TabsContent>

            <TabsContent value="modifiers">
              <ModifiersManagement
                productId={product?.id}
              />
            </TabsContent>

            <div className="flex gap-2 mt-6">
              <Button type="submit">
                {product ? 'Actualizar' : 'Crear'}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}