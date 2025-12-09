import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RawMaterial } from "@/types";
import { useUOM } from "@/hooks/useUOM";

interface RawMaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: RawMaterial;
  onSave: (material: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>) => void;
}

export function RawMaterialForm({ open, onOpenChange, material, onSave }: RawMaterialFormProps) {
  const { uoms } = useUOM();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "",
    base_uom_id: "",
    conversion_to_base: 1,
    min_stock: 0,
    last_cost: 0,
    avg_cost: 0,
    is_active: true,
  });

  const categoryOptions = [
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

  useEffect(() => {
    if (material) {
      setFormData({
        code: material.code || "",
        name: material.name,
        description: material.description || "",
        category: material.category || "",
        base_uom_id: material.base_uom_id || "",
        conversion_to_base: material.conversion_to_base || 1,
        min_stock: material.min_stock || 0,
        last_cost: material.last_cost || 0,
        avg_cost: material.avg_cost || 0,
        is_active: material.is_active,
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        category: "",
        base_uom_id: "",
        conversion_to_base: 1,
        min_stock: 0,
        last_cost: 0,
        avg_cost: 0,
        is_active: true,
      });
    }
  }, [material, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material ? "Editar Materia Prima" : "Nueva Materia Prima"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="MP-001"
              />
            </div>
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Carne de res"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalles de la materia prima"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="base_uom_id">Unidad base *</Label>
              <Select
                value={formData.base_uom_id}
                onValueChange={(value) => setFormData({ ...formData, base_uom_id: value })}
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
            <div>
              <Label htmlFor="min_stock">Stock mínimo</Label>
              <Input
                id="min_stock"
                type="number"
                step="0.01"
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="last_cost">Último costo (CLP)</Label>
              <Input
                id="last_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.last_cost}
                onChange={(e) => setFormData({ ...formData, last_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="avg_cost">Costo promedio (CLP)</Label>
              <Input
                id="avg_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.avg_cost}
                onChange={(e) => setFormData({ ...formData, avg_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Activo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
