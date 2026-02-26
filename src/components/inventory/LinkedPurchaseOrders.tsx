import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface LinkedOrder {
  id: string;
  po_number: string;
  status: string;
  supplier_id: string;
  supplier_name: string;
  total: number;
  items_count: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: 'text-muted-foreground', bg: 'bg-muted' },
  approved: { label: 'Aprobada', color: 'text-green-700', bg: 'bg-green-100' },
  sent: { label: 'Enviada', color: 'text-blue-700', bg: 'bg-blue-100' },
  partial: { label: 'Parcial', color: 'text-amber-700', bg: 'bg-amber-100' },
  received: { label: 'Recibida', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelled: { label: 'Cancelada', color: 'text-gray-700', bg: 'bg-gray-100' },
};

interface Props {
  requestId: string;
  onRefresh?: () => void;
  onOrdersLoaded?: (orders: { status: string }[]) => void;
  defaultCollapsed?: boolean;
}

export default function LinkedPurchaseOrders({ requestId, onRefresh, onOrdersLoaded, defaultCollapsed }: Props) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LinkedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(!defaultCollapsed);

  const fetchLinkedOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id, po_number, status, supplier_id, total,
        supplier:suppliers(id, name),
        items:purchase_items(id)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const mapped = data.map((o: any) => ({
        id: o.id,
        po_number: o.po_number || '',
        status: o.status,
        supplier_id: o.supplier_id,
        supplier_name: o.supplier?.name || 'Sin proveedor',
        total: o.total || 0,
        items_count: o.items?.length || 0,
      }));
      setOrders(mapped);
      onOrdersLoaded?.(mapped.map(o => ({ status: o.status })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLinkedOrders();
  }, [requestId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-4 px-4">
          <p className="text-sm text-muted-foreground">No se han generado órdenes de compra para esta solicitud.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCLP = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Órdenes de Compra ({orders.length})
              <span className="ml-auto">
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </span>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {orders.map((order) => {
              const st = STATUS_LABELS[order.status] || STATUS_LABELS.draft;
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{order.po_number}</span>
                      <Badge className={`${st.bg} ${st.color} border-0 text-xs`}>{st.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{order.supplier_name}</p>
                    <p className="text-xs text-muted-foreground">{order.items_count} items · {formatCLP(order.total)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/pos/inventario/compras/${order.id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Ver OC
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
