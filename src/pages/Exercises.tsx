import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Dumbbell,
    Search,
    Filter,
    Lock,
    Play,
    CheckCircle2,
    Zap,
    Star,
    Plus
} from 'lucide-react';
import { cn } from "../lib/utils";
import { useTier } from "../lib/TierContext";
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";

import { Navbar } from "../components/navigation/Navbar";

export function ExercisesPage({ username = "Alex" }: { username?: string }) {
    const { tier } = useTier();
    const [activeTab, setActiveTab] = useState('all');

    const exercises = [
        { id: 1, title: "TH Sound Basics", category: "pronunciation", difficulty: "Beginner", duration: "5 min", locked: false },
        { id: 2, title: "Breathing Techniques", category: "fluency", difficulty: "Beginner", duration: "10 min", locked: false },
        { id: 3, title: "Simple Word Practice", category: "vocabulary", difficulty: "Beginner", duration: "5 min", locked: false },
        { id: 4, title: "R vs L Distinction", category: "pronunciation", difficulty: "Intermediate", duration: "8 min", locked: tier === 'FREE' },
        { id: 5, title: "Timed Storytelling", category: "confidence", difficulty: "Advanced", duration: "15 min", locked: tier === 'FREE' },
        { id: 6, title: "Reduce Filler Words", category: "fluency", difficulty: "Intermediate", duration: "12 min", locked: tier === 'FREE' },
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
                                <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/50">
                                    <Dumbbell className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight uppercase">Exercise Library</h1>
                            </div>
                            <p className="text-white/40 font-medium ml-12">Targeted training for peak communication performance</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Search exercises..."
                                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-64"
                                />
                            </div>
                            <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-colors">
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['All', 'Pronunciation', 'Fluency', 'Vocabulary', 'Confidence', 'AI Conversations'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                                className={cn(
                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0",
                                    activeTab === tab.toLowerCase() ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white/5 text-white/40 hover:bg-white/10"
                                )}
                            >
                                {tab}
                                {tab === 'AI Conversations' && <Zap size={10} className="inline ml-2 text-amber-400" />}
                            </button>
                        ))}
                    </div>

                    {/* Exercises Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {exercises.map((ex) => (
                            <motion.div
                                key={ex.id}
                                whileHover={{ y: ex.locked ? 0 : -5 }}
                                className={cn("relative group", ex.locked && "opacity-60")}
                            >
                                <EnhancedCard className={cn(
                                    "h-full border-b-4 transition-all duration-300",
                                    ex.locked ? "border-b-white/5" : "border-b-blue-500 hover:border-b-blue-400"
                                )}>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-blue-500/10 transition-colors">
                                                <Play className={cn("w-5 h-5", ex.locked ? "text-white/20" : "text-blue-400")} />
                                            </div>
                                            {ex.locked ? <Lock size={16} className="text-amber-400" /> : <CheckCircle2 size={16} className="text-emerald-400" />}
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-lg font-black text-white">{ex.title}</h3>
                                            <div className="flex gap-2">
                                                <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-black text-white/40 uppercase tracking-tighter">{ex.category}</span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
                                                    ex.difficulty === 'Beginner' ? "bg-emerald-500/10 text-emerald-400" :
                                                        ex.difficulty === 'Intermediate' ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                                                )}>{ex.difficulty}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{ex.duration}</span>
                                            {ex.locked ? (
                                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Upgrade to Unlock</span>
                                            ) : (
                                                <button className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors">Start Training →</button>
                                            )}
                                        </div>
                                    </div>

                                    {ex.locked && (
                                        <div className="absolute inset-x-0 bottom-0 top-[60%] bg-gradient-to-t from-slate-950 to-transparent flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="px-4 py-2 bg-amber-400 text-slate-950 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                Go Pro to Unlock
                                            </button>
                                        </div>
                                    )}
                                </EnhancedCard>
                            </motion.div>
                        ))}

                        {/* Custom Goal Card (Pro only) */}
                        <EnhancedCard className="border-dashed border-2 border-white/10 bg-transparent flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:border-blue-500/40 transition-all">
                            <div className="p-4 bg-white/5 rounded-full mb-6 group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8 text-white/20 group-hover:text-blue-400" />
                            </div>
                            <p className="text-sm font-black text-white tracking-widest uppercase">Create Custom Goal</p>
                            <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">Personalized AI sequence</p>
                            {tier === 'FREE' && <Lock size={12} className="text-amber-400 mt-4" />}
                        </EnhancedCard>
                    </div>

                    {/* Family Section (Family layer only) */}
                    {tier === 'FAMILY' && (
                        <EnhancedCard className="bg-gradient-to-br from-purple-600/20 to-transparent border-purple-500/30">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                        <Star className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <h3 className="font-bold text-white tracking-tight">Family Core Challenges</h3>
                                </div>
                                <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black text-purple-400 uppercase tracking-widest">Team Effort</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                    <p className="text-xs font-black text-white uppercase tracking-widest">Master 'TH' Together</p>
                                    <div className="flex -space-x-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-slate-900" title="Dad" />
                                        <div className="w-6 h-6 rounded-full bg-pink-500 border-2 border-slate-900" title="Mom" />
                                        <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900" title="Child 1" />
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="w-[60%] h-full bg-purple-500" />
                                    </div>
                                </div>
                            </div>
                        </EnhancedCard>
                    )}

                </div>
            </div>
        </DashboardBackground>
    );
}
