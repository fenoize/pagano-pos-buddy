import { useEffect, useState, useRef } from 'react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';

const REAPPEAR_MS = 5 * 60 * 1000; // 5 minutos
const DISMISS_KEY = 'customer_phone_dismissed_at';

export function RequirePhoneModal() {
  const { customer, refreshCustomerData } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<number | null>(null);

  const customerId = customer?.id;
  const hasPhone = !!(customer?.phone && String(customer.phone).trim().length > 0);

  // Decide visibility based on dismissal timestamp
  useEffect(() => {
    if (!customerId || hasPhone) {
      setOpen(false);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const elapsed = Date.now() - dismissedAt;

    if (!dismissedAt || elapsed >= REAPPEAR_MS) {
      setOpen(true);
    } else {
      const remaining = REAPPEAR_MS - elapsed;
      timerRef.current = window.setTimeout(() => setOpen(true), remaining);
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [customerId, hasPhone]);

  const handleSkip = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      // Reabrir si todavía no tiene teléfono
      if (!customer?.phone) setOpen(true);
    }, REAPPEAR_MS);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (trimmed.length < 8) {
      toast.error('Teléfono inválido', { description: 'Ingresa un número válido' });
      return;
    }
    if (!customerId) return;

    setSaving(true);
    const { error } = await supabase
      .from('customers')
      .update({ phone: trimmed })
      .eq('id', customerId);
    setSaving(false);

    if (error) {
      toast.error('No se pudo guardar', { description: error.message });
      return;
    }

    localStorage.removeItem(DISMISS_KEY);
    toast.success('Teléfono actualizado');
    setOpen(false);
    await refreshCustomerData();
  };

  if (!customerId || hasPhone) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleSkip(); else setOpen(true); }}>
      <DialogContent
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Completa tu información
          </DialogTitle>
          <DialogDescription>
            Queremos darte una mejor experiencia dentro del Clan.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Agregar tu teléfono nos permite contactarte rápidamente ante cualquier duda, cambio o inconveniente relacionado con tus pedidos.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="require-phone">
              Teléfono <span className="text-destructive">*</span>
            </Label>
            <Input
              id="require-phone"
              type="tel"
              inputMode="tel"
              placeholder="+56912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
              autoFocus
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleSkip} disabled={saving}>
              Más tarde
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando…' : 'Actualizar'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tu número será utilizado únicamente para ayudarte con tus pedidos.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RequirePhoneModal;
