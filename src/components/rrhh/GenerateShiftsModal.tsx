import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarClock, Users, Loader2 } from 'lucide-react';
import { format, addDays, eachDayOfInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { HRSchedule, HRShiftFormData } from '@/types/hr';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface SchedulePreview {
  schedule: HRSchedule;
  shifts: {
    date: Date;
    dateStr: string;
    dayName: string;
    positions: HRSchedule['positions'];
  }[];
}

interface GenerateShiftsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedules: HRSchedule[];
  onGenerate: (shifts: Omit<HRShiftFormData, 'notes'>[]) => Promise<void>;
}

export function GenerateShiftsModal({
  open,
  onOpenChange,
  schedules,
  onGenerate
}: GenerateShiftsModalProps) {
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [generating, setGenerating] = useState(false);

  const activeSchedules = useMemo(() => schedules.filter(s => s.is_active), [schedules]);

  useEffect(() => {
    if (open) {
      // Pre-select all active schedules
      setSelectedScheduleIds(activeSchedules.map(s => s.id));
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
    }
  }, [open, activeSchedules]);

  const toggleSchedule = (scheduleId: string) => {
    setSelectedScheduleIds(prev =>
      prev.includes(scheduleId)
        ? prev.filter(id => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const selectAll = () => {
    setSelectedScheduleIds(activeSchedules.map(s => s.id));
  };

  const deselectAll = () => {
    setSelectedScheduleIds([]);
  };

  // Generate preview for all selected schedules
  const preview = useMemo<SchedulePreview[]>(() => {
    if (selectedScheduleIds.length === 0 || !startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) return [];

    const days = eachDayOfInterval({ start, end });
    const result: SchedulePreview[] = [];

    for (const scheduleId of selectedScheduleIds) {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) continue;

      const shifts: SchedulePreview['shifts'] = [];

      for (const day of days) {
        const jsDay = getDay(day);
        const ourDay = jsDay === 0 ? 7 : jsDay;

        if (schedule.days_of_week.includes(ourDay)) {
          shifts.push({
            date: day,
            dateStr: format(day, 'yyyy-MM-dd'),
            dayName: DAY_NAMES[jsDay],
            positions: schedule.positions || []
          });
        }
      }

      if (shifts.length > 0) {
        result.push({ schedule, shifts });
      }
    }

    return result;
  }, [selectedScheduleIds, schedules, startDate, endDate]);

  const totalShifts = preview.reduce(
    (sum, group) => sum + group.shifts.reduce((s, day) => s + (day.positions?.length || 0), 0),
    0
  );

  const handleGenerate = async () => {
    if (totalShifts === 0) return;

    setGenerating(true);
    try {
      const shiftsToCreate: Omit<HRShiftFormData, 'notes'>[] = [];

      for (const group of preview) {
        for (const day of group.shifts) {
          for (const position of day.positions || []) {
            shiftsToCreate.push({
              employee_id: null,
              shift_date: day.dateStr,
              shift_type_id: position.shift_type_id,
              role_id: position.role_id,
              schedule_id: group.schedule.id,
            });
          }
        }
      }

      await onGenerate(shiftsToCreate);
      onOpenChange(false);
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (time: string) => time.substring(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Generar Turnos desde Horario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          {/* Schedule multi-select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Horarios / Jornadas</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="h-7 text-xs"
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="h-7 text-xs"
                >
                  Ninguna
                </Button>
              </div>
            </div>

            {activeSchedules.length === 0 ? (
              <p className="text-sm text-destructive">
                No hay horarios activos. Crea uno en Configuración → Horarios.
              </p>
            ) : (
              <ScrollArea className="h-[180px] rounded-md border">
                <div className="p-2 space-y-2">
                  {activeSchedules.map(schedule => {
                    const isSelected = selectedScheduleIds.includes(schedule.id);
                    return (
                      <div
                        key={schedule.id}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/50 border-transparent hover:border-muted-foreground/20'
                        }`}
                        onClick={() => toggleSchedule(schedule.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSchedule(schedule.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{schedule.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-0.5">
                                {DAY_LETTERS.map((day, idx) => (
                                  <span
                                    key={day}
                                    className={`w-5 h-5 flex items-center justify-center text-[10px] rounded ${
                                      schedule.days_of_week.includes(idx + 1)
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground/50'
                                    }`}
                                  >
                                    {day}
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {schedule.positions?.length || 0} pos/día
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          {/* Preview summary */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Vista previa ({totalShifts} turnos)</Label>
              <ScrollArea className="h-[120px] rounded-md border p-3">
                <div className="space-y-3">
                  {preview.map((group) => {
                    const groupShifts = group.shifts.reduce(
                      (sum, day) => sum + (day.positions?.length || 0),
                      0
                    );
                    return (
                      <div key={group.schedule.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {group.schedule.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {groupShifts} turnos
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground pl-2">
                          {group.shifts.map(day => day.dayName).join(', ')} •{' '}
                          {formatTime(group.schedule.start_time)} - {formatTime(group.schedule.end_time)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {preview.length === 0 && selectedScheduleIds.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay días que coincidan con los horarios seleccionados en el rango.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={totalShifts === 0 || generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              `Generar ${totalShifts} turno(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
