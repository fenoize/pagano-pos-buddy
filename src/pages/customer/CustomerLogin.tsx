import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CustomerForgotPasswordModal } from '@/components/customer/CustomerForgotPasswordModal';
import { GoogleProfileCompletionModal } from '@/components/customer/GoogleProfileCompletionModal';
import { toast } from 'sonner';
import { Loader2, Flame, Eye, EyeOff, Gift } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useCustomerPortalConfig } from '@/hooks/useCustomerPortalConfig';
import { useGoogleSignInEnabled } from '@/hooks/useGoogleSignInEnabled';
import { saveAllianceAttribution, getAllianceAttribution, clearAllianceAttribution, getAllianceSessionId } from '@/lib/allianceAttribution';
import { supabase } from '@/integrations/supabase/client';
import { AllianceJoinOfferModal } from '@/components/customer/AllianceJoinOfferModal';

// Google icon component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, signInWithGoogle, needsProfileCompletion, customer, user, completeProfile } = useCustomerAuth();
  const { config: portalConfig } = useCustomerPortalConfig();
  const { enabled: googleSignInEnabled } = useGoogleSignInEnabled();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'login');

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
  const [signupEmailExists, setSignupEmailExists] = useState(false);

  // Alliance join offer modal state
  const [allianceOffer, setAllianceOffer] = useState<{ slug: string; allianceName: string; customerId: string } | null>(null);
  const [claimingAlliance, setClaimingAlliance] = useState(false);

  // ReCAPTCHA refs
  const loginCaptchaRef = useRef<ReCAPTCHA>(null);
  const signupCaptchaRef = useRef<ReCAPTCHA>(null);

  const allySlug = searchParams.get('ally');

  useEffect(() => {
    if (allySlug) {
      saveAllianceAttribution(allySlug);
      if (searchParams.get('mode') === 'signup') setActiveTab('signup');
    }
  }, [allySlug, searchParams]);

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

    if (!signupPhone || signupPhone.trim().length < 8) {
      toast.error('Teléfono requerido', {
        description: 'Ingresa un número de teléfono válido para continuar',
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

    const { error, alreadyRegistered } = await signUp(signupEmail, signupPassword, signupNombre, signupApellido, signupPhone, signupBirthDate);

    if (alreadyRegistered) {
      await handleAlreadyRegistered(signupEmail, signupPassword);
      signupCaptchaRef.current?.reset();
      setSignupCaptchaToken(null);
      setLoading(false);
      return;
    }

    if (error) {
      const isDuplicate = error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('ya está registrado') ||
        error.message?.toLowerCase().includes('user already registered') ||
        error.message?.toLowerCase().includes('already been registered');
      
      if (isDuplicate) {
        await handleAlreadyRegistered(signupEmail, signupPassword);
      } else {
        toast.error('Error al registrarse', {
          description: error.message,
        });
      }
      // Resetear CAPTCHA en caso de error
      signupCaptchaRef.current?.reset();
      setSignupCaptchaToken(null);
    } else {
      setSignupEmailExists(false);
      toast.success('¡Cuenta creada exitosamente!', {
        description: 'Revisa tu correo para verificar tu cuenta',
      });
      // Redirigir a la pantalla de verificación
      navigate('/verify-email', { state: { email: signupEmail } });
    }

    setLoading(false);
  };

  const showGenericExistsMessage = () => {
    setSignupEmailExists(true);
    toast.info('Ya existe una cuenta con este correo', {
      description: 'Inicia sesión o restablece tu contraseña para continuar.',
    });
  };

  const handleAlreadyRegistered = async (email: string, password: string) => {
    // Snapshot y limpieza inmediata del slug para evitar auto-claim durante el login
    const { slug, sessionId } = getAllianceAttribution();
    if (slug) clearAllianceAttribution();

    // Verificar identidad iniciando sesión con las credenciales que la persona acaba de escribir
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.user) {
      showGenericExistsMessage();
      return;
    }

    // Sin slug de alianza en contexto: mensaje genérico
    if (!slug) {
      showGenericExistsMessage();
      return;
    }

    // Buscar customer_id
    const { data: customerRow } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', signInData.user.id)
      .maybeSingle();

    if (!customerRow?.id) {
      showGenericExistsMessage();
      return;
    }

    const { data: offerData, error: offerError } = await supabase.rpc('get_alliance_join_offer' as any, {
      _slug: slug,
      _customer_id: customerRow.id,
    });

    const offer = Array.isArray(offerData) ? offerData[0] : offerData;

    if (offerError || !offer || offer.reason === 'invalid_alliance') {
      showGenericExistsMessage();
      return;
    }

    const allianceName = offer.alliance_name || 'la alianza';

    if (offer.reason === 'already_member') {
      toast.info(`Ya formas parte de ${allianceName}`, {
        description: 'Inicia sesión para ver tus beneficios.',
      });
      return;
    }

    if (offer.reason === 'already_in_other_alliance') {
      toast.info('Ya perteneces a otra alianza', {
        description: 'Ya perteneces a otra alianza dentro del Clan. Solo puedes mantener una alianza activa a la vez.',
      });
      return;
    }

    if (offer.eligible) {
      setAllianceOffer({ slug, allianceName, customerId: customerRow.id });
      return;
    }

    showGenericExistsMessage();
  };

  const handleConfirmAllianceJoin = async () => {
    if (!allianceOffer) return;
    setClaimingAlliance(true);
    const sessionId = getAllianceSessionId();
    const { data, error } = await supabase.rpc('claim_marketing_alliance_signup' as any, {
      _slug: allianceOffer.slug,
      _session_id: sessionId,
      _customer_id: allianceOffer.customerId,
    });

    if (error || !data) {
      toast.error('No pudimos activar la alianza', {
        description: 'Intenta nuevamente en unos minutos.',
      });
      setClaimingAlliance(false);
      return;
    }

    clearAllianceAttribution();
    toast.success('Alianza forjada', {
      description: `Ya tienes los beneficios de ${allianceOffer.allianceName} en tu cuenta.`,
    });
    setAllianceOffer(null);
    setClaimingAlliance(false);
    navigate('/');
  };

  const handleCancelAllianceJoin = () => {
    clearAllianceAttribution();
    setAllianceOffer(null);
    showGenericExistsMessage();
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    try {
      // Detectar si estamos en un dominio custom (no lovable.app ni lovableproject.com)
      const isCustomDomain = 
        !window.location.hostname.includes('lovable.app') &&
        !window.location.hostname.includes('lovableproject.com') &&
        !window.location.hostname.includes('localhost');

      if (isCustomDomain) {
        // Bypass auth-bridge para dominios custom
        const { data, error } = await signInWithGoogle(true); // skipBrowserRedirect = true
        
        if (error) throw error;
        
        // Validar URL de OAuth antes de redirigir
        if (data?.url) {
          const oauthUrl = new URL(data.url);
          const allowedHosts = ['accounts.google.com'];
          if (!allowedHosts.some(host => oauthUrl.hostname === host)) {
            throw new Error('URL de OAuth inválida');
          }
          window.location.href = data.url;
        }
      } else {
        // Para dominios Lovable, usar flujo normal
        const { error } = await signInWithGoogle();
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error('Error con Google', {
        description: error.message,
      });
      setGoogleLoading(false);
    }
    // No resetear googleLoading aquí - el redirect a Google lo manejará
  };

  // Preparar datos iniciales para el modal de completar perfil
  const getGoogleModalInitialData = () => {
    const metadata = user?.user_metadata || {};
    return {
      nombres: metadata.given_name || metadata.nombre || customer?.nombres || customer?.name || '',
      apellidos: metadata.family_name || metadata.apellido || customer?.apellidos || customer?.apellido || '',
      email: user?.email || customer?.email || '',
    };
  };

  return (
    <div className="customer-app min-h-screen flex items-center justify-center p-4 bg-background relative">
      {/* Staff Login - enlace discreto */}
      <a
        href="/pos"
        className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
      >
        Staff Login
      </a>

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
          {allySlug && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-primary">
                <Gift className="h-4 w-4" /> Beneficio exclusivo
              </div>
              <p className="mt-1 text-muted-foreground">Crea tu cuenta desde esta alianza y recibe tus beneficios para la primera compra.</p>
            </div>
          )}

          <Tabs 
            value={activeTab} 
            className="w-full"
            onValueChange={(value) => {
              setActiveTab(value);
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

                {/* Separador y Google Sign-In - solo si está habilitado */}
                {googleSignInEnabled && (
                  <>
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        o
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                    >
                      {googleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}
                      Continuar con Google
                    </Button>
                  </>
                )}

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
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      setSignupEmailExists(false);
                    }}
                    required
                    disabled={loading}
                    className="bg-muted/50"
                  />
                  {signupEmailExists && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2">
                      <p className="text-sm text-destructive font-medium">
                        Este correo ya está registrado
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setShowForgotPassword(true);
                        }}
                      >
                        Recuperar contraseña
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">
                    Teléfono <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+56912345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    disabled={loading}
                    className="bg-muted/50"
                    required
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
                  <Label htmlFor="signup-confirm-password">Confirmar contraseña</Label>
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

                {/* Separador y Google Sign-In - solo si está habilitado */}
                {googleSignInEnabled && (
                  <>
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        o
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                    >
                      {googleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}
                      Registrarse con Google
                    </Button>
                  </>
                )}

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

      {/* Modal de completar perfil (Google) */}
      <GoogleProfileCompletionModal
        isOpen={needsProfileCompletion}
        initialData={getGoogleModalInitialData()}
        onComplete={completeProfile}
      />

      {/* Modal de oferta de alianza para cuentas existentes */}
      <AllianceJoinOfferModal
        open={!!allianceOffer}
        allianceName={allianceOffer?.allianceName || ''}
        loading={claimingAlliance}
        onConfirm={handleConfirmAllianceJoin}
        onCancel={handleCancelAllianceJoin}
      />
    </div>
  );
}
