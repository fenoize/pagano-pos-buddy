import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export function StaffProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/pos/login" replace />;
  }

  // Rol TV solo puede acceder a /pos/pedido-listo y /pos/tv
  if (user.role === 'TV') {
    const allowedPaths = ['/pos/pedido-listo', '/pos/tv'];
    const isAllowed = allowedPaths.some(path => location.pathname.startsWith(path));
    if (!isAllowed) {
      return <Navigate to="/pos/pedido-listo" replace />;
    }
  }

  // Rol Leer QR solo puede acceder a /pos/qr-reader y /pos/mi-configuracion
  const userRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
  const isQROnly = userRoles.length === 1 && userRoles[0] === 'Leer QR';
  if (isQROnly) {
    const allowedPaths = ['/pos/qr-reader', '/pos/mi-configuracion'];
    const isAllowed = allowedPaths.some(path => location.pathname.startsWith(path));
    if (!isAllowed) {
      return <Navigate to="/pos/qr-reader" replace />;
    }
  }
  
  return <>{children}</>;
}
