import { useState } from 'react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
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
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';

interface CustomerForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerForgotPasswordModal({ isOpen, onClose }: CustomerForgotPasswordModalProps) {
  const { requestPasswordReset } = useCustomerAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);

    const { error } = await requestPasswordReset(email);

    if (error) {
      toast.error('Error al solicitar cambio de contraseña', {
        description: error.message,
      });
    } else {
      toast.success('¡Correo enviado!', {
        description: 'Revisa tu bandeja de entrada para restablecer tu contraseña',
      });
      handleClose();
    }

    setLoading(false);
  };

  const handleClose = () => {
    setEmail('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            ¿Olvidaste tu contraseña?
          </DialogTitle>
          <DialogDescription>
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Correo electrónico</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar enlace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
