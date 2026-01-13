import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useStaffNotifications } from '@/hooks/useStaffNotifications';
import { StaffNotificationList } from './StaffNotificationList';
import { cn } from '@/lib/utils';

export function StaffNotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useStaffNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span 
              className={cn(
                "absolute -top-1 -right-1 flex items-center justify-center",
                "min-w-[18px] h-[18px] px-1 text-[10px] font-bold",
                "bg-destructive text-destructive-foreground rounded-full",
                "animate-in zoom-in-50 duration-200"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        sideOffset={8}
      >
        <StaffNotificationList
          notifications={notifications}
          loading={loading}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
