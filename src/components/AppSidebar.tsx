import { useState } from "react";
import { 
  Home, 
  ShoppingCart, 
  TrendingUp, 
  ChefHat, 
  Monitor,
  Package,
  Boxes,
  Tags,
  Archive,
  Users,
  User,
  Settings,
  FileText,
  LogOut,
  Warehouse,
  BookOpen,
  History,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon,
  ArrowRightLeft,
  ShoppingCart as ShoppingCartIcon,
  ChevronDown,
  ChevronRight,
  Star,
  DollarSign,
  FileText as FileTextIcon,
  Building2,
  Megaphone,
  Bell,
  TruckIcon,
  BarChart3,
  Tv,
  Award,
  MessageSquare,
  Briefcase,
  Calendar,
  FlaskConical,
  Camera,
  LayoutDashboard
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { AppRole } from "@/types";
import { APP_VERSION } from "@/config/version";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/theme/ThemeToggle";


// Section 1: Resumen / Operación principal
const sectionMain = [
  { title: "Escritorio", url: "/pos", icon: Home, roles: ['Administrador', 'Cajero'] },
  { title: "Nueva Venta", url: "/pos/nueva-venta", icon: ShoppingCart, roles: ['Administrador', 'Cajero'] },
  { title: "Ventas", url: "/pos/ventas", icon: TrendingUp, roles: ['Administrador', 'Cajero', 'Viewer'] },
];

// Section 2: Cocina / Despacho (Delivery se inserta como collapsible)
const sectionKitchen = [
  { title: "Cocina", url: "/pos/cocina", icon: ChefHat, roles: ['Administrador', 'Cocinero', 'Preparador'] },
  { title: "Pedido Listo", url: "/pos/pedido-listo", icon: Monitor, roles: ['Administrador', 'Cocinero', 'Preparador', 'TV'] },
  { title: "Lector QR", url: "/pos/qr-reader", icon: Camera, roles: ['Administrador', 'Leer QR'] },
];

// Section 3: Catálogo (Inventario es collapsible)
const sectionCatalog = [
  { title: "Productos", url: "/pos/productos", icon: Package, roles: ['Administrador'] },
  { title: "Categorías", url: "/pos/categorias", icon: Tags, roles: ['Administrador'] },
];

// Section 4: Personas (RRHH collapsible)
const sectionPeople = [
  { title: "Clientes", url: "/pos/clientes", icon: Users, roles: ['Administrador', 'Cajero'] },
  { title: "Usuarios", url: "/pos/usuarios", icon: User, roles: ['Administrador'] },
];

// Section 5: Finanzas (Finanzas y Reportes son collapsibles)
const sectionFinanceTop = [
  { title: "Cierres Diarios", url: "/pos/cierres-diarios", icon: FileText, roles: ['Administrador'] },
];

// Section 7: Personal del usuario actual
const sectionPersonal = [
  { title: "Mi Calendario", url: "/pos/mi-calendario", icon: Calendar, roles: ['Administrador', 'Cajero', 'Cocinero', 'Preparador', 'Reparto', 'Caja', 'Cocina', 'Viewer'] },
];

// Section 8: Configuración
const sectionConfig = [
  { title: "Configuración", url: "/pos/configuracion", icon: Settings, roles: ['Administrador'] },
  { title: "Locales", url: "/pos/configuracion/locales", icon: Building2, roles: ['Administrador'] },
  { title: "Mi Configuración", url: "/pos/mi-configuracion", icon: Settings, roles: ['Cajero', 'Cocinero', 'Preparador', 'Reparto', 'Caja', 'Cocina', 'Viewer', 'Leer QR'] },
];

// Fidelización menu items
const fidelizacionItems = [
  { title: "Runas", url: "/pos/fidelizacion/runas", icon: Star, roles: ['Administrador'] },
  { title: "Niveles", url: "/pos/fidelizacion/niveles", icon: TrendingUpIcon, roles: ['Administrador'] },
  { title: "Insignias", url: "/pos/fidelizacion/insignias", icon: Award, roles: ['Administrador'] },
  { title: "Campañas", url: "/pos/fidelizacion/campanas", icon: Megaphone, roles: ['Administrador'] },
  { title: "Feedback", url: "/pos/fidelizacion/feedback", icon: MessageSquare, roles: ['Administrador'] },
];

// Delivery menu items
const deliveryItems = [
  { title: "Pedidos en Curso", url: "/pos/delivery", icon: TruckIcon, roles: ['Administrador', 'Reparto'] },
  { title: "Mis Deliverys", url: "/pos/delivery/historial", icon: History, roles: ['Administrador', 'Reparto'] },
  { title: "Mis Pagos", url: "/pos/delivery/pagos", icon: DollarSign, roles: ['Administrador', 'Reparto'] },
];

const inventoryItems = [
  { title: "Hub Inventario", url: "/pos/inventario", icon: Archive, roles: ['Administrador'] },
  { title: "Stock", url: "/pos/inventario/stock", icon: Boxes, roles: ['Administrador'] },
  { title: "Almacenes", url: "/pos/inventario/almacenes", icon: Warehouse, roles: ['Administrador'] },
  { title: "Materias Primas", url: "/pos/inventario/materias-primas", icon: Package, roles: ['Administrador'] },
  { title: "Recetas", url: "/pos/inventario/recetas", icon: BookOpen, roles: ['Administrador'] },
  { title: "Fabricación", url: "/pos/inventario/fabricacion", icon: FlaskConical, roles: ['Administrador'] },
  { title: "Solicitudes de Compra", url: "/pos/inventario/solicitudes", icon: FileText, roles: ['Administrador'] },
  { title: "Órdenes de Compra", url: "/pos/inventario/compras", icon: ShoppingCartIcon, roles: ['Administrador'] },
  { title: "Kardex", url: "/pos/inventario/kardex", icon: History, roles: ['Administrador'] },
  { title: "Ajustes", url: "/pos/inventario/ajustes", icon: SettingsIcon, roles: ['Administrador'] },
  { title: "Transferencias", url: "/pos/inventario/transferencias", icon: ArrowRightLeft, roles: ['Administrador'] },
  { title: "Reportes", url: "/pos/inventario/reportes", icon: TrendingUpIcon, roles: ['Administrador'] },
];

// Finance menu items with icons
const financeItems = [
  { title: "Indicadores (KPIs)", url: "/pos/finanzas/kpis", icon: TrendingUpIcon, roles: ['Administrador', 'Cajero'] },
  { title: "Cuentas", url: "/pos/finanzas/cuentas", icon: DollarSign, roles: ['Administrador'] },
  { title: "Proveedores", url: "/pos/finanzas/proveedores", icon: Building2, roles: ['Administrador'] },
  { title: "Gastos Fijos", url: "/pos/finanzas/gastos-fijos", icon: Building2, roles: ['Administrador'] },
  { title: "Egresos", url: "/pos/finanzas/egresos", icon: FileTextIcon, roles: ['Administrador', 'Cajero'] },
  { title: "Movimientos", url: "/pos/finanzas/movimientos", icon: ArrowRightLeft, roles: ['Administrador'] },
  { title: "Cierres Financieros", url: "/pos/finanzas/cierres", icon: FileText, roles: ['Administrador'] },
  { title: "Deliverys", url: "/pos/finanzas/deliverys", icon: TrendingUp, roles: ['Administrador', 'Cajero'] },
  { title: "Configuración", url: "/pos/finanzas/configuracion", icon: SettingsIcon, roles: ['Administrador'] },
];

// Marketing menu items
const marketingItems = [
  { title: "Promos App", url: "/pos/marketing/promos-app", icon: Megaphone, roles: ['Administrador'] },
  { title: "Alianzas", url: "/pos/marketing/alianzas", icon: Building2, roles: ['Administrador'] },
  { title: "Notificaciones", url: "/pos/marketing/notificaciones", icon: Bell, roles: ['Administrador'] },
  { title: "Contenido TV", url: "/pos/marketing/contenido-tv", icon: Tv, roles: ['Administrador'] },
];

// Reports menu items
const reportItems = [
  { title: "Escritorio", url: "/pos/reportes/escritorio", icon: LayoutDashboard, roles: ['Administrador'] },
  { title: "Productos", url: "/pos/reportes/productos", icon: TrendingUpIcon, roles: ['Administrador', 'Cajero'] },
];

// RRHH menu items
const rrhhItems = [
  { title: "Resumen", url: "/pos/rrhh/resumen", icon: BarChart3, roles: ['Administrador'] },
  { title: "Turnos", url: "/pos/rrhh/turnos", icon: Users, roles: ['Administrador'] },
  { title: "Liquidaciones", url: "/pos/rrhh/liquidaciones", icon: DollarSign, roles: ['Administrador'] },
  { title: "Ajustes", url: "/pos/rrhh/ajustes", icon: TrendingUpIcon, roles: ['Administrador'] },
  { title: "Configuración", url: "/pos/rrhh/configuracion", icon: SettingsIcon, roles: ['Administrador'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, logout } = useAuthContext();
  const currentPath = location.pathname;
  const [deliveryOpen, setDeliveryOpen] = useState(
    currentPath.startsWith("/pos/delivery")
  );
  const [inventoryOpen, setInventoryOpen] = useState(
    currentPath.startsWith("/pos/inventario")
  );
  const [financeOpen, setFinanceOpen] = useState(
    currentPath.startsWith("/pos/finanzas")
  );
  const [fidelizacionOpen, setFidelizacionOpen] = useState(
    currentPath.startsWith("/pos/fidelizacion")
  );
  const [marketingOpen, setMarketingOpen] = useState(
    currentPath.startsWith("/pos/marketing")
  );
  const [reportsOpen, setReportsOpen] = useState(
    currentPath.startsWith("/pos/reportes")
  );
  const [rrhhOpen, setRrhhOpen] = useState(
    currentPath.startsWith("/pos/rrhh")
  );

  const isCollapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
      : "text-primary hover:bg-primary hover:text-primary-foreground transition-colors";

  const canAccessRoute = (roles: AppRole[]) => {
    if (!user) return false;
    // Check all assigned roles (multi-role support)
    const userRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
    return userRoles.some(r => roles.includes(r));
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-bold text-center">
            {!isCollapsed ? "Paganos POS" : "P"}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            {(() => {
              const renderLinks = (items: typeof sectionMain) =>
                items
                  .filter(item => canAccessRoute(item.roles as AppRole[]))
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-md px-3 py-0.5 text-sm font-medium transition-colors ${getNavCls({ isActive })}`
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ));

              const renderCollapsible = (
                key: string,
                label: string,
                Icon: any,
                pathPrefix: string,
                open: boolean,
                setOpen: (v: boolean) => void,
                items: { title: string; url: string; icon: any; roles: string[] }[],
                allowedRoles: AppRole[],
              ) => {
                if (!canAccessRoute(allowedRoles)) return null;
                return (
                  <Collapsible
                    key={key}
                    open={open}
                    onOpenChange={setOpen}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={`flex items-center justify-between gap-3 rounded-md px-3 py-0.5 text-sm font-medium transition-colors ${
                            currentPath.startsWith(pathPrefix)
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-primary hover:bg-primary hover:text-primary-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span>{label}</span>}
                          </div>
                          {!isCollapsed && (
                            open ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {!isCollapsed && (
                        <CollapsibleContent className="mt-0.5 space-y-0.5">
                          {items
                            .filter(item => canAccessRoute(item.roles as AppRole[]))
                            .map((item) => (
                              <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                  <NavLink
                                    to={item.url}
                                    end
                                    className={({ isActive }) =>
                                      `flex items-center gap-3 rounded-md px-3 py-0.5 text-sm pl-10 transition-colors ${getNavCls({ isActive })}`
                                    }
                                  >
                                    <item.icon className="h-3 w-3 shrink-0" />
                                    <span className="text-xs">{item.title}</span>
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                );
              };

              const sep = (k: string) => (
                <SidebarSeparator key={k} className="my-0.5" />
              );

              const deliveryGroup = renderCollapsible(
                'delivery', 'Delivery', TruckIcon, '/pos/delivery',
                deliveryOpen, setDeliveryOpen, deliveryItems,
                ['Administrador', 'Reparto'] as AppRole[],
              );
              const inventoryGroup = renderCollapsible(
                'inventario', 'Inventario', Archive, '/pos/inventario',
                inventoryOpen, setInventoryOpen, inventoryItems,
                ['Administrador'] as AppRole[],
              );
              const rrhhGroup = renderCollapsible(
                'rrhh', 'RRHH', Briefcase, '/pos/rrhh',
                rrhhOpen, setRrhhOpen, rrhhItems,
                ['Administrador'] as AppRole[],
              );
              const financeGroup = renderCollapsible(
                'finanzas', 'Finanzas', TrendingUpIcon, '/pos/finanzas',
                financeOpen, setFinanceOpen, financeItems,
                ['Administrador', 'Cajero'] as AppRole[],
              );
              const reportsGroup = renderCollapsible(
                'reportes', 'Reportes', BarChart3, '/pos/reportes',
                reportsOpen, setReportsOpen, reportItems,
                ['Administrador', 'Cajero'] as AppRole[],
              );
              const marketingGroup = renderCollapsible(
                'marketing', 'Marketing', Megaphone, '/pos/marketing',
                marketingOpen, setMarketingOpen, marketingItems,
                ['Administrador'] as AppRole[],
              );
              const fidelizacionGroup = renderCollapsible(
                'fidelizacion', 'Fidelización', Star, '/pos/fidelizacion',
                fidelizacionOpen, setFidelizacionOpen, fidelizacionItems,
                ['Administrador'] as AppRole[],
              );

              return (
                <SidebarMenu>
                  {renderLinks(sectionMain)}

                  {sep('s1')}
                  {renderLinks(sectionCatalog)}
                  {inventoryGroup}

                  {sep('s2')}
                  {renderLinks(sectionPeople)}
                  {rrhhGroup}

                  {sep('s3')}
                  {renderLinks(sectionKitchen)}
                  {deliveryGroup}

                  {sep('s4')}
                  {renderLinks(sectionFinanceTop)}
                  {financeGroup}
                  {reportsGroup}

                  {sep('s5')}
                  {marketingGroup}
                  {fidelizacionGroup}

                  {sep('s6')}
                  {renderLinks(sectionPersonal)}

                  {sep('s7')}
                  {renderLinks(sectionConfig)}
                </SidebarMenu>
              );
            })()}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2 p-2">
              {!isCollapsed && user && (
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium">{user.username}</div>
                  <div>{user.role}</div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <ThemeToggle variant="icon" className="h-8 w-8" />
                <Button
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="flex-1 justify-start p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span className="ml-2">Cerrar Sesión</span>}
                </Button>
              </div>
              {!isCollapsed && (
                <div className="text-xs text-muted-foreground text-center border-t pt-2">
                  v{APP_VERSION}
                </div>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}