import { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HRShift, HRShiftStatus, HREmployee, HRShiftType, HRShiftRole } from '@/types/hr';
import { Plus } from 'lucide-react';
import { getRoleIcon, getRoleColorClass } from '@/lib/roleIcons';
import { ShiftDetailModal } from './ShiftDetailModal';

interface ShiftCalendarProps {
  shifts: HRShift[];
  currentDate: Date;
  viewMode: 'week' | 'month';
  employees: HREmployee[];
  shiftTypes: HRShiftType[];
  roles: HRShiftRole[];
  onAddShift: (date: string) => void;
  onUpdateShift: (id: string, data: any) => Promise<void>;
  onConfirmShift: (id: string) => Promise<void>;
  onApproveShift: (id: string) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
}

const statusColors: Record<HRShiftStatus, string> = {
  draft: 'border-l-gray-400',
  confirmed: 'border-l-blue-500',
  approved: 'border-l-green-500',
  paid: 'border-l-purple-500',
};

const statusBg: Record<HRShiftStatus, string> = {
  draft: 'bg-muted/60',
  confirmed: 'bg-blue-50 dark:bg-blue-950/30',
  approved: 'bg-green-50 dark:bg-green-950/30',
  paid: 'bg-purple-50 dark:bg-purple-950/30',
};

export function ShiftCalendar({
  shifts,
  currentDate,
  viewMode,
  employees,
  shiftTypes,
  roles,
  onAddShift,
  onUpdateShift,
  onConfirmShift,
  onApproveShift,
  onDeleteShift,
}: ShiftCalendarProps) {
  const [selectedShift, setSelectedShift] = useState<HRShift | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Generate days based on view mode
  const days = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  }, [currentDate, viewMode]);

  // Group shifts by date and then by shift type
  const shiftsByDateAndType = useMemo(() => {
    const map: Record<string, Record<string, HRShift[]>> = {};
    
    shifts.forEach(shift => {
      const dateKey = shift.shift_date;
      const typeId = shift.shift_type_id || 'unknown';
      
      if (!map[dateKey]) map[dateKey] = {};
      if (!map[dateKey][typeId]) map[dateKey][typeId] = [];
      map[dateKey][typeId].push(shift);
    });
    
    // Sort shifts within each type by role name then employee name
    Object.keys(map).forEach(dateKey => {
      Object.keys(map[dateKey]).forEach(typeId => {
        map[dateKey][typeId].sort((a, b) => {
          const roleCompare = (a.role?.name || '').localeCompare(b.role?.name || '');
          if (roleCompare !== 0) return roleCompare;
          return (a.employee?.full_name || 'ZZZ').localeCompare(b.employee?.full_name || 'ZZZ');
        });
      });
    });
    
    return map;
  }, [shifts]);

  // Get ordered shift types for consistent display
  const orderedShiftTypes = useMemo(() => {
    return shiftTypes.filter(st => st.is_active).sort((a, b) => a.name.localeCompare(b.name));
  }, [shiftTypes]);

  const handleShiftClick = (shift: HRShift) => {
    setSelectedShift(shift);
    setModalOpen(true);
  };

  const dayNames = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  return (
    <>
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header with day names */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {dayNames.map((day, idx) => (
            <div
              key={day}
              className={cn(
                "py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide",
                idx === 6 && "text-red-500"
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
                const dayShiftsByType = shiftsByDateAndType[dateKey] || {};
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

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
                          "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
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
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onAddShift(dateKey)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Shifts grouped by type */}
                    <div className="space-y-1 overflow-y-auto max-h-[calc(100%-28px)]">
                      {orderedShiftTypes.map((shiftType) => {
                        const typeShifts = dayShiftsByType[shiftType.id] || [];
                        if (typeShifts.length === 0) return null;
                        
                        return (
                          <div key={shiftType.id} className="space-y-0.5">
                            {/* Shift type header */}
                            <div className="flex items-center gap-1 px-1">
                              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                                {shiftType.name}
                              </span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                            
                            {/* Shifts for this type */}
                            {typeShifts.map((shift) => {
                              const RoleIcon = getRoleIcon(shift.role?.name || '');
                              const roleColorClass = getRoleColorClass(shift.role?.name || '');
                              
                              return (
                                <button
                                  key={shift.id}
                                  onClick={() => handleShiftClick(shift)}
                                  className={cn(
                                    "w-full text-left rounded px-1.5 py-0.5 text-xs transition-all",
                                    "border-l-2 cursor-pointer hover:shadow-sm hover:scale-[1.02]",
                                    statusColors[shift.status],
                                    statusBg[shift.status]
                                  )}
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <RoleIcon className={cn("h-3 w-3 flex-shrink-0", roleColorClass)} />
                                    <span className="truncate font-medium">
                                      {shift.employee?.full_name || 'Sin asignar'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
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

      {/* Shift Detail Modal */}
      <ShiftDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        shift={selectedShift}
        mode="view"
        employees={employees}
        shiftTypes={shiftTypes}
        roles={roles}
        onUpdate={onUpdateShift}
        onDelete={onDeleteShift}
        onConfirm={onConfirmShift}
        onApprove={onApproveShift}
      />
    </>
  );
}
