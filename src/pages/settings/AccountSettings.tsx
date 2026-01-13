import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Lock,
    Mail,
    Shield,
    Trash2,
    Smartphone,
    History,
    Calendar,
    List,
    Search,
    Filter,
    FileText,
    Clock,
    Mic,
    BookOpen,
    Eye,
    EyeOff,
    AlertTriangle,
    ChevronRight,
    Download,
    LogOut,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    MoreVertical,
    Play,
    Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

export const AccountSettings = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('security');
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [user, setUser] = useState<any>(null);
    const [securityAudit, setSecurityAudit] = useState<any[]>([]);

    const fetchSecurityAudit = async () => {
        setUpdating(true);
        // Simulate real-time fetch
        await new Promise(r => setTimeout(r, 800));
        setSecurityAudit([
            { type: 'Password Change', date: new Date().toISOString().replace('T', ' ').slice(0, 16), device: 'Chrome on macOS (Current)', status: 'Success' },
            { type: 'Login Attempt', date: '2024-01-09 09:15', device: 'iPhone 14 Pro', status: 'Blocked (Unrecognized)' },
        ]);
        setUpdating(false);
    };

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
        fetchSecurityAudit();
    }, []);

    const handleUpdatePassword = async () => {
        if (!newPassword) return;
        setUpdating(true);
        setMessage(null);

        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setNewPassword('');
            setCurrentPassword('');
        }
        setUpdating(false);
        setTimeout(() => setMessage(null), 5000);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Account Settings</h1>
                    <p className="text-white/40 font-bold text-sm mt-1">Manage your security and account preferences</p>
                </div>
                <div className="flex gap-2">
                    {['security', 'privacy', 'data'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                activeTab === tab
                                    ? "bg-white text-black shadow-xl"
                                    : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Security Section */}
                <div className="lg:col-span-8 space-y-8">
                    <EnhancedCard>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
                                <Lock className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Password & Authentication</h3>
                                <p className="text-xs text-white/30 font-bold">Keep your account secure with a strong password</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "p-4 rounded-xl text-xs font-bold uppercase tracking-widest border",
                                        message.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                                    )}
                                >
                                    {message.text}
                                </motion.div>
                            )}

                            <button
                                onClick={handleUpdatePassword}
                                disabled={updating}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                {updating && <RefreshCw className="w-4 h-4 animate-spin" />}
                                {updating ? 'Updating...' : 'Update Security'}
                            </button>
                        </div>

                        <div className="mt-12 pt-10 border-t border-white/5 space-y-6">
                            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-400">
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-black uppercase italic tracking-tight">Two-Factor Auth</h4>
                                        <p className="text-xs text-white/30 font-bold">Add an extra layer of security to your account</p>
                                    </div>
                                </div>
                                <button className="bg-white/10 hover:bg-white text-white hover:text-black font-black text-[10px] uppercase tracking-[0.15em] px-5 py-2.5 rounded-xl transition-all">
                                    Enable
                                </button>
                            </div>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-600/20 rounded-2xl text-amber-400">
                                    <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Security Audit</h3>
                                    <p className="text-xs text-white/30 font-bold">Recent security events and login attempts</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchSecurityAudit}
                                disabled={updating}
                                className="text-[10px] text-white/40 font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw className={cn("w-3 h-3", updating && "animate-spin")} /> Refresh
                            </button>
                        </div>

                        <div className="space-y-3">
                            {securityAudit.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            item.status.includes('Success') ? "bg-green-500" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                        )} />
                                        <div>
                                            <p className="text-sm font-bold text-white tracking-tight">{item.type}</p>
                                            <p className="text-[10px] text-white/30 font-bold uppercase">{item.device} • {item.date}</p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg italic",
                                        item.status.includes('Success') ? "text-green-400/50" : "text-red-400/50"
                                    )}>
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </EnhancedCard>
                </div>

                {/* Right Rail - Status & Quick Actions */}
                <div className="lg:col-span-4 space-y-6">
                    <EnhancedCard className="bg-gradient-to-br from-green-600/10 to-transparent border-green-500/20">
                        <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-sm italic">Account Status</h3>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white tracking-widest uppercase">Email Verified</p>
                                    <p className="text-[10px] text-white/40 font-bold">{user?.email || 'user@email.com'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white tracking-widest uppercase">Security Score</p>
                                    <p className="text-[10px] text-white/40 font-bold tracking-widest">85 / 100 • EXCELLENT</p>
                                </div>
                            </div>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="bg-slate-950/40 border-white/5">
                        <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-sm italic">Danger Zone</h3>
                        <div className="space-y-4">
                            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                <div className="flex items-center gap-3">
                                    <Download className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                                    <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">Download Data</span>
                                </div>
                                <ChevronRight className="w-3 h-3 text-white/20" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all group">
                                <div className="flex items-center gap-3">
                                    <Trash2 className="w-4 h-4 text-red-400/50 group-hover:text-red-400 transition-colors" />
                                    <span className="text-xs font-bold text-red-400/70 group-hover:text-red-400 transition-colors">Delete Account</span>
                                </div>
                                <ChevronRight className="w-3 h-3 text-red-400/20" />
                            </button>
                        </div>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
