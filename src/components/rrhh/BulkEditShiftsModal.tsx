import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { HREmployee, HRShiftType, HRShiftRole, HRSchedule } from '@/types/hr';

interface BulkEditShiftsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  employees: HREmployee[];
  shiftTypes: HRShiftType[];
  roles: HRShiftRole[];
  schedules: HRSchedule[];
  onApply: (changes: Record<string, any>) => Promise<void>;
}

const UNCHANGED = '__unchanged__';

export function BulkEditShiftsModal({
  open, onOpenChange, selectedCount,
  employees, shiftTypes, roles, schedules,
  onApply,
}: BulkEditShiftsModalProps) {
  const [employeeId, setEmployeeId] = useState(UNCHANGED);
  const [roleId, setRoleId] = useState(UNCHANGED);
  const [shiftTypeId, setShiftTypeId] = useState(UNCHANGED);
  const [scheduleId, setScheduleId] = useState(UNCHANGED);
  const [notes, setNotes] = useState('');
  const [replaceNotes, setReplaceNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeEmployees = employees.filter(e => e.is_active);
  const activeRoles = roles.filter(r => r.is_active);
  const activeShiftTypes = shiftTypes.filter(t => t.is_active);
  const activeSchedules = schedules.filter(s => s.is_active);

  const hasChanges = employeeId !== UNCHANGED || roleId !== UNCHANGED ||
    shiftTypeId !== UNCHANGED || scheduleId !== UNCHANGED || replaceNotes;

  const handleApply = async () => {
    const changes: Record<string, any> = {};
    if (employeeId !== UNCHANGED) changes.employee_id = employeeId || null;
    if (roleId !== UNCHANGED) changes.role_id = roleId;
    if (shiftTypeId !== UNCHANGED) changes.shift_type_id = shiftTypeId;
    if (scheduleId !== UNCHANGED) changes.schedule_id = scheduleId || null;
    if (replaceNotes) changes.notes = notes || null;

    setSaving(true);
    try {
      await onApply(changes);
      onOpenChange(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEmployeeId(UNCHANGED);
    setRoleId(UNCHANGED);
    setShiftTypeId(UNCHANGED);
    setScheduleId(UNCHANGED);
    setNotes('');
    setReplaceNotes(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edición Masiva ({selectedCount} turnos)</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Solo se modificarán los campos que cambies. Los demás se mantendrán sin cambios.
        </p>

        <div className="space-y-4">
          <div>
            <Label>Empleado</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Sin cambiar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCHANGED}>— Sin cambiar —</SelectItem>
                <SelectItem value="">Sin asignar</SelectItem>
                {activeEmployees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Rol</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger><SelectValue placeholder="Sin cambiar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCHANGED}>— Sin cambiar —</SelectItem>
                {activeRoles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de Turno</Label>
            <Select value={shiftTypeId} onValueChange={setShiftTypeId}>
              <SelectTrigger><SelectValue placeholder="Sin cambiar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCHANGED}>— Sin cambiar —</SelectItem>
                {activeShiftTypes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Jornada</Label>
            <Select value={scheduleId} onValueChange={setScheduleId}>
              <SelectTrigger><SelectValue placeholder="Sin cambiar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCHANGED}>— Sin cambiar —</SelectItem>
                <SelectItem value="">Sin jornada</SelectItem>
                {activeSchedules.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={replaceNotes}
                onChange={e => setReplaceNotes(e.target.checked)}
                className="rounded"
              />
              <Label className="mb-0">Reemplazar notas</Label>
            </div>
            {replaceNotes && (
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Nueva nota para todos los turnos seleccionados"
                rows={2}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply} disabled={!hasChanges || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
