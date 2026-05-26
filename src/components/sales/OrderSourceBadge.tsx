import { Badge } from '@/components/ui/badge';
import { Store, Smartphone, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderSourceBadgeProps {
  source?: string | null;
  /** If true, only the icon is shown (used on mobile to save space) */
  iconOnly?: boolean;
  className?: string;
}

export function OrderSourceBadge({ source, iconOnly = false, className }: OrderSourceBadgeProps) {
  if (source === 'pos') {
    return (
      <Badge
        variant="secondary"
        className={cn(
          'gap-1 bg-slate-700 text-slate-100 hover:bg-slate-700 dark:bg-slate-800 dark:text-slate-100',
          className
        )}
      >
        <Store className="h-3 w-3" />
        {!iconOnly && <span>Tienda</span>}
      </Badge>
    );
  }

  if (source === 'web') {
    return (
      <Badge
        className={cn(
          'gap-1 bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
          className
        )}
      >
        <Globe className="h-3 w-3" />
        {!iconOnly && <span>Web</span>}
      </Badge>
    );
  }

  if (source === 'customer_app') {
    return (
      <Badge
        className={cn(
          'gap-1 bg-indigo-600 text-white hover:bg-indigo-600 dark:bg-indigo-500',
          className
        )}
      >
        <Smartphone className="h-3 w-3" />
        {!iconOnly && <span>App</span>}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <span>—</span>
    </Badge>
  );
}
