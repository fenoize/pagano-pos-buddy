import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit2, Trash2, Search, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRecipes } from "@/hooks/useRecipes";
import { RecipeForm } from "@/components/inventory/RecipeForm";
import { Recipe, RecipeIngredient } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function Recipes() {
  const navigate = useNavigate();
  const { recipes, loading, createRecipe, updateRecipe, deleteRecipe, duplicateRecipe } = useRecipes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  const handleOpenDialog = (recipe?: Recipe) => {
    setEditingRecipe(recipe);
    setDialogOpen(true);
  };

  const handleSave = async (
    recipeData: Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'ingredients'>,
    ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at' | 'updated_at'>[]
  ) => {
    if (editingRecipe) {
      await updateRecipe(editingRecipe.id, recipeData);
    } else {
      await createRecipe(recipeData, ingredients);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteRecipe(deletingId);
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleDuplicate = async (recipeId: string) => {
    await duplicateRecipe(recipeId);
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pos/inventario")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Recetas</h1>
            <p className="text-muted-foreground">Composición de productos y consumo automático</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listado de Recetas</CardTitle>
            <div className="flex items-center gap-2 w-80">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredRecipes.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {searchTerm ? "No se encontraron resultados" : "No hay recetas registradas"}
              </div>
            ) : (
              filteredRecipes.map((recipe) => (
                <Collapsible
                  key={recipe.id}
                  open={expandedRecipe === recipe.id}
                  onOpenChange={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                >
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex-1 text-left">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{recipe.name}</h3>
                              {recipe.category_variant && (
                                <Badge variant="outline">{recipe.category_variant.name}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Producto: {recipe.product?.name} • {recipe.ingredients?.filter(i => i.is_active).length || 0} ingredientes
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              recipe.is_active
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {recipe.is_active ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(recipe.id)}
                          title="Duplicar receta"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(recipe)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingId(recipe.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4">
                      <div className="space-y-4">
                        {recipe.description && (
                          <div>
                            <p className="text-sm text-muted-foreground">{recipe.description}</p>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Ingredientes:</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Materia Prima</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead>Opcional</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recipe.ingredients?.filter(i => i.is_active).map((ing) => (
                                <TableRow key={ing.id}>
                                  <TableCell>{ing.raw_material?.name || "—"}</TableCell>
                                  <TableCell>{ing.quantity_per_unit}</TableCell>
                                  <TableCell>{ing.uom?.abbreviation || "—"}</TableCell>
                                  <TableCell>
                                    {ing.is_optional ? (
                                      <Badge variant="secondary">Opcional</Badge>
                                    ) : (
                                      <Badge>Requerido</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {recipe.preparation_notes && (
                          <div>
                            <h4 className="text-sm font-semibold mb-1">Notas de preparación:</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {recipe.preparation_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <RecipeForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recipe={editingRecipe}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              La receta será marcada como inactiva y no se aplicará en nuevos pedidos. Podrás reactivarla después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
