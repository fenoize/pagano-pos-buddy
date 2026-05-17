import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Send, PackagePlus } from 'lucide-react';
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
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useUOM } from '@/hooks/useUOM';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CreatePurchaseRequestItemData } from '@/types/purchaseRequests';
import { toast } from "sonner";

interface FormItem extends CreatePurchaseRequestItemData {
  tempId: string;
  materialName?: string;
  uomSymbol?: string;
}

export default function PurchaseRequestForm() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { createRequest, getRequestById, updateRequest, submitForApproval: submitRequestForApproval } = usePurchaseRequests();
  const { materials, fetchMaterials } = useRawMaterials();
  const { uoms } = useUOM();

  const [items, setItems] = useState<FormItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [createForItemId, setCreateForItemId] = useState<string | null>(null);

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
            qty: item.qty,
            uom_id: item.uom_id || '',
            estimated_unit_cost: item.estimated_unit_cost || 0,
            notes: item.notes || '',
            materialName: item.raw_material?.name,
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

  const addItem = () => {
    setItems([
      ...items,
      {
        tempId: crypto.randomUUID(),
        raw_material_id: '',
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
          updated.materialName = material.name;
          updated.uomSymbol = (material.base_uom as { abbreviation?: string })?.abbreviation || '';
        }
      }

      return updated;
    }));
  };

  const validateForm = (): boolean => {
    if (items.length === 0) {
      toast.error('Error', { description: 'Debes agregar al menos un item' });
      return false;
    }
    for (const item of items) {
      if (!item.raw_material_id || item.qty <= 0) {
        toast.error('Error', { description: 'Todos los items deben tener material y cantidad válida' });
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
        qty: item.qty,
        uom_id: item.uom_id,
        estimated_unit_cost: 0,
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

  const handleMaterialCreated = (material: { id: string; name: string; base_uom_id?: string }) => {
    fetchMaterials();
    if (createForItemId) {
      setItems(prev => prev.map(item =>
        item.tempId === createForItemId
          ? { ...item, raw_material_id: material.id, materialName: material.name, uom_id: material.base_uom_id || '' }
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
            Agrega los materiales que necesitas. El proveedor y precio se asignan después por logística.
          </p>
        </div>
      </div>

      {/* Items Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">¿Qué necesitas?</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay items. Haz clic en "Agregar" para comenzar.</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <Card key={item.tempId} className="border border-border">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Item #{idx + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.tempId)} className="h-7 w-7 text-destructive hover:text-destructive">
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
                        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setCreateForItemId(item.tempId); setShowCreateMaterial(true); }} title="Crear material">
                          <PackagePlus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Cantidad + Unidad */}
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
                        <Select value={item.uom_id} onValueChange={(v) => updateItem(item.tempId, 'uom_id', v)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Unidad" />
                          </SelectTrigger>
                          <SelectContent>
                            {uoms.map((uom) => (
                              <SelectItem key={uom.id} value={uom.id}>{uom.abbreviation}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Nota */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nota (opcional)</Label>
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => updateItem(item.tempId, 'notes', e.target.value)}
                        placeholder="Ej: maduros, rebanado fino, marca X..."
                        className="min-h-[60px] text-sm resize-none"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-md">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto min-w-[220px]">Material</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[100px]">Cantidad</TableHead>
                    <TableHead className="border-r border-border px-2 py-1.5 h-auto w-[100px]">Unidad</TableHead>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setCreateForItemId(item.tempId); setShowCreateMaterial(true); }} title="Crear material">
                              <PackagePlus className="h-3.5 w-3.5" />
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
                          <Select value={item.uom_id} onValueChange={(v) => updateItem(item.tempId, 'uom_id', v)}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                            <SelectContent>
                              {uoms.map((uom) => (
                                <SelectItem key={uom.id} value={uom.id}>{uom.abbreviation}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1 text-center">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.tempId)} className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow className={idx < items.length - 1 ? 'border-b border-border' : ''}>
                        <TableCell colSpan={4} className="p-1 pt-0">
                          <Textarea
                            value={item.notes || ''}
                            onChange={(e) => updateItem(item.tempId, 'notes', e.target.value)}
                            placeholder="Nota: ej. maduros, marca X, corte fino..."
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
          <CardTitle className="text-base sm:text-lg">Notas generales</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Notas adicionales para logística (urgencia, fecha límite, etc.)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total de items</span>
            <span className="font-medium">{items.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-3 flex items-center justify-between gap-2 z-40 sm:static sm:border-0 sm:p-0 sm:bg-transparent">
        <Button variant="ghost" size="sm" onClick={() => navigate('/pos/inventario/solicitudes')} className="text-xs sm:text-sm">
          Cancelar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving || items.length === 0} className="text-xs sm:text-sm">
            <Save className="h-3.5 w-3.5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Guardar Borrador</span>
            <span className="sm:hidden">Borrador</span>
          </Button>
          <Button size="sm" onClick={() => handleSave(true)} disabled={saving || items.length === 0} className="text-xs sm:text-sm">
            <Send className="h-3.5 w-3.5 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Enviar a Aprobación</span>
            <span className="sm:hidden">Enviar</span>
          </Button>
        </div>
      </div>

      {/* Quick Create Modal */}
      <QuickCreateMaterialModal
        open={showCreateMaterial}
        onOpenChange={setShowCreateMaterial}
        onCreated={handleMaterialCreated}
      />
    </div>
  );
}
