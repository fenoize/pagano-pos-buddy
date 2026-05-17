import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Search, 
  Package, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  RefreshCw,
  Plus,
  Pencil,
  Trash2
} from "lucide-react";
import { useWarehouses } from "@/hooks/useWarehouses";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRawMaterials } from "@/hooks/useRawMaterials";
import { RawMaterialForm } from "@/components/inventory/RawMaterialForm";
import { RawMaterial } from "@/types";
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

interface StockItem {
  id: string;
  code: string;
  name: string;
  category: string | null;
  min_stock: number;
  base_uom_name: string;
  current_stock: number;
  has_balance: boolean;
  new_stock: number | null;
}

type SortField = 'code' | 'name' | 'category' | 'current_stock' | 'min_stock';
type SortDirection = 'asc' | 'desc';

export default function StockManagement() {
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  const { user } = useAuth();
  const { createMaterial, updateMaterial, deleteMaterial } = useRawMaterials();
  
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // CRUD state
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<StockItem | null>(null);
  
  // Set default warehouse when warehouses load
  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouse) {
      const defaultWarehouse = warehouses.find(w => w.is_default && w.is_active);
      setSelectedWarehouse(defaultWarehouse?.id || warehouses[0].id);
    }
  }, [warehouses, selectedWarehouse]);

  // Fetch stock data when warehouse changes
  const fetchStockData = useCallback(async () => {
    if (!selectedWarehouse) return;
    
    setLoading(true);
    try {
      // Get all active raw materials
      const { data: materials, error: materialsError } = await supabase
        .from('raw_materials')
        .select(`
          id,
          code,
          name,
          category,
          min_stock,
          base_uom:units_of_measure!raw_materials_base_uom_id_fkey(abbreviation)
        `)
        .eq('is_active', true)
        .order('name');

      if (materialsError) throw materialsError;

      // Get stock balances for selected warehouse using RPC to bypass RLS
      const { data: balances, error: balancesError } = await supabase
        .rpc('get_stock_balances', { p_warehouse_id: selectedWarehouse });

      if (balancesError) throw balancesError;

      // Create balance map
      const balanceMap = new Map<string, number>();
      (balances || []).forEach((b: { raw_material_id: string; qty_on_hand: number | null }) => {
        balanceMap.set(b.raw_material_id, b.qty_on_hand || 0);
      });

      // Combine data
      const items: StockItem[] = (materials || []).map(m => {
        const qty = balanceMap.get(m.id);
        return {
          id: m.id,
          code: m.code || '',
          name: m.name,
          category: m.category as string | null,
          min_stock: m.min_stock || 0,
          base_uom_name: (m.base_uom as { abbreviation?: string })?.abbreviation || 'u',
          current_stock: qty ?? 0,
          has_balance: balanceMap.has(m.id),
          new_stock: null,
        };
      });

      setStockItems(items);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Error', { description: 'No se pudo cargar el stock' });
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, toast]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    stockItems.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [stockItems]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...stockItems];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      if (categoryFilter === "sin_categoria") {
        items = items.filter(item => !item.category);
      } else {
        items = items.filter(item => item.category === categoryFilter);
      }
    }

    // Apply sorting
    items.sort((a, b) => {
      let aVal: string | number = a[sortField] ?? '';
      let bVal: string | number = b[sortField] ?? '';
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [stockItems, searchTerm, categoryFilter, sortField, sortDirection]);

  // Track changes
  const changedItems = useMemo(() => {
    return stockItems.filter(item => 
      item.new_stock !== null && item.new_stock !== item.current_stock
    );
  }, [stockItems]);

  const handleStockChange = (id: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setStockItems(prev => prev.map(item => 
      item.id === id ? { ...item, new_stock: numValue } : item
    ));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id || changedItems.length === 0) return;
    
    setSaving(true);
    try {
      for (const item of changedItems) {
        // Use comprehensive RPC function that handles both stock_moves and stock_balances
        const { data, error } = await supabase.rpc('adjust_stock_quick', {
          p_raw_material_id: item.id,
          p_warehouse_id: selectedWarehouse,
          p_new_stock: item.new_stock || 0,
          p_current_stock: item.current_stock,
          p_notes: 'Conteo físico - Ajuste rápido de stock',
          p_user_id: user.id,
        });

        if (error) throw error;
        
        // Check if RPC returned an error
        const result = data as { success: boolean; error?: string } | null;
        if (result && !result.success) {
          throw new Error(result.error || 'Error al ajustar stock');
        }
      }

      toast({
        title: 'Stock actualizado',
        description: `Se actualizaron ${changedItems.length} items correctamente`,
      });

      setShowConfirmDialog(false);
      fetchStockData(); // Refresh data
    } catch (error: any) {
      console.error('Error saving stock:', error);
      toast.error('Error', { description: error.message || 'No se pudo guardar el stock' });
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return 'out';
    if (current <= min) return 'low';
    return 'ok';
  };

  // CRUD handlers
  const handleAddMaterial = () => {
    setEditingMaterial(undefined);
    setShowMaterialForm(true);
  };

  const handleEditMaterial = async (item: StockItem) => {
    // Fetch full material data
    const { data, error } = await supabase
      .from('raw_materials')
      .select(`*, base_uom:units_of_measure(*)`)
      .eq('id', item.id)
      .single();
    
    if (data) {
      setEditingMaterial(data as RawMaterial);
      setShowMaterialForm(true);
    }
  };

  const handleDeleteClick = (item: StockItem) => {
    setMaterialToDelete(item);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    
    const result = await deleteMaterial(materialToDelete.id);
    if (result.success) {
      setShowDeleteDialog(false);
      setMaterialToDelete(null);
      fetchStockData();
    }
  };

  const handleSaveMaterial = async (materialData: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingMaterial) {
      const result = await updateMaterial(editingMaterial.id, materialData);
      if (result.success) {
        fetchStockData();
      }
    } else {
      const result = await createMaterial(materialData);
      if (result.success) {
        fetchStockData();
      }
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-medium"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (warehousesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Gestión de Stock</h1>
          <p className="text-muted-foreground text-sm">
            Edita el stock directamente como en una hoja de cálculo
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleAddMaterial}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Materia Prima
          </Button>
          
          {changedItems.length > 0 && (
            <Button 
              onClick={() => setShowConfirmDialog(true)}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar Cambios
              <Badge variant="secondary" className="ml-1">
                {changedItems.length}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Warehouse selector */}
            <div className="w-full md:w-48">
              <Select 
                value={selectedWarehouse} 
                onValueChange={setSelectedWarehouse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.filter(w => w.is_active).map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            <div className="w-full md:w-48">
              <Select 
                value={categoryFilter} 
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="sin_categoria">Sin categoría</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Refresh button */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchStockData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Actual
            <Badge variant="outline" className="ml-2">
              {filteredItems.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">
                      <SortButton field="code">Código</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton field="name">Materia Prima</SortButton>
                    </TableHead>
                    <TableHead className="w-32">
                      <SortButton field="category">Categoría</SortButton>
                    </TableHead>
                    <TableHead className="w-28 text-right">
                      <SortButton field="current_stock">Stock Actual</SortButton>
                    </TableHead>
                    <TableHead className="w-24 text-right">
                      <SortButton field="min_stock">Mínimo</SortButton>
                    </TableHead>
                    <TableHead className="w-32 text-right">Nuevo Stock</TableHead>
                    <TableHead className="w-24 text-center">Estado</TableHead>
                    <TableHead className="w-24 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No se encontraron materias primas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => {
                      const status = getStockStatus(item.current_stock, item.min_stock);
                      const hasChange = item.new_stock !== null && item.new_stock !== item.current_stock;
                      
                      return (
                        <TableRow 
                          key={item.id}
                          className={hasChange ? 'bg-primary/5' : ''}
                        >
                          <TableCell className="font-mono text-sm">
                            {item.code || '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell>
                            {item.category ? (
                              <Badge variant="outline">{item.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.current_stock.toFixed(2)} {item.base_uom_name}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {item.min_stock} {item.base_uom_name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.new_stock ?? ''}
                              onChange={(e) => handleStockChange(item.id, e.target.value)}
                              placeholder={item.current_stock.toString()}
                              className={`w-24 text-right ml-auto ${hasChange ? 'border-primary' : ''}`}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {status === 'out' && (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Sin stock
                              </Badge>
                            )}
                            {status === 'low' && (
                              <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
                                <AlertTriangle className="h-3 w-3" />
                                Bajo
                              </Badge>
                            )}
                            {status === 'ok' && (
                              <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3" />
                                OK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditMaterial(item)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(item)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambios de stock</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizarán {changedItems.length} items con los siguientes cambios:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-72 overflow-y-auto space-y-2">
            {changedItems.map(item => {
              const diff = (item.new_stock || 0) - item.current_stock;
              return (
                <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.current_stock}</span>
                    <span>→</span>
                    <span className="font-medium">{item.new_stock}</span>
                    <Badge 
                      className={`ml-2 ${diff > 0 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                    >
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveChanges} disabled={saving}>
              {saving ? 'Guardando...' : 'Confirmar y Guardar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar materia prima?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar "{materialToDelete?.name}"? 
              Esta acción desactivará la materia prima y no podrá ser usada en nuevas recetas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Material Form Modal */}
      <RawMaterialForm
        open={showMaterialForm}
        onOpenChange={setShowMaterialForm}
        material={editingMaterial}
        onSave={handleSaveMaterial}
      />
    </div>
  );
}
