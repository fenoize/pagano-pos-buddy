import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, User } from 'lucide-react';
import { toast } from "sonner";
interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeSent: (identifier: string) => void;
}

export default function ForgotPasswordModal({
  open,
  onOpenChange,
  onCodeSent,
}: ForgotPasswordModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!identifier.trim()) {
      setError('Por favor ingresa tu usuario o email');
      return;
    }

    setLoading(true);

    try {
      // Determine if input is email or username
      const isEmail = identifier.includes('@');
      const payload = isEmail 
        ? { email: identifier.trim() }
        : { username: identifier.trim() };

      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: payload
      });

      if (error) {
        console.error('Function error:', error);
        setError(error.message || 'Error al enviar el código');
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      // Success
      toast.success("Código enviado", { description: "Si el usuario existe, recibirás un código por email" });

      onCodeSent(identifier);
      onOpenChange(false);

    } catch (error) {
      console.error('Error sending reset code:', error);
      setError('Error al enviar el código. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIdentifier('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recuperar Contraseña
          </DialogTitle>
          <DialogDescription>
            Ingresa tu usuario o email para recibir un código de verificación
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Usuario o Email</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="usuario o email@ejemplo.com"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Código'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}