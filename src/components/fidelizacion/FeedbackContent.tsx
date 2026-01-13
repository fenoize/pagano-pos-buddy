import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  Eye,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useOrderFeedback, OrderFeedback, FeedbackStats, FeedbackFilters, feedbackRequiresReview } from '@/hooks/useOrderFeedback';
import { useAuthContext } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function FeedbackContent() {
  const { user } = useAuthContext();
  const { getAllFeedback, getFeedbackStats, markAsReviewed, loading } = useOrderFeedback();
  
  const [feedback, setFeedback] = useState<OrderFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FeedbackFilters>({
    rating: 'all',
    reviewed: 'all'
  });
  
  // Detail modal state
  const [selectedFeedback, setSelectedFeedback] = useState<OrderFeedback | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const loadData = async () => {
    const [feedbackResult, statsResult] = await Promise.all([
      getAllFeedback(filters, page),
      getFeedbackStats()
    ]);
    
    setFeedback(feedbackResult.data);
    setTotalCount(feedbackResult.count);
    setStats(statsResult);
  };

  useEffect(() => {
    loadData();
  }, [filters, page]);

  const handleMarkReviewed = async () => {
    if (!selectedFeedback || !user?.id) return;
    
    setIsReviewing(true);
    const success = await markAsReviewed(selectedFeedback.id, user.id, reviewNotes);
    
    if (success) {
      setSelectedFeedback(null);
      setReviewNotes('');
      loadData();
    }
    setIsReviewing(false);
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    variant = 'default' 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ElementType;
    variant?: 'default' | 'success' | 'danger' | 'warning';
  }) => {
    const colorClasses = {
      default: 'text-muted-foreground',
      success: 'text-green-600',
      danger: 'text-red-600',
      warning: 'text-amber-600'
    };

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className={`text-2xl font-bold ${colorClasses[variant]}`}>{value}</p>
            </div>
            <div className={`p-3 rounded-full bg-muted ${colorClasses[variant]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats ? (
          <>
            <StatCard 
              title="Total" 
              value={stats.total} 
              icon={MessageSquare} 
            />
            <StatCard 
              title="Positivas" 
              value={stats.positive} 
              icon={ThumbsUp} 
              variant="success"
            />
            <StatCard 
              title="Negativas" 
              value={stats.negative} 
              icon={ThumbsDown} 
              variant="danger"
            />
            <StatCard 
              title="Pendientes" 
              value={stats.pending_review} 
              icon={Clock} 
              variant="warning"
            />
            <StatCard 
              title="Satisfacción" 
              value={`${stats.satisfaction_rate}%`} 
              icon={TrendingUp} 
              variant={stats.satisfaction_rate >= 80 ? 'success' : stats.satisfaction_rate >= 50 ? 'warning' : 'danger'}
            />
          </>
        ) : (
          Array(5).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16" />
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Calificaciones de Clientes</CardTitle>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Select 
              value={filters.rating} 
              onValueChange={(v) => setFilters(f => ({ ...f, rating: v as FeedbackFilters['rating'] }))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="positive">Positivas</SelectItem>
                <SelectItem value="negative">Negativas</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.reviewed} 
              onValueChange={(v) => setFilters(f => ({ ...f, reviewed: v as FeedbackFilters['reviewed'] }))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="reviewed">Revisadas</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-[160px]"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              placeholder="Desde"
            />
            <Input
              type="date"
              className="w-[160px]"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              placeholder="Hasta"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Comentario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && feedback.length === 0 ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(7).fill(0).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : feedback.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay calificaciones para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  feedback.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        #{f.order?.order_number || f.order_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{f.customer?.name || 'Sin nombre'}</div>
                          <div className="text-xs text-muted-foreground">{f.customer?.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(f.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.rating === 'positive' ? 'default' : 'destructive'}>
                          {f.rating === 'positive' ? (
                            <><ThumbsUp className="h-3 w-3 mr-1" /> Positiva</>
                          ) : (
                            <><ThumbsDown className="h-3 w-3 mr-1" /> Negativa</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {f.comment ? (
                          <span className="truncate block" title={f.comment}>
                            {f.comment.length > 50 ? f.comment.slice(0, 50) + '...' : f.comment}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin comentario</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {f.reviewed_at ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" /> Revisado
                          </Badge>
                        ) : feedbackRequiresReview(f) ? (
                          <Badge variant="outline" className="text-amber-600">
                            <Clock className="h-3 w-3 mr-1" /> Pendiente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <CheckCircle className="h-3 w-3 mr-1" /> OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedFeedback(f);
                            setReviewNotes(f.review_notes || '');
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Página {page} de {Math.ceil(totalCount / 20)}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= Math.ceil(totalCount / 20)}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Calificación</DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Pedido</p>
                  <p className="font-medium">#{selectedFeedback.order?.order_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-medium">
                    ${selectedFeedback.order?.total?.toLocaleString('es-CL')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedFeedback.customer?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{selectedFeedback.customer?.phone}</p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <Badge 
                  variant={selectedFeedback.rating === 'positive' ? 'default' : 'destructive'}
                  className="text-base px-4 py-2"
                >
                  {selectedFeedback.rating === 'positive' ? (
                    <><ThumbsUp className="h-4 w-4 mr-2" /> Calificación Positiva</>
                  ) : (
                    <><ThumbsDown className="h-4 w-4 mr-2" /> Calificación Negativa</>
                  )}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedFeedback.created_at), "dd/MM/yyyy HH:mm")}
                </span>
              </div>

              {/* Comment */}
              {selectedFeedback.comment && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Comentario del cliente:</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p>{selectedFeedback.comment}</p>
                  </div>
                </div>
              )}

              {/* Review Notes */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notas de seguimiento:</p>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Agregar notas sobre el seguimiento..."
                  rows={3}
                  disabled={!!selectedFeedback.reviewed_at}
                />
              </div>

              {selectedFeedback.reviewed_at && (
                <div className="text-sm text-muted-foreground">
                  Revisado el {format(new Date(selectedFeedback.reviewed_at), "dd/MM/yyyy HH:mm")}
                  {selectedFeedback.reviewer && ` por ${selectedFeedback.reviewer.username}`}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
              Cerrar
            </Button>
            {selectedFeedback && !selectedFeedback.reviewed_at && feedbackRequiresReview(selectedFeedback) && (
              <Button onClick={handleMarkReviewed} disabled={isReviewing}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Revisado
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
