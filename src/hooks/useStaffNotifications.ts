import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { StaffNotification } from '@/types/staffNotifications';

export function useStaffNotifications() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff_notifications')
        .select('*')
        .or(`user_id.eq.${user.id},role_target.eq.${user.role}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifs = (data || []) as StaffNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error fetching staff notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('staff_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user?.id]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('staff_notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user?.id, notifications]);

  // Handle new notification from realtime
  const handleNewNotification = useCallback((payload: any) => {
    const newNotif = payload.new as StaffNotification;
    
    // Check if this notification is for current user
    const isForUser = newNotif.user_id === user?.id;
    const isForRole = newNotif.role_target === user?.role;
    
    if (isForUser || isForRole) {
      setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);
      
      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {
        // Ignore audio errors
      }
    }
  }, [user?.id, user?.role]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('staff-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_notifications'
        },
        handleNewNotification
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications, handleNewNotification]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}
