import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Search, Clock, User, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, set } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDeliveryPayments, DeliveryPayment } from '@/hooks/useDeliveryPayments';
import { DeliveryPaymentModal } from '@/components/finance/DeliveryPaymentModal';

export default function FinanceDeliverys() {
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [startTime, setStartTime] = useState<string>('00:00');
  const [endTime, setEndTime] = useState<string>('23:59');
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [selectedRepartidor, setSelectedRepartidor] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('pending');
  const [repartidores, setRepartidores] = useState<Array<{id: string, name: string}>>([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const { payments, loading, fetchPayments, processPayments, getPaymentStats } = useDeliveryPayments();

  // Load repartidores list on mount
  useEffect(() => {
    const loadRepartidores = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('active', true)
          .or('role.eq.Reparto,role.eq.Administrador')
          .order('full_name');

        if (error) throw error;

        const repartidoresData = data
          ?.filter(u => u.full_name)
          .map(u => ({ id: u.id, name: u.full_name })) || [];
        
        setRepartidores(repartidoresData);
      } catch (error: any) {
        console.error('Error loading repartidores:', error);
      }
    };

    loadRepartidores();
  }, []);

  // Auto-detect most recent data and load with adjusted date range
  useEffect(() => {
    const initializeWithLatestData = async () => {
      if (initialLoadDone) return;
      
      try {
        // Check for most recent delivery payment date
        const { data } = await supabase
          .from('delivery_payments')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          const latestDate = new Date(data[0].created_at);
          const latestWeekStart = startOfWeek(latestDate, { weekStartsOn: 1 });
          const latestWeekEnd = endOfWeek(latestDate, { weekStartsOn: 1 });
          
          // If latest data is before current week, adjust the date range
          const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
          if (latestWeekStart < currentWeekStart) {
            setStartDate(latestWeekStart);
            setEndDate(latestWeekEnd);
          }
        }
      } catch (error) {
        console.error('Error detecting latest data:', error);
      } finally {
        setInitialLoadDone(true);
      }
    };

    initializeWithLatestData();
  }, [initialLoadDone]);

  // Load data when initial detection is done
  useEffect(() => {
    if (initialLoadDone) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoadDone]);

  const loadData = async () => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDateTime = set(startDate, { hours: startHour, minutes: startMinute, seconds: 0 });
    const endDateTime = set(endDate, { hours: endHour, minutes: endMinute, seconds: 59 });

    await fetchPayments({
      status: statusFilter,
      delivery_person_id: selectedRepartidor === 'todos' ? undefined : selectedRepartidor,
      date_start: startDateTime.toISOString(),
      date_end: endDateTime.toISOString()
    });
    
    setSelectedPaymentIds(new Set());
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = payments
        .filter(p => p.status === 'pending')
        .map(p => p.id);
      setSelectedPaymentIds(new Set(pendingIds));
    } else {
      setSelectedPaymentIds(new Set());
    }
  };

  const handleSelectPayment = (paymentId: string, checked: boolean) => {
    const newSelected = new Set(selectedPaymentIds);
    if (checked) {
      newSelected.add(paymentId);
    } else {
      newSelected.delete(paymentId);
    }
    setSelectedPaymentIds(newSelected);
  };

  const selectedPayments = payments.filter(p => selectedPaymentIds.has(p.id));
  
  // Group selected by delivery person - only allow one at a time
  const selectedDeliveryPersonIds = new Set(selectedPayments.map(p => p.delivery_person_id));
  const canProcessPayment = selectedPayments.length > 0 && selectedDeliveryPersonIds.size === 1;

  const handleOpenPaymentModal = () => {
    if (!canProcessPayment) {
      if (selectedDeliveryPersonIds.size > 1) {
        toast.error('Solo puedes pagar a un repartidor a la vez');
      }
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentConfirm = async (data: any) => {
    const success = await processPayments(data);
    if (success) {
      setSelectedPaymentIds(new Set());
      await loadData();
    }
    return success;
  };

  const exportCSV = () => {
    if (payments.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = ['Fecha', 'Orden', 'Repartidor', 'Monto Base', 'Turno', 'Impuesto', 'Neto', 'Estado', 'Fecha Pago'];
    const csvContent = [
      headers.join(','),
      ...payments.map(p => {
        const effectiveDate = p.order?.created_at ?? p.created_at;
        return [
          format(new Date(effectiveDate), 'dd/MM/yyyy HH:mm'),
          p.order?.order_number || '',
          p.delivery_person?.full_name || '',
          p.base_amount,
          p.shift_bonus,
          p.tax_amount,
          p.net_amount,
          p.status === 'paid' ? 'Pagado' : 'Pendiente',
          p.payment_date ? format(new Date(p.payment_date), 'dd/MM/yyyy') : ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagos_delivery_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Datos exportados');
  };

  const stats = getPaymentStats();
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const allPendingSelected = pendingPayments.length > 0 && 
    pendingPayments.every(p => selectedPaymentIds.has(p.id));

  // Group by repartidor for summary
  const summaryByRepartidor = payments.reduce((acc, p) => {
    const id = p.delivery_person_id;
    const name = p.delivery_person?.full_name || 'Sin asignar';
    
    if (!acc[id]) {
      acc[id] = { id, name, pending: 0, pendingAmount: 0, paid: 0, paidAmount: 0 };
    }
    
    if (p.status === 'pending') {
      acc[id].pending += 1;
      acc[id].pendingAmount += p.base_amount;
    } else {
      acc[id].paid += 1;
      acc[id].paidAmount += p.net_amount;
    }
    
    return acc;
  }, {} as Record<string, { id: string; name: string; pending: number; pendingAmount: number; paid: number; paidAmount: number }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Pagos a Repartidores</h1>
        </div>
        
        {selectedPayments.length > 0 && (
          <Button 
            onClick={handleOpenPaymentModal}
            disabled={!canProcessPayment}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Pagar Seleccionados ({selectedPayments.length})
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar Pagos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio</label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) setStartDate(date);
                      setStartCalendarOpen(false);
                    }}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin</label>
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      if (date) setEndDate(date);
                      setEndCalendarOpen(false);
                    }}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Repartidor</label>
              <Select value={selectedRepartidor} onValueChange={setSelectedRepartidor}>
                <SelectTrigger>
                  <User className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los repartidores</SelectItem>
                  {repartidores.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="paid">Pagados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={loadData} disabled={loading} variant="secondary">
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Cargando...' : 'Buscar'}
            </Button>

            {payments.length > 0 && (
              <Button onClick={exportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {payments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
              <p className="text-2xl font-bold">{stats.pendingCount}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(stats.pendingAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-sm text-muted-foreground">Pagados</p>
              </div>
              <p className="text-2xl font-bold">{stats.paidCount}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(stats.paidAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Seleccionados</p>
              <p className="text-2xl font-bold">{selectedPayments.length}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(selectedPayments.reduce((s, p) => s + p.base_amount, 0))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Período</p>
              <p className="text-2xl font-bold">{payments.length}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(stats.totalAmount)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary by Repartidor */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Repartidor</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Repartidor</TableHead>
                  <TableHead className="text-right">Pendientes</TableHead>
                  <TableHead className="text-right">Monto Pendiente</TableHead>
                  <TableHead className="text-right">Pagados</TableHead>
                  <TableHead className="text-right">Monto Pagado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(summaryByRepartidor).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {item.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.pending}</TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {formatCurrency(item.pendingAmount)}
                    </TableCell>
                    <TableCell className="text-right">{item.paid}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(item.paidAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={handleSelectAll}
                      disabled={pendingPayments.length === 0}
                    />
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Repartidor</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPaymentIds.has(payment.id)}
                        onCheckedChange={(checked) => handleSelectPayment(payment.id, !!checked)}
                        disabled={payment.status !== 'pending'}
                      />
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(
                          payment.order?.delivery_delivered_at ??
                          payment.order?.created_at ??
                          payment.created_at
                        ),
                        'dd/MM/yyyy HH:mm',
                        { locale: es }
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      #{payment.order?.order_number}
                    </TableCell>
                    <TableCell>{payment.delivery_person?.full_name || 'Sin asignar'}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={payment.order?.delivery_address || '-'}>
                      {payment.order?.delivery_address || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.base_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                        {payment.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.payment_date 
                        ? format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: es })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      <DeliveryPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedPayments={selectedPayments}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
