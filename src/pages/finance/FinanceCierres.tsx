import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus, Eye, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useFinanceClosures } from '@/hooks/useFinanceClosures';
import { ClosureDetailDrawer } from '@/components/finance/ClosureDetailDrawer';
import { exportClosureToCSV, formatCurrency, getPeriodLabel } from '@/lib/financeExport';
import { FinancialClosure } from '@/types/finance';
import { toast } from 'sonner';

export default function FinanceCierres() {
  const { closures, loading, generateClosure } = useFinanceClosures();
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  
  // Filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');
  const [excludeCancelled, setExcludeCancelled] = useState(true);
  
  // Drawer state
  const [selectedClosure, setSelectedClosure] = useState<FinancialClosure | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Funciones para botones rápidos
  const setCurrentWeek = () => {
    const now = new Date();
    setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
    setEndDate(endOfWeek(now, { weekStartsOn: 1 }));
  };

  const setLastWeek = () => {
    const lastWeek = subWeeks(new Date(), 1);
    setStartDate(startOfWeek(lastWeek, { weekStartsOn: 1 }));
    setEndDate(endOfWeek(lastWeek, { weekStartsOn: 1 }));
  };

  const setCurrentMonth = () => {
    const now = new Date();
    setStartDate(startOfMonth(now));
    setEndDate(endOfMonth(now));
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setStartDate(startOfMonth(lastMonth));
    setEndDate(endOfMonth(lastMonth));
  };

  // Detectar tipo de cierre automáticamente
  const detectClosureType = (start: Date, end: Date): string => {
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 6 && diffDays <= 7) return 'weekly';
    if (diffDays >= 28 && diffDays <= 31) return 'monthly';
    return 'custom';
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error('Selecciona un rango de fechas válido');
      return;
    }

    if (endDate < startDate) {
      toast.error('La fecha final debe ser posterior a la fecha inicial');
      return;
    }

    setGenerating(true);
    
    try {
      const periodType = detectClosureType(startDate, endDate);
      
      const filters: Record<string, any> = {
        exclude_cancelled: excludeCancelled
      };
      
      if (fulfillmentFilter !== 'all') {
        filters.fulfillment = fulfillmentFilter;
      }

      const closureId = await generateClosure({
        period_type: periodType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        notes: notes.trim() || undefined,
        filters
      });

      if (closureId) {
        setModalOpen(false);
        setStartDate(undefined);
        setEndDate(undefined);
        setNotes('');
        setFulfillmentFilter('all');
        setExcludeCancelled(true);
      }
    } catch (error) {
      console.error('Error generating closure:', error);
    } finally {
      setGenerating(false);
    }
  };

  const openDetail = (closure: FinancialClosure) => {
    setSelectedClosure(closure);
    setDrawerOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cierres Financieros</h1>
          <p className="text-muted-foreground">
            Historial y generación de cierres contables
          </p>
        </div>
        
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cierre
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generar Cierre Financiero</DialogTitle>
              <DialogDescription>
                Configura el rango de fechas y filtros para el cierre contable
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* 1. Selector de Rango de Fechas */}
              <div className="space-y-3">
                <Label>Rango de Fechas</Label>
                <div className="flex gap-2 flex-wrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy', { locale: es }) : 'Fecha Inicio'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy', { locale: es }) : 'Fecha Fin'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Botones Rápidos */}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={setCurrentWeek}>
                    Semana Actual
                  </Button>
                  <Button size="sm" variant="outline" onClick={setLastWeek}>
                    Semana Anterior
                  </Button>
                  <Button size="sm" variant="outline" onClick={setCurrentMonth}>
                    Mes Actual
                  </Button>
                  <Button size="sm" variant="outline" onClick={setLastMonth}>
                    Mes Anterior
                  </Button>
                </div>
              </div>

              {/* 2. Filtros Opcionales */}
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros Avanzados (opcional)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3 p-4 border rounded-md">
                  <div>
                    <Label>Canal de Venta</Label>
                    <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="retiro">Solo Retiro</SelectItem>
                        <SelectItem value="delivery">Solo Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="exclude-cancelled"
                      checked={excludeCancelled}
                      onCheckedChange={setExcludeCancelled}
                    />
                    <Label htmlFor="exclude-cancelled" className="cursor-pointer">
                      Excluir pedidos cancelados
                    </Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 3. Notas */}
              <div>
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre este cierre financiero..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleGenerate}
                disabled={!startDate || !endDate || generating}
                size="lg"
              >
                {generating ? 'Generando...' : 'Generar Cierre'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de Cierres */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cierres</CardTitle>
          <CardDescription>
            Últimos 50 cierres financieros generados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando cierres...
            </div>
          ) : closures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cierres financieros registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Órdenes</TableHead>
                  <TableHead className="text-right">Ventas Netas</TableHead>
                  <TableHead className="text-right">Egresos</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closures.map((closure) => (
                  <TableRow key={closure.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {getPeriodLabel(closure.period_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(closure.date_start), 'dd MMM', { locale: es })} -{' '}
                      {format(new Date(closure.date_end), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">{closure.totals.orders}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(closure.totals.sales.net)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(closure.total_expenses || 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={closure.margin_amount >= 0 ? 'text-primary' : 'text-destructive'}>
                        {formatCurrency(closure.margin_amount || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={closure.margin_percent >= 20 ? 'default' : 'destructive'}>
                        {closure.margin_percent || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(closure.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetail(closure)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => exportClosureToCSV(closure)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Drawer de Detalle */}
      <ClosureDetailDrawer
        closure={selectedClosure}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
