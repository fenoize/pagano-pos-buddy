import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, Loader2 } from 'lucide-react';
import { HREmployee, HRShiftRole, HRShiftType, HRSchedule } from '@/types/hr';
import { eachDayOfInterval, getDay, parseISO, format } from 'date-fns';
import { toast } from 'sonner';

interface AssignmentRule {
  id: string;
  employeeId: string;
  roleId: string;
  shiftTypeId: string;
  scheduleId: string | null;
  days: number[]; // 0=Dom, 1=Lun, ..., 6=Sab
}

interface BulkAssignShiftsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: HREmployee[];
  roles: HRShiftRole[];
  shiftTypes: HRShiftType[];
  schedules: HRSchedule[];
  onBulkCreate: (shifts: { employee_id: string; shift_date: string; shift_type_id: string; role_id: string; schedule_id?: string | null }[]) => Promise<void>;
}

const DAY_LABELS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
];

let ruleCounter = 0;

function createEmptyRule(): AssignmentRule {
  return {
    id: `rule-${++ruleCounter}`,
    employeeId: '',
    roleId: '',
    shiftTypeId: '',
    scheduleId: null,
    days: [1, 2, 3, 4, 5], // L-V por defecto
  };
}

export function BulkAssignShiftsModal({
  open, onOpenChange, employees, roles, shiftTypes, schedules, onBulkCreate,
}: BulkAssignShiftsModalProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rules, setRules] = useState<AssignmentRule[]>([createEmptyRule()]);
  const [saving, setSaving] = useState(false);

  const updateRule = (id: string, patch: Partial<AssignmentRule>) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const toggleDay = (ruleId: string, day: number) => {
    setRules(prev => prev.map(r => {
      if (r.id !== ruleId) return r;
      const days = r.days.includes(day) ? r.days.filter(d => d !== day) : [...r.days, day];
      return { ...r, days };
    }));
  };

  // Calculate preview
  const preview = useMemo(() => {
    if (!dateFrom || !dateTo) return { total: 0, byEmployee: [] as { name: string; count: number }[] };

    const start = parseISO(dateFrom);
    const end = parseISO(dateTo);
    if (start > end) return { total: 0, byEmployee: [] as { name: string; count: number }[] };

    const allDays = eachDayOfInterval({ start, end });
    let total = 0;
    const byEmployee: { name: string; count: number }[] = [];

    for (const rule of rules) {
      if (!rule.employeeId || !rule.roleId || !rule.shiftTypeId || rule.days.length === 0) continue;
      const matchingDays = allDays.filter(d => rule.days.includes(getDay(d)));
      const emp = employees.find(e => e.id === rule.employeeId);
      byEmployee.push({ name: emp?.full_name || '?', count: matchingDays.length });
      total += matchingDays.length;
    }

    return { total, byEmployee };
  }, [dateFrom, dateTo, rules, employees]);

  const handleConfirm = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Selecciona un rango de fechas');
      return;
    }
    if (preview.total === 0) {
      toast.error('No hay turnos a generar. Revisa las reglas.');
      return;
    }

    const start = parseISO(dateFrom);
    const end = parseISO(dateTo);
    const allDays = eachDayOfInterval({ start, end });

    const shiftsToCreate: { employee_id: string; shift_date: string; shift_type_id: string; role_id: string; schedule_id?: string | null }[] = [];

    for (const rule of rules) {
      if (!rule.employeeId || !rule.roleId || !rule.shiftTypeId || rule.days.length === 0) continue;
      const matchingDays = allDays.filter(d => rule.days.includes(getDay(d)));
      for (const day of matchingDays) {
        shiftsToCreate.push({
          employee_id: rule.employeeId,
          shift_date: format(day, 'yyyy-MM-dd'),
          shift_type_id: rule.shiftTypeId,
          role_id: rule.roleId,
          schedule_id: rule.scheduleId,
        });
      }
    }

    setSaving(true);
    try {
      await onBulkCreate(shiftsToCreate);
      onOpenChange(false);
      // Reset
      setRules([createEmptyRule()]);
      setDateFrom('');
      setDateTo('');
    } catch (e) {
      // error handled by hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Asignación Masiva de Turnos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha inicio *</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Fecha fin *</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Reglas de asignación</Label>
            {rules.map((rule, idx) => (
              <div key={rule.id} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Regla {idx + 1}</span>
                  {rules.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRule(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Employee */}
                <div>
                  <Label className="text-xs">Empleado *</Label>
                  <Select value={rule.employeeId} onValueChange={v => updateRule(rule.id, { employeeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role + Shift Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Rol *</Label>
                    <Select value={rule.roleId} onValueChange={v => updateRule(rule.id, { roleId: v })}>
                      <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Tipo de turno *</Label>
                    <Select value={rule.shiftTypeId} onValueChange={v => updateRule(rule.id, { shiftTypeId: v })}>
                      <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        {shiftTypes.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <Label className="text-xs">Jornada</Label>
                  <Select
                    value={rule.scheduleId || '__none__'}
                    onValueChange={v => updateRule(rule.id, { scheduleId: v === '__none__' ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Sin jornada" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin jornada</SelectItem>
                      {schedules.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.start_time?.substring(0, 5)}-{s.end_time?.substring(0, 5)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Days of week */}
                <div>
                  <Label className="text-xs">Días de la semana *</Label>
                  <div className="flex gap-1.5 mt-1">
                    {DAY_LABELS.map(({ value, label }) => {
                      const active = rule.days.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleDay(rule.id, value)}
                          className={`w-8 h-8 rounded-md text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:bg-accent'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={() => setRules(prev => [...prev, createEmptyRule()])}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar regla
            </Button>
          </div>

          {/* Preview */}
          {preview.total > 0 && (
            <div className="border rounded-lg p-3 bg-primary/5">
              <p className="text-sm font-semibold mb-2">
                Vista previa: {preview.total} turno(s) a crear
              </p>
              <div className="flex flex-wrap gap-2">
                {preview.byEmployee.map((item, i) => (
                  <Badge key={i} variant="secondary">
                    {item.name}: {item.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving || preview.total === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear {preview.total} turno(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
