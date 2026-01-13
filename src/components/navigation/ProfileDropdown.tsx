import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Settings,
    BarChart2,
    Target,
    Trophy,
    History,
    CreditCard,
    Bell,
    Globe,
    Palette,
    Smartphone,
    Lock,
    HelpCircle,
    LogOut,
    ChevronRight,
    Mail
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface ProfileDropdownProps {
    user: {
        username: string;
        email: string;
        avatar_url?: string;
    };
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const menuItems = [
        { icon: <User className="w-4 h-4" />, label: "My Profile", href: "/profile" },
        { icon: <Settings className="w-4 h-4" />, label: "Account Settings", href: "/settings/account" },
        { icon: <BarChart2 className="w-4 h-4" />, label: "Learning Analytics", href: "/analytics" },
        { icon: <Target className="w-4 h-4" />, label: "Goals & Preferences", href: "/settings/goals" },
        { icon: <Trophy className="w-4 h-4" />, label: "Achievements & Badges", href: "/achievements" },
        { icon: <History className="w-4 h-4" />, label: "Learning History", href: "/history" },
        { icon: <CreditCard className="w-4 h-4" />, label: "Subscription & Billing", href: "/settings/billing" },
        { icon: <Bell className="w-4 h-4" />, label: "Notifications", href: "/settings/notifications" },
        { icon: <Globe className="w-4 h-4" />, label: "Language & Region", href: "/settings/language" },
        { icon: <Palette className="w-4 h-4" />, label: "Appearance", href: "/settings/appearance" },
        { icon: <Smartphone className="w-4 h-4" />, label: "Connected Devices", href: "/settings/devices" },
        { icon: <Lock className="w-4 h-4" />, label: "Privacy & Security", href: "/settings/privacy" },
        { icon: <HelpCircle className="w-4 h-4" />, label: "Help & Support", href: "/help" },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all active:scale-95 group"
            >
                <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-sm text-white ring-2 ring-white/10 group-hover:ring-white/20 transition-all">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            user.username[0].toUpperCase()
                        )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0a0a1a] rounded-full" />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 mt-3 w-72 bg-slate-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100]"
                    >
                        {/* User Header */}
                        <div className="p-5 border-b border-white/5 bg-white/5">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-bold text-white tracking-tight">{user.username}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-3 h-3 text-white/40" />
                                    <span className="text-xs text-white/40 truncate">{user.email}</span>
                                </div>
                            </div>
                        </div>

                        {/* Menu List */}
                        <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {menuItems.map((item, index) => (
                                <Link
                                    key={item.label}
                                    to={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="p-1.5 rounded-lg bg-white/5 text-white/50 group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-colors">
                                            {item.icon}
                                        </span>
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
                                </Link>
                            ))}
                        </div>

                        {/* Logout */}
                        <div className="p-2 border-t border-white/5 bg-white/5">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-400 hover:bg-red-400/10 rounded-xl transition-all group font-bold"
                            >
                                <div className="p-1.5 rounded-lg bg-red-400/5 text-red-400/50 group-hover:text-red-400 group-hover:bg-red-400/10 transition-colors">
                                    <LogOut className="w-4 h-4" />
                                </div>
                                Log Out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
