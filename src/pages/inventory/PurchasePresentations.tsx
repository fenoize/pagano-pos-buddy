import { useState } from 'react';
import { Plus, Package, Trash2, Edit, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePurchasePresentations } from '@/hooks/usePurchasePresentations';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useUOM } from '@/hooks/useUOM';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { MaterialPurchasePresentation } from '@/types/purchaseRequests';

export default function PurchasePresentations() {
  const navigate = useNavigate();
  const { presentations, loading, createPresentation, updatePresentation, deletePresentation } = usePurchasePresentations();
  const { materials: rawMaterials } = useRawMaterials();
  const { uoms } = useUOM();
  const { suppliers } = useSuppliers();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    raw_material_id: '',
    supplier_id: '__none__',
    name: '',
    purchase_uom_id: '',
    content_qty: '',
    content_uom_id: '',
    last_price: '',
    is_default: false,
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({
      raw_material_id: '',
      supplier_id: '__none__',
      name: '',
      purchase_uom_id: '',
      content_qty: '',
      content_uom_id: '',
      last_price: '',
      is_default: false,
    });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (p: MaterialPurchasePresentation) => {
    setEditId(p.id);
    setFormData({
      raw_material_id: p.raw_material_id,
      supplier_id: p.supplier_id || '__none__',
      name: p.name,
      purchase_uom_id: p.purchase_uom_id,
      content_qty: String(p.content_qty),
      content_uom_id: p.content_uom_id,
      last_price: p.last_price > 0 ? String(p.last_price) : '',
      is_default: p.is_default,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.raw_material_id || !formData.name || !formData.purchase_uom_id || !formData.content_qty || !formData.content_uom_id) return;
    setSaving(true);

    const payload = {
      raw_material_id: formData.raw_material_id,
      supplier_id: formData.supplier_id === '__none__' ? null : formData.supplier_id,
      name: formData.name,
      purchase_uom_id: formData.purchase_uom_id,
      content_qty: parseFloat(formData.content_qty),
      content_uom_id: formData.content_uom_id,
      last_price: parseFloat(formData.last_price) || 0,
      is_default: formData.is_default,
    };

    let success: boolean;
    if (editId) {
      success = await updatePresentation(editId, payload);
    } else {
      success = await createPresentation(payload);
    }

    setSaving(false);
    if (success) {
      setShowForm(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePresentation(deleteId);
    setDeleteId(null);
  };

  const filtered = presentations.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.raw_material?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group by material
  const grouped = filtered.reduce<Record<string, MaterialPurchasePresentation[]>>((acc, p) => {
    const matName = p.raw_material?.name || 'Sin material';
    if (!acc[matName]) acc[matName] = [];
    acc[matName].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pos/inventario')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Presentaciones de Compra</h1>
            <p className="text-muted-foreground text-sm">Configura cómo se compran tus insumos (cajas, bolsas, sacos)</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Presentación
        </Button>
      </div>

      <Input
        placeholder="Buscar por material o nombre..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Cargando...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay presentaciones configuradas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crea presentaciones para mapear cajas, bolsas o sacos a sus unidades base (kg, gr, lt).
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primera presentación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([matName, items]) => (
            <Card key={matName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  {matName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{p.name}</p>
                        {p.is_default && (
                          <Badge variant="secondary" className="text-xs">Por defecto</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        1 {p.purchase_uom?.abbreviation || p.purchase_uom?.name} = {p.content_qty} {p.content_uom?.abbreviation || p.content_uom?.name}
                        {p.supplier?.name && ` · ${p.supplier.name}`}
                        {p.last_price > 0 && ` · $${p.last_price.toLocaleString('es-CL')}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar' : 'Nueva'} Presentación</DialogTitle>
            <DialogDescription>
              Define cómo se compra un insumo y su equivalencia en unidad base.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Material *</Label>
              <Select value={formData.raw_material_id} onValueChange={v => setFormData(f => ({ ...f, raw_material_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar material" /></SelectTrigger>
                <SelectContent position="popper" className="z-[200] max-h-[200px]">
                  {rawMaterials.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nombre de la presentación *</Label>
              <Input
                placeholder='Ej: "Caja 8x2.25kg"'
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Unidad de compra *</Label>
              <Select value={formData.purchase_uom_id} onValueChange={v => setFormData(f => ({ ...f, purchase_uom_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Ej: Caja, Bolsa, Saco" /></SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  {uoms.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contenido *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="18"
                  value={formData.content_qty}
                  onChange={e => setFormData(f => ({ ...f, content_qty: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad base *</Label>
                <Select value={formData.content_uom_id} onValueChange={v => setFormData(f => ({ ...f, content_uom_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Kg, Gr, Lt" /></SelectTrigger>
                  <SelectContent position="popper" className="z-[200]">
                    {uoms.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              {formData.content_qty && formData.purchase_uom_id && formData.content_uom_id ? (
                <>
                  <strong>Conversión:</strong> 1{' '}
                  {uoms.find(u => u.id === formData.purchase_uom_id)?.abbreviation || '?'} ={' '}
                  {formData.content_qty}{' '}
                  {uoms.find(u => u.id === formData.content_uom_id)?.abbreviation || '?'}
                </>
              ) : (
                'Completa los campos para ver la conversión'
              )}
            </div>

            <div className="space-y-2">
              <Label>Proveedor (opcional)</Label>
              <Select value={formData.supplier_id} onValueChange={v => setFormData(f => ({ ...f, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  <SelectItem value="__none__">Sin proveedor</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Último precio (CLP, opcional)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={formData.last_price}
                onChange={e => setFormData(f => ({ ...f, last_price: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.raw_material_id || !formData.name || !formData.purchase_uom_id || !formData.content_qty || !formData.content_uom_id}
            >
              {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presentación?</AlertDialogTitle>
            <AlertDialogDescription>La presentación será desactivada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
