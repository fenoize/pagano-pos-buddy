import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from './ImageUpload';
import { CategoryManagement } from './CategoryManagement';
import { ExtrasManagement } from './ExtrasManagement';
import { ModifiersManagement } from './ModifiersManagement';
import ProductVariantsManagementEnhanced from './ProductVariantsManagementEnhanced';
import ComboManagement from './ComboManagement';
import ProductVariantGroupsAssignment from './ProductVariantGroupsAssignment';
import { AlertTriangle, Package } from 'lucide-react';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { toast } from "sonner";
interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onProductUpdated: () => void;
}

export function ProductEditModal({ isOpen, onClose, product, onProductUpdated }: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    image_url: '',
    show_in_pos: true,
    show_in_app: true,
    show_in_web: true,
    raw_material_id: '' as string | null
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [isComboProduct, setIsComboProduct] = useState(false);
  const { materials } = useRawMaterials();
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: (product as any).description || '',
        active: product.active,
        image_url: product.image_url || '',
        show_in_pos: (product as any).show_in_pos ?? true,
        show_in_app: (product as any).show_in_app ?? true,
        show_in_web: (product as any).show_in_web ?? true,
        raw_material_id: (product as any).raw_material_id || null
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

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      toast.error("Error", { description: "Debe seleccionar al menos una categoría" });
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
            description: formData.description || null,
            active: formData.active,
            image_url: formData.image_url || null,
            show_in_pos: formData.show_in_pos,
            show_in_app: formData.show_in_app,
            raw_material_id: formData.raw_material_id || null,
            prices: { combo: {}, only: {} } // Default empty prices for backward compatibility
          } as any)
          .eq('id', product.id);

        if (error) throw error;
      } else {
        // Crear nuevo producto
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            description: formData.description || null,
            active: formData.active,
            image_url: formData.image_url || null,
            show_in_pos: formData.show_in_pos,
            show_in_app: formData.show_in_app,
            raw_material_id: formData.raw_material_id || null,
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

      toast.success("Éxito", { description: product ? "Producto actualizado correctamente" : "Producto creado correctamente" });

      onProductUpdated();
      onClose();
    } catch (error: any) {
      toast.error("Error", { description: error.message || "No se pudo guardar el producto" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      active: true,
      image_url: '',
      show_in_pos: true,
      show_in_app: true,
      raw_material_id: null
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
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

          <div>
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

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (visible en App Cliente)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción breve del producto..."
                  className="min-h-[80px] resize-none"
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

              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium">Visibilidad</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show_in_pos"
                    checked={formData.show_in_pos}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_in_pos: checked })}
                  />
                  <Label htmlFor="show_in_pos">Mostrar en POS</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show_in_app"
                    checked={formData.show_in_app}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_in_app: checked })}
                  />
                  <Label htmlFor="show_in_app">Mostrar en App Cliente</Label>
                </div>
              </div>

              {/* Inventario - Materia Prima Directa */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Inventario (Producto Simple)</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para productos sin receta (ej: bebidas), vincula directamente a una materia prima para descuento 1:1.
                </p>
                <Select
                  value={formData.raw_material_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, raw_material_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin vinculación directa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vinculación directa</SelectItem>
                    {materials.filter(m => m.is_active).map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.code ? `${material.code} - ` : ""}{material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagement
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
              />
            </TabsContent>

            <TabsContent value="variants">
              {isComboProduct ? (
                <div className="p-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium text-foreground">
                    Producto configurado como Combo
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Los combos no tienen variables propias. Las variables (como Proteína o Tamaño) se heredan de los productos que componen el combo. Configura las variables directamente en cada producto hijo.
                  </p>
                </div>
              ) : (
                <>
                  <ProductVariantsManagementEnhanced
                    productId={product?.id}
                    categoryIds={selectedCategories}
                  />
                  <div className="mt-6">
                    <ProductVariantGroupsAssignment productId={product?.id} />
                  </div>
                </>
              )}
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
              <Button type="button" onClick={handleSave}>
                {product ? 'Actualizar' : 'Crear'}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}