import { useMemo, useState } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { HRShift, HRShiftStatus, HREmployee, HRShiftType, HRShiftRole, HRSchedule } from '@/types/hr';
import { Check, CheckCheck, Trash2, Eye, Pencil } from 'lucide-react';
import { getRoleIcon, getRoleColorClass } from '@/lib/roleIcons';
import { ShiftDetailModal } from './ShiftDetailModal';

interface ShiftListViewProps {
  shifts: HRShift[];
  selectedIds: string[];
  employees: HREmployee[];
  shiftTypes: HRShiftType[];
  roles: HRShiftRole[];
  schedules: HRSchedule[];
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onUpdateShift: (id: string, data: any) => Promise<void>;
  onConfirmShift: (id: string) => Promise<void>;
  onApproveShift: (id: string) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
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
  employees,
  shiftTypes,
  roles,
  schedules,
  onSelect,
  onSelectAll,
  onUpdateShift,
  onConfirmShift,
  onApproveShift,
  onDeleteShift,
}: ShiftListViewProps) {
  const [selectedShift, setSelectedShift] = useState<HRShift | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

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
      shifts: map[date].sort((a, b) => {
        const roleCompare = (a.role?.name || '').localeCompare(b.role?.name || '');
        if (roleCompare !== 0) return roleCompare;
        return (a.employee?.full_name || 'ZZZ').localeCompare(b.employee?.full_name || 'ZZZ');
      }),
    }));
  }, [shifts]);

  const selectableShifts = shifts.filter(s => s.status === 'draft' || s.status === 'confirmed');
  const allSelected = selectableShifts.length > 0 &&
    selectableShifts.every(s => selectedIds.includes(s.id));

  const handleView = (shift: HRShift) => {
    setSelectedShift(shift);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleEdit = (shift: HRShift) => {
    setSelectedShift(shift);
    setModalMode('edit');
    setModalOpen(true);
  };

  return (
    <>
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
                    "text-sm font-semibold capitalize",
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
                    const canEdit = shift.status === 'draft' || shift.status === 'confirmed';
                    const isSelected = selectedIds.includes(shift.id);
                    const RoleIcon = getRoleIcon(shift.role?.name || '');
                    const roleColorClass = getRoleColorClass(shift.role?.name || '');

                    return (
                      <div
                        key={shift.id}
                        className={cn(
                          "px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        {/* Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => onSelect(shift.id, !!checked)}
                          disabled={!canSelect}
                        />

                        {/* Role Icon */}
                        <div className={cn("flex-shrink-0", roleColorClass)}>
                          <RoleIcon className="h-5 w-5" />
                        </div>

                        {/* Shift info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {shift.employee?.full_name || 'Sin asignar'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {shift.role?.name || '-'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {shift.shift_type?.name || '-'}
                            </span>
                          </div>
                          {shift.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {shift.notes}
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        <Badge variant={statusConfig[shift.status].variant} className="flex-shrink-0">
                          {statusConfig[shift.status].label}
                        </Badge>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* View */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleView(shift)}
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Edit (only draft/confirmed) */}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(shift)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Confirm (only draft) */}
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

                          {/* Approve (only confirmed) */}
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

                          {/* Delete (only draft/confirmed) */}
                          {canEdit && (
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

      {/* Shift Detail/Edit Modal */}
      <ShiftDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        shift={selectedShift}
        mode={modalMode}
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
