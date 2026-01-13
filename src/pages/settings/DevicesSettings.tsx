import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Smartphone,
    Monitor,
    Tablet,
    Globe,
    Shield,
    LogOut,
    MapPin,
    Clock,
    ShieldCheck,
    AlertTriangle,
    ChevronRight,
    RefreshCw,
    Cpu
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

const SESSIONS = [
    { id: 1, type: 'desktop', device: 'Chrome on macOS', location: 'San Francisco, CA', active: true, lastSeen: 'Active Now', ip: '192.168.1.1' },
    { id: 2, type: 'mobile', device: 'Fluently App on iPhone 14', location: 'London, UK', active: false, lastSeen: '2 hours ago', ip: '82.16.4.120' },
    { id: 3, type: 'tablet', device: 'Safari on iPad Air', location: 'New York, NY', active: false, lastSeen: '3 days ago', ip: '45.78.22.1' },
];

export const DevicesSettings = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Connected Devices</h1>
                    <p className="text-white/40 font-bold text-sm mt-1 uppercase italic tracking-widest">Manage and secure your active learning sessions</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-2xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95">
                    <LogOut className="w-4 h-4" /> Sign Out from All Other Devices
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Active Sessions List */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="px-2 flex items-center justify-between">
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] italic">Current Sessions</h3>
                        <button className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
                            <RefreshCw className="w-3 h-3" /> Refresh Audit
                        </button>
                    </div>

                    <div className="space-y-4">
                        {SESSIONS.map((session) => (
                            <EnhancedCard key={session.id} className={cn("group", session.active && "border-blue-500/30 bg-blue-600/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]")}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-start gap-6">
                                        <div className={cn(
                                            "p-4 rounded-3xl shrink-0 transition-transform group-hover:scale-110",
                                            session.active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-white/5 text-white/20"
                                        )}>
                                            {session.type === 'desktop' && <Monitor className="w-6 h-6" />}
                                            {session.type === 'mobile' && <Smartphone className="w-6 h-6" />}
                                            {session.type === 'tablet' && <Tablet className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-lg font-black text-white uppercase italic tracking-tight">{session.device}</h4>
                                                {session.active && (
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/20 animate-pulse">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {session.location}</span>
                                                <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3" /> {session.ip}</span>
                                                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {session.lastSeen}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {!session.active && (
                                        <button className="px-5 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95">
                                            Revoke Access
                                        </button>
                                    )}
                                </div>
                            </EnhancedCard>
                        ))}
                    </div>

                    <EnhancedCard className="bg-gradient-to-br from-amber-600/10 to-transparent border-amber-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-600/20 rounded-2xl text-amber-400">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Security Tip</h3>
                                <p className="text-sm text-white/40 font-bold leading-relaxed mt-2 uppercase italic tracking-tight">
                                    IF YOU SEE A DEVICE OR LOCATION YOU DON'T RECOGNIZE, CHANGE YOUR PASSWORD IMMEDIATELY AND REVOKE ALL ACTIVE SESSIONS.
                                </p>
                            </div>
                        </div>
                    </EnhancedCard>
                </div>

                {/* Device Security Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <EnhancedCard>
                        <h3 className="text-white font-black uppercase tracking-tighter mb-8 text-sm italic flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" /> Device Security
                        </h3>

                        <div className="space-y-5">
                            {[
                                { label: 'Require Approval', desc: 'Confirm new log-ins', active: true },
                                { label: 'Stay Signed In', desc: 'On trusted devices', active: true },
                                { label: 'Auto-Lock', desc: 'After 30 mins inactive', active: false },
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/20 transition-all">
                                    <div>
                                        <p className="text-xs font-bold text-white tracking-tight">{s.label}</p>
                                        <p className="text-[10px] text-white/30 font-bold uppercase">{s.desc}</p>
                                    </div>
                                    <div className={cn(
                                        "w-8 h-4 rounded-full p-1 cursor-pointer transition-all",
                                        s.active ? "bg-blue-600" : "bg-white/10"
                                    )}>
                                        <div className={cn(
                                            "w-2 h-2 bg-white rounded-full transition-all transform",
                                            s.active ? "translate-x-4" : "translate-x-0"
                                        )} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5">
                            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white text-white/60 hover:text-black transition-all group">
                                <span className="text-xs font-black uppercase tracking-widest italic outline-none">Manage Trusted Devices</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="bg-slate-950/40 border-white/10 relative overflow-hidden text-center py-10">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full mx-auto mb-6 flex items-center justify-center border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                            <ShieldCheck className="w-10 h-10 text-green-400" />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase italic tracking-[0.2em]">Verified Secure</h4>
                        <p className="text-[10px] text-white/20 font-bold mt-2 uppercase tracking-tight">Your account security is currently optimal for the connected devices.</p>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
