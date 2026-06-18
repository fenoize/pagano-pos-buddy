import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShoppingBag, Maximize2, X, Loader2, GripVertical } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePurchasePresentations } from '@/hooks/usePurchasePresentations';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { PurchaseRequestItem } from '@/types/purchaseRequests';
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  requestId?: string;
  items: PurchaseRequestItem[];
  warehouseId?: string;
  onItemResolved?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  resolveItemFn: (itemId: string, data: { procurement_mode: string; actual_supplier_id?: string | null; actual_unit_cost?: number; resolved_by: string; force_resolved?: boolean }) => Promise<boolean>;
  unresolveItemFn: (itemId: string) => Promise<boolean>;
}


interface OptimisticState {
  resolved_at: string | null;
  actual_unit_cost: number;
  actual_supplier_id: string | null;
}

/* ─── Edit Modal ─── */
function DirectPurchaseEditModal({
  item,
  open,
  onOpenChange,
  warehouseId,
  onOptimisticUpdate,
  resolveItemFn,
}: {
  item: PurchaseRequestItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  warehouseId?: string;
  onOptimisticUpdate: (itemId: string, state: OptimisticState) => void;
  resolveItemFn: Props['resolveItemFn'];
}) {
  const { suppliers } = useSuppliers();
  const { presentations } = usePurchasePresentations(item.raw_material_id);
  const { user } = useAuthContext();
  const [supplierId, setSupplierId] = useState(item.actual_supplier_id || '__none__');
  const [unitCost, setUnitCost] = useState(item.actual_unit_cost > 0 ? String(item.actual_unit_cost) : '');
  const [actualQty, setActualQty] = useState(String(item.qty || ''));
  const [presentationId, setPresentationId] = useState(item.presentation_id || '__none__');
  const [saving, setSaving] = useState(false);

  const unitCostNum = parseFloat(unitCost) || 0;
  const qtyNum = parseFloat(actualQty) || 0;
  const totalNum = Math.round(unitCostNum * qtyNum);

  const handleSave = async () => {
    if (!user) return;
    const unitPrice = unitCostNum;
    const qty = qtyNum || item.qty;
    const totalCost = Math.round(unitPrice * qty);
    const supplier = supplierId === '__none__' ? null : supplierId;

    onOptimisticUpdate(item.id, {
      resolved_at: new Date().toISOString(),
      actual_unit_cost: unitPrice,
      actual_supplier_id: supplier,
    });
    onOpenChange(false);

    setSaving(true);
    const success = await resolveItemFn(item.id, {
      procurement_mode: 'compra_directa',
      actual_supplier_id: supplier,
      actual_unit_cost: unitPrice,
      resolved_by: user.id,
      force_resolved: true,
    });

    if (success && presentationId !== '__none__') {
      await supabase.from('purchase_request_items').update({
        presentation_id: presentationId,
      }).eq('id', item.id);
    }

    if (success && warehouseId && qty > 0) {
      await supabase.rpc('receive_direct_purchase_item', {
        p_request_item_id: item.id,
        p_warehouse_id: warehouseId,
        p_qty: qty,
        p_total_cost: totalCost,
        p_notes: `Compra directa - ${item.raw_material?.name}`,
      });
    }

    setSaving(false);
    if (!success) {
      onOptimisticUpdate(item.id, {
        resolved_at: null,
        actual_unit_cost: 0,
        actual_supplier_id: null,
      });
      toast.error('Error', { description: 'No se pudo marcar el item' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{item.raw_material?.name}</DialogTitle>
          {item.notes && (
            <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Proveedor */}
          <div className="space-y-1.5">
            <Label className="text-sm">Proveedor / Lugar (opcional)</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="¿Dónde se compró?" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[200]">
                <SelectItem value="__none__">Sin especificar</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unidad | Cantidad | Total */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Unidad</Label>
              <Select value={presentationId} onValueChange={setPresentationId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Unidad" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  <SelectItem value="__none__">{item.uom?.abbreviation || 'u'}</SelectItem>
                  {presentations.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Cantidad</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={actualQty}
                onChange={e => setActualQty(e.target.value)}
                className="h-10 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Precio unit. $</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                className="h-10 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Total preview - prominente */}
          {qtyNum > 0 && unitCostNum > 0 && (
            <div className="flex items-baseline justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground">${totalNum.toLocaleString('es-CL')}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Marcar como Comprado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Item Row ─── */
function DirectPurchaseItemRow({
  item,
  warehouseId,
  onOptimisticUpdate,
  resolveItemFn,
  unresolveItemFn,
}: {
  item: PurchaseRequestItem;
  warehouseId?: string;
  onOptimisticUpdate: (itemId: string, state: OptimisticState) => void;
  resolveItemFn: Props['resolveItemFn'];
  unresolveItemFn: Props['unresolveItemFn'];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const isResolved = !!item.resolved_at;
  const costDisplay = item.actual_unit_cost > 0 ? `$${item.actual_unit_cost.toLocaleString('es-CL')}` : null;

  const handleCheckboxChange = async (checked: boolean | 'indeterminate') => {
    if (saving) return;
    if (!checked && isResolved) {
      // Unresolve
      onOptimisticUpdate(item.id, {
        resolved_at: null,
        actual_unit_cost: 0,
        actual_supplier_id: null,
      });
      setSaving(true);
      const success = await unresolveItemFn(item.id);
      setSaving(false);
      if (!success) {
        onOptimisticUpdate(item.id, {
          resolved_at: item.resolved_at,
          actual_unit_cost: item.actual_unit_cost,
          actual_supplier_id: item.actual_supplier_id,
        });
        toast.error('Error', { description: 'No se pudo desmarcar el item' });
      }
    }
  };

  const handleRowClick = () => {
    if (!isResolved) {
      setModalOpen(true);
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-colors cursor-pointer ${
          isResolved
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
            : 'bg-card border-border hover:bg-accent/50'
        } ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''}`}
        onClick={handleRowClick}
      >
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground touch-none cursor-grab active:cursor-grabbing px-1 -ml-1"
          aria-label="Reordenar"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Checkbox
          checked={isResolved}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          disabled={saving}
        />
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${isResolved ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {item.raw_material?.name}
          </p>
          {item.notes && (
            <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-right">
          <span className="text-xs text-muted-foreground">
            {item.qty} {item.uom?.abbreviation}
          </span>
          {isResolved && costDisplay && (
            <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:text-emerald-400">
              {costDisplay}
            </Badge>
          )}
        </div>
      </div>

      {modalOpen && (
        <DirectPurchaseEditModal
          item={item}
          open={modalOpen}
          onOpenChange={setModalOpen}
          warehouseId={warehouseId}
          onOptimisticUpdate={onOptimisticUpdate}
          resolveItemFn={resolveItemFn}
        />
      )}
    </>
  );
}


/* ─── Main Checklist ─── */
export default function DirectPurchaseChecklist({ requestId, items, warehouseId, onItemResolved, fullscreen, onToggleFullscreen, resolveItemFn, unresolveItemFn }: Props) {
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, OptimisticState>>({});

  const storageKey = requestId ? `direct-purchase-order:${requestId}` : null;
  const [order, setOrder] = useState<string[]>(() => {
    if (!storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const handleOptimisticUpdate = useCallback((itemId: string, state: OptimisticState) => {
    setOptimisticOverrides(prev => ({ ...prev, [itemId]: state }));
    onItemResolved?.();
  }, [onItemResolved]);

  const mergedItems = useMemo(() => {
    return items
      .filter(i => i.procurement_mode === 'compra_directa' || (!i.procurement_mode && !i.resolved_at) || optimisticOverrides[i.id])
      .map(i => {
        const override = optimisticOverrides[i.id];
        if (!override) return i;
        return { ...i, ...override };
      });
  }, [items, optimisticOverrides]);

  const directItems = mergedItems.filter(i => i.procurement_mode === 'compra_directa' || (!i.procurement_mode && !i.resolved_at));

  // Apply persisted order; new items go at the end
  const orderedItems = useMemo(() => {
    if (order.length === 0) return directItems;
    const map = new Map(directItems.map(i => [i.id, i]));
    const result: typeof directItems = [];
    for (const id of order) {
      const it = map.get(id);
      if (it) {
        result.push(it);
        map.delete(id);
      }
    }
    // append any new items not yet in order
    return [...result, ...map.values()];
  }, [directItems, order]);

  // Initialize / sync order when items appear
  useEffect(() => {
    if (!storageKey) return;
    const currentIds = directItems.map(i => i.id);
    const known = new Set(order);
    const missing = currentIds.filter(id => !known.has(id));
    const stillExisting = order.filter(id => currentIds.includes(id));
    if (missing.length > 0 || stillExisting.length !== order.length) {
      const next = [...stillExisting, ...missing];
      setOrder(next);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directItems.map(i => i.id).join('|'), storageKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex(i => i.id === active.id);
    const newIndex = orderedItems.findIndex(i => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(orderedItems, oldIndex, newIndex).map(i => i.id);
    setOrder(next);
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };

  const resolvedCount = orderedItems.filter(i => i.resolved_at).length;
  const progressPercent = orderedItems.length > 0 ? Math.round((resolvedCount / orderedItems.length) * 100) : 0;

  const totalSpent = orderedItems
    .filter(i => i.resolved_at && i.actual_unit_cost > 0)
    .reduce((sum, i) => sum + i.actual_unit_cost, 0);

  if (orderedItems.length === 0) return null;

  const content = (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          Lista de Compra Directa
          <Badge variant="outline" className="ml-auto text-xs">
            {resolvedCount}/{orderedItems.length}
          </Badge>
          {onToggleFullscreen && (
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={onToggleFullscreen}>
              {fullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className={`space-y-2 ${fullscreen ? 'max-h-[calc(100vh-280px)] overflow-y-auto' : ''}`}>
              {orderedItems.map(item => (
                <DirectPurchaseItemRow
                  key={item.id}
                  item={item}
                  warehouseId={warehouseId}
                  onOptimisticUpdate={handleOptimisticUpdate}
                  resolveItemFn={resolveItemFn}
                  unresolveItemFn={unresolveItemFn}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {totalSpent > 0 && (
          <div className="flex items-center justify-between pt-2 border-t text-sm font-medium">
            <span className="text-muted-foreground">Total gastado</span>
            <span className="text-foreground">${totalSpent.toLocaleString('es-CL')}</span>
          </div>
        )}
      </CardContent>
    </>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4">
          <Card>{content}</Card>
        </div>
      </div>
    );
  }

  return <Card>{content}</Card>;
}

