import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { HRSchedule, HRScheduleFormData } from '@/types/hr';

const DAYS = [
  { value: 1, label: 'Lunes', short: 'L' },
  { value: 2, label: 'Martes', short: 'M' },
  { value: 3, label: 'Miércoles', short: 'X' },
  { value: 4, label: 'Jueves', short: 'J' },
  { value: 5, label: 'Viernes', short: 'V' },
  { value: 6, label: 'Sábado', short: 'S' },
  { value: 7, label: 'Domingo', short: 'D' }
];

interface ScheduleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: HRSchedule | null;
  onSave: (data: HRScheduleFormData) => Promise<void>;
}

export function ScheduleFormModal({
  open,
  onOpenChange,
  schedule,
  onSave
}: ScheduleFormModalProps) {
  const [name, setName] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const isEditing = !!schedule;

  useEffect(() => {
    if (schedule) {
      setName(schedule.name);
      setDaysOfWeek(schedule.days_of_week);
      setStartTime(schedule.start_time.substring(0, 5));
      setEndTime(schedule.end_time.substring(0, 5));
    } else {
      setName('');
      setDaysOfWeek([1, 2, 3, 4, 5]); // Default: weekdays
      setStartTime('09:00');
      setEndTime('18:00');
    }
  }, [schedule, open]);

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const selectWeekdays = () => setDaysOfWeek([1, 2, 3, 4, 5]);
  const selectWeekend = () => setDaysOfWeek([6, 7]);
  const selectAll = () => setDaysOfWeek([1, 2, 3, 4, 5, 6, 7]);

  const handleSave = async () => {
    if (!name.trim() || daysOfWeek.length === 0) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isValid = name.trim() && daysOfWeek.length > 0 && startTime && endTime;

  // Detect if crosses midnight
  const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
  const crossesMidnight = endMinutes <= startMinutes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Horario' : 'Nuevo Horario'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del horario</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Jornada AM"
            />
          </div>

          {/* Days of week */}
          <div className="space-y-2">
            <Label>Días de la semana</Label>
            <div className="flex gap-1 flex-wrap">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                    daysOfWeek.includes(day.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectWeekdays}
              >
                L-V
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectWeekend}
              >
                S-D
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
              >
                Todos
              </Button>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora término</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {crossesMidnight && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
              ⚠️ Este horario cruza la medianoche. El turno se registrará en el día de inicio.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
