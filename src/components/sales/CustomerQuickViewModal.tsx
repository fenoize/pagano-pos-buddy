import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Mail, Phone, User, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerLite {
  id: string;
  name?: string | null;
  apellido?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  phone?: string | null;
  email?: string | null;
  cantidad_runas?: number | null;
}

interface Props {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RecentOrder {
  id: string;
  order_number: string | null;
  total: number;
  status: string;
  created_at: string;
}

const fullName = (c: CustomerLite | null) => {
  if (!c) return '';
  const a = `${c.nombres || ''} ${c.apellidos || ''}`.trim();
  if (a) return a;
  return `${c.name || ''} ${c.apellido || ''}`.trim();
};

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n || 0);

export function CustomerQuickViewModal({ customerId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !customerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, apellido, nombres, apellidos, phone, email, cantidad_runas')
          .eq('id', customerId)
          .maybeSingle(),
        supabase
          .from('orders')
          .select('id, order_number, total, status, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;
      setCustomer((c as any) || null);
      setOrders((o as any) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId]);

  const goToDetails = () => {
    if (!customerId) return;
    onOpenChange(false);
    navigate(`/pos/clientes?customerId=${customerId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {fullName(customer) || 'Cliente'}
          </DialogTitle>
          <DialogDescription>Información del cliente</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !customer ? (
          <p className="text-sm text-muted-foreground py-4">No se encontró el cliente.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Coins className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {new Intl.NumberFormat('es-CL').format(customer.cantidad_runas || 0)} Runas
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Últimas 5 compras</h4>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin compras registradas.</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          #{o.order_number || o.id.slice(0, 6)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(o.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-medium">{formatCLP(Number(o.total))}</div>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{o.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full" onClick={goToDetails}>
              Ver más detalles
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CustomerQuickViewModal;
