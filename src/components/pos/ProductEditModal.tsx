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
import ProductVariantsManagement from './ProductVariantsManagement';
import ComboManagement from './ComboManagement';
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
    prices: {
      combo: { simple: 0, doble: 0, triple: 0 },
      only: { simple: 0, doble: 0, triple: 0 }
    },
    active: true,
    image_url: ''
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        prices: product.prices,
        active: product.active,
        image_url: product.image_url || ''
      });
      
      // Cargar categorías del producto
      if (product.id) {
        fetchProductCategories(product.id);
      }
    } else {
      resetForm();
    }
  }, [product, isOpen]);

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
            prices: formData.prices,
            active: formData.active,
            image_url: formData.image_url || null
          })
          .eq('id', product.id);

        if (error) throw error;
      } else {
        // Crear nuevo producto
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            prices: formData.prices,
            active: formData.active,
            image_url: formData.image_url || null
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
      prices: {
        combo: { simple: 0, doble: 0, triple: 0 },
        only: { simple: 0, doble: 0, triple: 0 }
      },
      active: true,
      image_url: ''
    });
    setSelectedCategories([]);
    setActiveTab('general');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Precios Combo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Simple</Label>
                      <Input
                        type="number"
                        value={formData.prices.combo.simple}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            combo: { ...formData.prices.combo, simple: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Doble</Label>
                      <Input
                        type="number"
                        value={formData.prices.combo.doble}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            combo: { ...formData.prices.combo, doble: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Triple</Label>
                      <Input
                        type="number"
                        value={formData.prices.combo.triple}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            combo: { ...formData.prices.combo, triple: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Precios Solo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Simple</Label>
                      <Input
                        type="number"
                        value={formData.prices.only.simple}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            only: { ...formData.prices.only, simple: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Doble</Label>
                      <Input
                        type="number"
                        value={formData.prices.only.doble}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            only: { ...formData.prices.only, doble: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Triple</Label>
                      <Input
                        type="number"
                        value={formData.prices.only.triple}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            only: { ...formData.prices.only, triple: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
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

            <TabsContent value="variants">
              <ProductVariantsManagement
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