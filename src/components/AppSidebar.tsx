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
  Tv
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

const menuItems = [
  { title: "Escritorio", url: "/pos", icon: Home, roles: ['Administrador', 'Cajero'] },
  { title: "Nueva Venta", url: "/pos/nueva-venta", icon: ShoppingCart, roles: ['Administrador', 'Cajero'] },
  { title: "Ventas", url: "/pos/ventas", icon: TrendingUp, roles: ['Administrador', 'Cajero', 'Viewer'] },
  { title: "Cocina", url: "/pos/cocina", icon: ChefHat, roles: ['Administrador', 'Cocinero', 'Preparador'] },
  { title: "Pedido Listo", url: "/pos/pedido-listo", icon: Monitor, roles: ['Administrador', 'Cocinero', 'Preparador', 'TV'] },
  { title: "Productos", url: "/pos/productos", icon: Package, roles: ['Administrador'] },
  { title: "Categorías", url: "/pos/categorias", icon: Tags, roles: ['Administrador'] },
  { title: "Fidelización", url: "/pos/fidelizacion", icon: Star, roles: ['Administrador'] },
  { title: "Clientes", url: "/pos/clientes", icon: Users, roles: ['Administrador', 'Cajero'] },
  { title: "Usuarios", url: "/pos/usuarios", icon: User, roles: ['Administrador'] },
  { title: "Cierres Diarios", url: "/pos/cierres-diarios", icon: FileText, roles: ['Administrador'] },
  { title: "Configuración", url: "/pos/configuracion", icon: Settings, roles: ['Administrador'] },
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
  { title: "Cierres Financieros", url: "/pos/finanzas/cierres", icon: FileText, roles: ['Administrador'] },
  { title: "Deliverys", url: "/pos/finanzas/deliverys", icon: TrendingUp, roles: ['Administrador', 'Cajero'] },
  { title: "Configuración", url: "/pos/finanzas/configuracion", icon: SettingsIcon, roles: ['Administrador'] },
];

// Marketing menu items
const marketingItems = [
  { title: "Promos App", url: "/pos/marketing/promos-app", icon: Megaphone, roles: ['Administrador'] },
  { title: "Notificaciones", url: "/pos/marketing/notificaciones", icon: Bell, roles: ['Administrador'] },
  { title: "Contenido TV", url: "/pos/marketing/contenido-tv", icon: Tv, roles: ['Administrador'] },
];

// Reports menu items
const reportItems = [
  { title: "Productos", url: "/pos/reportes/productos", icon: TrendingUpIcon, roles: ['Administrador', 'Cajero'] },
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
  const [marketingOpen, setMarketingOpen] = useState(
    currentPath.startsWith("/pos/marketing")
  );
  const [reportsOpen, setReportsOpen] = useState(
    currentPath.startsWith("/pos/reportes")
  );

  const isCollapsed = state === "collapsed";
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-sm" 
      : "text-primary hover:bg-primary hover:text-primary-foreground transition-colors";

  const canAccessRoute = (roles: AppRole[]) => {
    return user?.role && roles.includes(user.role);
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
            <SidebarMenu>
              {menuItems
                .filter(item => canAccessRoute(item.roles as AppRole[]))
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink 
                       to={item.url} 
                       end 
                       className={({ isActive }) => 
                         `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${getNavCls({ isActive })}`
                       }
                     >
                       <item.icon className="h-4 w-4 shrink-0" />
                       {!isCollapsed && <span>{item.title}</span>}
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Delivery Collapsible Group */}
              {canAccessRoute(['Administrador', 'Reparto'] as AppRole[]) && (
                <Collapsible
                  open={deliveryOpen}
                  onOpenChange={setDeliveryOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          currentPath.startsWith("/pos/delivery")
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-primary hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <TruckIcon className="h-4 w-4 shrink-0" />
                          {!isCollapsed && <span>Delivery</span>}
                        </div>
                        {!isCollapsed && (
                          currentPath.startsWith("/pos/delivery") ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!isCollapsed && (
                      <CollapsibleContent className="mt-1 space-y-1">
                        {deliveryItems
                          .filter(item => canAccessRoute(item.roles as AppRole[]))
                          .map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className={({ isActive }) =>
                                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm pl-10 transition-colors ${getNavCls({ isActive })}`
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
              )}
              
              {/* Inventario Collapsible Group */}
              {canAccessRoute(['Administrador'] as AppRole[]) && (
                <Collapsible
                  open={inventoryOpen}
                  onOpenChange={setInventoryOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          currentPath.startsWith("/pos/inventario")
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-primary hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Archive className="h-4 w-4 shrink-0" />
                          {!isCollapsed && <span>Inventario</span>}
                        </div>
                        {!isCollapsed && (
                          inventoryOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!isCollapsed && (
                      <CollapsibleContent className="mt-1 space-y-1">
                        {inventoryItems
                          .filter(item => canAccessRoute(item.roles as AppRole[]))
                          .map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className={({ isActive }) =>
                                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm pl-10 transition-colors ${getNavCls({ isActive })}`
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
              )}
              
              {/* Finanzas Collapsible Group */}
              {canAccessRoute(['Administrador', 'Cajero'] as AppRole[]) && (
                <Collapsible
                  open={financeOpen}
                  onOpenChange={setFinanceOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          currentPath.startsWith("/pos/finanzas")
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-primary hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <TrendingUpIcon className="h-4 w-4 shrink-0" />
                          {!isCollapsed && <span>Finanzas</span>}
                        </div>
                        {!isCollapsed && (
                          financeOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!isCollapsed && (
                      <CollapsibleContent className="mt-1 space-y-1">
                        {financeItems
                          .filter(item => canAccessRoute(item.roles as AppRole[]))
                          .map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className={({ isActive }) =>
                                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm pl-10 transition-colors ${getNavCls({ isActive })}`
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
              )}
              
              {/* Marketing Collapsible Group */}
              {canAccessRoute(['Administrador'] as AppRole[]) && (
                <Collapsible
                  open={marketingOpen}
                  onOpenChange={setMarketingOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          currentPath.startsWith("/pos/marketing")
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-primary hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Megaphone className="h-4 w-4 shrink-0" />
                          {!isCollapsed && <span>Marketing</span>}
                        </div>
                        {!isCollapsed && (
                          marketingOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!isCollapsed && (
                      <CollapsibleContent className="mt-1 space-y-1">
                        {marketingItems
                          .filter(item => canAccessRoute(item.roles as AppRole[]))
                          .map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className={({ isActive }) =>
                                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm pl-10 transition-colors ${getNavCls({ isActive })}`
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
              )}
              
              {/* Reportes Collapsible Group */}
              {canAccessRoute(['Administrador', 'Cajero'] as AppRole[]) && (
                <Collapsible
                  open={reportsOpen}
                  onOpenChange={setReportsOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          currentPath.startsWith("/pos/reportes")
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-primary hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 className="h-4 w-4 shrink-0" />
                          {!isCollapsed && <span>Reportes</span>}
                        </div>
                        {!isCollapsed && (
                          reportsOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!isCollapsed && (
                      <CollapsibleContent className="mt-1 space-y-1">
                        {reportItems
                          .filter(item => canAccessRoute(item.roles as AppRole[]))
                          .map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end
                                className={({ isActive }) =>
                                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm pl-10 transition-colors ${getNavCls({ isActive })}`
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
              )}
            </SidebarMenu>
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