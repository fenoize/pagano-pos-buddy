import { useState, useCallback, useMemo } from 'react';
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
import { ShoppingBag, ChevronDown, ChevronUp, Loader2, Maximize2, X } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { usePurchasePresentations } from '@/hooks/usePurchasePresentations';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { PurchaseRequestItem } from '@/types/purchaseRequests';

interface Props {
  items: PurchaseRequestItem[];
  onItemResolved?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// Local optimistic state for a single item
interface OptimisticState {
  resolved_at: string | null;
  actual_unit_cost: number;
  actual_supplier_id: string | null;
}

function DirectPurchaseItemCard({ 
  item, 
  onOptimisticUpdate 
}: { 
  item: PurchaseRequestItem; 
  onOptimisticUpdate: (itemId: string, state: OptimisticState) => void;
}) {
  const { suppliers } = useSuppliers();
  const { resolveItem, unresolveItem } = usePurchaseRequests();
  const { presentations } = usePurchasePresentations(item.raw_material_id);
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [expanded, setExpanded] = useState(!item.resolved_at);
  const [supplierId, setSupplierId] = useState(item.actual_supplier_id || '__none__');
  const [unitCost, setUnitCost] = useState(item.actual_unit_cost > 0 ? String(item.actual_unit_cost) : '');
  const [actualQty, setActualQty] = useState(String(item.qty || ''));
  const [presentationId, setPresentationId] = useState(item.presentation_id || '__none__');
  const [saving, setSaving] = useState(false);
  const isResolved = !!item.resolved_at;

  const handleResolve = async () => {
    if (!user) return;
    const cost = parseFloat(unitCost) || 0;
    const supplier = supplierId === '__none__' ? null : supplierId;

    // Optimistic update immediately
    onOptimisticUpdate(item.id, {
      resolved_at: new Date().toISOString(),
      actual_unit_cost: cost,
      actual_supplier_id: supplier,
    });
    setExpanded(false);

    setSaving(true);
    const success = await resolveItem(item.id, {
      procurement_mode: 'compra_directa',
      actual_supplier_id: supplier,
      actual_unit_cost: cost,
      resolved_by: user.id,
    });

    if (success && presentationId !== '__none__') {
      await supabase.from('purchase_request_items').update({
        presentation_id: presentationId,
      }).eq('id', item.id);
    }

    setSaving(false);
    if (!success) {
      // Revert optimistic update on failure
      onOptimisticUpdate(item.id, {
        resolved_at: null,
        actual_unit_cost: 0,
        actual_supplier_id: null,
      });
      toast({ title: 'Error', description: 'No se pudo marcar el item', variant: 'destructive' });
    }
  };

  const handleUnresolve = async () => {
    // Optimistic update immediately
    onOptimisticUpdate(item.id, {
      resolved_at: null,
      actual_unit_cost: 0,
      actual_supplier_id: null,
    });
    setExpanded(true);

    setSaving(true);
    const success = await unresolveItem(item.id);
    setSaving(false);
    if (!success) {
      // Revert on failure
      onOptimisticUpdate(item.id, {
        resolved_at: item.resolved_at,
        actual_unit_cost: item.actual_unit_cost,
        actual_supplier_id: item.actual_supplier_id,
      });
      toast({ title: 'Error', description: 'No se pudo desmarcar el item', variant: 'destructive' });
    }
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (saving) return;
    if (checked && !isResolved) {
      handleResolve();
    } else if (!checked && isResolved) {
      handleUnresolve();
    }
  };

  // actual_unit_cost stores the TOTAL paid, not per-unit
  const costDisplay = item.actual_unit_cost > 0 ? `$${item.actual_unit_cost.toLocaleString('es-CL')}` : null;

  return (
    <div className={`rounded-lg border transition-colors ${isResolved ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-card border-border'}`}>
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
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
            <p className="text-xs text-muted-foreground">{item.notes}</p>
          )}
        </div>
        {/* Right side: qty + cost */}
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
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && !isResolved && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {/* Proveedor (opcional) */}
          <div className="space-y-1">
            <Label className="text-xs">Proveedor / Lugar (opcional)</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="h-9 text-sm">
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

          {/* Unidad | Cantidad | Precio en fila */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unidad</Label>
              <Select value={presentationId} onValueChange={setPresentationId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Unidad" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  <SelectItem value="__none__">{item.uom?.abbreviation || 'u'}</SelectItem>
                  {presentations.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cantidad</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={actualQty}
                onChange={e => setActualQty(e.target.value)}
                className="h-9 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Total $</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                className="h-9 text-sm"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {/* Price = total paid, show per-unit preview */}
          {actualQty && unitCost && parseFloat(actualQty) > 0 && parseFloat(unitCost) > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              Precio unitario: <span className="font-medium text-foreground">${Math.round(parseFloat(unitCost) / parseFloat(actualQty)).toLocaleString('es-CL')}</span> · Total: <span className="font-medium text-foreground">${Math.round(parseFloat(unitCost)).toLocaleString('es-CL')}</span>
            </p>
          )}

          <Button
            className="w-full"
            size="sm"
            onClick={handleResolve}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Marcar como Comprado
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DirectPurchaseChecklist({ items, onItemResolved, fullscreen, onToggleFullscreen }: Props) {
  // Local optimistic overrides keyed by item id
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, OptimisticState>>({});

  const handleOptimisticUpdate = useCallback((itemId: string, state: OptimisticState) => {
    setOptimisticOverrides(prev => ({ ...prev, [itemId]: state }));
    // Notify parent (non-blocking, no full reload needed)
    onItemResolved?.();
  }, [onItemResolved]);

  // Merge server items with optimistic overrides
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
  const resolvedCount = directItems.filter(i => i.resolved_at).length;
  const progressPercent = directItems.length > 0 ? Math.round((resolvedCount / directItems.length) * 100) : 0;

  // Running total of resolved items
  // actual_unit_cost = total paid (not per-unit)
  const totalSpent = directItems
    .filter(i => i.resolved_at && i.actual_unit_cost > 0)
    .reduce((sum, i) => sum + i.actual_unit_cost, 0);

  if (directItems.length === 0) return null;

  const content = (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" />
          Lista de Compra Directa
          <Badge variant="outline" className="ml-auto text-xs">
            {resolvedCount}/{directItems.length}
          </Badge>
          {onToggleFullscreen && (
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={onToggleFullscreen}>
              {fullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className={`space-y-2 ${fullscreen ? 'max-h-[calc(100vh-280px)] overflow-y-auto' : ''}`}>
          {directItems.map(item => (
            <DirectPurchaseItemCard
              key={item.id}
              item={item}
              onOptimisticUpdate={handleOptimisticUpdate}
            />
          ))}
        </div>

        {/* Running total */}
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
