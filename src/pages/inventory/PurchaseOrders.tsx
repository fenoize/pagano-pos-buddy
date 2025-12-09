import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const OrderCard = ({ order }: { order: PurchaseOrder }) => {
    const config = statusConfig[order.status] || statusConfig.draft;
    const StatusIcon = config.icon;

    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/pos/inventario/compras/${order.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-lg">{order.po_number}</h3>
              <p className="text-sm text-muted-foreground">{order.supplier?.name}</p>
            </div>
            <Badge className={`${config.color} gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Almacén:</span>
              <p className="font-medium">{order.warehouse?.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total:</span>
              <p className="font-semibold text-primary">{formatCurrency(order.total || 0)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(order.created_at), "dd MMM yyyy", { locale: es })}
            </span>
            {order.expected_date && (
              <span>
                Esperada: {format(new Date(order.expected_date), "dd/MM/yy")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
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

      {/* Orders List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}