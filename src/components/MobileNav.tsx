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
  TruckIcon,
  Briefcase,
  Camera
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { AppRole } from "@/types";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Inicio", url: "/pos", icon: Home, roles: ['Administrador', 'Cajero'] },
  { title: "Venta", url: "/pos/nueva-venta", icon: ShoppingCart, roles: ['Administrador', 'Cajero'] },
  { title: "Ventas", url: "/pos/ventas", icon: TrendingUp, roles: ['Administrador', 'Cajero', 'Viewer'] },
  { title: "Cocina", url: "/pos/cocina", icon: ChefHat, roles: ['Administrador', 'Cocinero', 'Preparador'] },
  { title: "Delivery", url: "/pos/delivery", icon: TruckIcon, roles: ['Administrador', 'Reparto'] },
  { title: "Lector QR", url: "/pos/qr-reader", icon: Camera, roles: ['Leer QR'] },
  { title: "RRHH", url: "/pos/rrhh/turnos", icon: Briefcase, roles: ['Administrador'] },
];

export function MobileNav() {
  const location = useLocation();
  const { user } = useAuthContext();
  const currentPath = location.pathname;

  const canAccessRoute = (roles: AppRole[]) => {
    if (!user) return false;
    const userRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
    return userRoles.some(r => roles.includes(r));
  };

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex justify-around items-center py-2">
        {menuItems
          .filter(item => canAccessRoute(item.roles as AppRole[]))
          .map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0",
                isActive(item.url)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate">{item.title}</span>
            </NavLink>
          ))}
      </div>
    </nav>
  );
}