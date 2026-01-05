import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, ChefHat, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';
import ResetPasswordModal from '@/components/auth/ResetPasswordModal';
import { usePOSThemeLogin } from '@/components/theme/POSThemeProvider';
import { configuredSupabase } from '@/lib/supabaseClient';

export default function Login() {
  // Forzar dark mode en login
  usePOSThemeLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const { login, loading, error, user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Cargar logo desde PWA config
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const { data } = await configuredSupabase
          .from('pwa_config')
          .select('icon_192_url')
          .eq('app_type', 'pos')
          .maybeSingle();
        
        if (data?.icon_192_url) {
          setLogoUrl(data.icon_192_url);
        }
      } catch (err) {
        console.error('Error loading logo:', err);
      }
    };
    loadLogo();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/pos');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Por favor ingresa usuario y contraseña",
        variant: "destructive",
      });
      return;
    }

    const result = await login(username, password);
    
    if (result.success) {
      toast({
        title: "Bienvenido",
        description: "Inicio de sesión exitoso",
      });
      navigate('/pos');
    } else {
      toast({
        title: "Error",
        description: result.error || "Error al iniciar sesión",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {logoUrl && !logoError ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-16 w-16 object-contain rounded-full"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="bg-primary text-primary-foreground p-3 rounded-full">
                <ChefHat className="h-8 w-8" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            Paganos POS
          </CardTitle>
          <CardDescription>
            Sistema de gestión para restaurante
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Forgot Password Link */}
          <div className="text-center mt-4">
            <Button
              type="button"
              variant="link"
              onClick={() => setShowForgotPassword(true)}
              disabled={loading}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              ¿Olvidaste tu contraseña?
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* Password Recovery Modals */}
      <ForgotPasswordModal
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
        onCodeSent={(identifier) => {
          setResetIdentifier(identifier);
          setShowResetPassword(true);
        }}
      />

      <ResetPasswordModal
        open={showResetPassword}
        onOpenChange={setShowResetPassword}
        identifier={resetIdentifier}
        onSuccess={() => {
          toast({
            title: "¡Listo!",
            description: "Ahora puedes iniciar sesión con tu nueva contraseña",
          });
          setUsername('');
          setPassword('');
        }}
      />
    </div>
  );
}