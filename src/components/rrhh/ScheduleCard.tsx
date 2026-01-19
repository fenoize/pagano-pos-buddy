import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Plus, X, Clock, Moon } from 'lucide-react';
import type { HRSchedule, HRShiftRole, HRShiftType } from '@/types/hr';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface ScheduleCardProps {
  schedule: HRSchedule;
  roles: HRShiftRole[];
  shiftTypes: HRShiftType[];
  onEdit: (schedule: HRSchedule) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onAddPosition: (scheduleId: string) => void;
  onRemovePosition: (positionId: string) => void;
}

export function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onToggleActive,
  onAddPosition,
  onRemovePosition
}: ScheduleCardProps) {
  const formatTime = (time: string) => {
    // time comes as "HH:MM:SS", we want "HH:MM"
    return time.substring(0, 5);
  };

  const getDaysText = () => {
    const days = schedule.days_of_week.sort((a, b) => a - b);
    
    // Check for common patterns
    if (days.length === 5 && days.join(',') === '1,2,3,4,5') {
      return 'Lunes a Viernes';
    }
    if (days.length === 2 && days.join(',') === '6,7') {
      return 'Fin de semana';
    }
    if (days.length === 7) {
      return 'Todos los días';
    }
    
    return days.map(d => DAY_NAMES[d - 1]).join(', ');
  };

  return (
    <Card className={!schedule.is_active ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {schedule.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {getDaysText()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch
              checked={schedule.is_active}
              onCheckedChange={(checked) => onToggleActive(schedule.id, checked)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(schedule)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(schedule.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Days badges */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <Badge
              key={day}
              variant={schedule.days_of_week.includes(day) ? 'default' : 'outline'}
              className={`w-7 h-7 p-0 flex items-center justify-center text-xs ${
                !schedule.days_of_week.includes(day) ? 'opacity-30' : ''
              }`}
            >
              {DAY_LABELS[day - 1]}
            </Badge>
          ))}
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
          </span>
          {schedule.crosses_midnight && (
            <Badge variant="secondary" className="gap-1">
              <Moon className="h-3 w-3" />
              Nocturno
            </Badge>
          )}
        </div>

        {/* Positions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Personal requerido
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAddPosition(schedule.id)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar
            </Button>
          </div>
          
          {schedule.positions && schedule.positions.length > 0 ? (
            <div className="space-y-1">
              {schedule.positions.map((position, index) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between py-1.5 px-2 bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium">
                      {position.role?.name || 'Sin rol'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {position.shift_type?.name || 'Sin tipo'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onRemovePosition(position.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-2">
              Sin posiciones definidas
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
