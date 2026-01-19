import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addDays, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HRShift, HRShiftStatus } from '@/types/hr';
import { Check, CheckCheck, Trash2, Plus } from 'lucide-react';

interface ShiftCalendarProps {
  shifts: HRShift[];
  currentDate: Date;
  viewMode: 'week' | 'month';
  onAddShift: (date: string) => void;
  onConfirmShift: (id: string) => void;
  onApproveShift: (id: string) => void;
  onDeleteShift: (id: string) => void;
}

const statusColors: Record<HRShiftStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-muted-foreground/30',
  confirmed: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  paid: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
};

const employeeColors = [
  'bg-pink-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
];

function getEmployeeColor(employeeId: string): string {
  const hash = employeeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return employeeColors[hash % employeeColors.length];
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function ShiftCalendar({
  shifts,
  currentDate,
  viewMode,
  onAddShift,
  onConfirmShift,
  onApproveShift,
  onDeleteShift,
}: ShiftCalendarProps) {
  // Generate days based on view mode
  const days = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      // For month view, include days from previous/next month to fill the grid
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  }, [currentDate, viewMode]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const map: Record<string, HRShift[]> = {};
    shifts.forEach(shift => {
      const dateKey = shift.shift_date;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(shift);
    });
    // Sort shifts by type name within each day
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (a.shift_type?.name || '').localeCompare(b.shift_type?.name || ''));
    });
    return map;
  }, [shifts]);

  // Group shifts by shift_type for rendering
  const groupByType = (dayShifts: HRShift[]): Record<string, HRShift[]> => {
    const grouped: Record<string, HRShift[]> = {};
    dayShifts.forEach(shift => {
      const typeName = shift.shift_type?.name || 'Sin tipo';
      if (!grouped[typeName]) grouped[typeName] = [];
      grouped[typeName].push(shift);
    });
    return grouped;
  };

  const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header with day names */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {dayNames.map((day, idx) => (
          <div 
            key={day} 
            className={cn(
              "py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide",
              idx === 0 && "text-red-500"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="divide-y">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x">
            {week.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayShifts = shiftsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const groupedShifts = groupByType(dayShifts);

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "min-h-[120px] p-1 relative group transition-colors",
                    viewMode === 'month' && "min-h-[100px]",
                    !isCurrentMonth && "bg-muted/20",
                    "hover:bg-muted/40"
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        isCurrentDay && "bg-primary text-primary-foreground",
                        !isCurrentMonth && "text-muted-foreground/50"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {/* Add button on hover */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onAddShift(dateKey)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Shifts grouped by type */}
                  <div className="space-y-1.5 overflow-y-auto max-h-[calc(100%-28px)]">
                    {Object.entries(groupedShifts).map(([typeName, typeShifts]) => (
                      <div
                        key={typeName}
                        className={cn(
                          "rounded-md p-1.5 text-xs",
                          "bg-accent/50 border border-border/50"
                        )}
                      >
                        <div className="font-medium text-foreground mb-1 truncate">
                          {typeName}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {typeShifts.map((shift) => (
                            <Badge
                              key={shift.id}
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 cursor-default",
                                getEmployeeColor(shift.employee_id),
                                "text-white border-0"
                              )}
                              title={`${shift.employee?.full_name} - ${shift.status}`}
                            >
                              {getInitials(shift.employee?.full_name || 'NN')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
