import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { useKitchenExpanded } from "@/hooks/useKitchenExpanded";
import Login from "./pages/Login";
import Dashboard from '@/pages/Dashboard';
import Clientes from '@/pages/Clientes';
import NewSale from '@/pages/NewSale';
import Sales from '@/pages/Sales';
import Kitchen from '@/pages/Kitchen';
import Users from '@/pages/Users';
import Products from '@/pages/Products';
import Categorias from '@/pages/Categorias';
import ConfiguracionPage from '@/pages/ConfiguracionPage';
import CierresDiarios from '@/pages/CierresDiarios';
import NotFound from '@/pages/NotFound';
import CustomerLogin from '@/pages/customer/CustomerLogin';
import CustomerPortal from '@/pages/customer/CustomerPortal';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  
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
  
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useKitchenExpanded();
  const isKitchenRoute = window.location.pathname === '/cocina';
  
  // If on kitchen route and expanded, render without layout
  if (isKitchenRoute && isExpanded) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4 md:px-6">
            <SidebarTrigger />
            <h2 className="ml-4 font-semibold text-primary">Paganos POS</h2>
          </header>
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      {/* Only show MobileNav when not in expanded kitchen mode */}
      {!(isKitchenRoute && isExpanded) && <MobileNav />}
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CustomerAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Customer Portal Routes */}
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route path="/customer" element={<CustomerPortal />} />
              
              {/* Staff Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/nueva-venta" element={
                <ProtectedRoute>
                  <AppLayout>
                    <NewSale />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/ventas" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Sales />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/cocina" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Kitchen />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/pedido-listo" element={
                <ProtectedRoute>
                  <AppLayout>
                    <div>Pedido Listo TV - En desarrollo</div>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/productos" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Products />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/categorias" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Categorias />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/inventario" element={
                <ProtectedRoute>
                  <AppLayout>
                    <div>Inventario - En desarrollo</div>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Clientes />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/usuarios" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Users />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/cierres-diarios" element={
                <ProtectedRoute>
                  <AppLayout>
                    <CierresDiarios />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/configuracion" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ConfiguracionPage />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
