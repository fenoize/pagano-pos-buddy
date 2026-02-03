import { useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HRShift, HREmployee, HRShiftType, HRShiftRole, HRSchedule } from '@/types/hr';
import { Plus } from 'lucide-react';
import { getRoleIcon, getRoleColorClass } from '@/lib/roleIcons';
import { ShiftDetailModal } from './ShiftDetailModal';
import { getShiftColors } from '@/lib/shiftColors';

interface ShiftCalendarProps {
  shifts: HRShift[];
  currentDate: Date;
  viewMode: 'week' | 'month';
  employees: HREmployee[];
  shiftTypes: HRShiftType[];
  roles: HRShiftRole[];
  schedules: HRSchedule[];
  onAddShift: (date: string) => void;
  onUpdateShift: (id: string, data: any) => Promise<void>;
  onConfirmShift: (id: string) => Promise<void>;
  onApproveShift: (id: string) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
}

const NO_SCHEDULE_KEY = '__no_schedule__';

export function ShiftCalendar({
  shifts,
  currentDate,
  viewMode,
  employees,
  shiftTypes,
  roles,
  schedules,
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

  // Group shifts by date and then by schedule (jornada)
  const shiftsByDateAndSchedule = useMemo(() => {
    const map: Record<string, Record<string, HRShift[]>> = {};
    
    shifts.forEach(shift => {
      const dateKey = shift.shift_date;
      const scheduleKey = shift.schedule_id || NO_SCHEDULE_KEY;
      
      if (!map[dateKey]) map[dateKey] = {};
      if (!map[dateKey][scheduleKey]) map[dateKey][scheduleKey] = [];
      map[dateKey][scheduleKey].push(shift);
    });
    
    // Sort shifts within each schedule by role name then employee name
    Object.keys(map).forEach(dateKey => {
      Object.keys(map[dateKey]).forEach(scheduleKey => {
        map[dateKey][scheduleKey].sort((a, b) => {
          const roleCompare = (a.role?.name || '').localeCompare(b.role?.name || '');
          if (roleCompare !== 0) return roleCompare;
          return (a.employee?.full_name || 'ZZZ').localeCompare(b.employee?.full_name || 'ZZZ');
        });
      });
    });
    
    return map;
  }, [shifts]);

  // Get ordered schedules for consistent display (sorted by start_time)
  const orderedSchedules = useMemo(() => {
    return [...schedules]
      .filter(s => s.is_active)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [schedules]);

  // Build a map of schedule_id -> schedule for quick lookup
  const scheduleMap = useMemo(() => {
    const map: Record<string, HRSchedule> = {};
    schedules.forEach(s => { map[s.id] = s; });
    return map;
  }, [schedules]);

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

  const formatTime = (time: string) => time?.substring(0, 5) || '';

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
                const dayShiftsBySchedule = shiftsByDateAndSchedule[dateKey] || {};
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

                    {/* Shifts grouped by schedule (jornada) */}
                    <div className="space-y-1.5 overflow-y-auto max-h-[calc(100%-28px)]">
                      {/* First show ordered schedules */}
                      {orderedSchedules.map((schedule) => {
                        const scheduleShifts = dayShiftsBySchedule[schedule.id] || [];
                        if (scheduleShifts.length === 0) return null;
                        
                        return (
                          <div key={schedule.id} className="space-y-0.5">
                            {/* Schedule/Jornada header */}
                            <div className="flex items-center gap-1 px-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-primary truncate">
                                {schedule.name}
                              </span>
                              <span className="text-[8px] text-muted-foreground">
                                ({formatTime(schedule.start_time)}-{formatTime(schedule.end_time)})
                              </span>
                              <div className="flex-1 h-px bg-primary/30" />
                            </div>
                            
                            {/* Shifts for this schedule */}
                            {scheduleShifts.map((shift) => {
                              const RoleIcon = getRoleIcon(shift.role?.name || '');
                              const roleColorClass = getRoleColorClass(shift.role?.name || '');
                              const shiftColors = getShiftColors(shift);
                              
                              return (
                                <button
                                  key={shift.id}
                                  onClick={() => handleShiftClick(shift)}
                                  className={cn(
                                    "w-full text-left rounded px-1.5 py-0.5 text-xs transition-all",
                                    "border-l-2 cursor-pointer hover:shadow-sm hover:scale-[1.02]",
                                    shiftColors.border,
                                    shiftColors.bg
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

                      {/* Show shifts without schedule at the end */}
                      {dayShiftsBySchedule[NO_SCHEDULE_KEY] && dayShiftsBySchedule[NO_SCHEDULE_KEY].length > 0 && (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 px-1">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                              Sin jornada
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          
                          {dayShiftsBySchedule[NO_SCHEDULE_KEY].map((shift) => {
                            const RoleIcon = getRoleIcon(shift.role?.name || '');
                            const roleColorClass = getRoleColorClass(shift.role?.name || '');
                            const shiftColors = getShiftColors(shift);
                            
                            return (
                              <button
                                key={shift.id}
                                onClick={() => handleShiftClick(shift)}
                                className={cn(
                                  "w-full text-left rounded px-1.5 py-0.5 text-xs transition-all",
                                  "border-l-2 cursor-pointer hover:shadow-sm hover:scale-[1.02]",
                                  shiftColors.border,
                                  shiftColors.bg
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
                      )}
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
        schedules={schedules}
        onUpdate={onUpdateShift}
        onDelete={onDeleteShift}
        onConfirm={onConfirmShift}
        onApprove={onApproveShift}
      />
    </>
  );
}
