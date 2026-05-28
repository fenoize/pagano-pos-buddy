import { useEffect, useState } from 'react';
import { Branch } from '@/contexts/BranchContext';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  branch: Branch | null;
}

const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

type DayHours = { open: string; close: string; closed: boolean; closes_next_day?: boolean };

const DEFAULT_HOURS = DAYS.reduce((acc, d) => {
  acc[d.key] = { open: '10:00', close: '23:00', closed: false, closes_next_day: false };
  return acc;
}, {} as Record<string, DayHours>);

// "HH:MM" → minutes
const toMin = (s: string) => {
  const [h, m] = (s || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function BranchFormDialog({ open, onOpenChange, branch }: Props) {
  const { create, update } = useBranches();
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    is_active: true,
    is_default: false,
    accepts_online_orders: true,
    cash_account_id: '__none__' as string,
    opening_hours: DEFAULT_HOURS,
  });
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; type: string; branch_id: string | null }>>([]);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('finance_accounts')
      .select('id, name, type, branch_id')
      .eq('type', 'Efectivo')
      .order('name')
      .then(({ data }) => setAccounts(data || []));
  }, [open]);

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name,
        address: branch.address || '',
        phone: branch.phone || '',
        is_active: branch.is_active,
        is_default: branch.is_default,
        accepts_online_orders: branch.accepts_online_orders,
        cash_account_id: branch.cash_account_id || '__none__',
        opening_hours: branch.opening_hours || DEFAULT_HOURS,
      });
    } else {
      setForm({
        name: '',
        address: '',
        phone: '',
        is_active: true,
        is_default: false,
        accepts_online_orders: true,
        cash_account_id: '__none__',
        opening_hours: DEFAULT_HOURS,
      });
    }
    setShowCreateAccount(false);
    setNewAccountName('');
  }, [branch, open]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Ingresa un nombre');
      return;
    }
    setSaving(true);
    try {
      let cashAccountId: string | null =
        form.cash_account_id === '__none__' ? null : form.cash_account_id;

      // Crear cuenta nueva si corresponde
      if (showCreateAccount && newAccountName.trim()) {
        const { data: newAcc, error: accErr } = await supabase
          .from('finance_accounts')
          .insert({ name: newAccountName.trim(), type: 'Efectivo', balance: 0 })
          .select('id')
          .single();
        if (accErr) throw accErr;
        cashAccountId = newAcc.id;
      }

      // Recalcular closes_next_day por día (close < open → cruza medianoche)
      const normalizedHours = Object.fromEntries(
        Object.entries(form.opening_hours).map(([k, h]) => [
          k,
          { ...h, closes_next_day: !h.closed && toMin(h.close) < toMin(h.open) },
        ])
      );

      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        is_active: form.is_active,
        is_default: form.is_default,
        accepts_online_orders: form.accepts_online_orders,
        cash_account_id: cashAccountId,
        opening_hours: normalizedHours,
      };

      if (branch) {
        await update({ id: branch.id, ...(payload as any) });
      } else {
        await create(payload as any);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{branch ? 'Editar local' : 'Nuevo local'}</DialogTitle>
          <DialogDescription>
            Configura nombre, dirección, horario y caja registradora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Foodtruck Centro"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Caja registradora</Label>
            {!showCreateAccount ? (
              <div className="flex gap-2">
                <Select
                  value={form.cash_account_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, cash_account_id: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem
                        key={a.id}
                        value={a.id}
                        disabled={!!a.branch_id && a.branch_id !== branch?.id}
                      >
                        {a.name}
                        {a.branch_id && a.branch_id !== branch?.id && ' (en uso)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setShowCreateAccount(true)}>
                  Crear nueva
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre de la nueva caja"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={() => setShowCreateAccount(false)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2 border rounded-md p-3">
            <Label>Horario de operación</Label>
            <div className="space-y-1.5">
              {DAYS.map((d) => {
                const h = form.opening_hours[d.key] || { open: '10:00', close: '23:00', closed: false };
                return (
                  <div key={d.key} className="flex items-center gap-2 text-sm">
                    <div className="w-20">{d.label}</div>
                    <Switch
                      checked={!h.closed}
                      onCheckedChange={(checked) =>
                        setForm((f) => ({
                          ...f,
                          opening_hours: {
                            ...f.opening_hours,
                            [d.key]: { ...h, closed: !checked },
                          },
                        }))
                      }
                    />
                    <Input
                      type="time"
                      value={h.open}
                      disabled={h.closed}
                      className="w-28"
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          opening_hours: {
                            ...f.opening_hours,
                            [d.key]: { ...h, open: e.target.value },
                          },
                        }))
                      }
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={h.close}
                      disabled={h.closed}
                      className="w-28"
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          opening_hours: {
                            ...f.opening_hours,
                            [d.key]: { ...h, close: e.target.value },
                          },
                        }))
                      }
                    />
                    {!h.closed && toMin(h.close) < toMin(h.open) && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        +1 día
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              Activo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.is_default}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))}
              />
              Predeterminado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.accepts_online_orders}
                onCheckedChange={(v) => setForm((f) => ({ ...f, accepts_online_orders: v }))}
              />
              Pedidos online
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
