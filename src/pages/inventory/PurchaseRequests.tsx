import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, CheckCircle, Filter, PlayCircle, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { usePurchaseRequests } from '@/hooks/usePurchaseRequests';
import { REQUEST_STATUS_CONFIG, type PurchaseRequestStatus } from '@/types/purchaseRequests';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PurchaseRequests() {
  const navigate = useNavigate();
  const { requests, loading } = usePurchaseRequests();
  const [statusFilter, setStatusFilter] = useState<PurchaseRequestStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = 
      request.pr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.creator?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.creator?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    draft: requests.filter(r => r.status === 'draft').length,
    pending: requests.filter(r => r.status === 'pending_approval').length,
    approved: requests.filter(r => r.status === 'approved').length,
    en_proceso: requests.filter(r => r.status === 'en_proceso').length,
    completada: requests.filter(r => r.status === 'completada').length,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitudes de Compra</h1>
          <p className="text-muted-foreground">Lista de necesidades de cocina → gestión por logística</p>
        </div>
        <Button onClick={() => navigate('/pos/inventario/solicitudes/nueva')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('draft')}>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Borradores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pending_approval')}>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-amber-600 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('approved')}>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-primary flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Aprobadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-primary">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('en_proceso')}>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-blue-600 flex items-center gap-1.5">
              <PlayCircle className="h-3.5 w-3.5" />
              En Proceso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-blue-600">{stats.en_proceso}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('completada')}>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
              <CheckCheck className="h-3.5 w-3.5" />
              Completadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-bold text-emerald-600">{stats.completada}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por número o creador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PurchaseRequestStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borradores</SelectItem>
                <SelectItem value="pending_approval">Pendientes</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="completada">Completadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No se encontraron solicitudes
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => {
                  const sc = REQUEST_STATUS_CONFIG[request.status];
                  return (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/pos/inventario/solicitudes/${request.id}`)}
                    >
                      <TableCell className="font-medium">{request.pr_number}</TableCell>
                      <TableCell>
                        <Badge className={`${sc.bgColor} ${sc.color} border-0`}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {request.creator?.full_name || request.creator?.username || 'Sistema'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        —
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
