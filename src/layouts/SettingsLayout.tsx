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
import { Navbar } from '../components/navigation/Navbar';
import { useLanguage } from '../lib/LanguageContext';

interface SettingsLayoutProps {
    username?: string;
}

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


export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ username = "User" }) => {
    const { t } = useLanguage();

    const sidebarItems = [
        { icon: <User className="w-5 h-5" />, label: t('menu.my_profile'), href: "/profile" },
        { icon: <Settings className="w-5 h-5" />, label: t('menu.account_settings'), href: "/settings/account" },
        { icon: <Target className="w-5 h-5" />, label: t('menu.goals_preferences'), href: "/settings/goals" },
        { icon: <CreditCard className="w-5 h-5" />, label: t('menu.subscription_billing'), href: "/settings/billing" },
        { icon: <Bell className="w-5 h-5" />, label: t('menu.notifications'), href: "/settings/notifications" },
        { icon: <Globe className="w-5 h-5" />, label: t('menu.language_region'), href: "/settings/language" },
        { icon: <Palette className="w-5 h-5" />, label: t('menu.appearance'), href: "/settings/appearance" },
        { icon: <Smartphone className="w-5 h-5" />, label: t('menu.connected_devices'), href: "/settings/devices" },
        { icon: <Lock className="w-5 h-5" />, label: t('menu.privacy_security'), href: "/settings/privacy" },
        { icon: <HelpCircle className="w-5 h-5" />, label: t('menu.help_support'), href: "/help" },
    ];

    return (
        <DashboardBackground>
            <div className="flex flex-col min-h-screen">
                <Navbar username={username} />

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
                                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                                            : "text-white/50 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <span className={cn(
                                        "transition-colors",
                                        "group-hover:text-primary group-[.active]:text-white"
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
