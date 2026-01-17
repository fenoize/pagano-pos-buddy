import React from 'react';
import { useDeliveryHistory } from '@/hooks/useDeliveryHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, DollarSign, Package } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers } from '@/hooks/useUsers';

export default function DeliveryHistory() {
  const { orders, loading, filters, setFilters, totals, isAdmin } = useDeliveryHistory();
  const { users } = useUsers();

  const repartidores = users.filter(u => u.role === 'Reparto' || u.can_do_delivery);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'En camino': return 'secondary';
      case 'Entregado': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="w-8 h-8" />
          {isAdmin ? 'Historial de Deliverys' : 'Mis Deliverys'}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Historial completo de todos los repartidores' : 'Tu historial de entregas'}
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fecha desde */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Desde</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
              />
            </div>

            {/* Fecha hasta */}
            <div className="space-y-2">
              <Label htmlFor="dateTo">Hasta</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value as any })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Listo">Listo</SelectItem>
                  <SelectItem value="En camino">En camino</SelectItem>
                  <SelectItem value="Entregado">Entregado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Repartidor (solo admin) */}
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="courier">Repartidor</Label>
                <Select
                  value={filters.courierId || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, courierId: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger id="courier">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {repartidores.map(rep => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.full_name || rep.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Total Deliverys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {totals.count}
            </div>
            <p className="text-xs text-muted-foreground">
              en el período seleccionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Total a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatPrice(totals.totalDeliveryFees)}
            </div>
            <p className="text-xs text-muted-foreground">
              suma de montos de delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Entregas</CardTitle>
          <CardDescription>
            Detalle de todos los deliverys realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay deliverys</h3>
              <p className="text-muted-foreground">
                No se encontraron entregas con los filtros aplicados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">
                            {format(new Date(order.created_at), 'dd MMM yyyy', { locale: es })}
                          </p>
                          <p className="text-muted-foreground">
                            {format(new Date(order.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-semibold">#{order.order_number}</p>
                          <p className="text-muted-foreground">{order.customer_name || 'Cliente'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-xs truncate">
                          {[order.delivery_address, order.delivery_number, order.delivery_comuna]
                            .filter(Boolean)
                            .join(', ') || 'Sin dirección'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatPrice(order.delivery_fee || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
