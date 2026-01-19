import { useMemo } from 'react';
import { format, parseISO, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { HRShift, HRShiftStatus } from '@/types/hr';
import { Check, CheckCheck, Trash2 } from 'lucide-react';

interface ShiftListViewProps {
  shifts: HRShift[];
  selectedIds: string[];
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onConfirmShift: (id: string) => void;
  onApproveShift: (id: string) => void;
  onDeleteShift: (id: string) => void;
}

const statusConfig: Record<HRShiftStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  approved: { label: 'Aprobado', variant: 'default' },
  paid: { label: 'Pagado', variant: 'destructive' },
};

export function ShiftListView({
  shifts,
  selectedIds,
  onSelect,
  onSelectAll,
  onConfirmShift,
  onApproveShift,
  onDeleteShift,
}: ShiftListViewProps) {
  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const map: Record<string, HRShift[]> = {};
    shifts.forEach(shift => {
      const dateKey = shift.shift_date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(shift);
    });
    // Sort dates descending
    const sortedDates = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return sortedDates.map(date => ({
      date,
      shifts: map[date].sort((a, b) => 
        (a.shift_type?.name || '').localeCompare(b.shift_type?.name || '')
      ),
    }));
  }, [shifts]);

  const selectableShifts = shifts.filter(s => s.status === 'draft' || s.status === 'confirmed');
  const allSelected = selectableShifts.length > 0 && 
    selectableShifts.every(s => selectedIds.includes(s.id));

  return (
    <div className="space-y-4">
      {/* Select all header */}
      {selectableShifts.length > 0 && (
        <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
          />
          <span>Seleccionar todo</span>
        </div>
      )}

      {shiftsByDate.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay turnos en el rango seleccionado
        </div>
      ) : (
        shiftsByDate.map(({ date, shifts: dayShifts }) => {
          const parsedDate = parseISO(date);
          const isTodayDate = isToday(parsedDate);

          return (
            <div key={date} className="border rounded-lg overflow-hidden bg-card">
              {/* Date header */}
              <div className={cn(
                "px-4 py-2 border-b bg-muted/30 flex items-center gap-2",
                isTodayDate && "bg-primary/10"
              )}>
                <span className={cn(
                  "text-sm font-semibold",
                  isTodayDate && "text-primary"
                )}>
                  {format(parsedDate, "EEEE d 'de' MMMM", { locale: es })}
                </span>
                {isTodayDate && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">Hoy</Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {dayShifts.length} turno{dayShifts.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Shifts for this day */}
              <div className="divide-y">
                {dayShifts.map(shift => {
                  const canSelect = shift.status === 'draft' || shift.status === 'confirmed';
                  const isSelected = selectedIds.includes(shift.id);

                  return (
                    <div
                      key={shift.id}
                      className={cn(
                        "px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelect(shift.id, !!checked)}
                        disabled={!canSelect}
                      />

                      {/* Shift info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{shift.employee?.full_name || 'Sin asignar'}</span>
                          <Badge variant="outline" className="text-xs">
                            {shift.shift_type?.name || '-'}
                          </Badge>
                          {shift.role?.name && (
                            <span className="text-xs text-muted-foreground">
                              {shift.role.name}
                            </span>
                          )}
                        </div>
                        {shift.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {shift.notes}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <Badge variant={statusConfig[shift.status].variant}>
                        {statusConfig[shift.status].label}
                      </Badge>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {shift.status === 'draft' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onConfirmShift(shift.id)}
                            title="Confirmar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {shift.status === 'confirmed' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => onApproveShift(shift.id)}
                            title="Aprobar"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {(shift.status === 'draft' || shift.status === 'confirmed') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDeleteShift(shift.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
