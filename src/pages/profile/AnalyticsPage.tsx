import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Clock,
    Flame,
    BookOpen,
    Download,
    Share2,
    ChevronDown,
    Brain,
    Calendar,
    Layers,
    Activity,
    Zap,
    Target
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

const fluencyData = [
    { day: 'Mon', score: 65 },
    { day: 'Tue', score: 68 },
    { day: 'Wed', score: 72 },
    { day: 'Thu', score: 70 },
    { day: 'Fri', score: 75 },
    { day: 'Sat', score: 78 },
    { day: 'Sun', score: 82 },
];

const skillData = [
    { subject: 'Speaking', A: 85, fullMark: 100 },
    { subject: 'Listening', A: 90, fullMark: 100 },
    { subject: 'Reading', A: 75, fullMark: 100 },
    { subject: 'Writing', A: 70, fullMark: 100 },
    { subject: 'Grammar', A: 80, fullMark: 100 },
    { subject: 'Vocab', A: 95, fullMark: 100 },
];

const timeDistribution = [
    { name: 'Vocab', value: 40, color: '#3b82f6' },
    { name: 'Grammar', value: 25, color: '#8b5cf6' },
    { name: 'Speaking', value: 20, color: '#ec4899' },
    { name: 'Others', value: 15, color: '#10b981' },
];

export const AnalyticsPage = () => {
    const [range, setRange] = useState('Last 7 Days');

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">Learning Analytics</h1>
                    <p className="text-white/40 font-bold text-sm mt-3 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-blue-400" />
                        AI-POWERED PERFORMANCE INSIGHTS & REAL-TIME TRACKING
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        {['Last 7 Days', 'Last 30 Days', 'All Time'].map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    range === r ? "bg-white text-black" : "text-white/40 hover:text-white"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all active:scale-95 group">
                        <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                    <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white transition-all active:scale-95 group">
                        <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Learning Time', value: '124h 35m', change: '+15%', icon: <Clock className="w-5 h-5" />, color: 'blue' },
                    { label: 'Fluency Score', value: '78/100', change: '+5 pts', icon: <TrendingUp className="w-5 h-5" />, color: 'purple' },
                    { label: 'Current Streak', value: '7 Days', change: 'Longest: 23d', icon: <Flame className="w-5 h-5 text-orange-400" />, color: 'orange' },
                    { label: 'Completion', value: '156 Sessions', change: 'Avg: 12m', icon: <BookOpen className="w-5 h-5" />, color: 'green' },
                ].map((kpi, i) => (
                    <EnhancedCard key={i} className="group hover:scale-[1.02] transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn("p-3 rounded-2xl", `bg-${kpi.color}-600/20 text-${kpi.color}-400`)}>
                                {kpi.icon}
                            </div>
                            <span className="text-[10px] font-black text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">
                                {kpi.change}
                            </span>
                        </div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{kpi.label}</p>
                        <h4 className="text-2xl font-black text-white italic tracking-tighter">{kpi.value}</h4>
                    </EnhancedCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Fluency Progression Chart */}
                <div className="lg:col-span-8 space-y-8">
                    <EnhancedCard>
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Fluency Progression</h3>
                                    <p className="text-xs text-white/30 font-bold tracking-widest uppercase">Daily scores & trend analysis</p>
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <AreaChart data={fluencyData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#ffffff4d', fontSize: 10, fontWeight: 900 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#ffffff4d', fontSize: 10, fontWeight: 900 }}
                                        domain={[0, 100]}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #ffffff1a', backdropFilter: 'blur(10px)' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#3b82f6"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </EnhancedCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Time Dist Table Placeholder */}
                        <EnhancedCard>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-8 border-l-4 border-blue-500 pl-4">Time Allocation</h3>
                            <div className="space-y-5">
                                {timeDistribution.map((item, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-white/40">{item.name}</span>
                                            <span className="text-white">{item.value}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${item.value}%` }}
                                                transition={{ duration: 1.5, delay: i * 0.2 }}
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </EnhancedCard>

                        {/* AI Recommendations */}
                        <EnhancedCard className="bg-gradient-to-br from-indigo-900/20 to-transparent border-indigo-500/20 relative overflow-hidden">
                            <Zap className="absolute top-[-20px] right-[-20px] w-40 h-40 text-indigo-500/5 rotate-12" />
                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-6 flex items-center gap-2">
                                <Brain className="w-4 h-4 text-indigo-400" /> AI Recommendations
                            </h3>
                            <div className="space-y-4 relative z-10">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all cursor-pointer group">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic">Weakness Detected</p>
                                    <p className="text-xs font-bold text-white group-hover:translate-x-1 transition-transform">Your 'th' sound pronunciation needs 15 mins focus this week.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all cursor-pointer group">
                                    <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1 italic">Speed Insight</p>
                                    <p className="text-xs font-bold text-white group-hover:translate-x-1 transition-transform">You're learning 20% faster than your set monthly goal!</p>
                                </div>
                            </div>
                        </EnhancedCard>
                    </div>
                </div>

                {/* Radar Chart & Leaderboard */}
                <div className="lg:col-span-4 space-y-8">
                    <EnhancedCard className="bg-slate-900/50">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-10 text-center">Skill Mastery Radar</h3>
                        <div className="h-[300px] w-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                                    <PolarGrid stroke="#ffffff1a" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff4d', fontSize: 10, fontWeight: 900 }} />
                                    <Radar
                                        name="Skills"
                                        dataKey="A"
                                        stroke="#ec4899"
                                        fill="#ec4899"
                                        fillOpacity={0.5}
                                        animationDuration={2500}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-6 flex justify-center gap-3">
                            <span className="flex items-center gap-2 text-[10px] font-black text-white/40"><Target className="w-3 h-3 text-pink-500" /> Current</span>
                            <span className="flex items-center gap-2 text-[10px] font-black text-white/40"><div className="w-3 h-3 border border-dashed border-white/20 rounded-full" /> Target</span>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-6">Upcoming Milestones</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Fluency Level C1', progress: 78, target: '90%', icon: <Layers className="w-4 h-4" /> },
                                { label: 'Vocabulary Legend', progress: 95, target: '100%', icon: <Zap className="w-4 h-4" /> },
                            ].map((m, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 shrink-0">
                                        {m.icon}
                                    </div>
                                    <div className="flex-grow space-y-1">
                                        <div className="flex justify-between items-center text-xs font-bold text-white tracking-tight">
                                            <span>{m.label}</span>
                                            <span className="text-blue-400 italic">{m.target}</span>
                                        </div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${m.progress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
