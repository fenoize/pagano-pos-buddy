import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, Clock, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useMyShifts } from '@/hooks/useMyShifts';
import { ShiftResponseModal } from '@/components/rrhh/ShiftResponseModal';
import { HREmployeeResponse } from '@/types/hr';

const responseStyles: Record<HREmployeeResponse | 'null', { bg: string; text: string; icon: any; label: string }> = {
  pending: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', icon: Clock, label: 'Pendiente' },
  accepted: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', icon: CheckCircle, label: 'Aceptado' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', icon: XCircle, label: 'Rechazado' },
  null: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', icon: Clock, label: 'Pendiente' },
};

export default function MiCalendario() {
  const {
    shifts,
    loading,
    employeeId,
    employeeName,
    currentDate,
    selectedShifts,
    pendingCount,
    acceptedCount,
    rejectedCount,
    acceptShift,
    rejectShift,
    bulkAccept,
    bulkReject,
    toggleSelect,
    selectAllPending,
    clearSelection,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  } = useMyShifts();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState<'single' | 'bulk'>('single');
  const [singleRejectShiftId, setSingleRejectShiftId] = useState<string | null>(null);

  // Generate days for calendar
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const map: Record<string, typeof shifts> = {};
    shifts.forEach(shift => {
      if (!map[shift.shift_date]) map[shift.shift_date] = [];
      map[shift.shift_date].push(shift);
    });
    return map;
  }, [shifts]);

  // Build weeks for rendering
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const dayNames = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

  const handleRejectClick = (shiftId: string) => {
    setSingleRejectShiftId(shiftId);
    setRejectMode('single');
    setRejectModalOpen(true);
  };

  const handleBulkRejectClick = () => {
    setRejectMode('bulk');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async (note?: string) => {
    if (rejectMode === 'single' && singleRejectShiftId) {
      await rejectShift(singleRejectShiftId, note);
    } else {
      await bulkReject(note);
    }
    setRejectModalOpen(false);
    setSingleRejectShiftId(null);
  };

  // If no employee linked
  if (!loading && !employeeId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mi Calendario</h1>
            <p className="text-muted-foreground">Tus turnos asignados</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin turnos asignados</h3>
            <p className="text-muted-foreground">
              Tu cuenta no está vinculada a un perfil de empleado en RRHH.
              <br />
              Contacta a un administrador para que te vincule.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mi Calendario</h1>
            <p className="text-muted-foreground">{employeeName}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {pendingCount} pendientes
          </Badge>
          <Badge variant="outline" className="gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            {acceptedCount} aceptados
          </Badge>
          <Badge variant="outline" className="gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            {rejectedCount} rechazados
          </Badge>
        </div>
      </div>

      {/* Navigation + Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold ml-2 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {pendingCount > 0 && (
            <Button variant="outline" size="sm" onClick={selectAllPending}>
              Seleccionar pendientes
            </Button>
          )}
          {selectedShifts.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpiar ({selectedShifts.size})
              </Button>
              <Button size="sm" onClick={bulkAccept} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-1" />
                Aceptar
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkRejectClick}>
                <XCircle className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            {/* Day names header */}
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {dayNames.map((day, idx) => (
                <div
                  key={day}
                  className={cn(
                    "py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide",
                    idx >= 5 && "text-red-500"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar weeks */}
            <div className="divide-y">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 divide-x">
                  {week.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayShifts = shiftsByDate[dateKey] || [];
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isCurrentDay = isToday(day);

                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          "min-h-[120px] p-1 relative",
                          !isCurrentMonth && "bg-muted/20"
                        )}
                      >
                        {/* Day number */}
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                              isCurrentDay && "bg-primary text-primary-foreground",
                              !isCurrentMonth && "text-muted-foreground/50"
                            )}
                          >
                            {format(day, 'd')}
                          </span>
                        </div>

                        {/* Shifts for this day */}
                        <div className="space-y-1 overflow-y-auto max-h-[calc(100%-28px)]">
                          {dayShifts.map((shift) => {
                            const response = shift.employee_response || 'null';
                            const style = responseStyles[response as keyof typeof responseStyles] || responseStyles.null;
                            const Icon = style.icon;
                            const isPending = response === 'pending' || response === 'null';
                            const isSelected = selectedShifts.has(shift.id);

                            return (
                              <div
                                key={shift.id}
                                className={cn(
                                  "rounded px-1.5 py-1 text-xs transition-all",
                                  style.bg,
                                  isSelected && "ring-2 ring-primary"
                                )}
                              >
                                <div className="flex items-start gap-1">
                                  {isPending && (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleSelect(shift.id)}
                                      className="h-3 w-3 mt-0.5"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <Icon className={cn("h-3 w-3 flex-shrink-0", style.text)} />
                                      <span className="truncate font-medium">
                                        {shift.schedule?.name || 'Sin jornada'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      {shift.role?.name} • {shift.schedule?.start_time?.substring(0, 5)} - {shift.schedule?.end_time?.substring(0, 5)}
                                    </div>
                                    {shift.coworkers.length > 0 && (
                                      <div className="flex items-center gap-0.5 mt-0.5">
                                        <Users className="h-2.5 w-2.5 text-muted-foreground" />
                                        <span className="text-[9px] text-muted-foreground truncate">
                                          {shift.coworkers.slice(0, 2).map(c => c.full_name.split(' ')[0]).join(', ')}
                                          {shift.coworkers.length > 2 && ` +${shift.coworkers.length - 2}`}
                                        </span>
                                      </div>
                                    )}
                                    {/* Actions for pending */}
                                    {isPending && !isSelected && (
                                      <div className="flex gap-1 mt-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 px-1.5 text-[10px] text-green-600 hover:text-green-700 hover:bg-green-100"
                                          onClick={() => acceptShift(shift.id)}
                                        >
                                          <CheckCircle className="h-3 w-3 mr-0.5" />
                                          Aceptar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 px-1.5 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-100"
                                          onClick={() => handleRejectClick(shift.id)}
                                        >
                                          <XCircle className="h-3 w-3 mr-0.5" />
                                          Rechazar
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <ShiftResponseModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        mode="reject"
        count={rejectMode === 'bulk' ? selectedShifts.size : 1}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}
