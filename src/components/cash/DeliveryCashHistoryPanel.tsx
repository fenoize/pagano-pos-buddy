import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Truck, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  CalendarDays,
  Filter,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDeliveryCashHistory, DeliveryCashHistoryFilters } from '@/hooks/useDeliveryCashHistory';
import { useDeliveryCashPending } from '@/hooks/useDeliveryCashPending';
import { useCashSession } from '@/hooks/useCashSession';
import { DeliveryCashPendingWidget } from './DeliveryCashPendingWidget';

interface DeliveryCashHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeliveryCashHistoryPanel({ open, onOpenChange }: DeliveryCashHistoryPanelProps) {
  const { 
    history, 
    loading: historyLoading, 
    deliveryPersons, 
    fetchHistory, 
    fetchDeliveryPersons, 
    exportToCSV,
    getStats 
  } = useDeliveryCashHistory();
  
  const { pendingByPerson, loading: pendingLoading } = useDeliveryCashPending();
  const { hasActiveSession } = useCashSession();

  const [filters, setFilters] = useState<DeliveryCashHistoryFilters>({
    status: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDeliveryPersons();
      fetchHistory(filters);
    }
  }, [open, fetchDeliveryPersons, fetchHistory, filters]);

  const stats = getStats();
  const totalPending = pendingByPerson.reduce((sum, p) => sum + p.total_pending, 0);

  const handleFilterChange = (key: keyof DeliveryCashHistoryFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    fetchHistory(newFilters);
  };

  const clearFilters = () => {
    const newFilters: DeliveryCashHistoryFilters = { status: 'all' };
    setFilters(newFilters);
    fetchHistory(newFilters);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'depositado':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Depositado</Badge>;
      case 'ajustado':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><TrendingUp className="h-3 w-3 mr-1" />Ajustado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-600" />
            Efectivo de Delivery
          </SheetTitle>
          <SheetDescription>
            Gestiona el efectivo cobrado por repartidores
          </SheetDescription>
        </SheetHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2 my-4">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-bold text-amber-700">{formatCurrency(totalPending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Depositado (filtro)</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(stats.totalDeposited)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="relative">
              Pendiente
              {totalPending > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {pendingByPerson.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {pendingLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />
                  ))}
                </div>
              ) : pendingByPerson.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No hay efectivo pendiente</p>
                  <p className="text-sm">Todos los depósitos están al día</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <DeliveryCashPendingWidget />
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={history.length === 0}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>

              {showFilters && (
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Desde</Label>
                        <Input
                          type="date"
                          value={filters.dateFrom || ''}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Hasta</Label>
                        <Input
                          type="date"
                          value={filters.dateTo || ''}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Repartidor</Label>
                        <Select 
                          value={filters.deliveryPersonId || 'all'} 
                          onValueChange={(v) => handleFilterChange('deliveryPersonId', v === 'all' ? '' : v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {deliveryPersons.map(person => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Estado</Label>
                        <Select 
                          value={filters.status || 'all'} 
                          onValueChange={(v) => handleFilterChange('status', v as any)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="depositado">Depositado</SelectItem>
                            <SelectItem value="ajustado">Ajustado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      Limpiar filtros
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* History List */}
            <ScrollArea className="flex-1">
              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3" />
                  <p>No hay registros</p>
                  <p className="text-sm">Ajusta los filtros para ver más resultados</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {history.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                Pedido #{item.order_number || '—'}
                              </span>
                              {getStatusBadge(item.status)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Truck className="h-3 w-3" />
                              <span>{item.delivery_person_name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Cobrado: {format(new Date(item.collected_at), "d MMM, HH:mm", { locale: es })}
                            </div>
                            {item.deposited_at && (
                              <div className="text-xs text-green-600">
                                Depositado: {format(new Date(item.deposited_at), "d MMM, HH:mm", { locale: es })}
                                {item.session_user_name && ` • ${item.session_user_name}`}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${item.status === 'pendiente' ? 'text-amber-600' : 'text-green-600'}`}>
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            "{item.notes}"
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
