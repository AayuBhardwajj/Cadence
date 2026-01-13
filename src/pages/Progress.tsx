import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Target,
    Calendar,
    Download,
    Lock,
    ChevronDown,
    Activity,
    Trophy,
    Lightbulb,
    BarChart3
} from 'lucide-react';
import { cn } from "../lib/utils";
import { useTier } from "../lib/TierContext";
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";
import { FluencyChart } from "../components/dashboard/FluencyChart";
import { StreakHeatmap } from "../components/dashboard/StreakHeatmap";
import { RadialProgress } from "../components/dashboard/RadialProgress";
import { Navbar } from "../components/navigation/Navbar";

export function ProgressPage({ username = "Alex" }: { username?: string }) {
    const { tier } = useTier();
    const [dateRange, setDateRange] = useState('7D');

    const ranges = [
        { id: '7D', label: 'Last 7 Days', locked: false },
        { id: '30D', label: 'Last 30 Days', locked: tier === 'FREE' },
        { id: '90D', label: 'Last 90 Days', locked: tier === 'FREE' },
        { id: 'ALL', label: 'All Time', locked: tier === 'FREE' }
    ];

    return (
        <DashboardBackground>
            <div className="flex flex-col min-h-screen">
                <Navbar username={username} />
                <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-500/50">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight uppercase">Your Progress Journey</h1>
                            </div>
                            <p className="text-white/40 font-medium ml-12">Tracking your evolution toward professional fluency</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <button className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition-all">
                                    {ranges.find(r => r.id === dateRange)?.label}
                                    <ChevronDown className="w-4 h-4 text-white/40" />
                                </button>
                                <div className="absolute right-0 mt-2 w-48 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 overflow-hidden">
                                    {ranges.map((range) => (
                                        <button
                                            key={range.id}
                                            disabled={range.locked}
                                            onClick={() => setDateRange(range.id)}
                                            className={cn(
                                                "w-full px-4 py-3 text-left text-xs font-bold transition-all flex items-center justify-between",
                                                range.locked ? "text-white/20 cursor-not-allowed bg-black/20" : "text-white/60 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {range.label}
                                            {range.locked && <Lock className="w-3 h-3 text-amber-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                                tier === 'FREE' ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                            )}>
                                <Download className="w-4 h-4" />
                                Download Report
                            </button>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Card 1: Overall Trend (Full Width) */}
                        <EnhancedCard className="lg:col-span-12 relative overflow-hidden h-[400px]">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <Activity className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h3 className="font-bold text-white tracking-tight">Fluency Consistency</h3>
                                </div>
                                {tier === 'FAMILY' && (
                                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Family Comparison Active</span>
                                    </div>
                                )}
                            </div>

                            <div className="relative h-[250px] w-full">
                                <FluencyChart />
                                {tier === 'FREE' && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-950/40 to-slate-950 backdrop-blur-[2px] flex items-center justify-end pr-12">
                                        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl flex flex-col items-center gap-4 shadow-2xl">
                                            <div className="p-3 bg-amber-400/20 rounded-full">
                                                <Lock className="w-6 h-6 text-amber-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-black text-white uppercase tracking-widest">Full History Locked</p>
                                                <p className="text-xs text-white/40 mt-1 font-medium">Upgrade to Pro to see your full progress timeline</p>
                                            </div>
                                            <button className="w-full py-3 bg-amber-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-widest hover:scale-105 transition-transform">
                                                Upgrade to Pro
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </EnhancedCard>

                        {/* Card 2: Score Breakdown (Left Column) */}
                        <div className="lg:col-span-4 space-y-8">
                            <EnhancedCard className="bg-gradient-to-br from-indigo-600/10 to-transparent border-indigo-500/20">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                        <Target className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <h3 className="font-bold text-white tracking-tight">Skill Matrix</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="flex flex-col items-center gap-3">
                                        <RadialProgress progress={78} color="#3b82f6" size={100} />
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Fluency</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-3">
                                        <RadialProgress progress={65} color="#10b981" size={100} />
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Clarity</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-3">
                                        <RadialProgress progress={72} color="#f472b6" size={100} />
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Vocabulary</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-3">
                                        <RadialProgress progress={85} color="#8b5cf6" size={100} />
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Confidence</p>
                                    </div>
                                </div>
                            </EnhancedCard>

                            <EnhancedCard className="bg-gradient-to-br from-orange-600/10 to-transparent border-orange-500/20">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-orange-500/20 rounded-lg">
                                        <Lightbulb className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <h3 className="font-bold text-white tracking-tight">AI Insights</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                        <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Key Discovery</p>
                                        <p className="text-sm text-white/80 leading-relaxed italic">"Your speech clarity drops when your pace exceeds 160 WPM. Practice slower transitions between topics."</p>
                                    </div>
                                    {tier === 'FREE' ? (
                                        <div className="pt-2 text-center border-t border-white/5 mt-4">
                                            <button className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] hover:text-amber-400 transition-colors">
                                                Unlock Personalized Tips 👑
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2">
                                            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Recommended Focus</p>
                                            <ul className="text-xs text-white/80 space-y-1 ml-4 list-disc">
                                                <li>Focus on lip precision for 'th' sounds</li>
                                                <li>Maintain eye contact during complex explanations</li>
                                                <li>Reduce filler words like 'um' and 'actually'</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </EnhancedCard>
                        </div>

                        {/* Card 3: Session Heatmap & Details */}
                        <div className="lg:col-span-8 space-y-8">
                            <EnhancedCard className="bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/20">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                                            <Calendar className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <h3 className="font-bold text-white tracking-tight">Consistency Map</h3>
                                    </div>
                                    <div className="px-3 py-1 bg-white/5 rounded-lg">
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">🔥 14 Days</span>
                                    </div>
                                </div>

                                <div className="relative">
                                    <StreakHeatmap />
                                    {tier === 'FREE' && (
                                        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center rounded-xl overflow-hidden">
                                            <div className="flex flex-col items-center gap-2">
                                                <Lock className="w-4 h-4 text-white/40" />
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Unlock Yearly View</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </EnhancedCard>

                            <EnhancedCard className="overflow-hidden">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                        <BarChart3 className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <h3 className="font-bold text-white tracking-tight">Detailed Session Metrics</h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-white/40 font-bold uppercase tracking-wider text-[10px]">
                                                <th className="pb-4">Date & Time</th>
                                                <th className="pb-4">Flow Score</th>
                                                <th className="pb-4">Clarity</th>
                                                <th className="pb-4">Pace (WPM)</th>
                                                <th className="pb-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-white/80">
                                            <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                <td className="py-4 font-medium">May 12, 11:45 AM</td>
                                                <td className="py-4">78/100</td>
                                                <td className="py-4 text-emerald-400">High</td>
                                                <td className="py-4">145</td>
                                                <td className="py-4"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-black uppercase">Completed</span></td>
                                            </tr>
                                            <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                <td className="py-4 font-medium">May 11, 09:30 AM</td>
                                                <td className="py-4">72/100</td>
                                                <td className="py-4 text-amber-400">Medium</td>
                                                <td className="py-4">152</td>
                                                <td className="py-4"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-black uppercase">Completed</span></td>
                                            </tr>
                                            {tier === 'FREE' ? (
                                                <tr>
                                                    <td colSpan={5} className="py-12 text-center relative group overflow-hidden">
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-50" />
                                                        <div className="relative z-10 space-y-3">
                                                            <Lock className="w-5 h-5 text-amber-400 mx-auto" />
                                                            <p className="text-xs font-bold text-white uppercase tracking-widest">15 Past Sessions Hidden</p>
                                                            <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-amber-400 uppercase tracking-widest hover:bg-amber-400/10 transition-all">
                                                                Upgrade to View All
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                                    <td className="py-4 font-medium">May 10, 04:15 PM</td>
                                                    <td className="py-4">68/100</td>
                                                    <td className="py-4 text-amber-400">Medium</td>
                                                    <td className="py-4">160</td>
                                                    <td className="py-4"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-black uppercase">Completed</span></td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </EnhancedCard>

                            <EnhancedCard className="bg-gradient-to-br from-purple-600/10 to-transparent border-purple-500/20">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                        <Trophy className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <h3 className="font-bold text-white tracking-tight">Milestones & Achievements</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { title: '7 Day Streak', icon: '🔥', active: true },
                                        { title: 'Goal Crusher', icon: '🎯', active: true },
                                        { title: 'Fluency King', icon: '👑', active: tier !== 'FREE' },
                                        { title: 'Family Star', icon: '✨', active: tier === 'FAMILY' }
                                    ].map((m) => (
                                        <div key={m.title} className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                            m.active ? "bg-white/10 border-white/10" : "bg-black/20 border-white/5 opacity-40 grayscale"
                                        )}>
                                            <span className="text-2xl">{m.icon}</span>
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest text-center">{m.title}</span>
                                            {!m.active && <Lock size={10} className="text-white/20" />}
                                        </div>
                                    ))}
                                </div>
                            </EnhancedCard>
                        </div>

                    </div>
                </div>
            </div>
        </DashboardBackground>
    );
}
