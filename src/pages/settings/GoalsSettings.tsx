import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    Clock,
    Bell,
    Settings,
    Plus,
    Trash2,
    CheckCircle2,
    Timer,
    Calendar,
    Zap,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

export const GoalsSettings = () => {
    const [goals, setGoals] = useState<any[]>([]);
    const [dailyMinutes, setDailyMinutes] = useState(30);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('user_goals')
                .select('*')
                .eq('user_id', user.id);
            if (data) setGoals(data);
        }
        setLoading(false);
    };

    const addGoal = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const newGoal = {
                user_id: user.id,
                type: 'fluency_target',
                title: 'New Fluency Target',
                target_value: 90,
                current_value: 0,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                priority: 'Medium'
            };
            const { data } = await supabase.from('user_goals').insert(newGoal).select().single();
            if (data) setGoals([...goals, data]);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Goals & Preferences</h1>
                <p className="text-white/40 font-bold text-sm mt-1">Define your learning path and set clear targets</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Goals List */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] italic">Active Learning Targets</h3>
                        <button
                            onClick={addGoal}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-white transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add New Goal
                        </button>
                    </div>

                    <div className="space-y-4">
                        {goals.map((goal, i) => (
                            <EnhancedCard key={i} className="group">
                                <div className="flex items-start justify-between gap-6 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-white uppercase italic tracking-tight">{goal.title}</h4>
                                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                                                <Calendar className="w-3 h-3" /> Deadline: {goal.deadline}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-blue-400 italic">Target: {goal.target_value}%</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                                        <span>Current Progress</span>
                                        <span>{Math.round((goal.current_value / goal.target_value) * 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(goal.current_value / goal.target_value) * 100}%` }}
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            </EnhancedCard>
                        ))}
                    </div>

                    {/* Daily Target Section */}
                    <EnhancedCard className="mt-12 bg-gradient-to-br from-purple-600/10 to-transparent">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-400">
                                <Timer className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Daily Commitment</h3>
                                <p className="text-xs text-white/30 font-bold">How many minutes can you dedicate today?</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center justify-between gap-10">
                                <input
                                    type="range"
                                    min="5"
                                    max="120"
                                    step="5"
                                    value={dailyMinutes}
                                    onChange={(e) => setDailyMinutes(parseInt(e.target.value))}
                                    className="flex-grow h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-500"
                                />
                                <div className="min-w-[80px] text-center">
                                    <span className="text-3xl font-black text-white italic">{dailyMinutes}</span>
                                    <span className="text-[10px] font-black text-white/40 uppercase block tracking-tighter">Minutes</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {[15, 30, 45, 60].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setDailyMinutes(m)}
                                        className={cn(
                                            "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            dailyMinutes === m ? "bg-white text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
                                        )}
                                    >
                                        {m} Mins
                                    </button>
                                ))}
                            </div>
                        </div>
                    </EnhancedCard>
                </div>

                {/* Reminders & Options Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <EnhancedCard>
                        <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-sm italic flex items-center gap-2">
                            <Bell className="w-4 h-4 text-amber-400" /> Notifications
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Daily Reminder', desc: 'Notify at 9:00 AM', active: true },
                                { label: 'Streak at Risk', desc: 'Warn before midnight', active: true },
                                { label: 'Friend Updates', desc: 'New social activity', active: false },
                            ].map((n, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div>
                                        <p className="text-xs font-bold text-white tracking-tight">{n.label}</p>
                                        <p className="text-[10px] text-white/30 font-bold uppercase">{n.desc}</p>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full p-1 cursor-pointer transition-all",
                                        n.active ? "bg-blue-600" : "bg-white/10"
                                    )}>
                                        <div className={cn(
                                            "w-3 h-3 bg-white rounded-full transition-all",
                                            n.active ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="bg-slate-950/40 relative overflow-hidden">
                        <Zap className="absolute top-[-20px] left-[-20px] w-40 h-40 text-blue-500/5 rotate-12" />
                        <h3 className="text-white font-black uppercase tracking-tighter mb-4 text-sm italic">Pro Preferences</h3>
                        <div className="space-y-3 relative z-10">
                            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 text-[10px] font-black text-white/60 uppercase tracking-widest hover:text-white transition-colors group">
                                Smart Difficulty
                                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 text-[10px] font-black text-white/60 uppercase tracking-widest hover:text-white transition-colors group">
                                Accent Selection
                                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
