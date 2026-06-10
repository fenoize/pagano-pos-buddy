import { Badge } from '@/components/ui/badge';
import { Store, Smartphone, Globe, Bike, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSalesChannels } from '@/hooks/useSalesChannels';

interface OrderSourceBadgeProps {
  source?: string | null;
  /** Optional dynamic channel slug from orders.sales_channel_slug — preferred when present */
  channelSlug?: string | null;
  /** Optional external order id (delivery app) — appended in muted text after the badge */
  externalOrderId?: string | null;
  /** If true, only the icon is shown (used on mobile to save space) */
  iconOnly?: boolean;
  className?: string;
}

function pickIcon(type?: string) {
  switch (type) {
    case 'delivery_app':
      return Bike;
    case 'web':
      return Globe;
    case 'phone':
      return Phone;
    case 'local':
    default:
      return Store;
  }
}

export function OrderSourceBadge({
  source,
  channelSlug,
  externalOrderId,
  iconOnly = false,
  className,
}: OrderSourceBadgeProps) {
  const { channels } = useSalesChannels();
  const channel = channelSlug ? channels.find((c) => c.slug === channelSlug) : undefined;

  if (channel) {
    const Icon = pickIcon(channel.type);
    const color = channel.color ?? '#475569';
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <Badge
          className="gap-1 text-white hover:opacity-90"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-3 w-3" />
          {!iconOnly && <span>{channel.name}</span>}
        </Badge>
        {externalOrderId && !iconOnly && (
          <span className="text-xs font-mono text-muted-foreground">#{externalOrderId}</span>
        )}
      </span>
    );
  }

  // Legacy fallback based on the free-text `source` column
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

