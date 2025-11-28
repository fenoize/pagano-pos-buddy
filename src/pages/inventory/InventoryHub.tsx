import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Package, 
  Warehouse, 
  ShoppingCart, 
  BookOpen, 
  History, 
  Settings as SettingsIcon, 
  TrendingUp,
  ArrowRightLeft,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useStockBalances } from "@/hooks/useStockBalances";

export default function InventoryHub() {
  const navigate = useNavigate();
  const { canManageInventory, canViewInventory } = usePermissions();
  const { stats, loading: statsLoading } = useStockBalances();

  const modules = [
    {
      title: "Almacenes",
      description: "Gestión de ubicaciones físicas",
      icon: Warehouse,
      route: "/pos/inventario/almacenes",
      color: "text-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
      permission: canManageInventory,
    },
    {
      title: "Materias Primas",
      description: "Catálogo de insumos y materiales",
      icon: Package,
      route: "/pos/inventario/materias-primas",
      color: "text-green-600",
      bgColor: "bg-green-50 hover:bg-green-100",
      permission: canManageInventory,
    },
    {
      title: "Recetas",
      description: "Composición de productos",
      icon: BookOpen,
      route: "/pos/inventario/recetas",
      color: "text-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
      permission: canManageInventory,
    },
    {
      title: "Órdenes de Compra",
      description: "Recepciones y compras",
      icon: ShoppingCart,
      route: "/pos/inventario/compras",
      color: "text-orange-600",
      bgColor: "bg-orange-50 hover:bg-orange-100",
      permission: canManageInventory,
    },
    {
      title: "Kardex",
      description: "Historial de movimientos",
      icon: History,
      route: "/pos/inventario/kardex",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 hover:bg-indigo-100",
      permission: canViewInventory,
    },
    {
      title: "Ajustes",
      description: "Correcciones de inventario",
      icon: SettingsIcon,
      route: "/pos/inventario/ajustes",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 hover:bg-yellow-100",
      permission: canManageInventory,
    },
    {
      title: "Transferencias",
      description: "Movimientos entre almacenes",
      icon: ArrowRightLeft,
      route: "/pos/inventario/transferencias",
      color: "text-teal-600",
      bgColor: "bg-teal-50 hover:bg-teal-100",
      permission: canManageInventory,
    },
    {
      title: "Reportes",
      description: "Análisis y reportes",
      icon: TrendingUp,
      route: "/pos/inventario/reportes",
      color: "text-red-600",
      bgColor: "bg-red-50 hover:bg-red-100",
      permission: canViewInventory,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Gestión de Inventario</h1>
        <p className="text-muted-foreground mt-2">
          Sistema integral de control de stock y materias primas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules
          .filter((module) => module.permission)
          .map((module) => (
            <Card
              key={module.title}
              className={`cursor-pointer transition-all hover:shadow-lg ${module.bgColor}`}
              onClick={() => navigate(module.route)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${module.bgColor}`}>
                    <module.icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{module.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Materias Primas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {statsLoading ? "..." : stats.totalMaterials}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Activas en sistema</p>
          </CardContent>
        </Card>

        <Card className={stats.lowStockCount > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${stats.lowStockCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              Stock Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowStockCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {statsLoading ? "..." : stats.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Items bajo mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4 text-green-600" />
              Movimientos Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? "..." : stats.movementsToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Transacciones registradas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
