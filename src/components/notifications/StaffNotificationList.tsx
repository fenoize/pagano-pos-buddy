import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { StaffNotification } from '@/types/staffNotifications';
import { StaffNotificationItem } from './StaffNotificationItem';

interface StaffNotificationListProps {
  notifications: StaffNotification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export function StaffNotificationList({
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose
}: StaffNotificationListProps) {
  const hasUnread = notifications.some(n => !n.read_at);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h4 className="font-semibold text-sm">Notificaciones</h4>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onMarkAllAsRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No tienes notificaciones de los últimos 7 días
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="flex flex-col">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <StaffNotificationItem
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                />
                {index < notifications.length - 1 && (
                  <Separator className="mx-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
