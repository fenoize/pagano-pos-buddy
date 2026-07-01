import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { CustomerOrderCard } from '@/components/customer/CustomerOrderCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCLP } from '@/lib/utils';
import { ShoppingBag, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";

const ORDERS_PER_PAGE = 20;

export default function MyOrders() {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Reorder modal
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [inactiveItems, setInactiveItems] = useState<any[]>([]);
  const [newTotal, setNewTotal] = useState(0);

  const fetchOrders = async () => {
    if (!customer?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE - 1);

      // Aplicar filtros
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter as any);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setOrders(data || []);
      setTotalPages(Math.ceil((count || 0) / ORDERS_PER_PAGE));
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Error', { description: 'No se pudieron cargar tus pedidos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [customer?.id, page, statusFilter, dateFrom, dateTo]);

  const handleReorder = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // Validar productos activos
    const items = order.items || [];
    const productIds = items.map((item: any) => item.product_id).filter(Boolean);

    if (productIds.length === 0) {
      toast.error('Error', { description: 'No se encontraron productos en este pedido' });
      return;
    }

    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, active, name')
        .in('id', productIds);

      if (error) throw error;

      const inactiveProductIds = (products || [])
        .filter((p) => !p.active)
        .map((p) => p.id);

      const validItems = items.filter(
        (item: any) => !inactiveProductIds.includes(item.product_id)
      );

      const invalidItems = items.filter((item: any) =>
        inactiveProductIds.includes(item.product_id)
      );

      const calculatedTotal = validItems.reduce(
        (sum: number, item: any) => sum + (item.total || 0),
        0
      );

      setSelectedOrder(order);
      setInactiveItems(invalidItems);
      setNewTotal(calculatedTotal);
      setReorderDialogOpen(true);
    } catch (error: any) {
      console.error('Error validating products:', error);
      toast.error('Error', { description: 'No se pudo validar el pedido' });
    }
  };

  const confirmReorder = () => {
    // TODO: Implementar lógica de reorden con items validados
    toast.success('Funcionalidad próximamente', { description: 'La opción de volver a pedir estará disponible pronto' });
    setReorderDialogOpen(false);
  };

  return (
    <CustomerLayout title="Mis Pedidos">
      {/* Filtros */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-white mb-2 block">Estado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-card text-white border-border">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="customer-app bg-card text-white border-border">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En preparación">En preparación</SelectItem>
                <SelectItem value="Listo">Listo</SelectItem>
                <SelectItem value="Entregado">Entregado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white mb-2 block">Desde</Label>
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)} 
              className="bg-card text-white border-border [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
          <div>
            <Label className="text-white mb-2 block">Hasta</Label>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)} 
              className="bg-card text-white border-border [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-lg font-medium">No tienes pedidos aún</h3>
          <p className="text-sm text-muted-foreground">
            Tus pedidos aparecerán aquí una vez que realices tu primera compra
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <CustomerOrderCard key={order.id} order={order} onReorder={handleReorder} />
          ))}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Reorder Dialog */}
      <AlertDialog open={reorderDialogOpen} onOpenChange={setReorderDialogOpen}>
        <AlertDialogContent className="customer-app">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reorden</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará un nuevo pedido basado en tu pedido #
              {selectedOrder?.order_number}.
              {inactiveItems.length > 0 && (
                <Alert variant="default" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">
                      Algunos productos ya no están disponibles y serán excluidos:
                    </p>
                    <ul className="list-disc list-inside text-sm">
                      {inactiveItems.map((item, i) => (
                        <li key={i}>{item.name}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <p className="mt-4">
                Total estimado: <strong>{formatCLP(newTotal)}</strong>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReorder}>Crear Pedido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomerLayout>
  );
}
