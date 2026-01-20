import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    Check,
    Trash2,
    Shield,
    Zap,
    Users,
    Clock,
    ChevronRight,
    X,
    Filter
} from 'lucide-react';
import { useNotifications, Notification } from '../../lib/NotificationsContext';
import { cn } from '../../lib/utils';

const NotificationItem = ({ notification, onRead, onDelete }: { notification: Notification, onRead: (id: string) => void, onDelete: (id: string) => void }) => {
    const iconMap = {
        security: <Shield className="w-4 h-4 text-red-400" />,
        learning: <Zap className="w-4 h-4 text-blue-400" />,
        social: <Users className="w-4 h-4 text-green-400" />
    };

    const bgMap = {
        security: 'bg-red-500/10 border-red-500/10',
        learning: 'bg-blue-500/10 border-blue-500/10',
        social: 'bg-green-500/10 border-green-500/10'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
                "group relative p-4 rounded-2xl border mb-2 transition-all hover:bg-white/5",
                !notification.is_read ? bgMap[notification.type] : "bg-transparent border-white/5 opacity-60 hover:opacity-100"
            )}
            onClick={() => !notification.is_read && onRead(notification.id)}
        >
            <div className="flex gap-4">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    notification.type === 'security' ? 'bg-red-500/20' :
                        notification.type === 'learning' ? 'bg-blue-500/20' : 'bg-green-500/20'
                )}>
                    {iconMap[notification.type]}
                </div>

                <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                        <h4 className={cn("text-xs font-black uppercase tracking-wider", !notification.is_read ? "text-white" : "text-white/60")}>
                            {notification.title}
                        </h4>
                        <span className="text-[9px] font-bold text-white/20 whitespace-nowrap ml-2">
                            {/* Attempting safe date format */}
                            {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-white/80 leading-snug">
                        {notification.message}
                    </p>

                    {notification.action_link && (
                        <a href={notification.action_link} className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 mt-2">
                            View Details <ChevronRight className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.is_read && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
                        className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                        title="Mark as read"
                    >
                        <Check className="w-3 h-3" />
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
                    className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-red-500 hover:text-white transition-colors"
                    title="Remove"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>

            {!notification.is_read && (
                <div className="absolute right-4 bottom-4 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
        </motion.div>
    );
};

export const NotificationList = () => {
    const { notifications, unreadCount, markAllAsRead, markAsRead, deleteNotification, loading } = useNotifications();
    const [filter, setFilter] = React.useState<'all' | 'security' | 'learning' | 'social'>('all');

    const filtered = notifications.filter(n => filter === 'all' || n.type === filter);

    if (loading) return <div className="p-8 text-center text-white/20 text-xs font-black uppercase tracking-widest">Loading...</div>;

    return (
        <div className="w-[400px] h-[600px] flex flex-col bg-[#0a0a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl">
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black text-white uppercase italic tracking-wider">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => markAllAsRead()}
                        className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                        disabled={unreadCount === 0}
                    >
                        Mark All Read
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-2 grid grid-cols-4 gap-1 border-b border-white/5">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'security', label: 'Security' },
                    { id: 'learning', label: 'Learning' },
                    { id: 'social', label: 'Social' }
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={cn(
                            "py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            filter === f.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 text-center p-8 space-y-4">
                        <div className="p-4 rounded-full bg-white/5">
                            <Bell className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest">All caught up!</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filtered.map(n => (
                            <NotificationItem
                                key={n.id}
                                notification={n}
                                onRead={markAsRead}
                                onDelete={deleteNotification}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/5 bg-white/[0.02] text-center">
                <a href="/settings/notifications" className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors">
                    Manage Settings
                </a>
            </div>
        </div>
    );
};
