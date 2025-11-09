import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePWAConfig } from '@/hooks/usePWAConfig';
import { APP_VERSION } from '@/config/version';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoUrl } = usePWAConfig();
  const [email, setEmail] = useState<string>('');
  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    // Obtener email del state de navegación
    const emailFromState = location.state?.email;
    if (emailFromState) {
      setEmail(emailFromState);
    } else {
      // Si no hay email, redirigir al login
      navigate('/login');
    }
  }, [location.state, navigate]);

  useEffect(() => {
    // Countdown para cooldown
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleResendVerification = async () => {
    if (!email || cooldownSeconds > 0) return;

    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success('Correo reenviado', {
        description: 'Te enviamos nuevamente el correo de verificación.',
      });

      // Activar cooldown de 15 segundos
      setCooldownSeconds(15);
    } catch (error: any) {
      console.error('Error resending verification:', error);
      toast.error('Error al reenviar', {
        description: error.message || 'No pudimos reenviar el correo. Intenta más tarde.',
      });
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="customer-app min-h-screen flex items-center justify-center p-4 bg-[#1c1e21]">
      <Card className="w-full max-w-md border-border/20 shadow-2xl bg-card">
        <CardHeader className="space-y-4 text-center">
          {/* Logo */}
          {logoUrl && (
            <div className="mx-auto">
              <img 
                src={logoUrl} 
                alt="Paganos Burger" 
                className="h-20 w-20 object-contain mx-auto"
              />
            </div>
          )}

          {/* Icono de escudo/verificación */}
          <div className="mx-auto w-16 h-16 rounded-full bg-[#cc2525]/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-[#cc2525]" />
          </div>

          <CardTitle className="text-2xl md:text-3xl font-bold text-white">
            🎮 Activa tu cuenta y comienza tu aventura
          </CardTitle>

          <CardDescription className="text-base text-muted-foreground">
            Te hemos enviado un correo a{' '}
            <span className="font-semibold text-white">{email}</span>.
            <br />
            Verifica tu cuenta para poder acceder a tus pedidos, tus Runas y tus beneficios de Clan.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mensaje de instrucciones */}
          <div className="bg-muted/30 p-4 rounded-lg border border-border/20">
            <div className="flex gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  Si no ves el correo, revisa tu carpeta de <strong className="text-foreground">Spam</strong> o <strong className="text-foreground">Promociones</strong>.
                </p>
                <p className="text-xs">
                  Cuando esté verificada, inicia sesión y continúa tu travesía.
                </p>
              </div>
            </div>
          </div>

          {/* Botón de reenviar */}
          <Button
            onClick={handleResendVerification}
            disabled={resending || cooldownSeconds > 0}
            className="w-full bg-[#cc2525] hover:bg-[#cc2525]/90 text-white"
            size="lg"
          >
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reenviando...
              </>
            ) : cooldownSeconds > 0 ? (
              `Espera ${cooldownSeconds}s para reenviar`
            ) : (
              'Reenviar correo de verificación'
            )}
          </Button>

          {/* Botón secundario */}
          <Button
            variant="ghost"
            onClick={handleBackToLogin}
            className="w-full text-muted-foreground hover:text-white"
          >
            Volver al inicio de sesión
          </Button>

          {/* Versión */}
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              App Paganos Burger v{APP_VERSION}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
