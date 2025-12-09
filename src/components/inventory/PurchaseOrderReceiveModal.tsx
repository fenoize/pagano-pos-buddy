import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, PackageCheck, AlertCircle } from 'lucide-react';
import { PurchaseOrder, usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PurchaseOrderReceiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder;
  onSuccess: () => void;
}

export default function PurchaseOrderReceiveModal({
  open,
  onOpenChange,
  order,
  onSuccess,
}: PurchaseOrderReceiveModalProps) {
  const { receiveItems } = usePurchaseOrders();
  const [loading, setLoading] = useState(false);
  const [ingressToInventory, setIngressToInventory] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    order.items?.forEach(item => {
      initial[item.id] = item.qty_pending || 0;
    });
    return initial;
  });

  const handleQuantityChange = (itemId: string, value: number) => {
    const item = order.items?.find(i => i.id === itemId);
    const maxQty = item?.qty_pending || 0;
    const clampedValue = Math.max(0, Math.min(value, maxQty));
    setQuantities(prev => ({ ...prev, [itemId]: clampedValue }));
  };

  const handleReceiveAll = () => {
    const all: Record<string, number> = {};
    order.items?.forEach(item => {
      all[item.id] = item.qty_pending || 0;
    });
    setQuantities(all);
  };

  const handleSubmit = async () => {
    const itemReceipts = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qtyReceived]) => ({ itemId, qtyReceived }));

    if (itemReceipts.length === 0) {
      return;
    }

    setLoading(true);
    const success = await receiveItems(order.id, itemReceipts, ingressToInventory);
    setLoading(false);

    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  const hasItemsToReceive = order.items?.some(item => (item.qty_pending || 0) > 0);
  const totalToReceive = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Registrar Recepción - {order.po_number}
          </DialogTitle>
          <DialogDescription>
            Ingresa las cantidades recibidas para cada item de la orden.
          </DialogDescription>
        </DialogHeader>

        {!hasItemsToReceive ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Todos los items de esta orden ya han sido recibidos.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center justify-between py-4 border-b">
              <div className="flex items-center gap-3">
                <Switch
                  id="ingressInventory"
                  checked={ingressToInventory}
                  onCheckedChange={setIngressToInventory}
                />
                <Label htmlFor="ingressInventory" className="cursor-pointer">
                  Ingresar automáticamente al inventario
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={handleReceiveAll}>
                Recibir Todo
              </Button>
            </div>

            {!ingressToInventory && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Los items quedarán como "recibidos" pero deberás ingresarlos manualmente al inventario después.
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Ordenado</TableHead>
                    <TableHead className="text-right">Recibido</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="w-32 text-right">A Recibir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item) => {
                    const isPending = (item.qty_pending || 0) > 0;
                    return (
                      <TableRow key={item.id} className={!isPending ? 'opacity-50' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.raw_material?.code ? `[${item.raw_material.code}] ` : ''}
                              {item.raw_material?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.uom?.abbreviation || item.raw_material?.base_uom?.abbreviation}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.qty}</TableCell>
                        <TableCell className="text-right">
                          <span className={item.qty_received > 0 ? 'text-green-600 font-medium' : ''}>
                            {item.qty_received || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={isPending ? 'text-amber-600 font-medium' : 'text-green-600'}>
                            {item.qty_pending || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={item.qty_pending || 0}
                            step="0.01"
                            value={quantities[item.id] || 0}
                            onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                            disabled={!isPending}
                            className="text-right"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || totalToReceive === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <PackageCheck className="h-4 w-4 mr-2" />
                Registrar Recepción ({totalToReceive} items)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}