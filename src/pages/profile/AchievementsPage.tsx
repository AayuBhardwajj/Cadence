import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Star,
    Flame,
    Zap,
    Award,
    Shield,
    Search,
    Filter,
    Lock,
    Unlock,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

const CATEGORIES = ['All', 'Streaks', 'Milestones', 'Mastery', 'Social'];
const RARITIES = {
    Common: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    Rare: 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    Epic: 'text-purple-400 bg-purple-400/10 border-purple-400/20 shadow-[0_0_20px_rgba(139,92,246,0.4)]',
    Legendary: 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_25px_rgba(251,191,36,0.5)]'
};

const ACHIEVEMENTS = [
    { id: 1, name: '7 Day Warrior', desc: 'Maintain a 7-day practice streak', category: 'Streaks', rarity: 'Common', progress: 100, unlocked: true },
    { id: 2, name: 'Vocab Virtuoso', desc: 'Learn 1,000 new words', category: 'Mastery', rarity: 'Rare', progress: 85, unlocked: false },
    { id: 3, name: 'Fluency King', desc: 'Reach 90+ fluency score', category: 'Milestones', rarity: 'Legendary', progress: 40, unlocked: false },
    { id: 4, name: 'Social Butterfly', desc: 'Invite 5 friends to Cadence', category: 'Social', rarity: 'Epic', progress: 60, unlocked: false },
    { id: 5, name: 'Grammar Guru', desc: 'Complete all advanced grammar tasks', category: 'Mastery', rarity: 'Rare', progress: 100, unlocked: true },
    { id: 6, name: '30 Day Champion', desc: 'Maintain a 30-day streak', category: 'Streaks', rarity: 'Epic', progress: 20, unlocked: false },
];

export const AchievementsPage = () => {
    const [filter, setFilter] = useState('All');

    const filteredAchievements = ACHIEVEMENTS.filter(a => filter === 'All' || a.category === filter);

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-400/20 rounded-2xl text-amber-400 border border-amber-400/20 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
                            <Trophy className="w-8 h-8" />
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">Hall of Fame</h1>
                    </div>
                    <p className="text-white/40 font-bold text-sm tracking-wide max-w-xl uppercase italic">
                        YOUR JOURNEY TO MASTERY IN BADGES. COLLECT, SHOWCASE, AND CONQUER.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        {CATEGORIES.map(c => (
                            <button
                                key={c}
                                onClick={() => setFilter(c)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    filter === c ? "bg-white text-black" : "text-white/40 hover:text-white"
                                )}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <EnhancedCard className="bg-gradient-to-br from-amber-600/10 to-transparent border-amber-500/20">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Unlocked</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white italic">12 / 48</span>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest italic outline-none">25% complete</span>
                    </div>
                </EnhancedCard>
                <EnhancedCard className="bg-gradient-to-br from-purple-600/10 to-transparent border-purple-500/20">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Rarity Power</p>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-3xl font-black text-white italic">1,450 XP</span>
                    </div>
                </EnhancedCard>
                <EnhancedCard className="bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/20">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Current Standing</p>
                    <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-blue-400" />
                        <span className="text-3xl font-black text-white italic">Top 5%</span>
                    </div>
                </EnhancedCard>
            </div>

            {/* Achievement Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode='popLayout'>
                    {filteredAchievements.map((achievement, i) => (
                        <motion.div
                            layout
                            key={achievement.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                        >
                            <EnhancedCard
                                className={cn(
                                    "h-full flex flex-col group relative transition-all duration-300",
                                    !achievement.unlocked && "opacity-60 grayscale-[0.8]"
                                )}
                            >
                                {!achievement.unlocked && (
                                    <div className="absolute top-4 right-4 text-white/20">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                )}
                                {achievement.unlocked && (
                                    <div className="absolute top-4 right-4 text-green-400 animate-pulse">
                                        <Unlock className="w-4 h-4" />
                                    </div>
                                )}

                                <div className="mb-6">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border",
                                        RARITIES[achievement.rarity as keyof typeof RARITIES]
                                    )}>
                                        {achievement.rarity}
                                    </span>
                                </div>

                                <div className="flex-grow space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight group-hover:text-blue-400 transition-colors">
                                            {achievement.name}
                                        </h3>
                                        <p className="text-xs text-white/40 font-bold leading-relaxed">{achievement.desc}</p>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-white/20">Progress</span>
                                            <span className={cn(achievement.unlocked ? "text-green-400" : "text-white/60")}>
                                                {achievement.progress}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${achievement.progress}%` }}
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    achievement.unlocked ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-blue-600"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] text-white/40 font-black">
                                            XP
                                        </div>
                                        <span className="text-xs font-black text-white italic">+100</span>
                                    </div>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-1 group/btn">
                                        Details <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </EnhancedCard>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};
