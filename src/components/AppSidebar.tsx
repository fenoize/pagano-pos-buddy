import { useState } from "react";
import { 
  Home, 
  ShoppingCart, 
  TrendingUp, 
  ChefHat, 
  Monitor,
  Package,
  Archive,
  Users,
  User,
  Settings,
  LogOut
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

const menuItems = [
  { title: "Escritorio", url: "/", icon: Home, roles: ['Administrador', 'Cajero'] },
  { title: "Nueva Venta", url: "/nueva-venta", icon: ShoppingCart, roles: ['Administrador', 'Cajero'] },
  { title: "Ventas", url: "/ventas", icon: TrendingUp, roles: ['Administrador', 'Cajero', 'Viewer'] },
  { title: "Cocina", url: "/cocina", icon: ChefHat, roles: ['Administrador', 'Cocinero', 'Preparador'] },
  { title: "Pedido Listo", url: "/pedido-listo", icon: Monitor, roles: ['Administrador', 'Cocinero', 'Preparador'] },
  { title: "Productos", url: "/productos", icon: Package, roles: ['Administrador'] },
  { title: "Inventario", url: "/inventario", icon: Archive, roles: ['Administrador'] },
  { title: "Clientes", url: "/clientes", icon: Users, roles: ['Administrador', 'Cajero'] },
  { title: "Usuarios", url: "/usuarios", icon: User, roles: ['Administrador'] },
  { title: "Configuración", url: "/configuracion", icon: Settings, roles: ['Administrador'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, logout } = useAuthContext();
  const currentPath = location.pathname;

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