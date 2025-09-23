import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CategoryVariant } from "@/types";

interface CategoryVariantsManagementProps {
  categoryId?: string;
}

const CategoryVariantsManagement: React.FC<CategoryVariantsManagementProps> = ({ categoryId }) => {
  const [variants, setVariants] = useState<CategoryVariant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<CategoryVariant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    active: true,
    display_order: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (categoryId) {
      fetchVariants();
    }
  }, [categoryId]);

  const fetchVariants = async () => {
    if (!categoryId) return;

    try {
      const { data, error } = await supabase
        .from('category_variants')
        .select('*')
        .eq('category_id', categoryId)
        .order('display_order');

      if (error) throw error;
      setVariants(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar las variantes",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    try {
      if (editingVariant) {
        const { error } = await supabase
          .from('category_variants')
          .update({
            name: formData.name,
            active: formData.active,
            display_order: formData.display_order,
          })
          .eq('id', editingVariant.id);

        if (error) throw error;
        toast({
          title: "Éxito",
          description: "Variante actualizada correctamente",
        });
      } else {
        const { error } = await supabase
          .from('category_variants')
          .insert({
            category_id: categoryId,
            name: formData.name,
            active: formData.active,
            display_order: formData.display_order,
          });

        if (error) throw error;
        toast({
          title: "Éxito",
          description: "Variante creada correctamente",
        });
      }

      fetchVariants();
      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar la variante",
        variant: "destructive",
      });
    }
  };

  const deleteVariant = async (variant: CategoryVariant) => {
    if (!window.confirm(`¿Estás seguro de eliminar la variante "${variant.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('category_variants')
        .delete()
        .eq('id', variant.id);

      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Variante eliminada correctamente",
      });
      fetchVariants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar la variante",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (variant: CategoryVariant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      active: variant.active,
      display_order: variant.display_order,
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingVariant(null);
    setFormData({
      name: '',
      active: true,
      display_order: variants.length + 1,
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingVariant(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      active: true,
      display_order: 0,
    });
  };

  if (!categoryId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Selecciona una categoría para gestionar sus variantes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Variantes de la Categoría</CardTitle>
          <Button onClick={openNewDialog} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Variante
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <p className="text-muted-foreground">
            No hay variantes configuradas para esta categoría.
          </p>
        ) : (
          <div className="space-y-2">
            {variants.map((variant) => (
              <Card key={variant.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Orden: {variant.display_order}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={variant.active}
                        onCheckedChange={async (checked) => {
                          try {
                            await supabase
                              .from('category_variants')
                              .update({ active: checked })
                              .eq('id', variant.id);
                            fetchVariants();
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Error al actualizar estado",
                              variant: "destructive",
                            });
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(variant)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteVariant(variant)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVariant ? 'Editar Variante' : 'Nueva Variante'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Simple, Doble, Triple"
                  required
                />
              </div>
              <div>
                <Label htmlFor="display_order">Orden de Visualización</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  min="0"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Activo</Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit">
                  {editingVariant ? 'Actualizar' : 'Crear'}
                </Button>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CategoryVariantsManagement;