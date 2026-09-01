import { useState, type ElementType } from "react";
import {
  Home,
  ShoppingCart,
  TrendingUp,
  Users,
  MoreHorizontal,
  ChefHat,
  CheckCircle,
  QrCode,
  Truck,
  FileText,
  Package,
  LayoutGrid,
  Box,
  Star,
  Megaphone,
  IdCard,
  User,
  Calendar,
  CircleDollarSign,
  BarChart2,
  Settings,
  MapPin,
  X,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuthContext } from "@/contexts/AuthContext";
import { AppRole } from "@/types";
import { cn } from "@/lib/utils";

type NavItem = { title: string; url: string; icon: ElementType; roles: AppRole[] };

// Ítems fijos de la barra inferior
const barItems: NavItem[] = [
  { title: "Inicio", url: "/pos", icon: Home, roles: ['Administrador', 'Cajero'] },
  { title: "Ventas", url: "/pos/ventas", icon: TrendingUp, roles: ['Administrador', 'Cajero', 'Viewer'] },
  // posición 3: FAB Nueva venta
  { title: "Clientes", url: "/pos/clientes", icon: Users, roles: ['Administrador', 'Cajero'] },
];

const newSaleRoles: AppRole[] = ['Administrador', 'Cajero'];

// Panel "Más" — secciones (mismas rutas y roles que el sidebar)
type SheetSection = { label: string | null; items: NavItem[] };

const sheetSections: SheetSection[] = [
  {
    label: "Operaciones",
    items: [
      { title: "Cocina", url: "/pos/cocina", icon: ChefHat, roles: ['Administrador', 'Cocinero', 'Preparador'] },
      { title: "Pedido Listo", url: "/pos/pedido-listo", icon: CheckCircle, roles: ['Administrador', 'Cocinero', 'Preparador', 'TV'] },
      { title: "Lector QR", url: "/pos/qr-reader", icon: QrCode, roles: ['Administrador', 'Leer QR'] },
    ],
  },
  {
    label: "Ventas",
    items: [
      { title: "Delivery", url: "/pos/delivery", icon: Truck, roles: ['Administrador', 'Reparto'] },
      { title: "Cierres Diarios", url: "/pos/cierres-diarios", icon: FileText, roles: ['Administrador'] },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { title: "Productos", url: "/pos/productos", icon: Package, roles: ['Administrador'] },
      { title: "Categorías", url: "/pos/categorias", icon: LayoutGrid, roles: ['Administrador'] },
      { title: "Inventario", url: "/pos/inventario", icon: Box, roles: ['Administrador'] },
    ],
  },
  {
    label: "Fidelización",
    items: [
      { title: "Fidelización", url: "/pos/fidelizacion", icon: Star, roles: ['Administrador'] },
      { title: "Marketing", url: "/pos/marketing", icon: Megaphone, roles: ['Administrador'] },
    ],
  },
  {
    label: "Equipo",
    items: [
      { title: "RRHH", url: "/pos/rrhh", icon: IdCard, roles: ['Administrador'] },
      { title: "Usuarios", url: "/pos/usuarios", icon: User, roles: ['Administrador'] },
      { title: "Mi Calendario", url: "/pos/mi-calendario", icon: Calendar, roles: ['Administrador', 'Cajero', 'Cocinero', 'Preparador', 'Reparto', 'Viewer'] },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { title: "Finanzas", url: "/pos/finanzas", icon: CircleDollarSign, roles: ['Administrador', 'Cajero'] },
      { title: "Reportes", url: "/pos/reportes", icon: BarChart2, roles: ['Administrador', 'Cajero'] },
    ],
  },
  {
    label: null,
    items: [
      { title: "Configuración", url: "/pos/configuracion", icon: Settings, roles: ['Administrador'] },
      { title: "Locales", url: "/pos/configuracion/locales", icon: MapPin, roles: ['Administrador'] },
    ],
  },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const currentPath = location.pathname;
  const [moreOpen, setMoreOpen] = useState(false);

  const canAccessRoute = (roles: AppRole[]) => {
    if (!user) return false;
    const userRoles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
    return userRoles.some(r => roles.includes(r));
  };

  const isActive = (path: string) => currentPath === path;

  const visibleBarItems = barItems.filter(item => canAccessRoute(item.roles));
  const showFab = canAccessRoute(newSaleRoles);

  const visibleSections = sheetSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessRoute(item.roles)),
    }))
    .filter(section => section.items.length > 0);

  const handleSheetNavigate = (url: string) => {
    setMoreOpen(false);
    navigate(url);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex justify-around items-end py-2">
          {/* Ítems 1 y 2 */}
          {visibleBarItems.slice(0, 2).map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1",
                isActive(item.url)
                  ? "text-[#E11D2C]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate">{item.title}</span>
            </NavLink>
          ))}

          {/* Posición 3: FAB Nueva Venta */}
          {showFab && (
            <div className="flex flex-col items-center justify-end flex-1">
              <button
                onClick={() => navigate('/pos/nueva-venta')}
                aria-label="Nueva venta"
                className={cn(
                  "flex items-center justify-center rounded-full bg-[#E11D2C] text-white shadow-lg hover:bg-[#c41926] transition-colors",
                  "h-[52px] w-[52px] -mt-[18px]"
                )}
              >
                <ShoppingCart className="h-6 w-6" />
              </button>
              <span
                className={cn(
                  "text-xs font-medium mt-1",
                  isActive('/pos/nueva-venta') ? "text-[#E11D2C]" : "text-[#E11D2C]"
                )}
              >
                Nueva venta
              </span>
            </div>
          )}

          {/* Ítem 4 (Clientes) */}
          {visibleBarItems.slice(2).map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1",
                isActive(item.url)
                  ? "text-[#E11D2C]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate">{item.title}</span>
            </NavLink>
          ))}

          {/* Posición 5: Más */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1",
              moreOpen
                ? "text-[#E11D2C]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Más</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[82vh] rounded-t-2xl px-0 pb-6 flex flex-col [&>button]:hidden"
        >
          {/* Handle decorativo */}
          <div className="mx-auto mt-1 mb-2 h-1.5 w-10 rounded-full bg-muted-foreground/30 shrink-0" />

          <SheetHeader className="px-4 pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-medium text-muted-foreground">
                Menú
              </SheetTitle>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Cerrar menú"
                className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>
          <Separator className="shrink-0" />

          <div className="overflow-y-auto overscroll-contain px-2 py-2">
            {visibleSections.map((section, idx) => (
              <div key={section.label ?? `section-${idx}`}>
                {idx > 0 && <Separator className="my-2" />}
                {section.label && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section.label}
                  </div>
                )}
                {section.items.map((item) => {
                  const muted = section.label === null;
                  return (
                    <button
                      key={item.title}
                      onClick={() => handleSheetNavigate(item.url)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                        muted
                          ? "text-muted-foreground hover:bg-muted/60"
                          : "hover:bg-accent"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          muted ? "text-muted-foreground" : "text-muted-foreground"
                        )}
                      />
                      <span
                        className={cn(
                          "font-medium",
                          isActive(item.url) && !muted && "text-[#E11D2C]"
                        )}
                      >
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
