import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

const DAYS: Array<{ key: string; label: string }> = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mié' },
  { key: 'thu', label: 'Jue' },
  { key: 'fri', label: 'Vie' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];

interface Props {
  value: Record<string, string[]> | undefined;
  onChange: (next: Record<string, string[]> | undefined) => void;
}

export function CouponTimeWindowEditor({ value, onChange }: Props) {
  const tw = value || {};
  const enabled = Object.keys(tw).length > 0;

  const toggleDay = (day: string, on: boolean) => {
    const next = { ...tw };
    if (on) next[day] = next[day]?.length ? next[day] : ['00:00-23:59'];
    else delete next[day];
    onChange(Object.keys(next).length ? next : undefined);
  };

  const updateWindow = (day: string, idx: number, start: string, end: string) => {
    const next = { ...tw };
    const list = [...(next[day] || [])];
    list[idx] = `${start}-${end}`;
    next[day] = list;
    onChange(next);
  };

  const addWindow = (day: string) => {
    const next = { ...tw, [day]: [...(tw[day] || []), '12:00-17:00'] };
    onChange(next);
  };

  const removeWindow = (day: string, idx: number) => {
    const next = { ...tw };
    next[day] = (next[day] || []).filter((_, i) => i !== idx);
    if (!next[day].length) delete next[day];
    onChange(Object.keys(next).length ? next : undefined);
  };

  const applyToAll = (day: string) => {
    const windows = tw[day];
    if (!windows?.length) return;
    const next: Record<string, string[]> = {};
    DAYS.forEach((d) => {
      if (tw[d.key] !== undefined) next[d.key] = [...windows];
    });
    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Días y horas de validez</Label>
        {enabled && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Quitar restricción
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Si no marcas ningún día, el cupón es válido a cualquier hora. Marca días para limitar su uso.
      </p>
      <div className="space-y-2">
        {DAYS.map((day) => {
          const isEnabled = day.key in tw;
          const windows = tw[day.key] || [];
          return (
            <div key={day.key} className="flex flex-col gap-2 rounded-md border bg-background p-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`day-${day.key}`}
                  checked={isEnabled}
                  onCheckedChange={(c) => toggleDay(day.key, !!c)}
                />
                <Label htmlFor={`day-${day.key}`} className="font-medium w-12">{day.label}</Label>
                {isEnabled && (
                  <>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addWindow(day.key)}>
                      <Plus className="h-3 w-3 mr-1" /> Franja
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => applyToAll(day.key)}>
                      Aplicar a otros días
                    </Button>
                  </>
                )}
              </div>
              {isEnabled && windows.map((w, i) => {
                const [start = '12:00', end = '17:00'] = w.split('-');
                return (
                  <div key={i} className="flex items-center gap-2 pl-7">
                    <Input
                      type="time"
                      value={start}
                      onChange={(e) => updateWindow(day.key, i, e.target.value, end)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground text-sm">a</span>
                    <Input
                      type="time"
                      value={end}
                      onChange={(e) => updateWindow(day.key, i, start, e.target.value)}
                      className="w-32"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeWindow(day.key, i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
