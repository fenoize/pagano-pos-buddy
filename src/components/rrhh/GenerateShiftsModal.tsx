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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CalendarClock, Users, Loader2 } from 'lucide-react';
import { format, addDays, eachDayOfInterval, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { HRSchedule, HRShiftFormData } from '@/types/hr';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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
  const [scheduleId, setScheduleId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [generating, setGenerating] = useState(false);

  const activeSchedules = schedules.filter(s => s.is_active);

  useEffect(() => {
    if (open) {
      setScheduleId(activeSchedules[0]?.id || '');
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
    }
  }, [open, activeSchedules]);

  const selectedSchedule = schedules.find(s => s.id === scheduleId);

  // Generate preview of shifts
  const preview = useMemo(() => {
    if (!selectedSchedule || !startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return [];

    const days = eachDayOfInterval({ start, end });
    const shifts: { date: Date; dateStr: string; dayName: string; positions: typeof selectedSchedule.positions }[] = [];

    for (const day of days) {
      // getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
      // We need to convert to 1=Mon, ..., 7=Sun
      const jsDay = getDay(day);
      const ourDay = jsDay === 0 ? 7 : jsDay;

      if (selectedSchedule.days_of_week.includes(ourDay)) {
        shifts.push({
          date: day,
          dateStr: format(day, 'yyyy-MM-dd'),
          dayName: DAY_NAMES[jsDay],
          positions: selectedSchedule.positions || []
        });
      }
    }

    return shifts;
  }, [selectedSchedule, startDate, endDate]);

  const totalShifts = preview.reduce((sum, day) => sum + (day.positions?.length || 0), 0);

  const handleGenerate = async () => {
    if (!selectedSchedule || totalShifts === 0) return;

    setGenerating(true);
    try {
      const shiftsToCreate: Omit<HRShiftFormData, 'notes'>[] = [];

      for (const day of preview) {
        for (const position of day.positions || []) {
          shiftsToCreate.push({
            employee_id: '', // Sin asignar
            shift_date: day.dateStr,
            shift_type_id: position.shift_type_id,
            role_id: position.role_id,
          });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Generar Turnos desde Horario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Schedule selector */}
          <div className="space-y-2">
            <Label>Horario / Plantilla</Label>
            <Select value={scheduleId} onValueChange={setScheduleId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar horario" />
              </SelectTrigger>
              <SelectContent>
                {activeSchedules.map(schedule => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.name} ({formatTime(schedule.start_time)} - {formatTime(schedule.end_time)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeSchedules.length === 0 && (
              <p className="text-sm text-destructive">
                No hay horarios activos. Crea uno en Configuración → Horarios.
              </p>
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

          {/* Schedule info */}
          {selectedSchedule && (
            <div className="p-3 bg-muted rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedSchedule.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}
                </span>
              </div>
              <div className="flex gap-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                  <Badge
                    key={day}
                    variant={selectedSchedule.days_of_week.includes(idx + 1) ? 'default' : 'outline'}
                    className={`w-6 h-6 p-0 flex items-center justify-center text-xs ${
                      !selectedSchedule.days_of_week.includes(idx + 1) ? 'opacity-30' : ''
                    }`}
                  >
                    {day}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                <Users className="h-3 w-3 inline mr-1" />
                {selectedSchedule.positions?.length || 0} posición(es) por día
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Vista previa ({totalShifts} turnos)</Label>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-3">
                  {preview.map((day) => (
                    <div key={day.dateStr} className="space-y-1">
                      <div className="font-medium text-sm">
                        {day.dayName} {format(day.date, "d 'de' MMMM", { locale: es })}
                      </div>
                      <div className="pl-3 space-y-1">
                        {day.positions?.map((pos, idx) => (
                          <div key={`${day.dateStr}-${pos.id}-${idx}`} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-4 text-center">{idx + 1}.</span>
                            <Badge variant="outline" className="text-xs">
                              {pos.role?.name}
                            </Badge>
                            <span className="text-xs">({pos.shift_type?.name})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {preview.length === 0 && selectedSchedule && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay días que coincidan con el horario en el rango seleccionado.
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
