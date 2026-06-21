import { Navigate } from "react-router-dom";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { RequirePhoneModal } from "@/components/customer/RequirePhoneModal";

export function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useCustomerAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar si el email está confirmado
  if (user && !user.email_confirmed_at) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />;
  }
  
  return (
    <>
      {children}
      <RequirePhoneModal />
    </>
  );
}
