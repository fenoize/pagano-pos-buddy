import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Edit2, Trash2, Search, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRawMaterials } from "@/hooks/useRawMaterials";
import { useStockBalances } from "@/hooks/useStockBalances";
import { RawMaterialForm } from "@/components/inventory/RawMaterialForm";
import { RawMaterial } from "@/types";
import { Badge } from "@/components/ui/badge";
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

export default function RawMaterials() {
  const navigate = useNavigate();
  const { materials, loading, createMaterial, updateMaterial, deleteMaterial } = useRawMaterials();
  const { balances, loading: balancesLoading } = useStockBalances();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const getStockForMaterial = (materialId: string): number => {
    // Sum stock across all warehouses
    return balances
      .filter(b => b.raw_material_id === materialId)
      .reduce((sum, b) => sum + b.quantity, 0);
  };

  const handleOpenDialog = (material?: RawMaterial) => {
    setEditingMaterial(material);
    setDialogOpen(true);
  };

  const handleSave = async (materialData: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingMaterial) {
      await updateMaterial(editingMaterial.id, materialData);
    } else {
      await createMaterial(materialData);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteMaterial(deletingId);
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || balancesLoading) {
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
            <h1 className="text-3xl font-bold text-primary">Materias Primas</h1>
            <p className="text-muted-foreground">Gestión del catálogo de insumos</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Materia Prima
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listado de Materias Primas</CardTitle>
            <div className="flex items-center gap-2 w-80">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Unidad Base</TableHead>
                <TableHead className="text-right">Stock Actual</TableHead>
                <TableHead className="text-right">Stock Mín.</TableHead>
                <TableHead>Costo Prom.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {searchTerm ? "No se encontraron resultados" : "No hay materias primas registradas"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((material) => {
                  const currentStock = getStockForMaterial(material.id);
                  const minStock = material.min_stock || 0;
                  const isLowStock = currentStock < minStock && minStock > 0;

                  return (
                  <TableRow key={material.id} className={isLowStock ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{material.code || "—"}</TableCell>
                    <TableCell>{material.name}</TableCell>
                    <TableCell>
                      {material.base_uom?.abbreviation || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={isLowStock ? "text-destructive font-medium" : ""}>
                          {currentStock}
                        </span>
                        {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{minStock}</TableCell>
                    <TableCell>${(material.avg_cost || 0).toLocaleString('es-CL')}</TableCell>
                    <TableCell>
                      <Badge variant={material.is_active ? "secondary" : "destructive"}>
                        {material.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(material)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(material.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );})
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RawMaterialForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        material={editingMaterial}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar materia prima?</AlertDialogTitle>
            <AlertDialogDescription>
              La materia prima será marcada como inactiva. Podrás reactivarla después si es necesario.
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
