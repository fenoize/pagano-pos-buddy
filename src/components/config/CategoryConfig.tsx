import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Grip, Star } from 'lucide-react';
import { usePOSConfig } from '@/hooks/usePOSConfig';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  display_order: number;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

// Sortable Category Item Component
function SortableCategoryItem({ 
  category, 
  onEdit, 
  onDelete, 
  onToggleActive,
  onSetDefault
}: { 
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onSetDefault: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <Grip className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{category.name}</h4>
              <Badge variant={category.active ? "default" : "secondary"}>
                {category.active ? 'Activa' : 'Inactiva'}
              </Badge>
              {category.is_default && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <Star className="w-3 h-3 mr-1 fill-yellow-600" />
                  Predeterminada
                </Badge>
              )}
            </div>
            {category.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {category.description}
              </p>
            )}
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSetDefault}
              title={category.is_default ? 'Es la predeterminada' : 'Establecer como predeterminada'}
              disabled={category.is_default}
            >
              <Star className={`w-4 h-4 ${category.is_default ? 'fill-yellow-600 text-yellow-600' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleActive}
              title={category.active ? 'Desactivar' : 'Activar'}
            >
              <Switch checked={category.active} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryConfig() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    show_in_pos: true,
    show_in_app: true
  });
  const { config, updateGridColumns, updateShowVariantStock } = usePOSConfig();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
    if (!confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?\n\nEsta acción no se puede deshacer.`)) {
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

  const toggleActive = async (category: Category) => {
    try {
      // Si se desactiva la categoría por defecto, quitarle el flag
      const updates: any = { active: !category.active };
      if (category.is_default && !category.active) {
        updates.is_default = false;
      }

      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', category.id);

      if (error) throw error;
      
      fetchCategories();
      toast.success("Éxito", { description: `Categoría ${!category.active ? 'activada' : 'desactivada'} correctamente` });
    } catch (error: any) {
      toast.error("Error", { description: error.message || "No se pudo actualizar la categoría" });
    }
  };

  const setDefaultCategory = async (categoryId: string) => {
    try {
      // Desmarcar todas las demás como default
      await supabase
        .from('categories')
        .update({ is_default: false })
        .neq('id', categoryId);
      
      // Marcar la seleccionada como default
      const { error } = await supabase
        .from('categories')
        .update({ is_default: true })
        .eq('id', categoryId);

      if (error) throw error;
      
      fetchCategories();
      toast.success("Éxito", { description: "Categoría predeterminada actualizada" });
    } catch (error: any) {
      toast.error("Error", { description: error.message || "No se pudo actualizar la categoría predeterminada" });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    
    const newOrder = arrayMove(categories, oldIndex, newIndex);
    setCategories(newOrder);
    
    // Actualizar display_order en base de datos
    try {
      const updates = newOrder.map((cat, index) => ({
        id: cat.id,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('categories')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      toast.success("Éxito", { description: "Orden de categorías actualizado" });
    } catch (error: any) {
      console.error('Error updating category order:', error);
      toast.error("Error", { description: "No se pudo actualizar el orden" });
      fetchCategories(); // Revert on error
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      active: category.active,
      show_in_pos: (category as any).show_in_pos ?? true,
      show_in_app: (category as any).show_in_app ?? true
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
      active: true,
      show_in_pos: true,
      show_in_app: true
    });
  };

  return (
    <div className="space-y-4">
      {/* Configuración de Visualización del POS */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Visualización del POS</CardTitle>
          <CardDescription>
            Define cuántas columnas se mostrarán en la grilla de productos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Columnas en grilla de productos</Label>
            <div className="flex gap-2 mt-2">
              {[3, 4, 5, 6].map(num => (
                <Button
                  key={num}
                  variant={config.gridColumns === num ? "default" : "outline"}
                  onClick={() => updateGridColumns(num)}
                  className="flex-1"
                >
                  {num}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Actualmente: <strong>{config.gridColumns} columnas</strong>
            </p>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="showVariantStock">Mostrar stock en variantes</Label>
                <p className="text-sm text-muted-foreground">
                  Muestra la cantidad disponible en variantes vinculadas a inventario
                </p>
              </div>
              <Switch
                id="showVariantStock"
                checked={config.showVariantStock}
                onCheckedChange={updateShowVariantStock}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Categorías */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Categorías del Sistema</CardTitle>
              <CardDescription>
                Arrastra para reordenar, marca la predeterminada con ⭐
              </CardDescription>
            </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
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
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej: Hamburguesas, Bebidas, Papas..."
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional de la categoría"
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
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay categorías configuradas.</p>
            <p className="text-sm mt-2">Crea la primera categoría para comenzar.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {categories.map((category) => (
                  <SortableCategoryItem
                    key={category.id}
                    category={category}
                    onEdit={() => openEditDialog(category)}
                    onDelete={() => deleteCategory(category)}
                    onToggleActive={() => toggleActive(category)}
                    onSetDefault={() => setDefaultCategory(category.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">💡 Información</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Arrastra las categorías para cambiar su orden en el POS</li>
            <li>• La categoría con ⭐ será la seleccionada al abrir "Nueva Venta"</li>
            <li>• Las categorías activas se muestran en el POS como tabs de filtrado</li>
            <li>• Los productos se asocian a estas categorías desde el módulo de Productos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
