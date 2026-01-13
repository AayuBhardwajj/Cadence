import React from 'react';
import { motion } from 'framer-motion';
import {
    Globe,
    MessageSquare,
    Heart,
    Share2,
    Trophy,
    Plus,
    Lock,
    Flame,
    UserPlus,
    Users
} from 'lucide-react';
import { cn } from "../lib/utils";
import { useTier } from "../lib/TierContext";
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";

import { Navbar } from "../components/navigation/Navbar";

export function CommunityPage({ username = "Alex" }: { username?: string }) {
    const { tier } = useTier();

    const posts = [
        { id: 1, user: "Elena_V", avatar: "E", content: "Just reached 85% fluency on my 'R' sound mastered challenge! 🎉", likes: 24, comments: 8, timestamp: "2h ago", badge: "Goal Crusher" },
        { id: 2, user: "Marcus_Dev", avatar: "M", content: "Any tips for maintaining pace during technical presentations? I tend to rush.", likes: 12, comments: 15, timestamp: "5h ago", badge: "Pro Member" },
        { id: 3, user: "Sarah_Speech", avatar: "S", content: "Aced my first job interview in English today. This platform really works! 💼", likes: 56, comments: 21, timestamp: "8h ago", badge: "Success Story" },
    ];

    const leaderboards = [
        { rank: 1, name: "Jordan S.", score: "+15% Imp.", avatar: "J" },
        { rank: 2, name: "Xiao L.", score: "+12% Imp.", avatar: "X" },
        { rank: 3, name: "Anita B.", score: "+11% Imp.", avatar: "A" },
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
                                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/50">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight uppercase">Community Hub</h1>
                            </div>
                            <p className="text-white/40 font-medium ml-12">Connect and grow with speakers worldwide</p>
                        </div>

                        <div className="flex items-center gap-4">
                            {tier === 'FREE' ? (
                                <button className="flex items-center gap-2 px-6 py-3 bg-amber-400 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-400/20 hover:scale-105 transition-all">
                                    Upgrade to Participate
                                </button>
                            ) : (
                                <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-white/5 hover:bg-blue-50 transition-all">
                                    <Plus className="w-4 h-4" />
                                    Create Post
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Feed */}
                        <div className="lg:col-span-8 space-y-8">
                            {posts.map((post) => (
                                <EnhancedCard key={post.id} className="relative group">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl text-white/40">
                                                    {post.avatar}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-black text-white tracking-tight">{post.user}</h4>
                                                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] font-black text-blue-400 uppercase tracking-widest">{post.badge}</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{post.timestamp}</p>
                                                </div>
                                            </div>
                                            {tier !== 'FREE' && (
                                                <button className="p-2 text-white/20 hover:text-white transition-colors">
                                                    <UserPlus size={18} />
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-white/80 leading-relaxed font-medium">
                                            {tier === 'FREE' && post.id > 1 ? (
                                                <span className="blur-sm select-none">This content is restricted to Pro members only...</span>
                                            ) : post.content}
                                        </p>

                                        <div className="flex items-center gap-8 pt-6 border-t border-white/5">
                                            <button className={cn(
                                                "flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors",
                                                tier === 'FREE' ? "text-white/10 cursor-not-allowed" : "text-white/40 hover:text-pink-400"
                                            )}>
                                                <Heart size={16} fill={tier === 'FREE' ? "none" : "currentColor"} className="opacity-50" />
                                                {post.likes}
                                            </button>
                                            <button className={cn(
                                                "flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors",
                                                tier === 'FREE' ? "text-white/10 cursor-not-allowed" : "text-white/40 hover:text-blue-400"
                                            )}>
                                                <MessageSquare size={16} />
                                                {post.comments}
                                            </button>
                                            <button className={cn(
                                                "flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors",
                                                tier === 'FREE' ? "text-white/10 cursor-not-allowed" : "text-white/40 hover:text-emerald-400 ml-auto"
                                            )}>
                                                <Share2 size={16} />
                                            </button>
                                        </div>

                                        {tier === 'FREE' && (
                                            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <div className="p-4 bg-slate-900/90 border border-white/10 rounded-2xl flex items-center gap-3">
                                                    <Lock size={14} className="text-amber-400" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Upgrade to Interact</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </EnhancedCard>
                            ))}
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-8">
                            <EnhancedCard className="bg-gradient-to-br from-indigo-600/10 to-transparent border-indigo-500/20">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                                            <Trophy className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <h3 className="font-bold text-white tracking-tight">Top Improvers</h3>
                                    </div>
                                    <Globe size={14} className="text-white/20" />
                                </div>

                                <div className="space-y-4">
                                    {leaderboards.map((user) => (
                                        <div key={user.rank} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-white/20 w-4">{user.rank}</span>
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs border border-blue-500/30">
                                                    {user.avatar}
                                                </div>
                                                <span className="text-xs font-black text-white uppercase tracking-wider">{user.name}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-400">{user.score}</span>
                                        </div>
                                    ))}
                                </div>

                                {tier === 'FAMILY' && (
                                    <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Family Battle</h4>
                                            <Users size={12} className="text-purple-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-white/40">
                                                <span>Your Family</span>
                                                <span>#4 Worldwide</span>
                                            </div>
                                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="w-[85%] h-full bg-purple-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </EnhancedCard>

                            <EnhancedCard className="bg-gradient-to-br from-amber-400/10 to-transparent border-amber-400/20 relative overflow-hidden">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-amber-400/20 rounded-lg">
                                        <Flame className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <h3 className="font-bold text-white tracking-tight">Community Streak</h3>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed font-medium">
                                    Pro users are currently on a combined <strong>2,481 day streak</strong>. Join them and push the limit!
                                </p>
                                <button className="w-full mt-6 py-3 bg-amber-400 text-slate-950 font-black text-[10px] rounded-xl uppercase tracking-widest shadow-lg shadow-amber-400/20">
                                    See All Challenges
                                </button>
                            </EnhancedCard>
                        </div>

                    </div>
                </div>
            </div>
        </DashboardBackground>
    );
}
