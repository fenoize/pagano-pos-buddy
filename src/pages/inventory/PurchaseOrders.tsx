import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  FileText, 
  Truck, 
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { usePurchaseOrders, POStatus, PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig: Record<POStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: FileText },
  approved: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  sent: { label: 'Enviada', color: 'bg-purple-100 text-purple-700', icon: Truck },
  partial: { label: 'Parcial', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  received: { label: 'Recibida', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PurchaseOrders() {
  const { orders, loading } = usePurchaseOrders();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.po_number?.toLowerCase().includes(search.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/pos/inventario')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
            <p className="text-muted-foreground">Gestión de compras a proveedores</p>
          </div>
        </div>
        <Button onClick={() => navigate('/pos/inventario/compras/nueva')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número o proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as POStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Borradores', status: 'draft', color: 'text-muted-foreground' },
          { label: 'En proceso', status: 'sent', color: 'text-purple-600' },
          { label: 'Pendientes', status: 'partial', color: 'text-amber-600' },
          { label: 'Recibidas', status: 'received', color: 'text-green-600' },
        ].map(({ label, status, color }) => (
          <Card key={status}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>
                {orders.filter(o => o.status === status).length}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders Table */}
      {loading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Orden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay órdenes de compra</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all' 
                ? 'No se encontraron órdenes con los filtros aplicados' 
                : 'Crea tu primera orden de compra para gestionar tus compras a proveedores'}
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={() => navigate('/pos/inventario/compras/nueva')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Orden
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Orden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="hidden md:table-cell">Almacén</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead className="hidden lg:table-cell">Entrega Esperada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const config = statusConfig[order.status] || statusConfig.draft;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow 
                      key={order.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/pos/inventario/compras/${order.id}`)}
                    >
                      <TableCell className="font-medium">{order.po_number}</TableCell>
                      <TableCell>{order.supplier?.name || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">{order.warehouse?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${config.color} gap-1 border-0`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(order.total || 0)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {order.expected_date 
                          ? format(new Date(order.expected_date), "dd/MM/yy") 
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}