import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Download, Users, DollarSign, Clock, FileText } from 'lucide-react';
import { useHRShiftsSummary, ShiftSummaryItem, ShiftSummaryTotals } from '@/hooks/useHRShiftsSummary';
import { useHREmployees } from '@/hooks/useHREmployees';
import { useHRShiftConfig } from '@/hooks/useHRShiftConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { exportShiftsSummaryCSV, exportShiftsSummaryPDF } from '@/lib/hrExport';

const formatCLP = (amount: number) => {
  return new Intl.NumberFormat('es-CL', { 
    style: 'currency', 
    currency: 'CLP', 
    maximumFractionDigits: 0 
  }).format(amount);
};

export default function RRHHResumen() {
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [employeeFilter, setEmployeeFilter] = useState<string>('__all__');
  const [shiftTypeFilter, setShiftTypeFilter] = useState<string>('__all__');

  const { employees } = useHREmployees();
  const { shiftTypes } = useHRShiftConfig();

  const { items, totals, loading } = useHRShiftsSummary({
    dateFrom: format(dateFrom, 'yyyy-MM-dd'),
    dateTo: format(dateTo, 'yyyy-MM-dd'),
    employeeId: employeeFilter !== '__all__' ? employeeFilter : undefined,
    shiftTypeId: shiftTypeFilter !== '__all__' ? shiftTypeFilter : undefined,
  });

  const dateRange = useMemo(() => ({
    from: format(dateFrom, 'dd/MM/yyyy', { locale: es }),
    to: format(dateTo, 'dd/MM/yyyy', { locale: es }),
  }), [dateFrom, dateTo]);

  const handleExportCSV = () => {
    exportShiftsSummaryCSV(items, totals, dateRange);
  };

  const handleExportPDF = () => {
    exportShiftsSummaryPDF(items, totals, dateRange);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resumen de Turnos y Pagos</h1>
          <p className="text-muted-foreground">Vista consolidada del período</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={items.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={items.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Date From */}
            <div className="space-y-2">
              <Label>Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {employees
                    .filter(e => e.is_active)
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shift Type Filter */}
            <div className="space-y-2">
              <Label>Tipo de Turno</Label>
              <Select value={shiftTypeFilter} onValueChange={setShiftTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {shiftTypes
                    .filter(st => st.is_active)
                    .map(st => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Turnos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total_shifts}</div>
            <p className="text-xs text-muted-foreground">
              {totals.total_pending} pendientes, {totals.total_approved} aprobados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total_employees}</div>
            <p className="text-xs text-muted-foreground">
              con turnos en el período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar (Est.)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCLP(totals.total_estimated_pay)}</div>
            <p className="text-xs text-muted-foreground">
              basado en reglas de pago activas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Empleado</CardTitle>
          <CardDescription>
            Período: {dateRange.from} - {dateRange.to}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay turnos en el período seleccionado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-center">Turnos</TableHead>
                  <TableHead className="text-center">Pendientes</TableHead>
                  <TableHead className="text-center">Aprobados</TableHead>
                  <TableHead className="text-right">Monto Estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.employee_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.employee_name}</div>
                        {item.employee_rut && (
                          <div className="text-xs text-muted-foreground">{item.employee_rut}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.total_shifts}</TableCell>
                    <TableCell className="text-center">
                      <span className={item.pending_shifts > 0 ? 'text-amber-600 font-medium' : ''}>
                        {item.pending_shifts}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={item.approved_shifts > 0 ? 'text-green-600 font-medium' : ''}>
                        {item.approved_shifts}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCLP(item.estimated_pay)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="text-center font-bold">{totals.total_shifts}</TableCell>
                  <TableCell className="text-center font-bold">{totals.total_pending}</TableCell>
                  <TableCell className="text-center font-bold">{totals.total_approved}</TableCell>
                  <TableCell className="text-right font-bold">{formatCLP(totals.total_estimated_pay)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center">
        * El monto estimado se calcula en base a las reglas de pago activas. Los ajustes (bonos, adelantos, descuentos) se aplican en las liquidaciones.
      </p>
    </div>
  );
}
