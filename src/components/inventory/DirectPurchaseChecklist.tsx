import { useState } from 'react';
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
  onItemResolved: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function DirectPurchaseItemCard({ item, onResolved }: { item: PurchaseRequestItem; onResolved: () => void }) {
  const { suppliers } = useSuppliers();
  const { resolveItem } = usePurchaseRequests();
  const { presentations } = usePurchasePresentations(item.raw_material_id);
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [expanded, setExpanded] = useState(!item.resolved_at);
  const [supplierId, setSupplierId] = useState(item.actual_supplier_id || '__none__');
  const [unitCost, setUnitCost] = useState(item.actual_unit_cost > 0 ? String(item.actual_unit_cost) : '');
  const [presentationId, setPresentationId] = useState(item.presentation_id || '__none__');
  const [saving, setSaving] = useState(false);
  const isResolved = !!item.resolved_at;

  const handleResolve = async () => {
    if (!user) return;
    setSaving(true);
    const success = await resolveItem(item.id, {
      procurement_mode: 'compra_directa',
      actual_supplier_id: supplierId === '__none__' ? null : supplierId,
      actual_unit_cost: parseFloat(unitCost) || 0,
      resolved_by: user.id,
    });

    if (success && presentationId !== '__none__') {
      await supabase.from('purchase_request_items').update({
        presentation_id: presentationId,
      }).eq('id', item.id);
    }

    setSaving(false);
    if (success) {
      toast({ title: 'Item marcado como comprado' });
      onResolved();
    }
  };

  const selectedPresentation = presentations.find(p => p.id === presentationId);

  return (
    <div className={`rounded-lg border transition-colors ${isResolved ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-card border-border'}`}>
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <Checkbox
          checked={isResolved}
          onCheckedChange={() => !isResolved && handleResolve()}
          onClick={(e) => e.stopPropagation()}
          disabled={saving || isResolved}
        />
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${isResolved ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {item.raw_material?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.qty} {item.uom?.abbreviation}
            {item.notes && ` · ${item.notes}`}
          </p>
        </div>
        {isResolved && unitCost && (
          <Badge variant="outline" className="text-xs shrink-0 border-emerald-300 text-emerald-700">
            ${parseFloat(unitCost).toLocaleString('es-CL')}
          </Badge>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && !isResolved && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label className="text-xs">Proveedor / Lugar</Label>
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

          {presentations.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Presentación</Label>
              <Select value={presentationId} onValueChange={setPresentationId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Seleccionar" />
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
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">
              Precio pagado (CLP) / {selectedPresentation
                ? selectedPresentation.purchase_uom?.abbreviation || 'unidad'
                : item.uom?.abbreviation || 'unidad'}
            </Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={unitCost}
              onChange={e => setUnitCost(e.target.value)}
              className="h-9 text-sm"
              style={{ fontSize: '16px' }}
            />
            {selectedPresentation && unitCost && parseFloat(unitCost) > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ ${Math.round(parseFloat(unitCost) / selectedPresentation.content_qty).toLocaleString('es-CL')}/{selectedPresentation.content_uom?.abbreviation || 'u'}
              </p>
            )}
          </div>

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
  const directItems = items.filter(i => i.procurement_mode === 'compra_directa' || (!i.procurement_mode && !i.resolved_at));
  const resolvedCount = directItems.filter(i => i.resolved_at).length;
  const progressPercent = directItems.length > 0 ? Math.round((resolvedCount / directItems.length) * 100) : 0;

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

        <div className={`space-y-2 ${fullscreen ? 'max-h-[calc(100vh-200px)] overflow-y-auto' : ''}`}>
          {directItems.map(item => (
            <DirectPurchaseItemCard
              key={item.id}
              item={item}
              onResolved={onItemResolved}
            />
          ))}
        </div>
      </CardContent>
    </>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
        <div className="max-w-2xl mx-auto p-4">
          <Card>
            {content}
          </Card>
        </div>
      </div>
    );
  }

  return <Card>{content}</Card>;
}
