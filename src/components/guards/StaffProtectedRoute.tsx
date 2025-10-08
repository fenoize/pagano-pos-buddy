import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export function StaffProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  
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
  
  return <>{children}</>;
}
