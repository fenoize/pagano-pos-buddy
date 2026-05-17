import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Minus, Package, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useRawMaterials } from "@/hooks/useRawMaterials";
import { useInventory } from "@/hooks/useInventory";
import { useStockBalances } from "@/hooks/useStockBalances";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ADJUSTMENT_REASONS = [
  { value: "stock_inicial", label: "Stock Inicial" },
  { value: "conteo_fisico", label: "Conteo Físico" },
  { value: "merma", label: "Merma / Pérdida" },
  { value: "correccion", label: "Corrección de Error" },
  { value: "otro", label: "Otro" },
];

export default function StockAdjustments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { warehouses, loading: warehousesLoading, getDefaultWarehouse } = useWarehouses();
  const { materials, loading: materialsLoading } = useRawMaterials();
  const { processAdjustment, isLoading: adjustmentLoading } = useInventory();
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const { balances, loading: balancesLoading, fetchBalances, fetchStats } = useStockBalances(selectedWarehouseId);

  // Form state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract" | "set">("add");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("stock_inicial");
  const [notes, setNotes] = useState<string>("");

  // Set default warehouse on load
  useEffect(() => {
    if (!warehousesLoading && warehouses.length > 0 && !selectedWarehouseId) {
      const defaultWarehouse = getDefaultWarehouse();
      if (defaultWarehouse) {
        setSelectedWarehouseId(defaultWarehouse.id);
      } else {
        setSelectedWarehouseId(warehouses[0].id);
      }
    }
  }, [warehouses, warehousesLoading, selectedWarehouseId, getDefaultWarehouse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMaterialId || !quantity || !reason || !selectedWarehouseId || !user?.id) {
      toast.error("Error", { description: "Completa todos los campos requeridos" });
      return;
    }

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      toast.error("Error", { description: "La cantidad debe ser un número positivo" });
      return;
    }

    // Calculate adjustment quantity based on type
    let adjustmentQty = numQuantity;
    if (adjustmentType === "subtract") {
      adjustmentQty = -numQuantity;
    } else if (adjustmentType === "set") {
      // For "set", we need to calculate the difference
      const currentBalance = balances.find(b => b.raw_material_id === selectedMaterialId)?.quantity || 0;
      adjustmentQty = numQuantity - currentBalance;
    }

    const reasonText = `${ADJUSTMENT_REASONS.find(r => r.value === reason)?.label || reason}${notes ? `: ${notes}` : ''}`;

    const result = await processAdjustment(
      selectedMaterialId,
      selectedWarehouseId,
      null, // lotId
      adjustmentQty,
      reasonText,
      user.id
    );

    if (result.success) {
      toast.success("Ajuste registrado", { description: "El stock ha sido actualizado correctamente" });
      // Reset form
      setSelectedMaterialId("");
      setQuantity("");
      setNotes("");
      // Refresh balances
      fetchBalances();
      fetchStats();
    } else {
      toast.error("Error", { description: result.error || "No se pudo registrar el ajuste" });
    }
  };

  const getCurrentStock = (materialId: string): number => {
    return balances.find(b => b.raw_material_id === materialId)?.quantity || 0;
  };

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const loading = warehousesLoading || materialsLoading || balancesLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pos/inventario")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Ajustes de Inventario</h1>
            <p className="text-muted-foreground">Registrar stock inicial y correcciones</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Nuevo Ajuste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Almacén</Label>
                <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.is_active).map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Materia Prima</Label>
                <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar materia prima" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.filter(m => m.is_active).map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.code ? `[${material.code}] ` : ''}{material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMaterial && (
                  <p className="text-sm text-muted-foreground">
                    Stock actual: <span className="font-medium">{getCurrentStock(selectedMaterialId)} {selectedMaterial.base_uom?.abbreviation}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de Ajuste</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={adjustmentType === "add" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdjustmentType("add")}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                  <Button
                    type="button"
                    variant={adjustmentType === "subtract" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdjustmentType("subtract")}
                    className="flex-1"
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    Restar
                  </Button>
                  <Button
                    type="button"
                    variant={adjustmentType === "set" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAdjustmentType("set")}
                    className="flex-1"
                  >
                    Fijar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles adicionales..."
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={adjustmentLoading || loading}>
                {adjustmentLoading ? "Procesando..." : "Registrar Ajuste"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stock List Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stock Actual en {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'Almacén'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Cargando...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Materia Prima</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.filter(m => m.is_active).map((material) => {
                    const balance = balances.find(b => b.raw_material_id === material.id);
                    const currentQty = balance?.quantity || 0;
                    const minStock = material.min_stock || 0;
                    const isLow = currentQty < minStock;

                    return (
                      <TableRow key={material.id} className={isLow ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{material.code || "—"}</TableCell>
                        <TableCell>{material.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {currentQty} {material.base_uom?.abbreviation}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {minStock} {material.base_uom?.abbreviation}
                        </TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Bajo
                            </Badge>
                          ) : currentQty > 0 ? (
                            <Badge variant="secondary">OK</Badge>
                          ) : (
                            <Badge variant="outline">Sin stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {materials.filter(m => m.is_active).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay materias primas registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
