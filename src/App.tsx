import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { SEOHead } from "@/components/SEOHead";
import { useKitchenExpanded } from "@/hooks/useKitchenExpanded";
import { Suspense, lazy } from "react";

// Guards
import { CustomerProtectedRoute } from "@/components/guards/CustomerProtectedRoute";
import { StaffProtectedRoute } from "@/components/guards/StaffProtectedRoute";
import { SmartRootRedirect } from "@/components/guards/SmartRootRedirect";

// Customer Pages
const CustomerLogin = lazy(() => import('@/pages/customer/CustomerLogin'));
const CustomerPortal = lazy(() => import('@/pages/customer/CustomerPortal'));
const MyOrders = lazy(() => import('@/pages/customer/MyOrders'));
const MyAddresses = lazy(() => import('@/pages/customer/MyAddresses'));
const MyRunes = lazy(() => import('@/pages/customer/MyRunes'));
const MyBadges = lazy(() => import('@/pages/customer/MyBadges'));

// Staff Pages - Lazy loading para code splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Clientes = lazy(() => import("@/pages/Clientes"));
const NewSale = lazy(() => import("@/pages/NewSale"));
const Sales = lazy(() => import("@/pages/Sales"));
const Kitchen = lazy(() => import("@/pages/Kitchen"));
const Users = lazy(() => import("@/pages/Users"));
const Products = lazy(() => import("@/pages/Products"));
const Categorias = lazy(() => import("@/pages/Categorias"));
const ConfiguracionPage = lazy(() => import("@/pages/ConfiguracionPage"));
const PermisosManagement = lazy(() => import("@/pages/PermisosManagement"));
const CierresDiarios = lazy(() => import("@/pages/CierresDiarios"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Loading component para Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function StaffLayout({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useKitchenExpanded();
  const isKitchenRoute = window.location.pathname === '/pos/cocina';
  
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
      {!(isKitchenRoute && isExpanded) && <MobileNav />}
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <AuthProvider>
        <CustomerAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SEOHead />
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
              {/* ==================== CUSTOMER ROUTES (ROOT) ==================== */}
              <Route path="/" element={<SmartRootRedirect />} />
              <Route path="/login" element={<CustomerLogin />} />
              <Route path="/portal" element={
                <CustomerProtectedRoute>
                  <CustomerPortal />
                </CustomerProtectedRoute>
              } />
              <Route path="/my-orders" element={
                <CustomerProtectedRoute>
                  <MyOrders />
                </CustomerProtectedRoute>
              } />
              <Route path="/my-addresses" element={
                <CustomerProtectedRoute>
                  <MyAddresses />
                </CustomerProtectedRoute>
              } />
              <Route path="/my-runes" element={
                <CustomerProtectedRoute>
                  <MyRunes />
                </CustomerProtectedRoute>
              } />
              <Route path="/my-badges" element={
                <CustomerProtectedRoute>
                  <MyBadges />
                </CustomerProtectedRoute>
              } />
              
              {/* Legacy redirects for old customer routes */}
              <Route path="/customer" element={<Navigate to="/" replace />} />
              <Route path="/customer/login" element={<Navigate to="/login" replace />} />
              
              {/* ==================== STAFF ROUTES (/pos/*) ==================== */}
              <Route path="/pos/login" element={<Login />} />
              
              <Route path="/pos" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Dashboard />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/nueva-venta" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <NewSale />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/ventas" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Sales />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/cocina" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Kitchen />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/pedido-listo" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <div>Pedido Listo TV - En desarrollo</div>
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/productos" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Products />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/categorias" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Categorias />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <div>Inventario - En desarrollo</div>
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/clientes" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Clientes />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/usuarios" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Users />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/cierres-diarios" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <CierresDiarios />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/configuracion" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <ConfiguracionPage />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/configuracion/permisos" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <PermisosManagement />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              {/* Legacy redirects for old staff routes */}
              <Route path="/nueva-venta" element={<Navigate to="/pos/nueva-venta" replace />} />
              <Route path="/ventas" element={<Navigate to="/pos/ventas" replace />} />
              <Route path="/cocina" element={<Navigate to="/pos/cocina" replace />} />
              <Route path="/pedido-listo" element={<Navigate to="/pos/pedido-listo" replace />} />
              <Route path="/productos" element={<Navigate to="/pos/productos" replace />} />
              <Route path="/categorias" element={<Navigate to="/pos/categorias" replace />} />
              <Route path="/inventario" element={<Navigate to="/pos/inventario" replace />} />
              <Route path="/clientes" element={<Navigate to="/pos/clientes" replace />} />
              <Route path="/usuarios" element={<Navigate to="/pos/usuarios" replace />} />
              <Route path="/cierres-diarios" element={<Navigate to="/pos/cierres-diarios" replace />} />
              <Route path="/configuracion" element={<Navigate to="/pos/configuracion" replace />} />
              
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
