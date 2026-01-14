import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { MaterialSearchAutocomplete } from '@/components/inventory/MaterialSearchAutocomplete';
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useToast } from '@/hooks/use-toast';
import { useUOM } from '@/hooks/useUOM';
import type { CreatePurchaseRequestItemData } from '@/types/purchaseRequests';

interface FormItem extends CreatePurchaseRequestItemData {
  tempId: string;
  materialName?: string;
  supplierName?: string;
  uomSymbol?: string;
}

export default function PurchaseRequestForm() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createRequest, getRequestById, updateRequest, submitForApproval: submitRequestForApproval } = usePurchaseRequests();
  const { materials } = useRawMaterials();
  const { suppliers } = useSuppliers();
  const { uoms } = useUOM();

  const [items, setItems] = useState<FormItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // Load existing request data in edit mode
  useEffect(() => {
    const loadRequest = async () => {
      if (!id) return;
      setLoading(true);
      const request = await getRequestById(id);
      if (request) {
        setNotes(request.notes || '');
        setItems(
          (request.items || []).map(item => ({
            tempId: item.id || crypto.randomUUID(),
            raw_material_id: item.raw_material_id,
            supplier_id: item.supplier_id,
            qty: item.qty,
            uom_id: item.uom_id || '',
            estimated_unit_cost: item.estimated_unit_cost,
            materialName: item.raw_material?.name,
            supplierName: item.supplier?.name,
            uomSymbol: item.uom?.abbreviation,
          }))
        );
      } else {
        navigate('/pos/inventario/solicitudes');
      }
      setLoading(false);
    };
    loadRequest();
  }, [id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        tempId: crypto.randomUUID(),
        raw_material_id: '',
        supplier_id: '',
        qty: 1,
        uom_id: '',
        estimated_unit_cost: 0,
      },
    ]);
  };

  const removeItem = (tempId: string) => {
    setItems(items.filter(item => item.tempId !== tempId));
  };

  const updateItem = (tempId: string, field: keyof FormItem, value: unknown) => {
    setItems(items.map(item => {
      if (item.tempId !== tempId) return item;

      const updated = { ...item, [field]: value };

      // Auto-fill when material is selected
      if (field === 'raw_material_id') {
        const material = materials.find(m => m.id === value);
        if (material) {
          updated.uom_id = material.base_uom_id;
          updated.estimated_unit_cost = material.last_cost || 0;
          updated.materialName = material.name;
          updated.uomSymbol = (material.base_uom as { symbol?: string })?.symbol || '';
        }
      }

      // Update supplier name
      if (field === 'supplier_id') {
        const supplier = suppliers.find(s => s.id === value);
        if (supplier) {
          updated.supplierName = supplier.name;
        }
      }

      return updated;
    }));
  };

  // Calculate totals
  const subtotal = items.reduce((acc, item) => acc + (item.qty * item.estimated_unit_cost), 0);
  const tax = subtotal * 0.19;
  const total = subtotal + tax;

  // Group items by supplier for preview
  const itemsBySupplier = items.reduce((acc, item) => {
    if (!item.supplier_id) return acc;
    const supplierName = item.supplierName || 'Sin proveedor';
    if (!acc[supplierName]) {
      acc[supplierName] = { count: 0, total: 0 };
    }
    acc[supplierName].count += 1;
    acc[supplierName].total += item.qty * item.estimated_unit_cost;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const validateForm = (): boolean => {
    if (items.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes agregar al menos un item',
        variant: 'destructive',
      });
      return false;
    }

    for (const item of items) {
      if (!item.raw_material_id || !item.supplier_id || item.qty <= 0) {
        toast({
          title: 'Error',
          description: 'Todos los items deben tener material, proveedor y cantidad válida',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async (submitForApproval: boolean) => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const itemsData = items.map(item => ({
        raw_material_id: item.raw_material_id,
        supplier_id: item.supplier_id,
        qty: item.qty,
        uom_id: item.uom_id,
        estimated_unit_cost: item.estimated_unit_cost,
      }));

      if (isEditMode && id) {
        // Update existing request
        const success = await updateRequest(id, {
          notes: notes || undefined,
          items: itemsData,
        });
        if (success) {
          if (submitForApproval) {
            // After update, submit for approval
            await submitRequestForApproval(id);
          }
          navigate(`/pos/inventario/solicitudes/${id}`);
        }
      } else {
        // Create new request
        const requestId = await createRequest({
          notes: notes || undefined,
          items: itemsData,
          submit_for_approval: submitForApproval,
        });

        if (requestId) {
          navigate(`/pos/inventario/solicitudes/${requestId}`);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEditMode ? `/pos/inventario/solicitudes/${id}` : '/pos/inventario/solicitudes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? 'Editar Solicitud de Compra' : 'Nueva Solicitud de Compra'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Modifica los materiales de la solicitud' : 'Agrega los materiales que necesitas comprar'}
          </p>
        </div>
      </div>

      {/* Items Table - Full Width */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items de la Solicitud</CardTitle>
          <Button onClick={addItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay items. Haz clic en "Agregar Item" para comenzar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-md">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto">Material</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto">Proveedor</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[90px]">Cantidad</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[90px]">Unidad</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[100px]">Precio Unit.</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[100px] text-right">Total</TableHead>
                    <TableHead className="px-1 py-1.5 h-auto w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.tempId} className={idx < items.length - 1 ? 'border-b border-border' : ''}>
                      <TableCell className="border-r border-border p-1">
                        <MaterialSearchAutocomplete
                          materials={materials}
                          loading={materials.length === 0}
                          value={item.raw_material_id}
                          displayValue={item.materialName}
                          onSelect={(materialId, material) => {
                            if (material) {
                              updateItem(item.tempId, 'raw_material_id', materialId);
                            } else {
                              // Clear the material
                              updateItem(item.tempId, 'raw_material_id', '');
                            }
                          }}
                          placeholder="Buscar material..."
                        />
                      </TableCell>
                      <TableCell className="border-r border-border p-1">
                        <Select
                          value={item.supplier_id}
                          onValueChange={(v) => updateItem(item.tempId, 'supplier_id', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="border-r border-border p-1">
                        <Input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={item.qty}
                          onChange={(e) => updateItem(item.tempId, 'qty', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm px-2"
                        />
                      </TableCell>
                      <TableCell className="border-r border-border p-1">
                        <Select
                          value={item.uom_id}
                          onValueChange={(v) => updateItem(item.tempId, 'uom_id', v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Unidad" />
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
                      <TableCell className="border-r border-border p-1">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={item.estimated_unit_cost}
                          onChange={(e) => updateItem(item.tempId, 'estimated_unit_cost', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm px-2"
                        />
                      </TableCell>
                      <TableCell className="border-r border-border p-1 text-right font-medium text-sm">
                        {formatCurrency(item.qty * item.estimated_unit_cost)}
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.tempId)}
                          className="h-7 w-7 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Notas adicionales para la solicitud..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Orders to generate & Summary - Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders to generate - Left */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Órdenes a Generar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(itemsBySupplier).length > 0 ? (
              Object.entries(itemsBySupplier).map(([supplierName, data]) => (
                <div key={supplierName} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{supplierName}</p>
                    <p className="text-muted-foreground text-xs">{data.count} items</p>
                  </div>
                  <span className="font-medium">{formatCurrency(data.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">Agrega items para ver las órdenes</p>
            )}
          </CardContent>
        </Card>

        {/* Summary - Right */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA (19%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="border-t pt-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Bottom */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/pos/inventario/solicitudes')}
        >
          Cancelar
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving || items.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Borrador
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || items.length === 0}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar a Aprobación
          </Button>
        </div>
      </div>
    </div>
  );
}
