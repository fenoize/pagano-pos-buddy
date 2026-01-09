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
  
  return <>{children}</>;
}
