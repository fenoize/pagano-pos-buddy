import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerResetPasswordModal } from '@/components/customer/CustomerResetPasswordModal';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function CustomerResetPassword() {
  const navigate = useNavigate();
  const [isValidToken, setIsValidToken] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verificar si hay un token de reset válido en la sesión
    const checkResetToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsValidToken(true);
      } else {
        // No hay token válido, redirigir a login
        navigate('/login');
      }
      
      setChecking(false);
    };

    checkResetToken();
  }, [navigate]);

  if (checking) {
    return (
      <div className="customer-app min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-app min-h-screen flex items-center justify-center bg-background">
      <CustomerResetPasswordModal isOpen={isValidToken} />
    </div>
  );
}
