import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Lock,
    Eye,
    EyeOff,
    Search,
    Share2,
    UserPlus,
    Shield,
    ShieldCheck,
    AlertCircle,
    ChevronRight,
    UserCheck,
    Activity,
    Download,
    Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

export const PrivacySettings = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Privacy & Security</h1>
                    <p className="text-white/40 font-bold text-sm mt-1 uppercase italic tracking-widest">Control your visibility and data sharing preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Visibility Controls */}
                <div className="lg:col-span-8 space-y-8">
                    <EnhancedCard>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
                                <Eye className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Profile Visibility</h3>
                                <p className="text-xs text-white/30 font-bold">Control who can see your learning profile and stats</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'vis_public', label: 'Public Profile', desc: 'Visible to everyone on the platform', active: true },
                                { id: 'vis_friends', label: 'Friends Only', desc: 'Only your connections can see your profile', active: false },
                                { id: 'vis_private', label: 'Private', desc: 'Only you can see your learning stats', active: false },
                            ].map((v) => (
                                <button
                                    key={v.id}
                                    className={cn(
                                        "w-full flex items-center justify-between p-6 rounded-3xl border transition-all active:scale-95 group text-left",
                                        v.active
                                            ? "bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20 text-white"
                                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                            v.active ? "border-white" : "border-white/20"
                                        )}>
                                            {v.active && <div className="w-2 h-2 bg-white rounded-full" />}
                                        </div>
                                        <div>
                                            <h4 className="font-black uppercase italic tracking-tight">{v.label}</h4>
                                            <p className={cn("text-[10px] font-bold mt-1 uppercase opacity-60", v.active ? "text-white" : "text-white/40")}>
                                                {v.desc}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </EnhancedCard>

                    {/* Activity & Interactions */}
                    <EnhancedCard>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-400">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Activity & interactions</h3>
                                <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Manage how others interact with you</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                { label: 'Show Online Status', desc: 'Let others see when you are practicing', active: true },
                                { label: 'Allow Friend Requests', desc: 'Anyone can send you a connection request', active: true },
                                { label: 'Searchability', desc: 'Allow others to find you via email/username', active: true },
                                { label: 'Share Achievements', desc: 'Automatically post badges to community feed', active: false },
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/20 transition-all">
                                    <div>
                                        <h4 className="text-sm font-bold text-white tracking-tight italic uppercase">{s.label}</h4>
                                        <p className="text-[10px] text-white/30 font-bold uppercase">{s.desc}</p>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full p-1 cursor-pointer transition-all",
                                        s.active ? "bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.3)]" : "bg-white/10"
                                    )}>
                                        <div className={cn(
                                            "w-3 h-3 bg-white rounded-full transition-all transform",
                                            s.active ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </EnhancedCard>
                </div>

                {/* Data Rights Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <EnhancedCard className="bg-gradient-to-br from-indigo-900/10 to-transparent border-indigo-500/20">
                        <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-sm italic flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" /> Data Rights
                        </h3>

                        <div className="space-y-4">
                            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group text-left">
                                <div>
                                    <p className="text-[10px] font-black text-white uppercase italic tracking-widest mb-1">Download Portability</p>
                                    <p className="text-[9px] text-white/30 font-bold uppercase">Export all your learning data</p>
                                </div>
                                <Download className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group text-left">
                                <div>
                                    <p className="text-[10px] font-black text-white uppercase italic tracking-widest mb-1">Research Opt-out</p>
                                    <p className="text-[9px] text-white/30 font-bold uppercase">Stop using data for AI training</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                            </button>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="bg-slate-950/40 relative overflow-hidden">
                        <div className="flex items-start gap-3 p-2">
                            <Info className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                            <p className="text-[10px] text-white/30 font-bold leading-relaxed uppercase italic">
                                YOUR DATA IS ENCRYPTED END-TO-END. WE NEVER SELL YOUR PERSONAL INFORMATION TO THIRD PARTIES.
                            </p>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="border-amber-500/20 bg-amber-500/5">
                        <h3 className="text-amber-400 font-black uppercase tracking-tighter mb-4 text-[10px] italic flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Account Safety
                        </h3>
                        <p className="text-[10px] text-white/30 font-bold mb-6">
                            View a list of all devices that have ever accessed your account.
                        </p>
                        <button className="w-full py-3 rounded-xl border border-amber-500/20 text-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10 text-[10px] font-black uppercase tracking-widest transition-all">
                            View Security Log
                        </button>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
