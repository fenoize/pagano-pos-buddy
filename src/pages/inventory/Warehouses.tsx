import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Warehouse } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

export default function Warehouses() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast.error("Error", { description: "No se pudieron cargar los almacenes" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        code: warehouse.code,
        name: warehouse.name,
        is_default: warehouse.is_default,
        is_active: warehouse.is_active,
      });
    } else {
      setEditingWarehouse(null);
      setFormData({
        code: "",
        name: "",
        is_default: false,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error("Error", { description: "Complete todos los campos requeridos" });
      return;
    }

    try {
      if (editingWarehouse) {
        const { error } = await supabase
          .from("warehouses")
          .update(formData)
          .eq("id", editingWarehouse.id);

        if (error) throw error;

        toast.success("Almacén actualizado", { description: "Los cambios se guardaron correctamente" });
      } else {
        const { error } = await supabase
          .from("warehouses")
          .insert([formData]);

        if (error) throw error;

        toast.success("Almacén creado", { description: "El almacén se creó correctamente" });
      }

      setDialogOpen(false);
      fetchWarehouses();
    } catch (error: any) {
      console.error("Error saving warehouse:", error);
      toast.error("Error", { description: error.message || "No se pudo guardar el almacén" });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("warehouses")
        .delete()
        .eq("id", deletingId);

      if (error) throw error;

      toast.success("Almacén eliminado", { description: "El almacén se eliminó correctamente" });

      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchWarehouses();
    } catch (error: any) {
      console.error("Error deleting warehouse:", error);
      toast.error("Error", { description: error.message || "No se pudo eliminar el almacén" });
    }
  };

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
            <h1 className="text-3xl font-bold text-primary">Almacenes</h1>
            <p className="text-muted-foreground">Gestión de ubicaciones físicas de inventario</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Almacén
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Almacenes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Predeterminado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay almacenes registrados
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">{warehouse.code}</TableCell>
                    <TableCell>{warehouse.name}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          warehouse.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {warehouse.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {warehouse.is_default && (
                        <span className="text-primary font-semibold">✓ Por defecto</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(warehouse)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingId(warehouse.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? "Editar Almacén" : "Nuevo Almacén"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="WH-001"
              />
            </div>
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Almacén Principal"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
              <Label>Almacén predeterminado</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar almacén?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el almacén y sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
