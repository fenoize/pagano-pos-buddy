import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import CustomerPortal from "@/pages/customer/CustomerPortal";

export function SmartRootRedirect() {
  const { user: staffUser, loading: staffLoading } = useAuthContext();
  const { user: customerUser, loading: customerLoading } = useCustomerAuth();
  
  // Mostrar loader mientras se verifica la autenticación
  if (staffLoading || customerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Si hay sesión de staff y NO hay sesión de cliente → redirigir a /pos
  if (staffUser && !customerUser) {
    return <Navigate to="/pos" replace />;
  }
  
  // En cualquier otro caso → mostrar portal de clientes
  return <CustomerPortal />;
}
