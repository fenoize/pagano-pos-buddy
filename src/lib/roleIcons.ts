import {
  ChefHat,
  Truck,
  CreditCard,
  Package,
  Headphones,
  Wrench,
  Users,
  Shield,
  Coffee,
  Utensils,
  ClipboardList,
  UserCog,
  Briefcase,
  type LucideIcon
} from 'lucide-react';

// Map role names (case-insensitive) to icons
const roleIconMap: Record<string, LucideIcon> = {
  // Kitchen roles
  'cocina': ChefHat,
  'cocinero': ChefHat,
  'chef': ChefHat,
  'parrillero': ChefHat,
  'preparador': ChefHat,
  'armador': Package,
  
  // Delivery roles
  'delivery': Truck,
  'reparto': Truck,
  'repartidor': Truck,
  'motorista': Truck,
  
  // Front of house
  'cajero': CreditCard,
  'caja': CreditCard,
  'mesero': Utensils,
  'mesera': Utensils,
  'garzón': Utensils,
  'garzona': Utensils,
  'atencion': Headphones,
  'atención': Headphones,
  'servicio': Coffee,
  
  // Management
  'encargado': ClipboardList,
  'supervisor': ClipboardList,
  'administrador': Shield,
  'admin': Shield,
  'gerente': UserCog,
  'manager': UserCog,
  
  // Support roles
  'mantenimiento': Wrench,
  'limpieza': Wrench,
  'bodega': Package,
  
  // Generic
  'auxiliar': Users,
  'apoyo': Users,
  'general': Briefcase,
};

/**
 * Get the appropriate icon for a role name
 * Falls back to Briefcase for unknown roles
 */
export function getRoleIcon(roleName: string): LucideIcon {
  const normalized = roleName.toLowerCase().trim();
  
  // Check exact match first
  if (roleIconMap[normalized]) {
    return roleIconMap[normalized];
  }
  
  // Check if role name contains any of the keywords
  for (const [keyword, icon] of Object.entries(roleIconMap)) {
    if (normalized.includes(keyword)) {
      return icon;
    }
  }
  
  // Default fallback
  return Briefcase;
}

/**
 * Get a color class for a role (for visual distinction)
 */
export function getRoleColorClass(roleName: string): string {
  const normalized = roleName.toLowerCase().trim();
  
  if (normalized.includes('cocina') || normalized.includes('chef') || normalized.includes('cocinero')) {
    return 'text-orange-600 dark:text-orange-400';
  }
  if (normalized.includes('delivery') || normalized.includes('reparto') || normalized.includes('repartidor')) {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (normalized.includes('caja') || normalized.includes('cajero')) {
    return 'text-green-600 dark:text-green-400';
  }
  if (normalized.includes('encargado') || normalized.includes('supervisor') || normalized.includes('gerente')) {
    return 'text-purple-600 dark:text-purple-400';
  }
  
  return 'text-muted-foreground';
}
