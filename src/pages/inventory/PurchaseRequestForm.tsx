import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Send, PackagePlus, TruckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { QuickCreateMaterialModal } from '@/components/inventory/QuickCreateMaterialModal';
import { QuickCreateSupplierModal } from '@/components/inventory/QuickCreateSupplierModal';
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useToast } from '@/hooks/use-toast';
import { useUOM } from '@/hooks/useUOM';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const { createRequest, getRequestById, updateRequest, submitForApproval: submitRequestForApproval } = usePurchaseRequests();
  const { materials, createMaterial, fetchMaterials } = useRawMaterials();
  const { suppliers, createSupplier, refetch: refetchSuppliers } = useSuppliers();
  const { uoms } = useUOM();

  const [items, setItems] = useState<FormItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // Quick create modals
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [createForItemId, setCreateForItemId] = useState<string | null>(null);

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
            notes: item.notes || '',
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

      if (field === 'raw_material_id') {
        const material = materials.find(m => m.id === value);
        if (material) {
          updated.uom_id = material.base_uom_id || '';
          updated.estimated_unit_cost = material.last_cost || 0;
          updated.materialName = material.name;
          updated.uomSymbol = (material.base_uom as { symbol?: string; abbreviation?: string })?.abbreviation || '';
        }
      }

      if (field === 'supplier_id') {
        const supplier = suppliers.find(s => s.id === value);
        if (supplier) {
          updated.supplierName = supplier.name;
        }
      }

      return updated;
    }));
  };

  const subtotal = items.reduce((acc, item) => acc + (item.qty * item.estimated_unit_cost), 0);
  const tax = subtotal * 0.19;
  const total = subtotal + tax;

  const itemsBySupplier = items.reduce((acc, item) => {
    if (!item.supplier_id) return acc;
    const supplierName = item.supplierName || 'Sin proveedor';
    if (!acc[supplierName]) acc[supplierName] = { count: 0, total: 0 };
    acc[supplierName].count += 1;
    acc[supplierName].total += item.qty * item.estimated_unit_cost;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const validateForm = (): boolean => {
    if (items.length === 0) {
      toast({ title: 'Error', description: 'Debes agregar al menos un item', variant: 'destructive' });
      return false;
    }
    for (const item of items) {
      if (!item.raw_material_id || !item.supplier_id || item.qty <= 0) {
        toast({ title: 'Error', description: 'Todos los items deben tener material, proveedor y cantidad válida', variant: 'destructive' });
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
        notes: item.notes || undefined,
      }));

      if (isEditMode && id) {
        const success = await updateRequest(id, { notes: notes || undefined, items: itemsData });
        if (success) {
          if (submitForApproval) await submitRequestForApproval(id);
          navigate(`/pos/inventario/solicitudes/${id}`);
        }
      } else {
        const requestId = await createRequest({
          notes: notes || undefined,
          items: itemsData,
          submit_for_approval: submitForApproval,
        });
        if (requestId) navigate(`/pos/inventario/solicitudes/${requestId}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle material created from quick modal
  const handleMaterialCreated = (material: { id: string; name: string; base_uom_id?: string; last_cost?: number }) => {
    fetchMaterials();
    if (createForItemId) {
      updateItem(createForItemId, 'raw_material_id', material.id);
      setItems(prev => prev.map(item =>
        item.tempId === createForItemId
          ? { ...item, raw_material_id: material.id, materialName: material.name, uom_id: material.base_uom_id || '', estimated_unit_cost: material.last_cost || 0 }
          : item
      ));
    }
    setCreateForItemId(null);
  };

  // Handle supplier created from quick modal
  const handleSupplierCreated = async (supplier: { id: string; name: string }) => {
    if (createForItemId && supplier.id) {
      updateItem(createForItemId, 'supplier_id', supplier.id);
      // Also update the supplier name for display
      setItems(prev => prev.map(item =>
        item.tempId === createForItemId
          ? { ...item, supplier_id: supplier.id, supplierName: supplier.name }
          : item
      ));
    }
    setCreateForItemId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-32 sm:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEditMode ? `/pos/inventario/solicitudes/${id}` : '/pos/inventario/solicitudes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
            {isEditMode ? 'Editar Solicitud' : 'Nueva Solicitud de Compra'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isEditMode ? 'Modifica los materiales' : 'Agrega los materiales que necesitas comprar'}
          </p>
        </div>
      </div>

      {/* Items Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Items de la Solicitud</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay items. Haz clic en "Agregar" para comenzar.</p>
            </div>
          ) : isMobile ? (
            /* ========== MOBILE: Card-based layout ========== */
            <div className="space-y-4">
              {items.map((item, idx) => (
                <Card key={item.tempId} className="border border-border">
                  <CardContent className="p-3 space-y-3">
                    {/* Header with index and delete */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Item #{idx + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.tempId)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Material */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Material</Label>
                      <div className="flex gap-1.5">
                        <div className="flex-1">
                          <MaterialSearchAutocomplete
                            materials={materials}
                            loading={materials.length === 0}
                            value={item.raw_material_id}
                            displayValue={item.materialName}
                            onSelect={(materialId, material) => {
                              if (material) {
                                updateItem(item.tempId, 'raw_material_id', materialId);
                              } else {
                                updateItem(item.tempId, 'raw_material_id', '');
                              }
                            }}
                            placeholder="Buscar material..."
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            setCreateForItemId(item.tempId);
                            setShowCreateMaterial(true);
                          }}
                          title="Crear material"
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Supplier */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Proveedor</Label>
                      <div className="flex gap-1.5">
                        <div className="flex-1">
                          <Select
                            value={item.supplier_id}
                            onValueChange={(v) => updateItem(item.tempId, 'supplier_id', v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Seleccionar proveedor" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => {
                            setCreateForItemId(item.tempId);
                            setShowCreateSupplier(true);
                          }}
                          title="Crear proveedor"
                        >
                          <TruckIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Cantidad + Unidad side by side */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0.01}
                          step={0.01}
                          value={item.qty}
                          onChange={(e) => updateItem(item.tempId, 'qty', parseFloat(e.target.value) || 0)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unidad</Label>
                        <Select
                          value={item.uom_id}
                          onValueChange={(v) => updateItem(item.tempId, 'uom_id', v)}
                        >
                          <SelectTrigger className="h-9 text-sm">
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
                      </div>
                    </div>

                    {/* Precio + Total side by side */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Precio Unit.</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={item.estimated_unit_cost}
                          onChange={(e) => updateItem(item.tempId, 'estimated_unit_cost', parseFloat(e.target.value) || 0)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Total</Label>
                        <div className="h-9 flex items-center px-3 rounded-md bg-muted text-sm font-medium">
                          {formatCurrency(item.qty * item.estimated_unit_cost)}
                        </div>
                      </div>
                    </div>

                    {/* Nota para el proveedor */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nota (instrucciones al proveedor)</Label>
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => updateItem(item.tempId, 'notes', e.target.value)}
                        placeholder="Ej: 1.5 kg rebanado y 1.5 kg entero"
                        className="min-h-[60px] text-sm resize-none"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* ========== DESKTOP: Table layout ========== */
            <div className="overflow-x-auto border border-border rounded-md">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto min-w-[180px]">Material</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto min-w-[160px]">Proveedor</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[90px]">Cantidad</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[90px]">Unidad</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[100px]">Precio Unit.</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[100px] text-right">Total</TableHead>
                    <TableHead className="px-1 py-1.5 h-auto w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <React.Fragment key={item.tempId}>
                    <TableRow className="border-b-0">
                      <TableCell className="border-r border-border p-1">
                        <div className="flex gap-1">
                          <div className="flex-1">
                            <MaterialSearchAutocomplete
                              materials={materials}
                              loading={materials.length === 0}
                              value={item.raw_material_id}
                              displayValue={item.materialName}
                              onSelect={(materialId, material) => {
                                if (material) {
                                  updateItem(item.tempId, 'raw_material_id', materialId);
                                } else {
                                  updateItem(item.tempId, 'raw_material_id', '');
                                }
                              }}
                              placeholder="Buscar material..."
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              setCreateForItemId(item.tempId);
                              setShowCreateMaterial(true);
                            }}
                            title="Crear material"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="border-r border-border p-1">
                        <div className="flex gap-1">
                          <div className="flex-1">
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
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              setCreateForItemId(item.tempId);
                              setShowCreateSupplier(true);
                            }}
                            title="Crear proveedor"
                          >
                            <TruckIcon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
                    <TableRow className={idx < items.length - 1 ? 'border-b border-border' : ''}>
                      <TableCell colSpan={7} className="p-1 pt-0">
                        <Textarea
                          value={item.notes || ''}
                          onChange={(e) => updateItem(item.tempId, 'notes', e.target.value)}
                          placeholder="Nota para el proveedor (ej: 1.5 kg rebanado y 1.5 kg entero)"
                          className="min-h-[40px] text-xs resize-none border-dashed"
                          rows={1}
                        />
                      </TableCell>
                    </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Button onClick={addItem} variant="outline" size="sm" className="w-full mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Item
          </Button>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Notas</CardTitle>
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

      {/* Orders to generate & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA (19%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons - Fixed bottom on mobile */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-3 flex items-center justify-between gap-2 z-40 sm:static sm:border-0 sm:p-0 sm:bg-transparent">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/pos/inventario/solicitudes')}
          className="text-xs sm:text-sm"
        >
          Cancelar
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving || items.length === 0}
            className="text-xs sm:text-sm"
          >
            <Save className="h-3.5 w-3.5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Guardar Borrador</span>
            <span className="sm:hidden">Borrador</span>
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving || items.length === 0}
            className="text-xs sm:text-sm"
          >
            <Send className="h-3.5 w-3.5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Enviar a Aprobación</span>
            <span className="sm:hidden">Enviar</span>
          </Button>
        </div>
      </div>

      {/* Quick Create Modals */}
      <QuickCreateMaterialModal
        open={showCreateMaterial}
        onOpenChange={setShowCreateMaterial}
        onCreated={handleMaterialCreated}
      />
      <QuickCreateSupplierModal
        open={showCreateSupplier}
        onOpenChange={setShowCreateSupplier}
        onCreated={handleSupplierCreated}
        refetchSuppliers={refetchSuppliers}
      />
    </div>
  );
}
