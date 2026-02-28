import { useState, useEffect, useRef, useCallback } from 'react';
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
  Pencil,
  MessageSquare,
  Save,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Warehouse,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import LinkedPurchaseOrders from '@/components/inventory/LinkedPurchaseOrders';
import DirectPurchaseChecklist from '@/components/inventory/DirectPurchaseChecklist';
import StartManagementOnboarding from '@/components/inventory/StartManagementOnboarding';

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
    updateManagementNotes,
    getLastPurchaseInfo,
    resolveItem: resolveItemFromHook,
    unresolveItem: unresolveItemFromHook,
  } = usePurchaseRequests();

  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDraftOCWarning, setShowDraftOCWarning] = useState(false);
  const [draftOCCount, setDraftOCCount] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resolveItem, setResolveItem] = useState<PurchaseRequestItem | null>(null);
  const [checklistFullscreen, setChecklistFullscreen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [itemsCollapsed, setItemsCollapsed] = useState(false);
  
  // Management notes
  const [managementNotes, setManagementNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Last purchase info for approval view
  const [lastPurchaseInfo, setLastPurchaseInfo] = useState<Record<string, {
    last_supplier_id: string | null;
    last_supplier_name: string | null;
    last_cost: number | null;
    last_procurement_mode: string | null;
  }>>({});

  // Linked OC info for finalize warning
  const [linkedOrders, setLinkedOrders] = useState<{ status: string }[]>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const loadRequest = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    const data = await getRequestById(id);
    setRequest(data);
    if (data) {
      setManagementNotes(data.management_notes || '');
      if (['pending_approval', 'approved'].includes(data.status) && data.items?.length) {
        const materialIds = data.items.map(i => i.raw_material_id);
        const info = await getLastPurchaseInfo(materialIds);
        setLastPurchaseInfo(info);
      }
    }
    if (!silent) setLoading(false);
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

  const handleTryComplete = () => {
    // Check if there are draft/unapproved OCs
    const draftOCs = linkedOrders.filter(o => ['draft'].includes(o.status));
    if (draftOCs.length > 0) {
      setDraftOCCount(draftOCs.length);
      setShowDraftOCWarning(true);
    } else {
      setShowCompleteDialog(true);
    }
  };

  const handleConfirmCompleteWithDrafts = () => {
    setShowDraftOCWarning(false);
    setShowCompleteDialog(true);
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
    if (success) navigate('/pos/inventario/solicitudes');
    setActionLoading(false);
  };

  const handleNotesChange = useCallback((value: string) => {
    setManagementNotes(value);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(async () => {
      if (!id) return;
      setNotesSaving(true);
      await updateManagementNotes(id, value);
      setNotesSaving(false);
    }, 1500);
  }, [id, updateManagementNotes]);

  const handleSaveNotes = async () => {
    if (!id) return;
    setNotesSaving(true);
    await updateManagementNotes(id, managementNotes);
    setNotesSaving(false);
  };

  // Allow admin to reopen completed requests
  const handleReopenToEnProceso = () => handleAction(async () => {
    if (!id) return false;
    const { error } = await (await import('@/integrations/supabase/client')).supabase
      .from('purchase_requests')
      .update({ status: 'en_proceso' as any })
      .eq('id', id);
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  });

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
  const isEnProceso = request.status === 'en_proceso';
  const isPendingApproval = request.status === 'pending_approval';
  const canResolveItems = isEnProceso || isPendingApproval;
  const isAdmin = user?.role === 'Administrador';

  return (
    <div className="space-y-4">
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
            <p className="text-muted-foreground text-sm">
              Creado por {request.creator?.full_name || request.creator?.username} el{' '}
              {format(new Date(request.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
            </p>
            {/* Compact approval/buyer info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {(request.status === 'approved' || isEnProceso || request.status === 'completada') && request.approver && (
                <span className="text-xs text-primary flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Aprobó: {request.approver.full_name || request.approver.username}
                  {request.approved_at && (
                    <span className="text-primary/60 ml-1">
                      ({format(new Date(request.approved_at), 'dd/MM HH:mm', { locale: es })})
                    </span>
                  )}
                </span>
              )}
              {(isEnProceso || request.status === 'completada') && request.buyer && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Comprador: {request.buyer.full_name || request.buyer.username}
                  {request.buyer_started_at && (
                    <span className="text-amber-500/60 ml-1">
                      ({format(new Date(request.buyer_started_at), 'dd/MM HH:mm', { locale: es })})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions based on status */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportPurchaseRequestToPDF(request)}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>

          {request.status === 'draft' && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/pos/inventario/solicitudes/${id}/editar`)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button size="sm" onClick={handleSubmitForApproval} disabled={actionLoading}>
                <Send className="h-4 w-4 mr-2" />
                Enviar a Aprobación
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          )}

          {isPendingApproval && (
            <>
              <Button variant="outline" size="sm" onClick={handleReturnToDraft} disabled={actionLoading}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Devolver
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            </>
          )}

          {request.status === 'approved' && (
            <Button size="sm" onClick={() => setShowOnboarding(true)} disabled={actionLoading}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Gestión
            </Button>
          )}

          {isEnProceso && (
            <Button
              size="sm"
              onClick={handleTryComplete}
              disabled={actionLoading || resolvedCount < totalItems}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Finalizar Gestión ({resolvedCount}/{totalItems})
            </Button>
          )}

          {request.status === 'completada' && isAdmin && (
            <Button variant="outline" size="sm" onClick={handleReopenToEnProceso} disabled={actionLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reabrir Gestión
            </Button>
          )}

          {request.status === 'rejected' && (
            <Button variant="outline" size="sm" onClick={handleReturnToDraft} disabled={actionLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reabrir como Borrador
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Reason */}
      {request.status === 'rejected' && request.rejection_reason && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive text-sm">Motivo del Rechazo</p>
                <p className="text-destructive/80 text-sm">{request.rejection_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === EN PROCESO sections === */}
      {isEnProceso && id && (
        <div className="space-y-4">
          {/* 1. Linked Purchase Orders (collapsible) */}
          <LinkedPurchaseOrders
            requestId={id}
            onRefresh={loadRequest}
            onOrdersLoaded={setLinkedOrders}
          />

          {/* 2. Direct Purchase Checklist */}
          {request.items && (
            <DirectPurchaseChecklist
              items={request.items}
              warehouseId={request.warehouse_id}
              onItemResolved={() => {}}
              fullscreen={checklistFullscreen}
              onToggleFullscreen={() => setChecklistFullscreen(!checklistFullscreen)}
              resolveItemFn={resolveItemFromHook}
              unresolveItemFn={unresolveItemFromHook}
            />
          )}
        </div>
      )}

      {/* Completada: also show linked OCs (collapsed) */}
      {request.status === 'completada' && id && (
        <LinkedPurchaseOrders requestId={id} onRefresh={loadRequest} defaultCollapsed />
      )}

      {/* Items Table — grouped by supplier */}
      {!checklistFullscreen && (
        <>
          <Collapsible open={!itemsCollapsed} onOpenChange={(open) => setItemsCollapsed(!open)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Items Solicitados</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-normal text-muted-foreground">{totalItems} items</span>
                      {itemsCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-0 space-y-0">
                  {(() => {
                    const items = request.items || [];
                    // Group by supplier
                    const groups: Record<string, { supplierName: string; items: typeof items }> = {};
                    items.forEach((item) => {
                      const suppName = item.actual_supplier?.name || item.supplier?.name || null;
                      const key = suppName || '__sin_proveedor__';
                      if (!groups[key]) {
                        groups[key] = { supplierName: suppName || 'Sin proveedor', items: [] };
                      }
                      groups[key].items.push(item);
                    });
                    const sortedKeys = Object.keys(groups).sort((a, b) => {
                      if (a === '__sin_proveedor__') return 1;
                      if (b === '__sin_proveedor__') return -1;
                      return groups[a].supplierName.localeCompare(groups[b].supplierName);
                    });

                    const showExtraCols = isPendingApproval || isEnProceso || request.status === 'approved' || request.status === 'completada';

                    return sortedKeys.map((key) => {
                      const group = groups[key];
                      const groupTotal = group.items.reduce((sum, i) => sum + (i.actual_unit_cost > 0 ? i.actual_unit_cost * (i.actual_qty ?? i.qty) : 0), 0);
                      return (
                        <Collapsible key={key} defaultOpen>
                          <CollapsibleTrigger asChild>
                            <div className="px-4 py-2.5 bg-muted/40 border-b border-t flex items-center gap-2 cursor-pointer hover:bg-muted/60 transition-colors">
                              <ChevronDown className="h-4 w-4 text-muted-foreground collapsible-chevron transition-transform [&[data-state=open]_.collapsible-chevron]:rotate-180" />
                              <Warehouse className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold text-foreground flex-1">{group.supplierName}</span>
                              <Badge variant="outline" className="text-xs">{group.items.length}</Badge>
                              {groupTotal > 0 && (
                                <span className="text-xs font-medium text-primary">{formatCurrency(groupTotal)}</span>
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Material</TableHead>
                                  <TableHead className="text-right">Cantidad</TableHead>
                                  <TableHead>Nota</TableHead>
                                  {showExtraCols && (
                                    <>
                                      <TableHead>Modalidad</TableHead>
                                      <TableHead className="text-right">Precio</TableHead>
                                    </>
                                  )}
                                  {isPendingApproval && (
                                    <>
                                      <TableHead className="text-muted-foreground text-xs">Últ. Proveedor</TableHead>
                                      <TableHead className="text-muted-foreground text-xs text-right">Últ. Precio</TableHead>
                                    </>
                                  )}
                                  {canResolveItems && <TableHead className="w-10" />}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.items.map((item) => {
                                  const isResolved = !!item.resolved_at;
                                  const lastInfo = lastPurchaseInfo[item.raw_material_id];
                                  return (
                                    <TableRow
                                      key={item.id}
                                      className={canResolveItems ? 'cursor-pointer hover:bg-muted/50' : ''}
                                      onClick={() => canResolveItems && setResolveItem(item)}
                                    >
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          {canResolveItems && (
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
                                        {item.actual_qty != null && item.actual_qty !== item.qty ? (
                                          <div>
                                            <p className="font-medium">{item.actual_qty} {item.uom?.abbreviation}</p>
                                            <p className="text-xs text-muted-foreground line-through">{item.qty} {item.uom?.abbreviation}</p>
                                          </div>
                                        ) : (
                                          <span>{item.qty} {item.uom?.abbreviation}</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                        {item.notes || '—'}
                                      </TableCell>
                                      {showExtraCols && (
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
                                          <TableCell className="text-right text-sm">
                                            {item.actual_unit_cost > 0 ? (
                                              <div>
                                                <p className="font-medium">{formatCurrency(item.actual_unit_cost * (item.actual_qty ?? item.qty))}</p>
                                                <p className="text-xs text-muted-foreground">{formatCurrency(item.actual_unit_cost)}/{item.uom?.abbreviation || 'u'}</p>
                                              </div>
                                            ) : '—'}
                                          </TableCell>
                                        </>
                                      )}
                                      {isPendingApproval && (
                                        <>
                                          <TableCell className="text-xs text-muted-foreground">
                                            {lastInfo?.last_supplier_name || '—'}
                                          </TableCell>
                                          <TableCell className="text-right text-xs text-muted-foreground">
                                            {lastInfo?.last_cost ? formatCurrency(lastInfo.last_cost) : '—'}
                                          </TableCell>
                                        </>
                                      )}
                                      {canResolveItems && (
                                        <TableCell className="w-10">
                                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    });
                  })()}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Notes */}
          {request.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notas del Chef</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{request.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Management Notes (editable in en_proceso) */}
          {isEnProceso && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentarios de Gestión
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder="Notas sobre la gestión de compras (cambios de precio, tips de ahorro, observaciones...)"
                  value={managementNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {notesSaving ? 'Guardando...' : 'Auto-guardado'}
                  </p>
                  <Button variant="ghost" size="sm" onClick={handleSaveNotes} disabled={notesSaving}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Guardar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Management notes for completada status (read-only) */}
          {request.status === 'completada' && request.management_notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentarios de Gestión
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{request.management_notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
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
                {(isEnProceso || request.status === 'completada') && (
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
        </>
      )}

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

      {/* Draft OC Warning Dialog */}
      <AlertDialog open={showDraftOCWarning} onOpenChange={setShowDraftOCWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-amber-500" />
              OC en Borrador detectadas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hay <strong>{draftOCCount}</strong> Orden(es) de Compra en estado <strong>Borrador</strong> que no han sido aprobadas ni enviadas. 
              Al finalizar la gestión, estas OC serán <strong>canceladas automáticamente</strong>.
              <br /><br />
              ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver y revisar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCompleteWithDrafts} className="bg-amber-600 hover:bg-amber-700 text-white">
              Continuar y cancelar borradores
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete/Finalize Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar Gestión de Compras?</AlertDialogTitle>
            <AlertDialogDescription>
              Los precios y proveedores de cada item quedarán registrados como referencia para futuras solicitudes.
              {isAdmin && ' Un administrador podrá reabrir la gestión si se necesitan correcciones.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowCompleteDialog(false); handleComplete(); }}>
              Finalizar Gestión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item Resolve Modal */}
      <ItemResolveModal
        open={!!resolveItem}
        onOpenChange={(open) => !open && setResolveItem(null)}
        item={resolveItem}
        onResolved={() => loadRequest(true)}
      />

      {/* Onboarding Iniciar Gestión */}
      <StartManagementOnboarding
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onConfirm={async () => {
          setShowOnboarding(false);
          handleStartProcessing();
        }}
        loading={actionLoading}
      />
    </div>
  );
}
