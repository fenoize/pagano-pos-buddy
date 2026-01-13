import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, Eye, EyeOff, UtensilsCrossed, IceCream, Cookie, Coffee, Sandwich, Pizza, Cake, Beef } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';
import ResetPasswordModal from '@/components/auth/ResetPasswordModal';
import { usePOSThemeLogin } from '@/components/theme/POSThemeProvider';
import { configuredSupabase } from '@/lib/supabaseClient';

// Food icons grid component
function FoodIconsPattern() {
  const icons = [
    Beef, Coffee, Sandwich, Pizza,
    UtensilsCrossed, IceCream, Cookie, Cake,
    Sandwich, Coffee, Beef, Pizza,
    Cookie, UtensilsCrossed, IceCream, Cake,
    Beef, Coffee, Sandwich, Pizza,
  ];

  return (
    <div className="w-full h-full grid grid-cols-4 gap-6 p-6 content-center">
      {icons.map((Icon, i) => (
        <div key={i} className="flex items-center justify-center">
          <Icon className="w-10 h-10 text-primary/30" strokeWidth={1.2} />
        </div>
      ))}
    </div>
  );
}

export default function Login() {
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8">
      {/* Main container with dark background and rounded corners */}
      <div className="relative w-full max-w-5xl bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/50">
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          
          {/* Left side - Login form */}
          <div className="flex-1 p-8 md:p-12 lg:p-16 flex flex-col justify-center z-10">
            {/* Logo/Brand */}
            <div className="mb-8">
              {logoUrl && !logoError ? (
                <img 
                  src={logoUrl} 
                  alt="Paganos POS" 
                  className="h-10 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-xl font-bold text-primary italic">Paganos</span>
              )}
            </div>

            {/* Welcome text */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                ¡Hola!
              </h1>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Bienvenido de vuelta
              </h2>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-muted-foreground text-sm">
                  Usuario
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  disabled={loading}
                  className="bg-background/50 border-border/50 h-12 text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground text-sm">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    disabled={loading}
                    className="bg-background/50 border-border/50 h-12 pr-12 text-foreground placeholder:text-muted-foreground/50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-4 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Forgot password link */}
              <div>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setShowForgotPassword(true)}
                  disabled={loading}
                  className="p-0 h-auto text-sm text-primary hover:text-primary/80"
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Login button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          </div>

          {/* Right side - Food icons pattern */}
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <FoodIconsPattern />
          </div>
        </div>
      </div>

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
