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
  Download,
  PlayCircle,
  CheckCheck,
  Package,
  Pencil
} from 'lucide-react';
import { exportPurchaseRequestToPDF } from '@/lib/purchaseRequestExport';
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
import { REQUEST_STATUS_CONFIG, PROCUREMENT_MODE_CONFIG, type PurchaseRequest, type PurchaseRequestItem } from '@/types/purchaseRequests';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ItemResolveModal from '@/components/inventory/ItemResolveModal';

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
    startProcessing,
    completeRequest,
  } = usePurchaseRequests();

  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resolveItem, setResolveItem] = useState<PurchaseRequestItem | null>(null);
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

  const handleAction = async (action: () => Promise<boolean | void>) => {
    setActionLoading(true);
    const result = await action();
    if (result !== false) await loadRequest();
    setActionLoading(false);
  };

  const handleApprove = () => handleAction(async () => {
    if (!id || !user) return false;
    return approveRequest(id, user.id);
  });

  const handleSubmitForApproval = () => handleAction(async () => {
    if (!id) return false;
    return submitForApproval(id);
  });

  const handleReturnToDraft = () => handleAction(async () => {
    if (!id) return false;
    return returnToDraft(id);
  });

  const handleStartProcessing = () => handleAction(async () => {
    if (!id) return false;
    return startProcessing(id);
  });

  const handleComplete = () => handleAction(async () => {
    if (!id) return false;
    return completeRequest(id);
  });

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
    if (success) navigate('/pos/inventario/solicitudes');
    setActionLoading(false);
  };

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
        <Button variant="link" onClick={() => navigate('/pos/inventario/solicitudes')}>Volver al listado</Button>
      </div>
    );
  }

  const statusConfig = REQUEST_STATUS_CONFIG[request.status];
  const hasEstimatedCosts = request.items?.some(i => i.estimated_unit_cost > 0);
  const resolvedCount = request.items?.filter(i => i.resolved_at).length || 0;
  const totalItems = request.items?.length || 0;

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
          <Button variant="outline" onClick={() => exportPurchaseRequestToPDF(request)}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>

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
                Devolver
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            </>
          )}

          {request.status === 'approved' && (
            <Button onClick={handleStartProcessing} disabled={actionLoading}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Gestión
            </Button>
          )}

          {request.status === 'en_proceso' && (
            <Button onClick={handleComplete} disabled={actionLoading || resolvedCount < totalItems}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar Completada ({resolvedCount}/{totalItems})
            </Button>
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
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Motivo del Rechazo</p>
                <p className="text-destructive/80">{request.rejection_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Info */}
      {(request.status === 'approved' || request.status === 'en_proceso' || request.status === 'completada') && request.approver && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-primary">
                  Aprobada por {request.approver.full_name || request.approver.username}
                </p>
                {request.approved_at && (
                  <p className="text-primary/70 text-sm">
                    {format(new Date(request.approved_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Items Solicitados</span>
            <span className="text-sm font-normal text-muted-foreground">{totalItems} items</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Nota</TableHead>
                {(request.status === 'en_proceso' || request.status === 'completada') && (
                  <>
                    <TableHead>Modalidad</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </>
                )}
                {request.status === 'en_proceso' && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.items?.map((item) => {
                const isEnProceso = request.status === 'en_proceso';
                const isResolved = !!item.resolved_at;
                return (
                <TableRow
                  key={item.id}
                  className={isEnProceso ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => isEnProceso && setResolveItem(item)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isEnProceso && (
                        <div className={`h-2 w-2 rounded-full shrink-0 ${isResolved ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      )}
                      <div>
                        <p className="font-medium">{item.raw_material?.name}</p>
                        {item.raw_material?.code && (
                          <p className="text-xs text-muted-foreground">{item.raw_material.code}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.qty} {item.uom?.abbreviation}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {item.notes || '—'}
                  </TableCell>
                  {(request.status === 'en_proceso' || request.status === 'completada') && (
                    <>
                      <TableCell>
                        {item.procurement_mode ? (
                          <Badge className={`${PROCUREMENT_MODE_CONFIG[item.procurement_mode].bgColor} ${PROCUREMENT_MODE_CONFIG[item.procurement_mode].color} border-0 text-xs`}>
                            {PROCUREMENT_MODE_CONFIG[item.procurement_mode].label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.actual_supplier?.name || item.supplier?.name || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.actual_unit_cost > 0 ? formatCurrency(item.actual_unit_cost) : '—'}
                      </TableCell>
                    </>
                  )}
                  {isEnProceso && (
                    <TableCell className="w-10">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </TableCell>
                  )}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {request.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{request.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Información</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Almacén</span>
              <span>{request.warehouse?.name || 'Por defecto'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Items</span>
              <span>{totalItems}</span>
            </div>
            {(request.status === 'en_proceso' || request.status === 'completada') && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items resueltos</span>
                <span className="font-medium">{resolvedCount}/{totalItems}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {hasEstimatedCosts && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Estimado</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(request.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span>{formatCurrency(request.tax)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(request.total)}</span>
              </div>
            </CardContent>
          </Card>
        )}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>Indica el motivo del rechazo.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Motivo del rechazo..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim() || actionLoading}>Rechazar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Resolve Modal */}
      <ItemResolveModal
        open={!!resolveItem}
        onOpenChange={(open) => !open && setResolveItem(null)}
        item={resolveItem}
        onResolved={loadRequest}
      />
    </div>
  );
}
