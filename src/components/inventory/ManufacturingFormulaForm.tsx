import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FlaskConical, DollarSign } from "lucide-react";
import { useUOM } from "@/hooks/useUOM";
import { useRawMaterials } from "@/hooks/useRawMaterials";

import { ManufacturingFormula } from "@/hooks/useManufacturingFormulas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface FormulaIngredientRow {
  raw_material_id: string;
  quantity: number;
  uom_id: string;
  notes: string;
}

interface ManufacturingFormulaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formula?: ManufacturingFormula;
  onSave: (
    formula: { raw_material_id: string; name: string; description?: string; yield_quantity: number; yield_uom_id?: string; preparation_notes?: string },
    ingredients: { raw_material_id: string; quantity: number; uom_id?: string; notes?: string }[]
  ) => void;
}

export function ManufacturingFormulaForm({ open, onOpenChange, formula, onSave }: ManufacturingFormulaFormProps) {
  const { uoms } = useUOM();
  const { materials } = useRawMaterials();

  const [formData, setFormData] = useState({
    raw_material_id: "",
    name: "",
    description: "",
    yield_quantity: 1,
    yield_uom_id: "",
    preparation_notes: "",
  });

  const [ingredients, setIngredients] = useState<FormulaIngredientRow[]>([]);

  useEffect(() => {
    if (formula) {
      setFormData({
        raw_material_id: formula.raw_material_id,
        name: formula.name,
        description: formula.description || "",
        yield_quantity: formula.yield_quantity,
        yield_uom_id: formula.yield_uom_id || "",
        preparation_notes: formula.preparation_notes || "",
      });
      if (formula.ingredients) {
        setIngredients(formula.ingredients.filter(i => i.is_active).map(i => ({
          raw_material_id: i.raw_material_id,
          quantity: i.quantity,
          uom_id: i.uom_id || "",
          notes: i.notes || "",
        })));
      }
    } else {
      setFormData({ raw_material_id: "", name: "", description: "", yield_quantity: 1, yield_uom_id: "", preparation_notes: "" });
      setIngredients([]);
    }
  }, [formula, open]);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { raw_material_id: "", quantity: 0, uom_id: "", notes: "" }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  // Auto-fill UOM when selecting a material for ingredient
  const handleIngredientMaterialSelect = (index: number, materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      raw_material_id: materialId,
      uom_id: mat?.base_uom_id || updated[index].uom_id,
    };
    setIngredients(updated);
  };

  // Auto-fill name and UOM when selecting output material
  const handleOutputMaterialSelect = (materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    setFormData(prev => ({
      ...prev,
      raw_material_id: materialId,
      name: prev.name || (mat ? `Fórmula - ${mat.name}` : prev.name),
      yield_uom_id: prev.yield_uom_id || (mat?.base_uom_id || ""),
    }));
  };

  // Calculate estimated cost
  const estimatedCost = ingredients.reduce((sum, ing) => {
    const mat = materials.find(m => m.id === ing.raw_material_id);
    const cost = mat?.last_cost || mat?.avg_cost || 0;
    return sum + (cost * ing.quantity);
  }, 0);

  const costPerUnit = formData.yield_quantity > 0 ? estimatedCost / formData.yield_quantity : 0;

  const activeMaterials = materials.filter(m => m.is_active);
  // For ingredient selection, exclude the output material
  const ingredientMaterials = activeMaterials.filter(m => m.id !== formData.raw_material_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.raw_material_id || !formData.name || ingredients.length < 2) return;
    
    const validIngredients = ingredients.filter(i => i.raw_material_id && i.quantity > 0);
    if (validIngredients.length < 2) return;

    onSave(
      { ...formData, yield_uom_id: formData.yield_uom_id || undefined },
      validIngredients.map(i => ({ ...i, uom_id: i.uom_id || undefined }))
    );
    onOpenChange(false);
  };

  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString("es-CL")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            {formula ? "Editar Fórmula" : "Nueva Fórmula de Fabricación"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Output material */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h3 className="font-semibold text-sm">Producto Fabricado (Salida)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Materia Prima de salida *</Label>
                  <Select
                    value={formData.raw_material_id || "__none__"}
                    onValueChange={v => handleOutputMaterialSelect(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar materia prima" /></SelectTrigger>
                    <SelectContent position="popper" className="z-[9999] max-h-60">
                      <SelectItem value="__none__" disabled>Seleccionar materia prima</SelectItem>
                      {activeMaterials.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    El insumo que se producirá con esta fórmula
                  </p>
                </div>
                <div>
                  <Label>Nombre de la fórmula *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Salsa Ácida"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nombre descriptivo para identificar esta fórmula
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Rendimiento (cantidad) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.yield_quantity}
                    onChange={e => setFormData({ ...formData, yield_quantity: parseFloat(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cuántas unidades produce esta fórmula por lote
                  </p>
                </div>
                <div>
                  <Label>Unidad de rendimiento</Label>
                  <Select value={formData.yield_uom_id || "__none__"} onValueChange={v => setFormData({ ...formData, yield_uom_id: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar unidad" /></SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                      <SelectItem value="__none__" disabled>Seleccionar unidad</SelectItem>
                      {uoms.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unidad de medida del producto fabricado (ej: litros, cups)
                  </p>
                </div>
              </div>
              <div>
                <Label>Descripción / Notas de preparación</Label>
                <Textarea
                  value={formData.preparation_notes}
                  onChange={e => setFormData({ ...formData, preparation_notes: e.target.value })}
                  rows={2}
                  placeholder="Instrucciones de preparación..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pasos o instrucciones para elaborar el producto
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">Ingredientes (Entrada) — mínimo 2</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddIngredient}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Materia Prima</TableHead>
                      <TableHead className="w-24">Cantidad</TableHead>
                      <TableHead className="w-32">Unidad</TableHead>
                      <TableHead className="w-28 text-right">Costo Est.</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Agrega al menos 2 ingredientes para la fórmula.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ingredients.map((ing, index) => {
                        const mat = materials.find(m => m.id === ing.raw_material_id);
                        const ingCost = (mat?.last_cost || mat?.avg_cost || 0) * ing.quantity;
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Select
                                value={ing.raw_material_id || "__none__"}
                                onValueChange={v => handleIngredientMaterialSelect(index, v === "__none__" ? "" : v)}
                              >
                                <SelectTrigger className="w-48"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent position="popper" className="z-[9999] max-h-60">
                                  <SelectItem value="__none__" disabled>Seleccionar</SelectItem>
                                  {ingredientMaterials.map(m => (
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
                                value={ing.quantity || ""}
                                onChange={e => handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Select value={ing.uom_id || "__none__"} onValueChange={v => handleIngredientChange(index, 'uom_id', v === "__none__" ? "" : v)}>
                                <SelectTrigger className="w-32"><SelectValue placeholder="UOM" /></SelectTrigger>
                                <SelectContent position="popper" className="z-[9999]">
                                  <SelectItem value="__none__" disabled>Seleccionar</SelectItem>
                                  {uoms.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.abbreviation}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {ingCost > 0 ? formatCurrency(ingCost) : "—"}
                            </TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveIngredient(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Cost summary */}
              {ingredients.length >= 2 && estimatedCost > 0 && (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <div className="flex-1 flex justify-between">
                    <span>Costo total estimado: <strong>{formatCurrency(estimatedCost)}</strong></span>
                    <span>
                      Costo por unidad: <strong>{formatCurrency(costPerUnit)}</strong>
                      {formData.yield_uom_id && (
                        <span className="text-muted-foreground ml-1">
                          / {uoms.find(u => u.id === formData.yield_uom_id)?.abbreviation || "un"}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!formData.raw_material_id || !formData.name || ingredients.filter(i => i.raw_material_id && i.quantity > 0).length < 2}>
              Guardar Fórmula
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
