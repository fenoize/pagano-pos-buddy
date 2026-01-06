import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2, 
  Send, 
  RotateCcw,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { useAuthContext } from '@/contexts/AuthContext';
import { REQUEST_STATUS_CONFIG, type PurchaseRequest } from '@/types/purchaseRequests';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PurchaseRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const {
    getRequestById,
    submitForApproval,
    approveRequest,
    rejectRequest,
    deleteRequest,
    returnToDraft,
  } = usePurchaseRequests();

  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const loadRequest = async () => {
    if (!id) return;
    setLoading(true);
    const data = await getRequestById(id);
    setRequest(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequest();
  }, [id]);

  const handleSubmitForApproval = async () => {
    if (!id) return;
    setActionLoading(true);
    const success = await submitForApproval(id);
    if (success) await loadRequest();
    setActionLoading(false);
  };

  const handleApprove = async () => {
    if (!id || !user) return;
    setActionLoading(true);
    const result = await approveRequest(id, user.id);
    if (result.success) {
      await loadRequest();
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) return;
    setActionLoading(true);
    const success = await rejectRequest(id, rejectionReason);
    if (success) {
      setShowRejectDialog(false);
      setRejectionReason('');
      await loadRequest();
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    const success = await deleteRequest(id);
    if (success) {
      navigate('/pos/inventario/solicitudes');
    }
    setActionLoading(false);
  };

  const handleReturnToDraft = async () => {
    if (!id) return;
    setActionLoading(true);
    const success = await returnToDraft(id);
    if (success) await loadRequest();
    setActionLoading(false);
  };

  // Group items by supplier
  const itemsBySupplier = request?.items?.reduce((acc, item) => {
    const supplierName = item.supplier?.name || 'Sin proveedor';
    if (!acc[supplierName]) {
      acc[supplierName] = { supplier: item.supplier, items: [] };
    }
    acc[supplierName].items.push(item);
    return acc;
  }, {} as Record<string, { supplier: typeof request.items[0]['supplier']; items: typeof request.items }>) || {};

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Solicitud no encontrada</p>
        <Button variant="link" onClick={() => navigate('/pos/inventario/solicitudes')}>
          Volver al listado
        </Button>
      </div>
    );
  }

  const statusConfig = REQUEST_STATUS_CONFIG[request.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pos/inventario/solicitudes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{request.pr_number}</h1>
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Creado por {request.creator?.full_name || request.creator?.username} el{' '}
              {format(new Date(request.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
            </p>
          </div>
        </div>

        {/* Actions based on status */}
        <div className="flex gap-2 flex-wrap">
          {request.status === 'draft' && (
            <>
              <Button variant="outline" onClick={() => navigate(`/pos/inventario/solicitudes/${id}/editar`)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button onClick={handleSubmitForApproval} disabled={actionLoading}>
                <Send className="h-4 w-4 mr-2" />
                Enviar a Aprobación
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          )}

          {request.status === 'pending_approval' && (
            <>
              <Button variant="outline" onClick={handleReturnToDraft} disabled={actionLoading}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Devolver a Borrador
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar y Generar OC
              </Button>
            </>
          )}

          {request.status === 'rejected' && (
            <Button variant="outline" onClick={handleReturnToDraft} disabled={actionLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reabrir como Borrador
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Reason */}
      {request.status === 'rejected' && request.rejection_reason && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Motivo del Rechazo</p>
                <p className="text-red-600">{request.rejection_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Info */}
      {request.status === 'approved' && request.approver && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-green-700">
                  Aprobada por {request.approver.full_name || request.approver.username}
                </p>
                {request.approved_at && (
                  <p className="text-green-600 text-sm">
                    {format(new Date(request.approved_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items grouped by supplier */}
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(itemsBySupplier).map(([supplierName, { supplier, items }]) => (
            <Card key={supplierName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{supplierName}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {items.length} items
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.raw_material?.name}</p>
                            {item.raw_material?.sku && (
                              <p className="text-xs text-muted-foreground">{item.raw_material.sku}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.qty} {item.uom?.symbol}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.estimated_unit_cost)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.estimated_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={3} className="text-right font-medium">
                        Subtotal Proveedor
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(items.reduce((acc, i) => acc + i.estimated_total, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {/* Notes */}
          {request.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{request.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(request.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span>{formatCurrency(request.tax)}</span>
              </div>
              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(request.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Almacén</span>
                <span>{request.warehouse?.name || 'Por defecto'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proveedores</span>
                <span>{Object.keys(itemsBySupplier).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items</span>
                <span>{request.items?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar solicitud?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La solicitud {request.pr_number} será eliminada permanentemente.
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

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo para que el solicitante pueda corregirlo.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo del rechazo..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading}
            >
              Rechazar Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
