import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../lib/NotificationsContext';
import { NotificationList } from '../notifications/NotificationList';
import { cn } from '../../lib/utils';

export const NotificationBell = () => {
    const { unreadCount } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const bellRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative z-50" ref={bellRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-3 rounded-xl transition-all duration-300 group",
                    isOpen ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "text-white/60 hover:text-white hover:bg-white/10"
                )}
            >
                <Bell className={cn("w-5 h-5 transition-transform", isOpen ? "scale-110" : "group-hover:scale-110")} />

                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-black"></span>
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-4 origin-top-right"
                    >
                        <NotificationList />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
