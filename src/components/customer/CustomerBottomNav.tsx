import { NavLink } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingCart, Package, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

export function CustomerBottomNav() {
  const { itemCount } = useCart();

  const navItems = [
    {
      to: '/portal',
      icon: Home,
      label: 'Inicio'
    },
    {
      to: '/menu',
      icon: UtensilsCrossed,
      label: 'Menú'
    },
    {
      to: '/cart',
      icon: ShoppingCart,
      label: 'Carrito',
      badge: itemCount > 0 ? itemCount : undefined
    },
    {
      to: '/my-orders',
      icon: Package,
      label: 'Pedidos'
    },
    {
      to: '/benefits',
      icon: Award,
      label: 'Beneficios'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors flex-1 relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                      variant="destructive"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn('text-xs font-medium', isActive && 'text-primary')}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
