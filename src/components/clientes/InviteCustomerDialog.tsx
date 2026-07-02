import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { User } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: User | null;
}

export function InviteCustomerDialog({ open, onOpenChange, currentUser }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => setEmail('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Ingresa un correo válido');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-customer', {
        body: { email: trimmed, invited_by: currentUser?.username ?? null },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'No se pudo enviar la invitación');
      toast.success(`Invitación enviada a ${trimmed}`);
      reset();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo enviar la invitación: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invocar al Clan Pagano
          </DialogTitle>
          <DialogDescription>
            Envía una invitación por correo. El cliente recibirá un enlace para registrarse en la app.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-customer-email">Correo del cliente</Label>
            <Input
              id="invite-customer-email"
              type="email"
              placeholder="cliente@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
