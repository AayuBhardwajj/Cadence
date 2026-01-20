import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useProfile } from './ProfileContext';

export interface Notification {
    id: string;
    type: 'security' | 'learning' | 'social';
    category: string;
    title: string;
    message: string;
    is_read: boolean;
    action_link?: string;
    created_at: string;
    metadata?: any;
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useProfile();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) {
            setLoading(false);
            setNotifications([]);
            return;
        }

        // Fetch initial
        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(50); // Limit to recent 50

            if (error) {
                console.error('Error fetching notifications:', error);
            } else {
                setNotifications(data || []);
            }
            setLoading(false);
        };

        fetchNotifications();

        // Real-time subscription
        const subscription = supabase
            .channel('notifications_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${profile.id}`
            }, (payload) => {
                const newNotif = payload.new as Notification;
                setNotifications((prev) => [newNotif, ...prev]);

                // Optional: Browser Notification or Toast
                // new Audio('/sounds/notification.mp3').play().catch(() => {});
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [profile?.id]);

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) console.error('Error marking as read:', error);
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', profile?.id)
            .eq('is_read', false);

        if (error) console.error('Error marking all as read:', error);
    };

    const deleteNotification = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) console.error('Error deleting notification:', error);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationsContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            markAsRead,
            markAllAsRead,
            deleteNotification
        }}>
            {children}
        </NotificationsContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};
