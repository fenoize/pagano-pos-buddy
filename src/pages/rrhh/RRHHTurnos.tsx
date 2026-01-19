import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, CalendarDays, List, Plus, Check, CheckCheck, ChevronLeft, ChevronRight, Loader2, Filter, CalendarClock } from 'lucide-react';
import { useHRShifts } from '@/hooks/useHRShifts';
import { useHREmployees } from '@/hooks/useHREmployees';
import { useHRShiftConfig } from '@/hooks/useHRShiftConfig';
import { useHRSchedules } from '@/hooks/useHRSchedules';
import { HRShiftFormData, HRShiftStatus } from '@/types/hr';
import { format, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ShiftCalendar } from '@/components/rrhh/ShiftCalendar';
import { ShiftListView } from '@/components/rrhh/ShiftListView';
import { GenerateShiftsModal } from '@/components/rrhh/GenerateShiftsModal';

type ViewType = 'calendar' | 'list';
type PeriodType = 'week' | 'month';

function RRHHTurnos() {
  const [viewType, setViewType] = useState<ViewType>('calendar');
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    if (periodType === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
  }, [currentDate, periodType]);

  const { 
    shifts, loading, filters, setFilters, 
    createShift, updateShift, confirmShift, approveShift, deleteShift,
    bulkConfirm, bulkApprove, bulkCreateShifts,
  } = useHRShifts({
    dateFrom: format(dateRange.start, 'yyyy-MM-dd'),
    dateTo: format(dateRange.end, 'yyyy-MM-dd'),
  });

  const { employees, activeEmployees } = useHREmployees();
  const { roles, shiftTypes, activeRoles, activeShiftTypes } = useHRShiftConfig();
  const { schedules } = useHRSchedules();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState<HRShiftFormData>({
    employee_id: '',
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    shift_type_id: '',
    role_id: '',
    notes: '',
  });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    if (periodType === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => subMonths(prev, 1));
    }
  };

  const goToNext = () => {
    if (periodType === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  };

  // Get period label
  const periodLabel = useMemo(() => {
    if (periodType === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
    } else {
      return format(currentDate, "MMMM 'de' yyyy", { locale: es });
    }
  }, [currentDate, periodType]);

  const handleOpenModal = (date?: string) => {
    setShiftForm({
      employee_id: '',
      shift_date: date || format(new Date(), 'yyyy-MM-dd'),
      shift_type_id: activeShiftTypes[0]?.id || '',
      role_id: activeRoles[0]?.id || '',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSaveShift = async () => {
    try {
      await createShift(shiftForm);
      setModalOpen(false);
    } catch (e) {}
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = shifts
        .filter(s => s.status === 'draft' || s.status === 'confirmed')
        .map(s => s.id);
      setSelectedIds(selectableIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkConfirm = async () => {
    const draftIds = selectedIds.filter(id => {
      const shift = shifts.find(s => s.id === id);
      return shift?.status === 'draft';
    });
    if (draftIds.length > 0) {
      await bulkConfirm(draftIds);
      setSelectedIds([]);
    }
  };

  const handleBulkApprove = async () => {
    const confirmedIds = selectedIds.filter(id => {
      const shift = shifts.find(s => s.id === id);
      return shift?.status === 'confirmed';
    });
    if (confirmedIds.length > 0) {
      await bulkApprove(confirmedIds);
      setSelectedIds([]);
    }
  };

  const draftSelected = selectedIds.filter(id => shifts.find(s => s.id === id)?.status === 'draft').length;
  const confirmedSelected = selectedIds.filter(id => shifts.find(s => s.id === id)?.status === 'confirmed').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Turnos</h1>
            <p className="text-muted-foreground">Registra y gestiona turnos del personal</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGenerateModalOpen(true)}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Generar desde Horario
            </Button>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Turno
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
          {/* Period label and navigation */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold capitalize min-w-[200px]">
              {periodLabel}
            </span>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* View toggles */}
          <div className="flex items-center gap-2">
            {/* Period toggle */}
            <ToggleGroup type="single" value={periodType} onValueChange={(v) => v && setPeriodType(v as PeriodType)}>
              <ToggleGroupItem value="week" aria-label="Vista semanal" className="text-xs">
                Semana
              </ToggleGroupItem>
              <ToggleGroupItem value="month" aria-label="Vista mensual" className="text-xs">
                Mes
              </ToggleGroupItem>
            </ToggleGroup>

            {/* View type toggle */}
            <ToggleGroup type="single" value={viewType} onValueChange={(v) => v && setViewType(v as ViewType)}>
              <ToggleGroupItem value="calendar" aria-label="Vista calendario">
                <CalendarDays className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Vista lista">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Empleado</Label>
                <Select 
                  value={filters.employeeId || ''} 
                  onValueChange={(val) => setFilters(f => ({ ...f, employeeId: val || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {activeEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={filters.shiftTypeId || ''} 
                  onValueChange={(val) => setFilters(f => ({ ...f, shiftTypeId: val || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {activeShiftTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rol</Label>
                <Select 
                  value={filters.roleId || ''} 
                  onValueChange={(val) => setFilters(f => ({ ...f, roleId: val || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {activeRoles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select 
                  value={filters.status || ''} 
                  onValueChange={(val) => setFilters(f => ({ ...f, status: (val as HRShiftStatus) || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">{selectedIds.length} turno(s) seleccionado(s)</span>
            <div className="flex gap-2">
              {draftSelected > 0 && (
                <Button size="sm" variant="secondary" onClick={handleBulkConfirm}>
                  <Check className="h-4 w-4 mr-1" />
                  Confirmar ({draftSelected})
                </Button>
              )}
              {confirmedSelected > 0 && (
                <Button size="sm" onClick={handleBulkApprove}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Aprobar ({confirmedSelected})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewType === 'calendar' ? (
        <ShiftCalendar
          shifts={shifts}
          currentDate={currentDate}
          viewMode={periodType}
          employees={employees}
          shiftTypes={shiftTypes}
          roles={roles}
          onAddShift={handleOpenModal}
          onUpdateShift={updateShift}
          onConfirmShift={confirmShift}
          onApproveShift={approveShift}
          onDeleteShift={deleteShift}
        />
      ) : (
        <ShiftListView
          shifts={shifts}
          selectedIds={selectedIds}
          employees={employees}
          shiftTypes={shiftTypes}
          roles={roles}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onUpdateShift={updateShift}
          onConfirmShift={confirmShift}
          onApproveShift={approveShift}
          onDeleteShift={deleteShift}
        />
      )}

      {/* New Shift Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empleado *</Label>
              <Select 
                value={shiftForm.employee_id} 
                onValueChange={(val) => setShiftForm(f => ({ ...f, employee_id: val }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha *</Label>
              <Input 
                type="date"
                value={shiftForm.shift_date}
                onChange={(e) => setShiftForm(f => ({ ...f, shift_date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Turno *</Label>
                <Select 
                  value={shiftForm.shift_type_id} 
                  onValueChange={(val) => setShiftForm(f => ({ ...f, shift_type_id: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {activeShiftTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rol *</Label>
                <Select 
                  value={shiftForm.role_id} 
                  onValueChange={(val) => setShiftForm(f => ({ ...f, role_id: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {activeRoles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea 
                value={shiftForm.notes || ''}
                onChange={(e) => setShiftForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveShift} disabled={!shiftForm.employee_id || !shiftForm.shift_type_id || !shiftForm.role_id}>
              Crear Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate from Schedule Modal */}
      <GenerateShiftsModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        schedules={schedules}
        onGenerate={bulkCreateShifts}
      />
    </div>
  );
}

export default RRHHTurnos;
