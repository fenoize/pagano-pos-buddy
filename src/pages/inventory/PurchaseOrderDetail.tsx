import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  FileText, 
  Truck, 
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Package,
  Loader2,
  History,
  Trash2,
  Send,
  ThumbsUp,
  PackageCheck
} from 'lucide-react';
import { usePurchaseOrders, POStatus, PurchaseOrder, PurchaseOrderStatusHistory } from '@/hooks/usePurchaseOrders';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import PurchaseOrderReceiveModal from '@/components/inventory/PurchaseOrderReceiveModal';
import { SendPurchaseOrderModal } from '@/components/inventory/SendPurchaseOrderModal';

const statusConfig: Record<POStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: FileText },
  approved: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700', icon: ThumbsUp },
  sent: { label: 'Enviada', color: 'bg-purple-100 text-purple-700', icon: Truck },
  partial: { label: 'Recepción Parcial', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  received: { label: 'Recibida', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrderById, getStatusHistory, updateOrderStatus, deleteOrder } = usePurchaseOrders();

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [history, setHistory] = useState<PurchaseOrderStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    const data = await getOrderById(id);
    if (data) {
      setOrder(data);
      const historyData = await getStatusHistory(id);
      setHistory(historyData);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleStatusChange = async (newStatus: POStatus) => {
    if (!id) return;
    setActionLoading(true);
    const success = await updateOrderStatus(id, newStatus);
    if (success) {
      await loadOrder();
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    const success = await deleteOrder(id);
    if (success) {
      navigate('/pos/inventario/compras');
    }
    setActionLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const getReceptionProgress = () => {
    if (!order?.items?.length) return 0;
    const totalQty = order.items.reduce((sum, i) => sum + i.qty, 0);
    const receivedQty = order.items.reduce((sum, i) => sum + (i.qty_received || 0), 0);
    return totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Orden no encontrada</h3>
            <Button onClick={() => navigate('/pos/inventario/compras')}>
              Volver a Órdenes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = statusConfig[order.status] || statusConfig.draft;
  const StatusIcon = config.icon;
  const progress = getReceptionProgress();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/pos/inventario/compras')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.po_number}</h1>
              <Badge className={`${config.color} gap-1`}>
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {order.supplier?.name}
              {order.request_id && (
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2 h-auto p-0 text-muted-foreground hover:text-primary"
                  onClick={() => navigate(`/pos/inventario/solicitudes/${order.request_id}`)}
                >
                  ← Volver a Solicitud
                </Button>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {order.status === 'draft' && (
            <>
              <Button 
                variant="outline"
                onClick={() => navigate(`/pos/inventario/compras/${id}/editar`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button 
                onClick={() => handleStatusChange('approved')}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                Aprobar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={actionLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          )}

          {order.status === 'approved' && (
            <>
              <Button 
                variant="outline"
                onClick={() => setShowSendModal(true)}
                disabled={actionLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar al Proveedor
              </Button>
              <Button 
                onClick={() => handleStatusChange('sent')}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
                Marcar como Enviada
              </Button>
            </>
          )}

          {order.status === 'sent' && (
            <Button 
              variant="outline"
              onClick={() => setShowSendModal(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Reenviar
            </Button>
          )}

          {(order.status === 'sent' || order.status === 'partial') && (
            <Button 
              onClick={() => setShowReceiveModal(true)}
              disabled={actionLoading}
            >
              <PackageCheck className="h-4 w-4 mr-2" />
              Registrar Recepción
            </Button>
          )}

          {!['received', 'cancelled', 'rejected'].includes(order.status) && (
            <Button 
              variant="outline"
              onClick={() => handleStatusChange('cancelled')}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información de la Orden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Proveedor</span>
                  <p className="font-medium">{order.supplier?.name}</p>
                  {order.supplier?.rut && (
                    <p className="text-sm text-muted-foreground">{order.supplier.rut}</p>
                  )}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Almacén Destino</span>
                  <p className="font-medium">{order.warehouse?.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Fecha de Creación</span>
                  <p className="font-medium">
                    {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
                {order.expected_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">Fecha Esperada</span>
                    <p className="font-medium">
                      {format(new Date(order.expected_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                )}
                {order.notes && (
                  <div className="sm:col-span-2">
                    <span className="text-sm text-muted-foreground">Notas</span>
                    <p className="font-medium">{order.notes}</p>
                  </div>
                )}
              </div>

              {/* Reception Progress */}
              {(order.status === 'sent' || order.status === 'partial' || order.status === 'received') && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Progreso de Recepción</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Recibido</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.raw_material?.code ? `[${item.raw_material.code}] ` : ''}
                              {item.raw_material?.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.qty} {item.uom?.abbreviation || item.raw_material?.base_uom?.abbreviation}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.qty_received > 0 ? 'text-green-600 font-medium' : ''}>
                            {item.qty_received || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.qty_pending > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                            {item.qty_pending || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total_cost || item.qty * item.unit_cost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Estados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="mt-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.old_status && (
                            <>
                              <Badge variant="outline" className="text-xs">
                                {statusConfig[entry.old_status]?.label || entry.old_status}
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                            </>
                          )}
                          <Badge className={`text-xs ${statusConfig[entry.new_status]?.color || ''}`}>
                            {statusConfig[entry.new_status]?.label || entry.new_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: es })}
                          {entry.changed_by_user && (
                            <span> • {entry.changed_by_user.full_name || entry.changed_by_user.username}</span>
                          )}
                        </p>
                        {entry.notes && (
                          <p className="text-sm mt-1">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(order.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA (19%):</span>
                  <span>{formatCurrency(order.tax || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(order.total || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del Proceso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { status: 'draft', label: 'Creada', date: order.created_at },
                  { status: 'approved', label: 'Aprobada', date: order.approved_at },
                  { status: 'sent', label: 'Enviada', date: order.sent_at },
                  { status: 'received', label: 'Recibida', date: order.received_date },
                ].map((step, index) => {
                  const isCompleted = step.date !== null;
                  const isCurrent = order.status === step.status;
                  
                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${isCompleted ? 'bg-primary text-primary-foreground' : 
                          isCurrent ? 'bg-primary/20 text-primary border-2 border-primary' : 
                          'bg-muted text-muted-foreground'}
                      `}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isCompleted || isCurrent ? '' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(step.date), "dd/MM/yy HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar orden de compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los items asociados a esta orden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receive Modal */}
      <PurchaseOrderReceiveModal
        open={showReceiveModal}
        onOpenChange={setShowReceiveModal}
        order={order}
        onSuccess={loadOrder}
      />

      {/* Send Modal */}
      <SendPurchaseOrderModal
        open={showSendModal}
        onOpenChange={setShowSendModal}
        order={order}
      />
    </div>
  );
}