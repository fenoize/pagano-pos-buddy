import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DeliveryExportRow } from '@/types/finance';

export default function FinanceExport() {
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportDeliveryCSV = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc('delivery_export_range', {
        _start: format(startDate, 'yyyy-MM-dd'),
        _end: format(endDate, 'yyyy-MM-dd'),
        _tz: 'America/Santiago'
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('No hay deliveries en el período seleccionado');
        return;
      }

      // Generar CSV
      const rows = data as DeliveryExportRow[];
      const headers = ['Fecha y Hora', 'Número Orden', 'Dirección', 'Monto Delivery'];
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
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

      toast.success(`${rows.length} deliveries exportados`);
    } catch (error: any) {
      console.error('Error exporting deliveries:', error);
      toast.error(error.message || 'Error exportando deliveries');
    } finally {
      setExporting(false);
    }
  };

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

          <Button
            onClick={exportDeliveryCSV}
            disabled={exporting}
            className="w-full md:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exportando...' : 'Exportar CSV de Deliverys'}
          </Button>

          <p className="text-sm text-muted-foreground">
            El archivo incluirá: Fecha y hora, Número de orden, Dirección completa y Monto del delivery.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
