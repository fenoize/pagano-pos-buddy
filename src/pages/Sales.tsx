import React, { useState, useEffect } from 'react';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_number: number;
  customer_id: string;
  fulfillment: 'retiro' | 'delivery';
  items: any;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_efectivo: number;
  payment_mp: number;
  payment_pos: number;
  payment_method: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  delivery_address?: string;
  delivery_number?: string;
  delivery_comuna?: string;
}

interface Customer {
  id: string;
  name: string;
  apellido?: string;
  phone?: string;
  rut?: string;
}

interface SalesFilters {
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  customerId?: string;
  status?: string;
  paymentMethod?: string;
}

export default function Sales() {
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

  useEffect(() => {
    loadOrders();
    loadCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filters, searchQuery]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error cargando las ventas');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, apellido, phone, rut')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= filters.startDate!
      );
    }
    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => 
        new Date(order.created_at) <= endOfDay
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

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const customer = customers.find(c => c.id === order.customer_id);
        const customerName = customer ? `${customer.name} ${customer.apellido || ''}`.toLowerCase() : '';
        const orderNumber = order.order_number.toString();
        
        return orderNumber.includes(query) || 
               customerName.includes(query) ||
               order.status.toLowerCase().includes(query);
      });
    }

    setFilteredOrders(filtered);
  };

  const resetFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const exportToCSV = () => {
    const csvData = filteredOrders.map(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      const customerName = customer ? `${customer.name} ${customer.apellido || ''}` : 'Cliente no encontrado';
      
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

  const getCustomerInfo = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Cliente no encontrado';
    return `${customer.name} ${customer.apellido || ''}`.trim();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ventas</h1>
          <p className="text-muted-foreground">
            Historial y gestión de ventas
          </p>
        </div>
        
        <div className="flex gap-2">
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
                <Select value={filters.customerId || ''} onValueChange={(value) => setFilters({...filters, customerId: value || undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los clientes</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.apellido || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filters.status || ''} onValueChange={(value) => setFilters({...filters, status: value || undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
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
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={filters.paymentMethod || ''} onValueChange={(value) => setFilters({...filters, paymentMethod: value || undefined})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los métodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los métodos</SelectItem>
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
          Mostrando {filteredOrders.length} de {orders.length} ventas
        </span>
        <span>
          Total: {formatPrice(filteredOrders.reduce((sum, order) => sum + order.total, 0))}
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
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método Pago</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron ventas con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(order.created_at), 'dd/MM/yyyy')}</div>
                          <div className="text-muted-foreground">{format(new Date(order.created_at), 'HH:mm')}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getCustomerInfo(order.customer_id)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status}
                        </Badge>
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
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
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

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        {selectedOrder && (
          <OrderEditModal
            order={selectedOrder as any}
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            onOrderUpdated={(updatedOrder: any) => {
              // Update the order in the list
              setOrders(prevOrders => 
                prevOrders.map(order => 
                  order.id === updatedOrder.id ? {...order, ...updatedOrder} : order
                )
              );
              setSelectedOrder({...selectedOrder, ...updatedOrder});
            }}
          />
        )}
      </Dialog>
    </div>
  );
}