import { useState, useEffect, useCallback, useRef } from 'react';
import { getStaffSupabaseClient } from '@/lib/supabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { StaffNotification } from '@/types/staffNotifications';

const POLLING_INTERVAL_MS = 4000;

export function useStaffNotifications() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !user?.role) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Use staff client which sends x-staff-token header
      const staff = getStaffSupabaseClient();
      
      const { data, error } = await staff
        .from('staff_notifications')
        .select('*')
        .or(`user_id.eq.${user.id},role_target.eq.${user.role}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching staff notifications:', error);
        return;
      }

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
      const staff = getStaffSupabaseClient();
      
      const { error } = await staff
        .from('staff_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

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

    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      const staff = getStaffSupabaseClient();
      
      const { error } = await staff
        .from('staff_notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user?.id, notifications]);

  // Setup polling instead of realtime (more reliable without Supabase Auth)
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Setup polling interval
    pollingRef.current = setInterval(fetchNotifications, POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}
