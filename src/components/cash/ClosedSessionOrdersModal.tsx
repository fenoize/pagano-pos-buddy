import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';
import { OrderEditModal } from '@/components/sales/OrderEditModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthContext } from '@/contexts/AuthContext';

interface ClosedSessionOrdersModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated: () => void;
}

export function ClosedSessionOrdersModal({ 
  sessionId, 
  isOpen, 
  onClose,
  onSessionUpdated 
}: ClosedSessionOrdersModalProps) {
  const { user } = useAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      loadSessionOrders();
    }
  }, [isOpen, sessionId]);

  const loadSessionOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            name,
            nombres,
            apellidos
          )
        `)
        .eq('cash_session_id', sessionId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders((data as any[]) || []);
    } catch (error) {
      console.error('Error loading session orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
  };

  const getCustomerName = (order: Order) => {
    if (order.customer) {
      const customer = order.customer as any;
      const nombre = customer.name || `${customer.nombres || ''} ${customer.apellidos || ''}`.trim();
      return nombre || 'Cliente';
    }
    return order.nombre_resumen || 'Cliente';
  };

  const handleOrderUpdated = () => {
    loadSessionOrders();
    onSessionUpdated();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Pedidos del Cierre de Caja</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Total de pedidos: {orders.length}
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No hay pedidos en este cierre
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Entrega</TableHead>
                    {user?.role === 'Administrador' && (
                      <TableHead className="w-24">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>{getCustomerName(order)}</TableCell>
                      <TableCell>{formatDateTime(order.created_at)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'Entregado' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.fulfillment === 'delivery' ? 'outline' : 'secondary'}>
                          {order.fulfillment === 'delivery' ? 'Delivery' : 'Retiro'}
                        </Badge>
                      </TableCell>
                      {user?.role === 'Administrador' && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedOrder && (
        <OrderEditModal
          order={selectedOrder}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOrder(null);
          }}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </>
  );
}
