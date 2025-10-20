import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Search } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DeliveryExportRow } from '@/types/finance';
import { ExportTable } from '@/components/finance/ExportTable';

export default function FinanceExport() {
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [deliveryData, setDeliveryData] = useState<DeliveryExportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('delivery_export_range', {
        _start: format(startDate, 'yyyy-MM-dd'),
        _end: format(endDate, 'yyyy-MM-dd'),
        _tz: 'America/Santiago'
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('No hay deliveries en el período seleccionado');
        setDeliveryData([]);
        return;
      }

      setDeliveryData(data as DeliveryExportRow[]);
      setCurrentPage(1); // Reset to first page
      toast.success(`${data.length} deliveries cargados`);
    } catch (error: any) {
      console.error('Error loading deliveries:', error);
      toast.error(error.message || 'Error cargando deliveries');
      setDeliveryData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportDeliveryCSV = () => {
    if (deliveryData.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    setExporting(true);
    try {
      // Generar CSV
      const headers = ['Fecha y Hora', 'Número Orden', 'Dirección', 'Monto Delivery'];
      const csvContent = [
        headers.join(','),
        ...deliveryData.map(row =>
          [
            row.fecha_hora,
            row.numero_orden,
            `"${row.direccion}"`,
            row.monto_delivery
          ].join(',')
        )
      ].join('\n');

      // Descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `deliverys_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${deliveryData.length} deliveries exportados`);
    } catch (error: any) {
      console.error('Error exporting deliveries:', error);
      toast.error(error.message || 'Error exportando deliveries');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(numValue);
  };

  const totalAmount = deliveryData.reduce((sum, row) => {
    const amount = typeof row.monto_delivery === 'string' ? parseInt(row.monto_delivery) : row.monto_delivery;
    return sum + amount;
  }, 0);

  const averageAmount = deliveryData.length > 0 ? totalAmount / deliveryData.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Download className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Exportaciones</h1>
      </div>

      {/* Export Delivery */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Deliverys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
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
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
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
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={loadDeliveries}
              disabled={loading}
              variant="secondary"
              className="flex-1 md:flex-none"
            >
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Cargando...' : 'Cargar Deliveries'}
            </Button>

            {deliveryData.length > 0 && (
              <Button
                onClick={exportDeliveryCSV}
                disabled={exporting}
                className="flex-1 md:flex-none"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Primero carga los deliveries para visualizarlos en una tabla, luego puedes exportar a CSV.
          </p>
        </CardContent>
      </Card>

      {/* Estadísticas Resumidas */}
      {deliveryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-2xl font-bold">{deliveryData.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cobrado</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Promedio</p>
                <p className="text-2xl font-bold">{formatCurrency(averageAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rango</p>
                <p className="text-sm font-medium">
                  {format(startDate, 'dd MMM', { locale: es })} - {format(endDate, 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla con Paginación */}
      {deliveryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Datos de Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportTable
              data={deliveryData}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
