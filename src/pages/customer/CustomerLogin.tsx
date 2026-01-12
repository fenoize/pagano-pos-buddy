import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerForgotPasswordModal } from '@/components/customer/CustomerForgotPasswordModal';
import { toast } from 'sonner';
import { Loader2, Flame, Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useCustomerPortalConfig } from '@/hooks/useCustomerPortalConfig';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const { signIn, signUp } = useCustomerAuth();
  const { config: portalConfig } = useCustomerPortalConfig();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null);

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signupNombre, setSignupNombre] = useState('');
  const [signupApellido, setSignupApellido] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupBirthDate, setSignupBirthDate] = useState('');
  const [signupCaptchaToken, setSignupCaptchaToken] = useState<string | null>(null);

  // ReCAPTCHA refs
  const loginCaptchaRef = useRef<ReCAPTCHA>(null);
  const signupCaptchaRef = useRef<ReCAPTCHA>(null);

  // ReCAPTCHA callbacks
  const onLoginCaptchaChange = (token: string | null) => {
    setLoginCaptchaToken(token);
  };

  const onSignupCaptchaChange = (token: string | null) => {
    setSignupCaptchaToken(token);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar CAPTCHA
    if (!loginCaptchaToken) {
      toast.error('Verificación requerida', {
        description: 'Por favor completa el CAPTCHA',
      });
      return;
    }

    setLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast.error('Error al iniciar sesión', {
        description: error.message,
      });
      // Resetear CAPTCHA en caso de error
      loginCaptchaRef.current?.reset();
      setLoginCaptchaToken(null);
    } else {
      toast.success('¡Bienvenido de vuelta!');
      navigate('/');
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar CAPTCHA
    if (!signupCaptchaToken) {
      toast.error('Verificación requerida', {
        description: 'Por favor completa el CAPTCHA',
      });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error('Las contraseñas no coinciden', {
        description: 'Por favor verifica que ambas contraseñas sean iguales',
      });
      return;
    }

    setLoading(true);

    const { error } = await signUp(signupEmail, signupPassword, signupNombre, signupApellido, signupPhone, signupBirthDate);

    if (error) {
      toast.error('Error al registrarse', {
        description: error.message,
      });
      // Resetear CAPTCHA en caso de error
      signupCaptchaRef.current?.reset();
      setSignupCaptchaToken(null);
    } else {
      toast.success('¡Cuenta creada exitosamente!', {
        description: 'Revisa tu correo para verificar tu cuenta',
      });
      // Redirigir a la pantalla de verificación
      navigate('/verify-email', { state: { email: signupEmail } });
    }

    setLoading(false);
  };

  return (
    <div className="customer-app min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border shadow-2xl bg-card">
        <CardHeader className="space-y-3 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {portalConfig.iconUrl ? (
                  <img src={portalConfig.iconUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Flame className="h-8 w-8 text-primary" />
                )}
              </div>
          <CardTitle className="text-3xl font-bold">Portal Paganos</CardTitle>
          <CardDescription className="text-muted-foreground">
            {portalConfig.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs 
            defaultValue="login" 
            className="w-full"
            onValueChange={() => {
              // Resetear ambos CAPTCHAs al cambiar de tab
              loginCaptchaRef.current?.reset();
              signupCaptchaRef.current?.reset();
              setLoginCaptchaToken(null);
              setSignupCaptchaToken(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo electrónico</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-muted/50"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-muted-foreground hover:text-primary px-0 h-auto"
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-muted/50 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      disabled={loading}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* reCAPTCHA */}
                <div className="flex justify-center">
                  <ReCAPTCHA
                    ref={loginCaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    onChange={onLoginCaptchaChange}
                    theme="dark"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !loginCaptchaToken}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-2">
                  Este sitio está protegido por reCAPTCHA y aplican la{' '}
                  <a 
                    href="https://policies.google.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Política de privacidad
                  </a>
                  {' '}y{' '}
                  <a 
                    href="https://policies.google.com/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Términos del servicio
                  </a>
                  {' '}de Google.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-nombre">Nombre</Label>
                    <Input
                      id="signup-nombre"
                      type="text"
                      placeholder="Juan"
                      value={signupNombre}
                      onChange={(e) => setSignupNombre(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-apellido">Apellido</Label>
                    <Input
                      id="signup-apellido"
                      type="text"
                      placeholder="Pérez"
                      value={signupApellido}
                      onChange={(e) => setSignupApellido(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-muted/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo electrónico</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="bg-muted/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Teléfono (opcional)</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+56912345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    disabled={loading}
                    className="bg-muted/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-birthdate">Fecha de nacimiento (opcional)</Label>
                  <Input
                    id="signup-birthdate"
                    type="date"
                    value={signupBirthDate}
                    onChange={(e) => setSignupBirthDate(e.target.value)}
                    disabled={loading}
                    className="bg-muted/50"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="bg-muted/50 pr-10"
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        disabled={loading}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        type={showSignupConfirmPassword ? "text" : "password"}
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="bg-muted/50 pr-10"
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        disabled={loading}
                      >
                        {showSignupConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* reCAPTCHA */}
                <div className="flex justify-center">
                  <ReCAPTCHA
                    ref={signupCaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    onChange={onSignupCaptchaChange}
                    theme="dark"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !signupCaptchaToken}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-2">
                  Este sitio está protegido por reCAPTCHA y aplican la{' '}
                  <a 
                    href="https://policies.google.com/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Política de privacidad
                  </a>
                  {' '}y{' '}
                  <a 
                    href="https://policies.google.com/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Términos del servicio
                  </a>
                  {' '}de Google.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de recuperación de contraseña */}
      <CustomerForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
