import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    User,
    Settings,
    Target,
    CreditCard,
    Bell,
    Globe,
    Palette,
    Smartphone,
    Lock,
    HelpCircle,
    ChevronLeft
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DashboardBackground } from '../components/dashboard/DashboardBackground';
import { motion } from 'framer-motion';

const sidebarItems = [
    { icon: <User className="w-5 h-5" />, label: "My Profile", href: "/profile" },
    { icon: <Settings className="w-5 h-5" />, label: "Account Settings", href: "/settings/account" },
    { icon: <Target className="w-5 h-5" />, label: "Goals & Preferences", href: "/settings/goals" },
    { icon: <CreditCard className="w-5 h-5" />, label: "Subscription & Billing", href: "/settings/billing" },
    { icon: <Bell className="w-5 h-5" />, label: "Notifications", href: "/settings/notifications" },
    { icon: <Globe className="w-5 h-5" />, label: "Language & Region", href: "/settings/language" },
    { icon: <Palette className="w-5 h-5" />, label: "Appearance", href: "/settings/appearance" },
    { icon: <Smartphone className="w-5 h-5" />, label: "Connected Devices", href: "/settings/devices" },
    { icon: <Lock className="w-5 h-5" />, label: "Privacy & Security", href: "/settings/privacy" },
    { icon: <HelpCircle className="w-5 h-5" />, label: "Help & Support", href: "/help" },
];

export const SettingsLayout: React.FC = () => {
    return (
        <DashboardBackground>
            <div className="flex flex-col min-h-screen">
                {/* Simple Header for Settings */}
                <header className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-xl flex items-center px-6 sticky top-0 z-50">
                    <NavLink to="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold tracking-tight">Back to Dashboard</span>
                    </NavLink>
                </header>

                <div className="flex-grow max-w-[1400px] mx-auto w-full px-6 py-10 flex flex-col md:flex-row gap-10">
                    {/* Sidebar */}
                    <aside className="w-full md:w-80 shrink-0">
                        <div className="sticky top-32 space-y-2">
                            <h2 className="text-2xl font-black text-white px-4 mb-6 tracking-tight">Settings</h2>
                            {sidebarItems.map((item) => (
                                <NavLink
                                    key={item.label}
                                    to={item.href}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group",
                                        isActive
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                            : "text-white/50 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <span className={cn(
                                        "transition-colors",
                                        "group-hover:text-blue-400 group-[.active]:text-white"
                                    )}>
                                        {item.icon}
                                    </span>
                                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    </aside>

                    {/* Page Content */}
                    <main className="flex-grow min-w-0">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Outlet />
                        </motion.div>
                    </main>
                </div>
            </div>
        </DashboardBackground>
    );
};
