import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import supabaseService from '../services/supabaseService.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

const mockNotifications = [
  {
    id: 'mock-1',
    title: 'Daily Goal Achieved!',
    message: 'You just hit your 30-minute learning goal. Great focus!',
    type: 'success',
    priority: 'high',
    createdAt: new Date().toISOString(),
    isRead: false,
    isVisible: true
  },
  {
    id: 'mock-2',
    title: 'Week Warrior unlocked',
    message: '۷ روز متوالی تمرین داشتی! ادامه بده 👏',
    type: 'achievement',
    priority: 'normal',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    isRead: false,
    isVisible: true
  },
  {
    id: 'mock-3',
    title: 'Lesson Reminder',
    message: 'Pronunciation boost lesson is waiting whenever you are ready.',
    type: 'reminder',
    priority: 'low',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    isRead: true,
    isVisible: true
  }
];

const sortNotifications = (rows = []) =>
  [...rows].sort(
    (a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()
  );

export const NotificationProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isHydrated, setIsHydrated] = useState(false);
  const [channelStatus, setChannelStatus] = useState('idle');
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  const normalizeNotification = useCallback((row) => ({
    id: row.id,
    title: row.title || row.content?.slice(0, 48) || 'Notification',
    message: row.content || row.message || '',
    type: row.type || 'info',
    priority: row.priority || 'normal',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    isRead: row.is_read ?? row.isRead ?? false,
    isVisible: row.is_visible ?? row.isVisible ?? true,
    actionUrl: row.action_url || row.actionUrl || null,
    metadata: row.metadata || {}
  }), []);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications(mockNotifications);
      setIsHydrated(true);
      return;
    }
    try {
      setError(null);
      const result = await supabaseService.getNotifications(40);
      if (result.success) {
        const hydrated = sortNotifications(
          result.data.map((row) => normalizeNotification(row))
        );
        setNotifications(hydrated);
      } else {
        setNotifications(mockNotifications);
        setError(result.error || 'Unable to load notifications');
      }
    } catch (err) {
      console.error('Notification bootstrap error:', err);
      setNotifications(mockNotifications);
      setError(err.message);
    } finally {
      setIsHydrated(true);
    }
  }, [user, normalizeNotification]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) {
      subscriptionRef.current?.unsubscribe?.();
      subscriptionRef.current = null;
      setChannelStatus('idle');
      return;
    }
    const channel = supabaseService.subscribeToNotifications(
      user.id,
      (payload) => {
        const row = payload.new || payload.old;
        if (!row) return;
        if (payload.eventType === 'DELETE') {
          setNotifications((prev) => prev.filter((item) => item.id !== payload.old?.id));
          return;
        }
        const normalized = normalizeNotification(row);
        setNotifications((prev) => {
          const exists = prev.some((item) => item.id === normalized.id);
          const next = exists
            ? prev.map((item) => (item.id === normalized.id ? normalized : item))
            : [normalized, ...prev];
          return sortNotifications(next);
        });
      },
      (status) => setChannelStatus(status?.toLowerCase?.() || status || 'idle')
    );
    subscriptionRef.current = channel;
    return () => {
      channel?.unsubscribe?.();
      subscriptionRef.current = null;
    };
  }, [user, normalizeNotification]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item))
    );
    const result = await supabaseService.markNotificationRead(notificationId, true);
    if (!result.success) {
      setError(result.error || 'Failed to update notification');
      // Reload from server to keep state aligned
      loadNotifications();
    }
  }, [loadNotifications]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.isRead && n.isVisible !== false).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    const result = await supabaseService.markNotificationsRead(unreadIds);
    if (!result.success) {
      setError(result.error || 'Failed to mark notifications as read');
      loadNotifications();
    }
  }, [notifications, loadNotifications]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => item.isVisible !== false),
    [notifications]
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((item) => !item.isRead).length,
    [visibleNotifications]
  );

  const highlightedNotification = useMemo(
    () => visibleNotifications.find((item) => !item.isRead) || visibleNotifications[0] || null,
    [visibleNotifications]
  );

  const value = useMemo(() => ({
    notifications: visibleNotifications,
    unreadCount,
    highlightedNotification,
    isLoading: !isHydrated && !authLoading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
    connectionState: channelStatus
  }), [
    visibleNotifications,
    unreadCount,
    highlightedNotification,
    isHydrated,
    authLoading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    channelStatus
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

