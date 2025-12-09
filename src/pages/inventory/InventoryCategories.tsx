import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tags, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  materials_count?: number;
}

const DEFAULT_CATEGORIES = [
  "Carnes",
  "Lácteos",
  "Vegetales",
  "Salsas",
  "Panes",
  "Bebidas",
  "Packaging",
  "Insumos",
  "Otros"
];

export default function InventoryCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<InventoryCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sort_order: 0,
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Get unique categories from raw_materials
      const { data: materials, error } = await supabase
        .from('raw_materials')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;

      // Count materials per category
      const categoryCount = new Map<string, number>();
      (materials || []).forEach(m => {
        const cat = m.category || 'Sin categoría';
        categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
      });

      // Build categories list from defaults + existing
      const allCategories = new Set([...DEFAULT_CATEGORIES]);
      categoryCount.forEach((_, cat) => {
        if (cat !== 'Sin categoría') {
          allCategories.add(cat);
        }
      });

      const categoriesList: InventoryCategory[] = Array.from(allCategories).map((name, index) => ({
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name,
        description: null,
        is_active: true,
        sort_order: DEFAULT_CATEGORIES.indexOf(name) >= 0 ? DEFAULT_CATEGORIES.indexOf(name) : 100 + index,
        created_at: new Date().toISOString(),
        materials_count: categoryCount.get(name) || 0,
      }));

      // Add "Sin categoría" if there are uncategorized materials
      const uncategorizedCount = categoryCount.get('Sin categoría') || 0;
      if (uncategorizedCount > 0) {
        categoriesList.push({
          id: 'sin_categoria',
          name: 'Sin categoría',
          description: 'Materias primas sin categoría asignada',
          is_active: true,
          sort_order: 999,
          created_at: new Date().toISOString(),
          materials_count: uncategorizedCount,
        });
      }

      // Sort by sort_order
      categoriesList.sort((a, b) => a.sort_order - b.sort_order);

      setCategories(categoriesList);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las categorías',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ name: "", description: "", sort_order: categories.length });
    setShowForm(true);
  };

  const handleEdit = (category: InventoryCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      sort_order: category.sort_order,
    });
    setShowForm(true);
  };

  const handleDeleteClick = (category: InventoryCategory) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      // Update materials with this category to null
      const { error } = await supabase
        .from('raw_materials')
        .update({ category: null })
        .eq('category', categoryToDelete.name);

      if (error) throw error;

      toast({
        title: 'Categoría eliminada',
        description: `Se removió la categoría "${categoryToDelete.name}" de las materias primas`,
      });

      setShowDeleteDialog(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la categoría',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingCategory) {
        // Update all materials with old category name to new name
        const { error } = await supabase
          .from('raw_materials')
          .update({ category: formData.name.trim() })
          .eq('category', editingCategory.name);

        if (error) throw error;

        toast({
          title: 'Categoría actualizada',
          description: `Se actualizó "${editingCategory.name}" a "${formData.name.trim()}"`,
        });
      } else {
        // Check if category already exists
        if (categories.some(c => c.name.toLowerCase() === formData.name.trim().toLowerCase())) {
          toast({
            title: 'Error',
            description: 'Ya existe una categoría con ese nombre',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Categoría creada',
          description: `La categoría "${formData.name.trim()}" está disponible para asignar a materias primas`,
        });
      }

      setShowForm(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la categoría',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Tags className="h-8 w-8" />
            Categorías de Inventario
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las categorías para organizar las materias primas
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Categorías Disponibles
            <Badge variant="outline" className="ml-2">
              {categories.length} categorías
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Materias Primas</TableHead>
                  <TableHead className="text-center">Orden</TableHead>
                  <TableHead className="text-center w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay categorías definidas
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ 
                              backgroundColor: `hsl(${(DEFAULT_CATEGORIES.indexOf(category.name) * 40) % 360}, 70%, 50%)` 
                            }}
                          />
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={category.materials_count && category.materials_count > 0 ? "default" : "secondary"}>
                          {category.materials_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {category.sort_order}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(category)}
                            title="Editar"
                            disabled={category.name === 'Sin categoría'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(category)}
                            title="Eliminar"
                            disabled={category.name === 'Sin categoría' || !category.materials_count}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Carnes, Bebidas, Packaging..."
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <div>
              <Label htmlFor="sort_order">Orden de visualización</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se removerá la categoría "{categoryToDelete?.name}" de las {categoryToDelete?.materials_count || 0} materias primas asociadas.
              Las materias primas quedarán sin categoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
