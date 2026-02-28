import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useUOM } from '@/hooks/useUOM';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderItem {
  id: string;
  raw_material_id: string;
  qty: number;
  uom_id: string;
  unit_cost: number;
}

export default function PurchaseOrderForm() {
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { suppliers, loading: loadingSuppliers } = useSuppliers();
  const { warehouses, loading: loadingWarehouses } = useWarehouses();
  const { materials, loading: loadingMaterials } = useRawMaterials();
  const { uoms, loading: loadingUoms } = useUOM();
  const { createOrder, updateOrder, getOrderById } = usePurchaseOrders();

  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(isEditMode);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);

  // Load existing order for edit mode
  useEffect(() => {
    if (!editId) return;
    (async () => {
      setLoadingOrder(true);
      const order = await getOrderById(editId);
      if (order) {
        setSupplierId(order.supplier_id);
        setWarehouseId(order.warehouse_id);
        setExpectedDate(order.expected_date || '');
        setNotes(order.notes || '');
        setItems(
          (order.items || []).map((i: any) => ({
            id: crypto.randomUUID(),
            raw_material_id: i.raw_material_id,
            qty: i.qty,
            uom_id: i.uom_id,
            unit_cost: i.unit_cost,
          }))
        );
      } else {
        toast({ title: 'Error', description: 'No se encontró la orden', variant: 'destructive' });
        navigate('/pos/inventario/compras');
      }
      setLoadingOrder(false);
    })();
  }, [editId]);

  // Set default warehouse (only for new orders)
  useEffect(() => {
    if (isEditMode) return;
    const defaultWarehouse = warehouses.find(w => w.is_default && w.is_active);
    if (defaultWarehouse && !warehouseId) {
      setWarehouseId(defaultWarehouse.id);
    }
  }, [warehouses, warehouseId, isEditMode]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        raw_material_id: '',
        qty: 1,
        uom_id: '',
        unit_cost: 0,
      },
    ]);
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      if (field === 'raw_material_id') {
        const material = materials.find(m => m.id === value);
        if (material?.base_uom_id) {
          updated.uom_id = material.base_uom_id;
        }
      }
      
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + (item.qty * item.unit_cost), 0);
  const calculateTax = () => Math.round(calculateSubtotal() * 0.19);
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const validateBasicInfo = () => {
    if (!supplierId) {
      toast({ title: 'Error', description: 'Selecciona un proveedor', variant: 'destructive' });
      return false;
    }
    if (!warehouseId) {
      toast({ title: 'Error', description: 'Selecciona un almacén', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const getOrderData = (itemsToSave: OrderItem[]) => ({
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    expected_date: expectedDate || undefined,
    notes,
    items: itemsToSave.map(({ raw_material_id, qty, uom_id, unit_cost }) => ({
      raw_material_id, qty, uom_id, unit_cost,
    })),
  });

  const handleSaveDraft = async () => {
    if (!validateBasicInfo()) return;
    const validItems = items.filter(i => i.raw_material_id && i.uom_id && i.qty > 0);

    setSavingDraft(true);
    if (isEditMode) {
      const success = await updateOrder(editId!, getOrderData(validItems));
      setSavingDraft(false);
      if (success) navigate(`/pos/inventario/compras/${editId}`);
    } else {
      const orderId = await createOrder(getOrderData(validItems));
      setSavingDraft(false);
      if (orderId) {
        toast({ title: 'Borrador guardado' });
        navigate(`/pos/inventario/compras/${orderId}`);
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateBasicInfo()) return;
    if (items.length === 0) {
      toast({ title: 'Error', description: 'Agrega al menos un item', variant: 'destructive' });
      return;
    }
    const invalidItems = items.filter(i => !i.raw_material_id || !i.uom_id || i.qty <= 0);
    if (invalidItems.length > 0) {
      toast({ title: 'Error', description: 'Completa todos los items correctamente', variant: 'destructive' });
      return;
    }

    setSaving(true);
    if (isEditMode) {
      const success = await updateOrder(editId!, getOrderData(items));
      setSaving(false);
      if (success) navigate(`/pos/inventario/compras/${editId}`);
    } else {
      const orderId = await createOrder(getOrderData(items));
      setSaving(false);
      if (orderId) navigate(`/pos/inventario/compras/${orderId}`);
    }
  };

  const isLoading = loadingSuppliers || loadingWarehouses || loadingMaterials || loadingUoms;

  if (loadingOrder) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => isEditMode ? navigate(`/pos/inventario/compras/${editId}`) : navigate('/pos/inventario/compras')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditMode ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}</h1>
          <p className="text-muted-foreground">{isEditMode ? 'Modifica los datos de la orden' : 'Crea una nueva orden para tu proveedor'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Almacén destino *</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar almacén" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.filter(w => w.is_active).map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} {w.is_default && '(Principal)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha esperada de entrega</Label>
                  <Input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Notas adicionales para esta orden..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items de la Orden</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Item
              </Button>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay items en la orden</p>
                  <Button onClick={addItem} variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar primer item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Material</TableHead>
                        <TableHead className="w-24">Cantidad</TableHead>
                        <TableHead className="w-32">Unidad</TableHead>
                        <TableHead className="w-32">Costo Unit.</TableHead>
                        <TableHead className="w-32 text-right">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Select
                              value={item.raw_material_id}
                              onValueChange={(v) => updateItem(item.id, 'raw_material_id', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {materials.filter(m => m.is_active).map(m => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.code ? `[${m.code}] ` : ''}{m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.uom_id}
                              onValueChange={(v) => updateItem(item.id, 'uom_id', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Unidad" />
                              </SelectTrigger>
                              <SelectContent>
                                {uoms.map(u => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.abbreviation}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.unit_cost}
                              onChange={(e) => updateItem(item.id, 'unit_cost', parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.qty * item.unit_cost)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA (19%):</span>
                  <span>{formatCurrency(calculateTax())}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>{items.length} item(s) en la orden</p>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleSubmit}
            disabled={saving || savingDraft || items.length === 0}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Guardar Cambios' : 'Crear Orden'}
              </>
            )}
          </Button>

          <Button 
            variant="secondary" 
            className="w-full"
            onClick={handleSaveDraft}
            disabled={saving || savingDraft}
          >
            {savingDraft ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar como Borrador'
            )}
          </Button>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => isEditMode ? navigate(`/pos/inventario/compras/${editId}`) : navigate('/pos/inventario/compras')}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}