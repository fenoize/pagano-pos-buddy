import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { Recipe, RecipeIngredient } from "@/types";
import { useUOM } from "@/hooks/useUOM";
import { useRawMaterials } from "@/hooks/useRawMaterials";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecipeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: Recipe;
  onSave: (
    recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'ingredients'>,
    ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at' | 'updated_at'>[]
  ) => void;
}

export function RecipeForm({ open, onOpenChange, recipe, onSave }: RecipeFormProps) {
  const { uoms } = useUOM();
  const { materials } = useRawMaterials();
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    product_id: "",
    category_variant_id: "",
    name: "",
    description: "",
    yield_quantity: 1,
    yield_uom_id: "",
    preparation_notes: "",
    is_active: true,
  });

  const [ingredients, setIngredients] = useState<Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at' | 'updated_at'>[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchVariants();
  }, []);

  useEffect(() => {
    if (recipe) {
      setFormData({
        product_id: recipe.product_id,
        category_variant_id: recipe.category_variant_id || "",
        name: recipe.name,
        description: recipe.description || "",
        yield_quantity: recipe.yield_quantity,
        yield_uom_id: recipe.yield_uom_id || "",
        preparation_notes: recipe.preparation_notes || "",
        is_active: recipe.is_active,
      });
      
      if (recipe.ingredients) {
        setIngredients(recipe.ingredients.map(ing => ({
          raw_material_id: ing.raw_material_id,
          quantity_per_unit: ing.quantity_per_unit,
          uom_id: ing.uom_id,
          is_optional: ing.is_optional,
          is_active: ing.is_active,
          notes: ing.notes,
        })));
      }
    } else {
      resetForm();
    }
  }, [recipe, open]);

  const resetForm = () => {
    setFormData({
      product_id: "",
      category_variant_id: "",
      name: "",
      description: "",
      yield_quantity: 1,
      yield_uom_id: "",
      preparation_notes: "",
      is_active: true,
    });
    setIngredients([]);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('active', true)
      .order('name');
    setProducts(data || []);
  };

  const fetchVariants = async () => {
    const { data } = await supabase
      .from('category_variants')
      .select('id, name, category_id')
      .eq('active', true)
      .order('name');
    setVariants(data || []);
  };

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        raw_material_id: "",
        quantity_per_unit: 0,
        uom_id: "",
        is_optional: false,
        is_active: true,
        notes: "",
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.name || ingredients.length === 0) {
      return;
    }
    onSave(formData, ingredients);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? "Editar Receta" : "Nueva Receta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Datos Generales</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredientes ({ingredients.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_id">Producto *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category_variant_id">Variante</Label>
                  <Select
                    value={formData.category_variant_id}
                    onValueChange={(value) => setFormData({ ...formData, category_variant_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin variante (receta general)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin variante</SelectItem>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Nombre de la receta *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Hamburguesa Simple"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yield_quantity">Rendimiento (cantidad)</Label>
                  <Input
                    id="yield_quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.yield_quantity}
                    onChange={(e) => setFormData({ ...formData, yield_quantity: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="yield_uom_id">Unidad de rendimiento</Label>
                  <Select
                    value={formData.yield_uom_id}
                    onValueChange={(value) => setFormData({ ...formData, yield_uom_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {uoms.map((uom) => (
                        <SelectItem key={uom.id} value={uom.id}>
                          {uom.name} ({uom.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="preparation_notes">Notas de preparación</Label>
                <Textarea
                  id="preparation_notes"
                  value={formData.preparation_notes}
                  onChange={(e) => setFormData({ ...formData, preparation_notes: e.target.value })}
                  rows={3}
                  placeholder="Instrucciones especiales..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Receta activa</Label>
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Agrega los ingredientes necesarios para esta receta
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddIngredient}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar ingrediente
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Materia Prima</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Opcional</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No hay ingredientes. Agrega al menos uno.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ingredients.map((ing, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={ing.raw_material_id}
                              onValueChange={(value) => handleIngredientChange(index, 'raw_material_id', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {materials.filter(m => m.is_active).map((m) => (
                                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={ing.quantity_per_unit}
                              onChange={(e) => handleIngredientChange(index, 'quantity_per_unit', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={ing.uom_id}
                              onValueChange={(value) => handleIngredientChange(index, 'uom_id', value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="UOM" />
                              </SelectTrigger>
                              <SelectContent>
                                {uoms.map((uom) => (
                                  <SelectItem key={uom.id} value={uom.id}>
                                    {uom.abbreviation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={ing.is_optional}
                              onCheckedChange={(checked) => handleIngredientChange(index, 'is_optional', checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveIngredient(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.product_id || !formData.name || ingredients.length === 0}>
              Guardar Receta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
