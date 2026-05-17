import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from "sonner";
interface CategoryManagementProps {
  selectedCategories: string[];
  onCategoriesChange: (categoryIds: string[]) => void;
}

export function CategoryManagement({ selectedCategories, onCategoriesChange }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true
  });
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      toast.error("Error", { description: "No se pudieron cargar las categorías" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        
        toast.success("Éxito", { description: "Categoría actualizada correctamente" });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(formData);

        if (error) throw error;
        
        toast.success("Éxito", { description: "Categoría creada correctamente" });
      }

      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error("Error", { description: error.message || "No se pudo guardar la categoría" });
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      
      fetchCategories();
      toast.success("Éxito", { description: "Categoría eliminada correctamente" });
    } catch (error: any) {
      toast.error("Error", { description: error.message || "No se pudo eliminar la categoría" });
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId);
    if (isSelected) {
      onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      active: category.active
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setEditingCategory(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      active: true
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Categorías del Producto</Label>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Categoría activa</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingCategory ? 'Actualizar' : 'Crear'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {categories.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer transition-colors ${
              selectedCategories.includes(category.id)
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => toggleCategorySelection(category.id)}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{category.name}</span>
                    <Badge variant={category.active ? "default" : "secondary"} className="text-xs">
                      {category.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                  )}
                </div>
                
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(category)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCategory(category)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCategories.length === 0 && (
        <p className="text-sm text-muted-foreground">Selecciona al menos una categoría para el producto</p>
      )}
    </div>
  );
}