import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { usePurchasePresentations } from '@/hooks/usePurchasePresentations';
import { useAuthContext } from '@/contexts/AuthContext';
import { PROCUREMENT_MODE_CONFIG, type PurchaseRequestItem, type ProcurementMode } from '@/types/purchaseRequests';
import { Package, Truck, ShoppingBag, Store, Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ItemResolveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PurchaseRequestItem | null;
  onResolved: () => void;
}

const MODE_ICONS: Record<ProcurementMode, React.ElementType> = {
  proveedor_despacha: Truck,
  retiro_proveedor: ShoppingBag,
  compra_directa: Store,
};

export default function ItemResolveModal({ open, onOpenChange, item, onResolved }: ItemResolveModalProps) {
  const { suppliers } = useSuppliers();
  const { resolveItem } = usePurchaseRequests();
  const { presentations, fetchPresentations } = usePurchasePresentations(item?.raw_material_id);
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [mode, setMode] = useState<ProcurementMode | ''>('');
  const [supplierId, setSupplierId] = useState<string>('__none__');
  const [unitCost, setUnitCost] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [presentationId, setPresentationId] = useState<string>('__none__');
  const [saving, setSaving] = useState(false);

  // Quotations
  const [quotations, setQuotations] = useState<Array<{
    id?: string;
    supplier_name: string;
    unit_price: number;
    notes: string;
    is_selected: boolean;
  }>>([]);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [newQuoteSupplier, setNewQuoteSupplier] = useState('');
  const [newQuotePrice, setNewQuotePrice] = useState('');
  const [newQuoteNotes, setNewQuoteNotes] = useState('');

  useEffect(() => {
    if (open && item) {
      setMode((item.procurement_mode as ProcurementMode) || '');
      setSupplierId(item.actual_supplier_id || item.supplier_id || '__none__');
      setUnitCost(item.actual_unit_cost > 0 ? String(item.actual_unit_cost) : '');
      setActualQty(String(item.actual_qty ?? item.qty));
      setPresentationId(item.presentation_id || '__none__');
      loadQuotations(item.id);
    }
  }, [open, item?.id]);

  const loadQuotations = async (itemId: string) => {
    const { data } = await supabase
      .from('purchase_quotations')
      .select('*')
      .eq('request_item_id', itemId)
      .order('quoted_at', { ascending: false });
    if (data) {
      setQuotations(data.map(q => ({
        id: q.id,
        supplier_name: q.supplier_name || '',
        unit_price: q.unit_price,
        notes: q.notes || '',
        is_selected: q.is_selected,
      })));
    }
  };

  const handleAddQuote = async () => {
    if (!item || !newQuoteSupplier.trim() || !newQuotePrice) return;
    const { error } = await supabase.from('purchase_quotations').insert({
      request_item_id: item.id,
      supplier_name: newQuoteSupplier,
      unit_price: parseFloat(newQuotePrice),
      notes: newQuoteNotes || null,
      quoted_by: user?.id || null,
    });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la cotización', variant: 'destructive' });
      return;
    }
    setNewQuoteSupplier('');
    setNewQuotePrice('');
    setNewQuoteNotes('');
    setShowAddQuote(false);
    await loadQuotations(item.id);
  };

  const handleSelectQuote = async (quoteId: string, price: number) => {
    if (!item) return;
    // Deselect all, select this one
    await supabase.from('purchase_quotations').update({ is_selected: false }).eq('request_item_id', item.id);
    await supabase.from('purchase_quotations').update({ is_selected: true }).eq('id', quoteId);
    setUnitCost(String(price));
    await loadQuotations(item.id);
  };

  const handleSave = async () => {
    if (!item || !mode || !user) return;
    setSaving(true);

    const parsedQty = parseFloat(actualQty) || item.qty;
    const success = await resolveItem(item.id, {
      procurement_mode: mode,
      actual_supplier_id: supplierId === '__none__' ? null : supplierId,
      actual_unit_cost: parseFloat(unitCost) || 0,
      actual_qty: parsedQty !== item.qty ? parsedQty : null,
      resolved_by: user.id,
    });

    // Also save presentation_id if selected
    if (success && presentationId !== '__none__') {
      await supabase.from('purchase_request_items').update({
        presentation_id: presentationId,
      }).eq('id', item.id);
    }

    setSaving(false);
    if (success) {
      toast({ title: 'Item resuelto' });
      onResolved();
      onOpenChange(false);
    }
  };

  if (!item) return null;

  const selectedPresentation = presentations.find(p => p.id === presentationId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resolver Item</DialogTitle>
          <DialogDescription>
            Asigna modalidad, proveedor y precio para: <strong>{item.raw_material?.name}</strong>
            {' '}— {item.qty} {item.uom?.abbreviation}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Procurement Mode */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modalidad de Compra</Label>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(PROCUREMENT_MODE_CONFIG) as ProcurementMode[]).map((m) => {
                const config = PROCUREMENT_MODE_CONFIG[m];
                const Icon = MODE_ICONS[m];
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{config.label}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Supplier */}
          {mode && mode !== 'compra_directa' && (
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Presentation */}
          {presentations.length > 0 && (
            <div className="space-y-2">
              <Label>Presentación de Compra</Label>
              <Select value={presentationId} onValueChange={setPresentationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar presentación" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  <SelectItem value="__none__">Sin presentación</SelectItem>
                  {presentations.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.content_qty} {p.content_uom?.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPresentation && (
                <p className="text-xs text-muted-foreground">
                  1 {selectedPresentation.purchase_uom?.abbreviation} = {selectedPresentation.content_qty} {selectedPresentation.content_uom?.abbreviation}
                  {selectedPresentation.last_price > 0 && ` · Último precio: $${selectedPresentation.last_price.toLocaleString('es-CL')}`}
                </p>
              )}
            </div>
          )}

          {/* Actual Quantity */}
          <div className="space-y-2">
            <Label>
              Cantidad ({item.uom?.abbreviation || 'u'})
            </Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder={String(item.qty)}
              value={actualQty}
              onChange={e => setActualQty(e.target.value)}
            />
            {parseFloat(actualQty) !== item.qty && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">
                  Cantidad ajustada
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Solicitado: {item.qty} {item.uom?.abbreviation || 'u'}
                </span>
              </div>
            )}
          </div>

          {/* Unit Cost */}
          <div className="space-y-2">
            <Label>
              Precio Unitario (CLP) / {selectedPresentation
                ? selectedPresentation.purchase_uom?.abbreviation || selectedPresentation.purchase_uom?.name || 'unidad'
                : item.uom?.abbreviation || item.uom?.name || 'unidad'}
            </Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={unitCost}
              onChange={e => setUnitCost(e.target.value)}
            />
            {selectedPresentation && unitCost && parseFloat(unitCost) > 0 && (
              <p className="text-xs text-muted-foreground">
                Equivale a ${Math.round(parseFloat(unitCost) / selectedPresentation.content_qty).toLocaleString('es-CL')}/{selectedPresentation.content_uom?.abbreviation || 'unidad base'}
              </p>
            )}
            {unitCost && parseFloat(unitCost) > 0 && (parseFloat(actualQty) || item.qty) > 0 && (
              <p className="text-sm font-medium text-foreground mt-1">
                Total estimado: <span className="text-primary">${Math.round(parseFloat(unitCost) * (parseFloat(actualQty) || item.qty)).toLocaleString('es-CL')}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({parseFloat(actualQty) || item.qty} {item.uom?.abbreviation || 'u'} × ${parseFloat(unitCost).toLocaleString('es-CL')})
                </span>
              </p>
            )}
          </div>

          {/* Quotations section */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Cotizaciones</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowAddQuote(!showAddQuote)}>
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            </div>

            {showAddQuote && (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <Input
                  placeholder="Proveedor o lugar"
                  value={newQuoteSupplier}
                  onChange={e => setNewQuoteSupplier(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Precio unitario"
                  value={newQuotePrice}
                  onChange={e => setNewQuotePrice(e.target.value)}
                />
                <Input
                  placeholder="Notas (opcional)"
                  value={newQuoteNotes}
                  onChange={e => setNewQuoteNotes(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddQuote} disabled={!newQuoteSupplier.trim() || !newQuotePrice}>
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddQuote(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {quotations.length === 0 && !showAddQuote && (
              <p className="text-xs text-muted-foreground">Sin cotizaciones registradas</p>
            )}

            {quotations.map((q) => (
              <div
                key={q.id}
                className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                  q.is_selected ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div>
                  <p className="font-medium">{q.supplier_name}</p>
                  <p className="text-xs text-muted-foreground">{q.notes}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">${q.unit_price.toLocaleString('es-CL')}</span>
                  {q.is_selected ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">Seleccionada</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => q.id && handleSelectQuote(q.id, q.unit_price)}
                    >
                      Usar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!mode || saving}>
            {saving ? 'Guardando...' : 'Resolver Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
