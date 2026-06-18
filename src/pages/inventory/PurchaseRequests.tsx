import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, CheckCircle, PlayCircle, CheckCheck, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { REQUEST_STATUS_CONFIG, type PurchaseRequest, type PurchaseRequestStatus } from '@/types/purchaseRequests';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStaffUserId } from '@/lib/staffSession';
import StartManagementOnboarding from '@/components/inventory/StartManagementOnboarding';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';

type ColumnKey = Extract<PurchaseRequestStatus, 'draft' | 'pending_approval' | 'approved' | 'en_proceso' | 'completada'>;

const COLUMNS: { key: ColumnKey; label: string; icon: typeof FileText; accent: string }[] = [
  { key: 'draft', label: 'Borradores', icon: FileText, accent: 'text-muted-foreground' },
  { key: 'pending_approval', label: 'Pendientes', icon: Clock, accent: 'text-amber-600' },
  { key: 'approved', label: 'Aprobadas', icon: CheckCircle, accent: 'text-primary' },
  { key: 'en_proceso', label: 'En Proceso', icon: PlayCircle, accent: 'text-blue-600' },
  { key: 'completada', label: 'Completadas', icon: CheckCheck, accent: 'text-emerald-600' },
];

const NEXT_STATUS: Record<ColumnKey, ColumnKey | null> = {
  draft: 'pending_approval',
  pending_approval: 'approved',
  approved: 'en_proceso',
  en_proceso: 'completada',
  completada: null,
};

function RequestCard({ request, dragging = false }: { request: PurchaseRequest; dragging?: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: request.id,
    data: { status: request.status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`group rounded-lg border bg-card p-3 shadow-sm transition ${
        isDragging ? 'opacity-30' : 'hover:shadow-md'
      } ${dragging ? 'ring-2 ring-primary shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Arrastrar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate(`/pos/inventario/solicitudes/${request.id}`)}
          className="flex-1 text-left min-w-0"
        >
          <p className="font-medium text-sm truncate">{request.pr_number}</p>
          <p className="text-xs text-muted-foreground truncate">
            {request.creator?.full_name || request.creator?.username || 'Sistema'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {format(new Date(request.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
          </p>
        </button>
      </div>
    </div>
  );
}

function Column({ column, items }: { column: typeof COLUMNS[number]; items: PurchaseRequest[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  const Icon = column.icon;
  return (
    <div className="flex flex-col min-w-[260px] flex-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${column.accent}`}>
          <Icon className="h-4 w-4" />
          {column.label}
        </div>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] rounded-lg border-2 border-dashed p-2 space-y-2 transition ${
          isOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
        }`}
      >
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Vacío</p>
        ) : (
          items.map(r => <RequestCard key={r.id} request={r} />)
        )}
      </div>
    </div>
  );
}

export default function PurchaseRequests() {
  const navigate = useNavigate();
  const { requests, loading, submitForApproval, approveRequest, startProcessing, completeRequest, fetchRequests } = usePurchaseRequests();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [pendingComplete, setPendingComplete] = useState<string | null>(null);
  const [startLoading, setStartLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filteredRequests = useMemo(() => requests.filter(request => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      request.pr_number.toLowerCase().includes(q) ||
      request.creator?.username?.toLowerCase().includes(q) ||
      request.creator?.full_name?.toLowerCase().includes(q)
    );
  }), [requests, searchTerm]);

  const grouped = useMemo(() => {
    const map: Record<ColumnKey, PurchaseRequest[]> = {
      draft: [], pending_approval: [], approved: [], en_proceso: [], completada: [],
    };
    filteredRequests.forEach(r => {
      if (r.status in map) map[r.status as ColumnKey].push(r);
    });
    return map;
  }, [filteredRequests]);

  const activeRequest = activeId ? requests.find(r => r.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    const id = String(e.active.id);
    const fromStatus = e.active.data.current?.status as ColumnKey | undefined;
    const toStatus = e.over?.id as ColumnKey | undefined;
    setActiveId(null);
    if (!toStatus || !fromStatus || fromStatus === toStatus) return;

    const expected = NEXT_STATUS[fromStatus];
    if (expected !== toStatus) {
      toast.error('Movimiento no permitido', {
        description: 'Solo puedes avanzar a la siguiente etapa del flujo.',
      });
      return;
    }

    if (toStatus === 'pending_approval') {
      await submitForApproval(id);
    } else if (toStatus === 'approved') {
      const userId = getStaffUserId();
      if (!userId) {
        toast.error('Sesión no válida');
        return;
      }
      await approveRequest(id, userId);
    } else if (toStatus === 'en_proceso') {
      setPendingStart(id);
    } else if (toStatus === 'completada') {
      setPendingComplete(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitudes de Compra</h1>
          <p className="text-muted-foreground">Arrastra las solicitudes para avanzar de etapa</p>
        </div>
        <Button onClick={() => navigate('/pos/inventario/solicitudes/nueva')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Buscar por número o creador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <Column key={col.key} column={col} items={grouped[col.key]} />
          ))}
        </div>
        <DragOverlay>
          {activeRequest ? <RequestCard request={activeRequest} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Other statuses (rejected/cancelled) summary */}
      {(requests.some(r => r.status === 'rejected' || r.status === 'cancelled')) && (
        <Card>
          <CardContent className="pt-6 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground mr-2">Otros estados:</span>
            {requests.filter(r => r.status === 'rejected' || r.status === 'cancelled').map(r => {
              const sc = REQUEST_STATUS_CONFIG[r.status];
              return (
                <Badge
                  key={r.id}
                  className={`${sc.bgColor} ${sc.color} border-0 cursor-pointer`}
                  onClick={() => navigate(`/pos/inventario/solicitudes/${r.id}`)}
                >
                  {r.pr_number} · {sc.label}
                </Badge>
              );
            })}
          </CardContent>
        </Card>
      )}

      <StartManagementOnboarding
        open={!!pendingStart}
        onClose={() => setPendingStart(null)}
        loading={startLoading}
        onConfirm={async () => {
          if (!pendingStart) return;
          setStartLoading(true);
          await startProcessing(pendingStart);
          setStartLoading(false);
          setPendingStart(null);
        }}
      />

      <AlertDialog open={!!pendingComplete} onOpenChange={v => !v && setPendingComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar gestión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizarán los precios y proveedores de los insumos según lo registrado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingComplete) return;
                await completeRequest(pendingComplete);
                setPendingComplete(null);
                await fetchRequests();
              }}
            >
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
