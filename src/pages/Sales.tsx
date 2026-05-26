import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Search, Eye, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { OrderEditModal } from '@/components/sales/OrderEditModal';
import { OrderSourceBadge } from '@/components/sales/OrderSourceBadge';
import { OrderStatusDropdown } from '@/components/sales/OrderStatusDropdown';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Order } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { BranchFilter } from '@/components/branches/BranchFilter';

interface Customer {
  id: string;
  name?: string;
  nombres?: string;
  apellido?: string;
  apellidos?: string;
  phone?: string;
  rut?: string;
}

interface SalesFilters {
  startDate?: Date;
  startTime?: string;
  endDate?: Date;
  endTime?: string;
  minAmount?: number;
  maxAmount?: number;
  customerId?: string;
  status?: string;
  paymentMethod?: string;
  branchId?: string;
}

export default function Sales() {
  const [searchParams] = useSearchParams();
  const { canViewAllOrders, loading: permissionsLoading } = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<SalesFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Date picker states
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    loadOrders();
    loadCustomers();
    
    // Check if we're filtering by active shift
    const activeShiftId = searchParams.get('activeShift');
    const startDate = searchParams.get('startDate');
    
    if (activeShiftId && startDate) {
      setFilters({
        startDate: new Date(startDate)
      });
      setShowFilters(true);
    }
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [orders, filters, searchQuery]);

  const loadOrders = async () => {
    try {
      // Optimización: Solo cargar últimos 200 pedidos por defecto
      // El usuario puede usar filtros si necesita datos más antiguos
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_id, status, total, payment_method, fulfillment, created_at, updated_at, nombre_resumen, notes, branch_id, source')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setOrders((data || []) as unknown as Order[]);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error cargando las ventas');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      // Optimización: Solo cargar clientes activos para el selector
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, nombres, apellido, apellidos, phone, rut')
        .eq('estado_cliente', 'Activo')
        .order('name')
        .limit(500);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Suscripción realtime a cambios en orders con manejo robusto de errores
  useEffect(() => {
    console.log('[Sales] Setting up realtime subscription');
    
    const channel = supabase
      .channel('sales-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          try {
            console.log('[Sales] Realtime event:', payload.eventType, payload);
            
            // Validar estructura del payload
            if (!payload || !payload.eventType) {
              console.error('[Sales] Invalid payload structure:', payload);
              return;
            }
            
            if (payload.eventType === 'INSERT') {
              // Validar que new existe y tiene estructura válida
              if (!payload.new || !payload.new.id) {
                console.error('[Sales] INSERT event missing required data:', payload);
                return;
              }
              
              const newOrder = payload.new as Order;
              setOrders(prev => [newOrder, ...prev]);
              console.log(`[Sales] New order added: #${newOrder.order_number}`);
              
              // Notificación discreta
              toast.success(`Nueva venta: Pedido #${newOrder.order_number}`);
            } 
            else if (payload.eventType === 'UPDATE') {
              // Validar que new existe y tiene estructura válida
              if (!payload.new || !payload.new.id) {
                console.error('[Sales] UPDATE event missing required data:', payload);
                return;
              }
              
              const updatedOrder = payload.new as Order;
              setOrders(prev => prev.map(order => 
                order.id === updatedOrder.id ? updatedOrder : order
              ));
              console.log(`[Sales] Order updated: #${updatedOrder.order_number}, status: ${updatedOrder.status}`);
              
              // Actualizar selectedOrder si está abierto
              setSelectedOrder(prev => 
                prev?.id === updatedOrder.id ? updatedOrder : prev
              );
            } 
            else if (payload.eventType === 'DELETE') {
              // Validar que old existe
              if (!payload.old || !payload.old.id) {
                console.error('[Sales] DELETE event missing required data:', payload);
                return;
              }
              
              const deletedOrder = payload.old as Order;
              setOrders(prev => prev.filter(order => order.id !== deletedOrder.id));
              console.log(`[Sales] Order deleted: #${deletedOrder.order_number}`);
              
              // Cerrar modal si es la orden que se está viendo
              if (selectedOrder?.id === deletedOrder.id) {
                setSelectedOrder(null);
                setShowDetailModal(false);
              }
            }
          } catch (error) {
            console.error('[Sales] Error handling realtime event:', error);
            toast.error('Error al sincronizar pedidos. Intenta refrescar la página.');
          }
        }
      )
      .subscribe((status) => {
        console.log('[Sales] Subscription status:', status);
        
        if (status === 'CHANNEL_ERROR') {
          console.error('[Sales] Channel error, attempting to reconnect...');
          toast.error('Error de conexión. Reconectando...');
        } else if (status === 'SUBSCRIBED') {
          console.log('[Sales] Successfully subscribed to realtime updates');
        }
      });

    return () => {
      console.log('[Sales] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [selectedOrder]);

  const getFullCustomerName = (customer: Customer): string => {
    // Prioridad 1: Si existe 'name' (nombre completo), usarlo
    if (customer.name && customer.name.trim()) {
      return customer.name.trim();
    }
    
    // Prioridad 2: Construir desde 'nombres' y 'apellidos'
    if (customer.nombres || customer.apellidos) {
      return `${customer.nombres || ''} ${customer.apellidos || ''}`.trim();
    }
    
    // Fallback: cualquier combinación disponible
    return `${customer.name || ''} ${customer.apellido || ''}`.trim() || 'Cliente';
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Filter by date range with time
    if (filters.startDate) {
      const startDateTime = new Date(filters.startDate);
      if (filters.startTime) {
        const [hours, minutes] = filters.startTime.split(':');
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        startDateTime.setHours(0, 0, 0, 0);
      }
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= startDateTime
      );
    }
    if (filters.endDate) {
      const endDateTime = new Date(filters.endDate);
      if (filters.endTime) {
        const [hours, minutes] = filters.endTime.split(':');
        endDateTime.setHours(parseInt(hours), parseInt(minutes), 59, 999);
      } else {
        endDateTime.setHours(23, 59, 59, 999);
      }
      filtered = filtered.filter(order => 
        new Date(order.created_at) <= endDateTime
      );
    }

    // Filter by amount range
    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(order => order.total >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(order => order.total <= filters.maxAmount!);
    }

    // Filter by customer
    if (filters.customerId) {
      filtered = filtered.filter(order => order.customer_id === filters.customerId);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Filter by payment method
    if (filters.paymentMethod) {
      filtered = filtered.filter(order => order.payment_method === filters.paymentMethod);
    }

    // Filter by branch
    if (filters.branchId) {
      filtered = filtered.filter(order => (order as any).branch_id === filters.branchId);
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const customer = customers.find(c => c.id === order.customer_id);
        const customerName = customer ? getFullCustomerName(customer).toLowerCase() : '';
        const guestName = (order.nombre_resumen || '').toLowerCase();
        const orderNumber = order.order_number.toString();
        
        return orderNumber.includes(query) || 
               customerName.includes(query) ||
               guestName.includes(query) ||
               order.status.toLowerCase().includes(query);
      });
    }

    setFilteredOrders(filtered);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const exportToCSV = () => {
    const csvData = filteredOrders.map(order => {
      let customerName = 'Cliente';
      
      // Si el cliente está registrado
      if (order.customer_id) {
        const customer = customers.find(c => c.id === order.customer_id);
        if (customer) {
          customerName = getFullCustomerName(customer);
        }
      } else {
        // Si no está registrado, usar nombre_resumen
        customerName = order.nombre_resumen || 'Cliente';
      }
      
      return {
        Hora: format(new Date(order.created_at), 'HH:mm'),
        ID: order.order_number,
        Método: order.payment_method,
        Cliente: customerName,
        Total: order.total
      };
    });

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Pendiente': return 'secondary';
      case 'En preparación': return 'default';
      case 'En pausa': return 'outline';
      case 'Listo': return 'default';
      case 'Entregado': return 'default';
      case 'Cancelado': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleOrderUpdate = (updatedOrder: Order) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === updatedOrder.id ? updatedOrder as Order : order
      )
    );
    // Also update selectedOrder if it's the same
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder as Order);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string, newUpdatedAt: string) => {
    // El realtime ya actualiza el estado automáticamente
    // Esta función solo se mantiene por compatibilidad con OrderStatusDropdown
    console.log(`[Sales] Status change callback: ${orderId} -> ${newStatus}`);
  };

  const getCustomerInfo = (order: Order) => {
    // Si el cliente está registrado, mostrar nombre clickeable
    if (order.customer_id) {
      const customer = customers.find(c => c.id === order.customer_id);
      if (customer) {
        const customerName = getFullCustomerName(customer);
        return (
          <button
            className="text-primary hover:underline text-left"
            onClick={() => {
              // TODO: Implementar modal de información de cliente
              console.log('Ver cliente:', customer.id);
            }}
          >
            {customerName}
          </button>
        );
      }
    }
    
    // Si no está registrado, usar nombre_resumen
    const guestName = order.nombre_resumen || 'Cliente';
    
    return (
      <span className="text-muted-foreground">
        {guestName}
      </span>
    );
  };

  const getOrderDetails = (order: Order) => {
    try {
      const notes = JSON.parse(order.notes || '{}');
      return {
        customerInfo: notes.customerInfo || {},
        paymentDetails: notes.paymentDetails || {},
        deliveryZone: notes.deliveryZone || ''
      };
    } catch {
      return {
        customerInfo: {},
        paymentDetails: {},
        deliveryZone: ''
      };
    }
  };

  if (permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  if (!canViewAllOrders) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No tienes permisos para ver el historial de ventas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <BranchFilter
          value={filters.branchId || 'all'}
          onChange={(v) => setFilters({ ...filters, branchId: v === 'all' ? undefined : v })}
        />
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
          <Button
            onClick={exportToCSV}
            className="flex items-center gap-2"
            disabled={filteredOrders.length === 0}
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Número de orden, cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => {
                        setFilters({...filters, startDate: date});
                        setStartDateOpen(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={filters.startTime || ''}
                  onChange={(e) => setFilters({...filters, startTime: e.target.value})}
                  placeholder="00:00"
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => {
                        setFilters({...filters, endDate: date});
                        setEndDateOpen(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={filters.endTime || ''}
                  onChange={(e) => setFilters({...filters, endTime: e.target.value})}
                  placeholder="23:59"
                />
              </div>

              {/* Amount Range */}
              <div className="space-y-2">
                <Label>Monto Mínimo</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount || ''}
                  onChange={(e) => setFilters({...filters, minAmount: e.target.value ? Number(e.target.value) : undefined})}
                />
              </div>

              <div className="space-y-2">
                <Label>Monto Máximo</Label>
                <Input
                  type="number"
                  placeholder="Sin límite"
                  value={filters.maxAmount || ''}
                  onChange={(e) => setFilters({...filters, maxAmount: e.target.value ? Number(e.target.value) : undefined})}
                />
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={filters.customerId || 'all'} onValueChange={(value) => setFilters({...filters, customerId: value === 'all' ? undefined : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {getFullCustomerName(customer)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filters.status || 'all'} onValueChange={(value) => setFilters({...filters, status: value === 'all' ? undefined : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En preparación">En preparación</SelectItem>
                    <SelectItem value="En pausa">En pausa</SelectItem>
                    <SelectItem value="Listo">Listo</SelectItem>
                    <SelectItem value="Entregado">Entregado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={filters.paymentMethod || 'all'} onValueChange={(value) => setFilters({...filters, paymentMethod: value === 'all' ? undefined : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los métodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los métodos</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="mixto">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={resetFilters} variant="outline">
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          Mostrando {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} de {filteredOrders.length} ventas
        </span>
        <span>
          Total: {formatPrice(filteredOrders.filter(o => o.status !== 'Cancelado').reduce((sum, order) => sum + order.total, 0))}
        </span>
      </div>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">N° Orden</TableHead>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método Pago</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No se encontraron ventas con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(order.created_at), 'dd/MM/yyyy')}</div>
                          <div className="text-muted-foreground">{format(new Date(order.created_at), 'HH:mm')}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getCustomerInfo(order)}</TableCell>
                      <TableCell>
                        <OrderStatusDropdown
                          orderId={order.id}
                          currentStatus={order.status}
                          updatedAt={order.updated_at}
                          onStatusChange={(newStatus, newUpdatedAt) => 
                            handleStatusChange(order.id, newStatus, newUpdatedAt)
                          }
                        />
                      </TableCell>
                      <TableCell className="capitalize">{order.fulfillment}</TableCell>
                      <TableCell className="capitalize">{order.payment_method}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            // Cargar orden completa con todos los campos
                            try {
                              const { data: fullOrder, error } = await supabase
                                .from('orders')
                                .select('*, customer:customers(id, name, apellido, nombres, apellidos, phone, rut, email)')
                                .eq('id', order.id)
                                .single();
                              
                              if (error) {
                                console.error('Error loading full order:', error);
                                toast.error('Error cargando el detalle del pedido');
                                return;
                              }
                              
                              console.log('[Sales] Full order loaded:', fullOrder);
                              setSelectedOrder(fullOrder as unknown as Order);
                              setShowDetailModal(true);
                            } catch (error) {
                              console.error('Error:', error);
                              toast.error('Error al abrir el pedido');
                            }
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage = 
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                if (showEllipsisBefore || showEllipsisAfter) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                if (!showPage) return null;

                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        {selectedOrder && (
          <OrderEditModal
            order={selectedOrder as any}
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            onOrderUpdated={handleOrderUpdate}
          />
        )}
      </Dialog>
    </div>
  );
}