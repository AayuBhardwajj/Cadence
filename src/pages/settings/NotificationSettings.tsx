import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Bell,
    Mail,
    Smartphone,
    MessageSquare,
    Volume2,
    ShieldCheck,
    Zap,
    Clock,
    Settings,
    AlertTriangle,
    ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';
import { supabase } from '../../lib/supabase';

const NOTIFICATION_CATEGORIES = [
    {
        title: 'Learning & Activity',
        desc: 'Updates on your progress, goals, and practice streaks.',
        items: [
            { id: 'daily_reminder', label: 'Daily Practice Reminders', email: true, push: true, sms: false },
            { id: 'goal_milestones', label: 'Goal Milestones & Badges', email: true, push: true, sms: false },
            { id: 'weekly_report', label: 'Weekly Performance Reports', email: true, push: false, sms: false },
        ]
    },
    {
        title: 'Security & Account',
        desc: 'Critical updates about your account security and billing.',
        items: [
            { id: 'login_alerts', label: 'New Login Alerts', email: true, push: true, sms: true },
            { id: 'billing_notif', label: 'Billing & Subscription Status', email: true, push: true, sms: false },
            { id: 'security_audit', label: 'Security Audit Notifications', email: true, push: false, sms: false },
        ]
    },
    {
        title: 'Social & Community',
        desc: 'Interactions from friends and community updates.',
        items: [
            { id: 'friend_activity', label: 'Friend Practice Activity', email: false, push: true, sms: false },
            { id: 'leaderboard', label: 'Leaderboard Position Changes', email: false, push: true, sms: false },
            { id: 'new_features', label: 'New Feature Announcements', email: true, push: false, sms: false },
        ]
    }
];

export const NotificationSettings = () => {
    const [preferences, setPreferences] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPreferences = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('notification_preferences')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data) {
                    setPreferences(data);
                } else {
                    // Initialize if not exists
                    const defaultPrefs = {
                        user_id: user.id,
                        preferences: {
                            daily_reminder: true,
                            goal_milestones: true,
                            weekly_report: true,
                            login_alerts: true,
                            billing_notif: true,
                            security_audit: true,
                            friend_activity: true,
                            leaderboard: true,
                            new_features: true
                        }
                    };
                    const { data: newData } = await supabase
                        .from('notification_preferences')
                        .insert(defaultPrefs)
                        .select()
                        .single();
                    setPreferences(newData);
                }
            }
            setLoading(false);
        };
        fetchPreferences();
    }, []);

    const updatePreference = async (key: string, value: boolean, isChannel = false) => {
        if (!preferences) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let updates: any = {};
        if (isChannel) {
            updates[key] = value;
            setPreferences((prev: any) => ({ ...prev, [key]: value }));
        } else {
            const newPrefs = { ...preferences.preferences, [key]: value };
            updates = { preferences: newPrefs };
            setPreferences((prev: any) => ({ ...prev, preferences: newPrefs }));
        }

        await supabase
            .from('notification_preferences')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
    };

    if (loading) return <div className="p-10 text-center text-white">Loading settings...</div>;

    const getToggle = (id: string) => {
        // For individual items, check JSONB preferences
        return preferences?.preferences?.[id] ?? false;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Notifications</h1>
                    <p className="text-white/40 font-bold text-sm mt-1 uppercase italic tracking-widest">Control how and when you hear from us</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white text-white/60 hover:text-black rounded-2xl border border-white/10 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95">
                    Mute All Notifications
                </button>
            </div>

            {/* Global Channel Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { id: 'email_enabled', icon: <Mail className="w-5 h-5" />, label: 'Email', color: 'blue' },
                    { id: 'push_enabled', icon: <Smartphone className="w-5 h-5" />, label: 'Push', color: 'amber' },
                    { id: 'sms_enabled', icon: <MessageSquare className="w-5 h-5" />, label: 'SMS', color: 'slate' },
                ].map((channel) => {
                    const isEnabled = preferences?.[channel.id];
                    return (
                        <EnhancedCard key={channel.id} className="flex items-center justify-between p-6">
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-2xl", isEnabled ? `bg-${channel.color}-600/20 text-${channel.color}-400` : "bg-white/5 text-white/20")}>
                                    {channel.icon}
                                </div>
                                <div>
                                    <h4 className="font-black text-white uppercase italic tracking-tight">{channel.label}</h4>
                                    <p className={cn("text-[10px] font-black uppercase tracking-widest", isEnabled ? "text-green-500" : "text-white/20")}>
                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                    </p>
                                </div>
                            </div>
                            <div onClick={() => updatePreference(channel.id, !isEnabled, true)}>
                                <Toggle active={isEnabled} />
                            </div>
                        </EnhancedCard>
                    );
                })}
            </div>

            {/* Detailed Categories */}
            <div className="space-y-8">
                {NOTIFICATION_CATEGORIES.map((cat, i) => (
                    <div key={i} className="space-y-4">
                        <div className="px-2">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{cat.title}</h3>
                            <p className="text-xs text-white/30 font-bold">{cat.desc}</p>
                        </div>

                        <EnhancedCard className="overflow-hidden p-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] bg-white/[0.02]">
                                        <th className="py-4 pl-8">Notification Type</th>
                                        <th className="py-4 text-center">Alerts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {cat.items.map((item) => (
                                        <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="py-6 pl-8">
                                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase italic tracking-tight">{item.label}</p>
                                            </td>
                                            <td className="py-6 text-center">
                                                <div onClick={() => updatePreference(item.id, !getToggle(item.id))}>
                                                    <Toggle active={getToggle(item.id)} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </EnhancedCard>
                    </div>
                ))}
            </div>

            {/* Quiet Hours Selection */}
            <EnhancedCard className="bg-gradient-to-br from-purple-600/10 to-transparent">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 text-center md:text-left">
                        <div className="p-4 bg-purple-600/20 rounded-3xl text-purple-400">
                            <Clock className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Quiet Hours</h3>
                            <p className="text-xs text-white/30 font-bold">Automatically silence notifications during specific times</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-6 py-3 bg-black/40 border border-white/10 rounded-2xl text-white font-black italic">
                            22:00 — 07:00
                        </div>
                        <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                            Schedule
                        </button>
                    </div>
                </div>
            </EnhancedCard>
        </div>
    );
};

const Toggle = ({ active }: { active: boolean }) => (
    <div className="flex justify-center">
        <div className={cn(
            "w-8 h-4 rounded-full p-1 cursor-pointer transition-all duration-300",
            active ? "bg-blue-600" : "bg-white/5 border border-white/10"
        )}>
            <div className={cn(
                "w-2 h-2 bg-white rounded-full transition-all duration-300 transform",
                active ? "translate-x-4" : "translate-x-0"
            )} />
        </div>
    </div>
);
