import { useState } from "react";
import { 
  Home, 
  ShoppingCart, 
  TrendingUp, 
  ChefHat, 
  Monitor,
  Package,
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
  ChevronRight
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const menuItems = [
  { title: "Escritorio", url: "/pos", icon: Home, roles: ['Administrador', 'Cajero'] },
  { title: "Nueva Venta", url: "/pos/nueva-venta", icon: ShoppingCart, roles: ['Administrador', 'Cajero'] },
  { title: "Ventas", url: "/pos/ventas", icon: TrendingUp, roles: ['Administrador', 'Cajero', 'Viewer'] },
  { title: "Cocina", url: "/pos/cocina", icon: ChefHat, roles: ['Administrador', 'Cocinero', 'Preparador'] },
  { title: "Pedido Listo", url: "/pos/pedido-listo", icon: Monitor, roles: ['Administrador', 'Cocinero', 'Preparador'] },
  { title: "Productos", url: "/pos/productos", icon: Package, roles: ['Administrador'] },
  { title: "Categorías", url: "/pos/categorias", icon: Tags, roles: ['Administrador'] },
  { title: "Clientes", url: "/pos/clientes", icon: Users, roles: ['Administrador', 'Cajero'] },
  { title: "Usuarios", url: "/pos/usuarios", icon: User, roles: ['Administrador'] },
  { title: "Cierres Diarios", url: "/pos/cierres-diarios", icon: FileText, roles: ['Administrador'] },
  { title: "Configuración", url: "/pos/configuracion", icon: Settings, roles: ['Administrador'] },
];

const inventoryItems = [
  { title: "Hub Inventario", url: "/pos/inventario", icon: Archive, roles: ['Administrador'] },
  { title: "Almacenes", url: "/pos/inventario/almacenes", icon: Warehouse, roles: ['Administrador'] },
  { title: "Materias Primas", url: "/pos/inventario/materias-primas", icon: Package, roles: ['Administrador'] },
  { title: "Recetas", url: "/pos/inventario/recetas", icon: BookOpen, roles: ['Administrador'] },
  { title: "Órdenes de Compra", url: "/pos/inventario/compras", icon: ShoppingCartIcon, roles: ['Administrador'] },
  { title: "Kardex", url: "/pos/inventario/kardex", icon: History, roles: ['Administrador'] },
  { title: "Ajustes", url: "/pos/inventario/ajustes", icon: SettingsIcon, roles: ['Administrador'] },
  { title: "Transferencias", url: "/pos/inventario/transferencias", icon: ArrowRightLeft, roles: ['Administrador'] },
  { title: "Reportes", url: "/pos/inventario/reportes", icon: TrendingUpIcon, roles: ['Administrador'] },
];

const financeItems = [
  { title: "Indicadores (KPIs)", url: "/pos/finanzas/kpis", icon: TrendingUpIcon, roles: ['Administrador', 'Cajero'] },
  { title: "Cierres Financieros", url: "/pos/finanzas/cierres", icon: FileText, roles: ['Administrador'] },
  { title: "Delivery", url: "/pos/finanzas/exportaciones", icon: TrendingUp, roles: ['Administrador', 'Cajero'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, logout } = useAuthContext();
  const currentPath = location.pathname;
  const [inventoryOpen, setInventoryOpen] = useState(
    currentPath.startsWith("/pos/inventario")
  );
  const [financeOpen, setFinanceOpen] = useState(
    currentPath.startsWith("/pos/finanzas")
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
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={handleLogout}
                 className="justify-start p-2 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
               >
                 <LogOut className="h-4 w-4" />
                 {!isCollapsed && <span className="ml-2">Cerrar Sesión</span>}
               </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}