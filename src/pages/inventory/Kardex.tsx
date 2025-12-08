import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, RefreshCw, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useKardex, KardexFilters } from "@/hooks/useKardex";
import { useRawMaterials } from "@/hooks/useRawMaterials";
import { useWarehouses } from "@/hooks/useWarehouses";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const MOVE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  purchase: { label: "Compra", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  sale: { label: "Venta", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  adjustment: { label: "Ajuste", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  transfer_in: { label: "Transfer. Entrada", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  transfer_out: { label: "Transfer. Salida", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  waste: { label: "Merma", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

export default function Kardex() {
  const navigate = useNavigate();
  const { materials } = useRawMaterials();
  const { warehouses } = useWarehouses();
  
  const [filters, setFilters] = useState<KardexFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { entries, loading, totalCount, fetchKardex } = useKardex(filters);

  const activeWarehouses = useMemo(() => 
    warehouses.filter(w => w.is_active), 
    [warehouses]
  );

  const activeMaterials = useMemo(() => 
    materials.filter(m => m.is_active), 
    [materials]
  );

  const handleFilterChange = (key: keyof KardexFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pos/inventario")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">Kardex</h1>
            <p className="text-muted-foreground">Historial completo de movimientos de inventario</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {Object.values(filters).filter(v => v).length}
              </Badge>
            )}
          </Button>
          <Button variant="outline" onClick={() => fetchKardex(page, pageSize)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Materia Prima</Label>
                <Select
                  value={filters.rawMaterialId || "all"}
                  onValueChange={(v) => handleFilterChange("rawMaterialId", v === "all" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {activeMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code ? `${m.code} - ` : ""}{m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Almacén</Label>
                <Select
                  value={filters.warehouseId || "all"}
                  onValueChange={(v) => handleFilterChange("warehouseId", v === "all" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {activeWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Movimiento</Label>
                <Select
                  value={filters.moveType || "all"}
                  onValueChange={(v) => handleFilterChange("moveType", v === "all" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(MOVE_TYPE_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha Desde</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value || undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Hasta</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value || undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Total Movimientos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {entries.filter(e => e.qty_in > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Entradas (página)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {entries.filter(e => e.qty_out > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Salidas (página)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {activeMaterials.length}
            </div>
            <p className="text-xs text-muted-foreground">Materias Primas</p>
          </CardContent>
        </Card>
      </div>

      {/* Kardex Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {hasActiveFilters 
                ? "No se encontraron movimientos con los filtros seleccionados"
                : "No hay movimientos de inventario registrados"
              }
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Materia Prima</TableHead>
                      <TableHead>Almacén</TableHead>
                      <TableHead className="text-right">Entrada</TableHead>
                      <TableHead className="text-right">Salida</TableHead>
                      <TableHead>UoM</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const typeInfo = MOVE_TYPE_LABELS[entry.move_type] || { 
                        label: entry.move_type, 
                        color: "bg-gray-100 text-gray-800" 
                      };
                      
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge className={typeInfo.color}>
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.raw_material_name}</div>
                              {entry.raw_material_code && (
                                <div className="text-xs text-muted-foreground">
                                  {entry.raw_material_code}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{entry.warehouse_name}</TableCell>
                          <TableCell className="text-right">
                            {entry.qty_in > 0 ? (
                              <span className="text-green-600 flex items-center justify-end gap-1">
                                <ArrowDownCircle className="h-4 w-4" />
                                {entry.qty_in.toLocaleString("es-CL")}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.qty_out > 0 ? (
                              <span className="text-red-600 flex items-center justify-end gap-1">
                                <ArrowUpCircle className="h-4 w-4" />
                                {entry.qty_out.toLocaleString("es-CL")}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>{entry.uom_abbreviation}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.unit_cost)}
                          </TableCell>
                          <TableCell>
                            {entry.order_number ? (
                              <Badge variant="outline">Orden #{entry.order_number}</Badge>
                            ) : entry.notes ? (
                              <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                                {entry.notes}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {entry.created_by_name || "Sistema"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {page + 1} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
