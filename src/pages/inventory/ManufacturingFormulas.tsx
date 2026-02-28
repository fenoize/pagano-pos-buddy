import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FlaskConical, Trash2, Edit, ArrowLeft } from "lucide-react";
import { useManufacturingFormulas, ManufacturingFormula } from "@/hooks/useManufacturingFormulas";
import { ManufacturingFormulaForm } from "@/components/inventory/ManufacturingFormulaForm";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManufacturingFormulas() {
  const navigate = useNavigate();
  const { formulas, loading, createFormula, updateFormula, deleteFormula } = useManufacturingFormulas();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editFormula, setEditFormula] = useState<ManufacturingFormula | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ManufacturingFormula | null>(null);

  const filtered = formulas.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.raw_material?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (
    formula: any,
    ingredients: any[]
  ) => {
    if (editFormula) {
      await updateFormula(editFormula.id, formula, ingredients);
    } else {
      await createFormula(formula, ingredients);
    }
    setEditFormula(undefined);
  };

  const handleEdit = (f: ManufacturingFormula) => {
    setEditFormula(f);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteFormula(deleteTarget.id, deleteTarget.raw_material_id);
    setDeleteTarget(null);
  };

  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString("es-CL")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pos/inventario")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <FlaskConical className="h-6 w-6" />
              Fabricación
            </h1>
            <p className="text-muted-foreground text-sm">
              Fórmulas para producir materias primas a partir de otras
            </p>
          </div>
        </div>
        <Button onClick={() => { setEditFormula(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Fórmula
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar fórmulas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fórmula</TableHead>
                <TableHead>Produce</TableHead>
                <TableHead>Rendimiento</TableHead>
                <TableHead>Ingredientes</TableHead>
                <TableHead className="text-right">Costo Est.</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? "Sin resultados" : "No hay fórmulas creadas. Crea la primera."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(f => {
                  const activeIngs = f.ingredients?.filter(i => i.is_active) || [];
                  const totalCost = activeIngs.reduce((sum, i) => {
                    const cost = i.raw_material?.last_cost || i.raw_material?.avg_cost || 0;
                    return sum + cost * i.quantity;
                  }, 0);
                  const costPerUnit = f.yield_quantity > 0 ? totalCost / f.yield_quantity : 0;

                  return (
                    <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(f)}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <FlaskConical className="h-3 w-3" />
                          {f.raw_material?.name || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {f.yield_quantity} {f.yield_uom?.abbreviation || "un"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {activeIngs.slice(0, 3).map((i, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {i.quantity} {i.uom?.abbreviation || ""} {i.raw_material?.name || ""}
                            </Badge>
                          ))}
                          {activeIngs.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{activeIngs.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {costPerUnit > 0 ? (
                          <span>{formatCurrency(costPerUnit)}/{f.yield_uom?.abbreviation || "un"}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(f)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(f)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ManufacturingFormulaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        formula={editFormula}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar fórmula?</AlertDialogTitle>
            <AlertDialogDescription>
              Se desactivará "{deleteTarget?.name}". La materia prima seguirá existiendo pero dejará de marcarse como fabricada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Desactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
