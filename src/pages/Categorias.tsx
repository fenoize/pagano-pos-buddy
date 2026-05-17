import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryVariantsManagement from "@/components/pos/CategoryVariantsManagement";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductCount {
  category_id: string;
  count: number;
}

export default function Categorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeleteingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Obtener categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;

      // Obtener conteo de productos por categoría
      const { data: countsData, error: countsError } = await supabase
        .from("product_categories")
        .select("category_id");

      if (countsError) throw countsError;
      
      const counts = (countsData || []).reduce((acc: Record<string, number>, item) => {
        acc[item.category_id] = (acc[item.category_id] || 0) + 1;
        return acc;
      }, {});
      
      const productCountsArray = Object.entries(counts).map(([category_id, count]) => ({
        category_id,
        count: count as number
      }));

      setCategories(categoriesData || []);
      setProductCounts(productCountsArray);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error", { description: "Error al cargar las categorías" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Error", { description: "El nombre de la categoría es obligatorio" });
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            active: formData.active,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;

        toast.success("Éxito", { description: "Categoría actualizada correctamente" });
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            active: formData.active,
          });

        if (error) throw error;

        toast.success("Éxito", { description: "Categoría creada correctamente" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Error", { description: "Error al guardar la categoría" });
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    const productsCount = productCounts.find(p => p.category_id === deletingCategory.id)?.count || 0;

    try {
      if (productsCount > 0) {
        // Soft delete - desactivar categoría
        const { error } = await supabase
          .from("categories")
          .update({ active: false })
          .eq("id", deletingCategory.id);

        if (error) throw error;

        toast.success("Categoría desactivada", { description: `La categoría tiene ${productsCount} producto(s) asociado(s) y ha sido desactivada. Los productos no se mostrarán en el POS.` });
      } else {
        // Eliminar completamente
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", deletingCategory.id);

        if (error) throw error;

        toast.success("Éxito", { description: "Categoría eliminada correctamente" });
      }

      setIsDeleteDialogOpen(false);
      setDeleteingCategory(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Error", { description: "Error al eliminar la categoría" });
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      active: category.active,
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingCategory(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      active: true,
    });
    setEditingCategory(null);
  };

  const getProductCount = (categoryId: string) => {
    return productCounts.find(p => p.category_id === categoryId)?.count || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-end items-center mb-8">
        <Button onClick={openNewDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id} className={!category.active ? "opacity-60" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                {category.name}
                {!category.active && (
                  <EyeOff className="ml-2 h-4 w-4 text-muted-foreground" />
                )}
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(category)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeleteingCategory(category);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {category.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {category.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <Badge variant={category.active ? "default" : "secondary"}>
                  {category.active ? "Activa" : "Inactiva"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {getProductCount(category.id)} producto(s)
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog para crear/editar categoría */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="variants" disabled={!editingCategory}>
                Variantes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nombre de la categoría"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descripción opcional"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                  <Label htmlFor="active">Categoría activa</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingCategory ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="variants">
              {editingCategory && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-4">
                      Variantes de {editingCategory.name}
                    </h3>
                    <CategoryVariantsManagement categoryId={editingCategory.id} />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCategory && (
                <>
                  {getProductCount(deletingCategory.id) > 0 ? (
                    <div className="space-y-2">
                      <p>
                        La categoría "{deletingCategory.name}" tiene{" "}
                        {getProductCount(deletingCategory.id)} producto(s) asociado(s).
                      </p>
                      <p className="font-medium">
                        La categoría será desactivada y los productos no se mostrarán en el POS.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Para eliminar completamente, primero reasigne los productos a otra categoría.
                      </p>
                    </div>
                  ) : (
                    <p>
                      ¿Está seguro de que desea eliminar la categoría "{deletingCategory.name}"?
                      Esta acción no se puede deshacer.
                    </p>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deletingCategory && getProductCount(deletingCategory.id) > 0
                ? "Desactivar"
                : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}