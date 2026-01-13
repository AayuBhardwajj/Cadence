import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History,
    Calendar,
    List,
    Search,
    Filter,
    FileText,
    Clock,
    Mic,
    BookOpen,
    ChevronRight,
    Download,
    AlertCircle,
    CheckCircle2,
    MoreVertical,
    Play,
    Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

export const HistoryPage = () => {
    const [view, setView] = useState('Timeline');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('learning_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (data) setHistory(data);
        }
        setLoading(false);
    };

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'assessment': return <Mic className="w-4 h-4 text-purple-400" />;
            case 'practice': return <Activity className="w-4 h-4 text-blue-400" />;
            case 'lesson': return <BookOpen className="w-4 h-4 text-green-400" />;
            default: return <FileText className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Learning History</h1>
                    <p className="text-white/40 font-bold text-sm mt-1 uppercase italic tracking-widest">Chronicle of your journey to fluency</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                    {['Timeline', 'Calendar', 'List'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={cn(
                                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                view === v ? "bg-white text-black" : "text-white/40 hover:text-white"
                            )}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-12">
                {view === 'Timeline' && (
                    <div className="relative space-y-12 after:absolute after:left-[31px] after:top-0 after:bottom-0 after:w-0.5 after:bg-white/5 after:z-0">
                        {history.length > 0 ? history.map((item, i) => (
                            <div key={i} className="relative z-10 flex gap-10 group">
                                {/* Date Marker */}
                                <div className="flex flex-col items-center shrink-0">
                                    <div className="w-16 text-center">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                                            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-white/10 mt-4 group-hover:border-blue-500 transition-colors shadow-[0_0_15px_rgba(59,130,246,0)] group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                                </div>

                                {/* Content Card */}
                                <EnhancedCard className="flex-grow hover:border-white/20 transition-all">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white/5 rounded-2xl">
                                                {getIcon(item.activity_type)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className="font-black text-white uppercase italic tracking-tight">{item.title}</h4>
                                                    <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase">{item.activity_type}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duration_minutes}m</span>
                                                    <span className="flex items-center gap-1 font-black text-green-400"><CheckCircle2 className="w-3 h-3" /> Score: {item.score}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95 group/btn">
                                                <Play className="w-4 h-4 group-hover/btn:text-blue-400 transition-colors" />
                                            </button>
                                            <button className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </EnhancedCard>
                            </div>
                        )) : (
                            <div className="text-center py-20 px-10 rounded-3xl border border-dashed border-white/10 bg-white/5">
                                <History className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                <h3 className="text-xl font-black text-white/40 uppercase italic">No History Found</h3>
                                <p className="text-sm text-white/20 font-bold mt-2">Start your first session to begin your chronicle.</p>
                            </div>
                        )}
                    </div>
                )}

                {view === 'Calendar' && (
                    <EnhancedCard className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
                        <Calendar className="w-16 h-16 text-white/5 mb-6" />
                        <h3 className="text-2xl font-black text-white/20 uppercase tracking-tighter italic">Heatmap Calendar Coming Soon</h3>
                        <p className="text-sm text-white/10 font-bold mt-2">Advanced consistency tracking is in active development.</p>
                    </EnhancedCard>
                )}

                {view === 'List' && (
                    <EnhancedCard className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                    <th className="pb-6 pl-4">Activity</th>
                                    <th className="pb-6">Date</th>
                                    <th className="pb-6">Type</th>
                                    <th className="pb-6">Duration</th>
                                    <th className="pb-6">Score</th>
                                    <th className="pb-6 pr-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {history.map((item, i) => (
                                    <tr key={i} className="group hover:bg-white/5 border-b border-white/[0.03] last:border-0 transition-all">
                                        <td className="py-5 pl-4 font-bold text-white tracking-tight italic uppercase">{item.title}</td>
                                        <td className="py-5 text-white/40 font-bold">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td className="py-5">
                                            <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded uppercase">{item.activity_type}</span>
                                        </td>
                                        <td className="py-5 text-white/40 font-bold italic">{item.duration_minutes}m</td>
                                        <td className="py-5 font-black text-green-400 italic">{item.score}%</td>
                                        <td className="py-5 pr-4 text-right">
                                            <button className="text-xs font-black text-white/20 hover:text-white transition-colors">Download</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </EnhancedCard>
                )}
            </div>
        </div>
    );
};
