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
import { CashSessionTopBar } from "@/components/cash/CashSessionTopBar";
import { SessionExpiryModal } from "@/components/auth/SessionExpiryModal";
import { useKitchenExpanded } from "@/hooks/useKitchenExpanded";
import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive";
import { Suspense, lazy } from "react";
import { CartProvider } from "@/contexts/CartContext";
import { CustomerAppWrapper } from "@/components/customer/CustomerAppWrapper";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Guards
import { CustomerProtectedRoute } from "@/components/guards/CustomerProtectedRoute";
import { StaffProtectedRoute } from "@/components/guards/StaffProtectedRoute";
import { SmartRootRedirect } from "@/components/guards/SmartRootRedirect";
import { Footer } from "@/components/ui/footer";

// Customer Pages
const CustomerLogin = lazy(() => import('@/pages/customer/CustomerLogin'));
const CustomerResetPassword = lazy(() => import('@/pages/customer/CustomerResetPassword'));
const VerifyEmail = lazy(() => import('@/pages/customer/VerifyEmail'));
const CustomerPortal = lazy(() => import('@/pages/customer/CustomerPortal'));
const CustomerMenu = lazy(() => import('@/pages/customer/CustomerMenu'));
const CustomerCart = lazy(() => import('@/pages/customer/CustomerCart'));
const CustomerCheckout = lazy(() => import('@/pages/customer/CustomerCheckout'));
const CustomerBenefits = lazy(() => import('@/pages/customer/CustomerBenefits'));
const CustomerOrderTracking = lazy(() => import('@/pages/customer/CustomerOrderTracking'));
const CustomerPaymentSuccess = lazy(() => import('@/pages/customer/CustomerPaymentSuccess'));
const CustomerOrderSuccess = lazy(() => import('@/pages/customer/CustomerOrderSuccess'));
const CustomerPaymentFailure = lazy(() => import('@/pages/customer/CustomerPaymentFailure'));
const CustomerPaymentPending = lazy(() => import('@/pages/customer/CustomerPaymentPending'));
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
const NivelesManagement = lazy(() => import("@/pages/NivelesManagement"));
const FidelizacionHub = lazy(() => import("@/pages/FidelizacionHub"));
const ConfiguracionPage = lazy(() => import("@/pages/ConfiguracionPage"));
const PermisosManagement = lazy(() => import("@/pages/PermisosManagement"));
const CierresDiarios = lazy(() => import("@/pages/CierresDiarios"));
const MarketingPromosApp = lazy(() => import("@/pages/MarketingPromosApp"));
const MarketingNotifications = lazy(() => import("@/pages/MarketingNotifications"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Delivery Pages
const DeliveryDashboard = lazy(() => import("@/pages/delivery/DeliveryDashboard"));
const DeliveryHistory = lazy(() => import("@/pages/delivery/DeliveryHistory"));

// Inventory Pages
const InventoryHub = lazy(() => import("@/pages/inventory/InventoryHub"));
const InventoryCategories = lazy(() => import("@/pages/inventory/InventoryCategories"));
const Warehouses = lazy(() => import("@/pages/inventory/Warehouses"));
const RawMaterials = lazy(() => import("@/pages/inventory/RawMaterials"));
const Recipes = lazy(() => import("@/pages/inventory/Recipes"));
const Kardex = lazy(() => import("@/pages/inventory/Kardex"));
const StockAdjustments = lazy(() => import("@/pages/inventory/StockAdjustments"));
const StockTransfers = lazy(() => import("@/pages/inventory/StockTransfers"));
const StockManagement = lazy(() => import("@/pages/inventory/StockManagement"));
const PurchaseOrders = lazy(() => import("@/pages/inventory/PurchaseOrders"));
const PurchaseOrderForm = lazy(() => import("@/pages/inventory/PurchaseOrderForm"));
const PurchaseOrderDetail = lazy(() => import("@/pages/inventory/PurchaseOrderDetail"));

// Finance Pages
const FinanceKPIs = lazy(() => import("@/pages/finance/FinanceKPIs"));
const FinanceCierres = lazy(() => import("@/pages/finance/FinanceCierres"));
const FinanceExport = lazy(() => import("@/pages/finance/FinanceExport"));
const FinanceAccounts = lazy(() => import("@/pages/finance/FinanceAccounts"));
const FinanceExpenses = lazy(() => import("@/pages/finance/FinanceExpenses"));
const FixedExpenses = lazy(() => import("@/pages/finance/FixedExpenses"));
const FinanceSuppliers = lazy(() => import("@/pages/finance/FinanceSuppliers"));
const FinanceConfig = lazy(() => import("@/pages/finance/FinanceConfig"));

// Report Pages
const ProductSalesReport = lazy(() => import("@/pages/reports/ProductSalesReport"));

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
  
  // Activar keep-alive de sesión para staff autenticado
  const { showExpiryModal, handleStayActive, handleForceLogout } = useSessionKeepAlive();
  
  // If on kitchen route and expanded, render without layout
  if (isKitchenRoute && isExpanded) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      {/* Modal de expiración - se renderiza globalmente */}
      <SessionExpiryModal
        isOpen={showExpiryModal}
        onStayActive={handleStayActive}
        onLogout={handleForceLogout}
      />
      
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h2 className="font-semibold text-primary">Paganos POS</h2>
            </div>
            <CashSessionTopBar />
          </header>
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
          <Footer />
        </div>
      </div>
      {!(isKitchenRoute && isExpanded) && <MobileNav />}
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <CustomerAuthProvider>
            <CartProvider>
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
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/reset-password" element={<CustomerResetPassword />} />
              
              <Route path="/portal" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <CustomerPortal />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/menu" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <CustomerMenu />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/cart" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <CustomerCart />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/checkout" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <CustomerCheckout />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/benefits" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <CustomerBenefits />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/my-orders" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <MyOrders />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/track/:orderId" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <CustomerOrderTracking />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/payment-success" element={
                <CustomerProtectedRoute>
                  <CustomerPaymentSuccess />
                </CustomerProtectedRoute>
              } />
              
              <Route path="/order-success" element={
                <CustomerProtectedRoute>
                  <CustomerOrderSuccess />
                </CustomerProtectedRoute>
              } />
              
              <Route path="/payment-failure" element={
                <CustomerProtectedRoute>
                  <CustomerPaymentFailure />
                </CustomerProtectedRoute>
              } />
              
              <Route path="/payment-pending" element={
                <CustomerProtectedRoute>
                  <CustomerPaymentPending />
                </CustomerProtectedRoute>
              } />
              
              <Route path="/my-addresses" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <MyAddresses />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/my-runes" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <MyRunes />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              <Route path="/my-badges" element={
                <CustomerProtectedRoute>
                  <CustomerAppWrapper>
                    <MyBadges />
                  </CustomerAppWrapper>
                </CustomerProtectedRoute>
              } />
              
              {/* Legacy redirects for old customer routes */}
              <Route path="/customer" element={<Navigate to="/" replace />} />
              <Route path="/customer/login" element={<Navigate to="/login" replace />} />
              <Route path="/addresses" element={<Navigate to="/my-addresses" replace />} />
              
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
              
              <Route path="/pos/fidelizacion" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <FidelizacionHub />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/niveles" element={
                <Navigate to="/pos/fidelizacion?tab=niveles" replace />
              } />
              
              <Route path="/pos/inventario" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <InventoryHub />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/almacenes" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Warehouses />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/materias-primas" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <RawMaterials />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/recetas" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Recipes />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/kardex" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <Kardex />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/compras" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <PurchaseOrders />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/compras/nueva" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <PurchaseOrderForm />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/compras/:id" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <PurchaseOrderDetail />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/ajustes" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <StockAdjustments />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/transferencias" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <StockTransfers />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/stock" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <StockManagement />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/categorias" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <InventoryCategories />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/inventario/reportes" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <div className="p-6 text-center text-muted-foreground">
                      Reportes de Inventario - En desarrollo
                    </div>
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              {/* Finance Routes */}
              <Route path="/pos/finanzas/kpis" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <FinanceKPIs />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/finanzas/cuentas" element={<StaffProtectedRoute><StaffLayout><FinanceAccounts /></StaffLayout></StaffProtectedRoute>} />
              <Route path="/pos/finanzas/proveedores" element={<StaffProtectedRoute><StaffLayout><FinanceSuppliers /></StaffLayout></StaffProtectedRoute>} />
              <Route path="/pos/finanzas/gastos-fijos" element={<StaffProtectedRoute><StaffLayout><FixedExpenses /></StaffLayout></StaffProtectedRoute>} />
              <Route path="/pos/finanzas/egresos" element={<StaffProtectedRoute><StaffLayout><FinanceExpenses /></StaffLayout></StaffProtectedRoute>} />
              <Route path="/pos/finanzas/cierres" element={<StaffProtectedRoute><StaffLayout><FinanceCierres /></StaffLayout></StaffProtectedRoute>} />
              <Route path="/pos/finanzas/configuracion" element={<StaffProtectedRoute><StaffLayout><FinanceConfig /></StaffLayout></StaffProtectedRoute>} />
              
              <Route path="/pos/finanzas/exportaciones" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <FinanceExport />
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
              
              <Route path="/pos/marketing/promos-app" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <MarketingPromosApp />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/marketing/notificaciones" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <MarketingNotifications />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              {/* Reports Routes */}
              <Route path="/pos/reportes/productos" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <ProductSalesReport />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              {/* Delivery Routes */}
              <Route path="/pos/delivery" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <DeliveryDashboard />
                  </StaffLayout>
                </StaffProtectedRoute>
              } />
              
              <Route path="/pos/delivery/historial" element={
                <StaffProtectedRoute>
                  <StaffLayout>
                    <DeliveryHistory />
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
          </CartProvider>
        </CustomerAuthProvider>
      </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
