import { useState, useEffect } from 'react';
import { Eye, RotateCcw, Filter, Package, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCustomerOrders, CustomerOrderFilters, CustomerOrderStats } from '@/hooks/useCustomerOrders';
import { Order, OrderStatus, FulfillmentType, PaymentMethod, OrderItem } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerOrdersProps {
  customerId: string;
}

export default function CustomerOrders({ customerId }: CustomerOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<CustomerOrderStats>({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0
  });
  const [filters, setFilters] = useState<CustomerOrderFilters>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const {
    loading,
    getCustomerOrders,
    getCustomerOrderStats,
    getOrderById,
    reorderCustomerOrder
  } = useCustomerOrders();

  const loadOrders = async () => {
    const { orders: orderData, totalCount: count } = await getCustomerOrders(customerId, filters, currentPage);
    setOrders(orderData);
    setTotalCount(count);
    
    const orderStats = await getCustomerOrderStats(customerId);
    setStats(orderStats);
  };

  useEffect(() => {
    loadOrders();
  }, [customerId, filters, currentPage]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente': return 'secondary';
      case 'En preparación': return 'default';
      case 'En pausa': return 'outline';
      case 'Listo': return 'secondary';
      case 'Entregado': return 'default';
      case 'Cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const getFulfillmentBadgeVariant = (fulfillment: FulfillmentType) => {
    switch (fulfillment) {
      case 'retiro': return 'default';
      case 'delivery': return 'secondary';
      default: return 'outline';
    }
  };

  const getFulfillmentLabel = (fulfillment: FulfillmentType) => {
    switch (fulfillment) {
      case 'retiro': return 'Retiro';
      case 'delivery': return 'Delivery';
      default: return fulfillment;
    }
  };

  const handleViewOrder = async (order: Order) => {
    const fullOrder = await getOrderById(order.id);
    if (fullOrder) {
      setSelectedOrder(fullOrder);
      setIsOrderDetailOpen(true);
    }
  };

  const handleReorder = async (order: Order) => {
    if (window.confirm(`¿Reordenar el pedido #${order.order_number}?`)) {
      await reorderCustomerOrder(order.id);
      loadOrders();
    }
  };

  const renderOrderItems = (items: OrderItem[]) => {
    return (
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="border-l-2 border-primary/20 pl-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.size} • {item.priceKind} • Cantidad: {item.quantity}
                </p>
                {item.extras.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Extras: {item.extras.map(e => e.label).join(', ')}
                  </p>
                )}
                {item.modifiers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Modificadores: {item.modifiers.map(m => m.name).join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-muted-foreground">Nota: {item.notes}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-medium">{formatPrice(item.basePrice * item.quantity)}</p>
                {item.extras.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    +{formatPrice(item.extras.reduce((sum, e) => sum + (e.price * (e.quantity || 1)), 0) * item.quantity)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Package className="w-5 h-5 mr-2 text-primary" />
              Total Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
            <p className="text-sm text-muted-foreground">pedidos completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Total Gastado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatPrice(stats.totalSpent)}</p>
            <p className="text-sm text-muted-foreground">en pedidos completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Ticket Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatPrice(stats.averageOrderValue)}</p>
            <p className="text-sm text-muted-foreground">por pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Clock className="w-5 h-5 mr-2 text-purple-600" />
              Última Compra
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lastOrderDate ? (
              <>
                <p className="text-lg font-bold text-purple-600">
                  {format(new Date(stats.lastOrderDate), 'dd MMM', { locale: es })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(stats.lastOrderDate), 'yyyy')}
                </p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground">Ninguna</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Header and Filters */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Historial de Pedidos</h3>
          <p className="text-sm text-muted-foreground">
            Registro completo de pedidos del cliente
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Select 
                value={filters.status || ''} 
                onValueChange={(value) => setFilters({...filters, status: value as OrderStatus || undefined})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En preparación">En preparación</SelectItem>
                  <SelectItem value="En pausa">En pausa</SelectItem>
                  <SelectItem value="Listo">Listo</SelectItem>
                  <SelectItem value="Entregado">Entregado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.fulfillment || ''} 
                onValueChange={(value) => setFilters({...filters, fulfillment: value as FulfillmentType || undefined})}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Entrega" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="retiro">Retiro</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Label htmlFor="dateFrom" className="text-sm">Desde:</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value || undefined})}
                  className="w-40"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="dateTo" className="text-sm">Hasta:</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value || undefined})}
                  className="w-40"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">Sin pedidos</h4>
              <p className="text-muted-foreground">
                {Object.keys(filters).some(key => filters[key as keyof CustomerOrderFilters])
                  ? 'No hay pedidos que coincidan con los filtros aplicados'
                  : 'Este cliente aún no ha realizado pedidos'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">#{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} ítem{order.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {format(new Date(order.created_at), 'dd MMM yyyy', { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getFulfillmentBadgeVariant(order.fulfillment)}>
                        {getFulfillmentLabel(order.fulfillment)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{formatPrice(order.total)}</p>
                      {order.delivery_fee > 0 && (
                        <p className="text-xs text-muted-foreground">
                          (inc. {formatPrice(order.delivery_fee)} envío)
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.payment_efectivo > 0 && <p>Efectivo: {formatPrice(order.payment_efectivo)}</p>}
                        {order.payment_mp > 0 && <p>Trans/MP: {formatPrice(order.payment_mp)}</p>}
                        {order.payment_pos > 0 && <p>POS: {formatPrice(order.payment_pos)}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {order.status === 'Entregado' && (
                          <Button variant="ghost" size="sm" onClick={() => handleReorder(order)}>
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {currentPage * 20 + 1} - {Math.min((currentPage + 1) * 20, totalCount)} de {totalCount} pedidos
          </p>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={(currentPage + 1) * 20 >= totalCount}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pedido #{selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Información del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span>{format(new Date(selectedOrder.created_at), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entrega:</span>
                      <Badge variant={getFulfillmentBadgeVariant(selectedOrder.fulfillment)}>
                        {getFulfillmentLabel(selectedOrder.fulfillment)}
                      </Badge>
                    </div>
                    {selectedOrder.fulfillment === 'delivery' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dirección:</span>
                          <span className="text-right text-sm">
                            {selectedOrder.delivery_address} {selectedOrder.delivery_number}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comuna:</span>
                          <span>{selectedOrder.delivery_comuna}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Resumen de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.delivery_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Envío:</span>
                        <span>{formatPrice(selectedOrder.delivery_fee)}</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Descuento:</span>
                        <span>-{formatPrice(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Productos</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderOrderItems(selectedOrder.items)}
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {selectedOrder.status === 'Entregado' && (
                <div className="flex justify-end">
                  <Button onClick={() => handleReorder(selectedOrder)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reordenar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}