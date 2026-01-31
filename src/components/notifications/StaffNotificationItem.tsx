import { 
  Lock, 
  Unlock, 
  DollarSign, 
  Truck, 
  CheckCircle,
  Circle,
  Calendar,
  XCircle
} from 'lucide-react';
import { StaffNotification, StaffNotificationType, NOTIFICATION_TYPE_CONFIG } from '@/types/staffNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface StaffNotificationItemProps {
  notification: StaffNotification;
  onMarkAsRead: (id: string) => void;
}

const ICONS: Record<StaffNotificationType, React.ReactNode> = {
  cash_session_open: <Unlock className="h-4 w-4" />,
  cash_session_close: <Lock className="h-4 w-4" />,
  cash_movement: <DollarSign className="h-4 w-4" />,
  order_assigned: <Truck className="h-4 w-4" />,
  order_delivered: <CheckCircle className="h-4 w-4" />,
  shift_assigned: <Calendar className="h-4 w-4" />,
  shift_accepted: <CheckCircle className="h-4 w-4" />,
  shift_rejected: <XCircle className="h-4 w-4" />
};

export function StaffNotificationItem({ 
  notification, 
  onMarkAsRead 
}: StaffNotificationItemProps) {
  const isUnread = !notification.read_at;
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const icon = ICONS[notification.type];

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: es
  });

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left px-4 py-3 transition-colors hover:bg-muted/50",
        isUnread && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          "bg-muted",
          config.color
        )}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "text-sm font-medium truncate",
              isUnread && "text-foreground",
              !isUnread && "text-muted-foreground"
            )}>
              {notification.title}
            </p>
            {isUnread && (
              <Circle className="h-2 w-2 fill-primary text-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className={cn(
            "text-xs mt-0.5 line-clamp-2",
            isUnread ? "text-muted-foreground" : "text-muted-foreground/70"
          )}>
            {notification.body}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {timeAgo}
          </p>
        </div>
      </div>
    </button>
  );
}
