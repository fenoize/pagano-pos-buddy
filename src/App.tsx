import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import NewSale from "./pages/NewSale";
import Sales from "./pages/Sales";
import Kitchen from "./pages/Kitchen";
import NotFound from "./pages/NotFound";

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
      <MobileNav />
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
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
                  <div>Clientes - En desarrollo</div>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute>
                <AppLayout>
                  <div>Usuarios - En desarrollo</div>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/configuracion" element={
              <ProtectedRoute>
                <AppLayout>
                  <div>Configuración - En desarrollo</div>
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
