/**
 * TipOfTheDay.tsx
 * Fetches a personalized daily tip from GET /api/tip-of-the-day?user_id=<uuid>
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Sparkles, RefreshCw, Lock } from "lucide-react";
import { EnhancedCard } from "./EnhancedCard";
import { useTier } from "../../lib/TierContext";
import { supabase } from "../../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface TipData {
    tip: string;
    is_personalized: boolean;
    generated_at: string;
    cached: boolean;
}

export function TipOfTheDay() {
    const { tier } = useTier();
    const [tip, setTip] = useState<TipData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchTip = async () => {
        setLoading(true);
        setError(false);
        try {
            // Get user_id from Supabase — same pattern as the rest of the app
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error("Not authenticated");

            const res = await fetch(
                `${API_BASE}/api/tip-of-the-day?user_id=${user.id}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: TipData = await res.json();
            setTip(data);
        } catch (e) {
            console.error("Failed to fetch tip:", e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTip();
    }, []);

    const isPaid = tier?.toUpperCase() !== "FREE";

    return (
        <EnhancedCard className="bg-gradient-to-br from-orange-600/10 to-transparent border-orange-500/20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white tracking-tight">Tip of the Day</h3>
                        {tip?.is_personalized && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                                <Sparkles className="w-2.5 h-2.5" /> Personalized
                            </span>
                        )}
                    </div>
                </div>

                {/* Refresh — only shown for paid users */}
                {isPaid && !loading && (
                    <button
                        onClick={fetchTip}
                        title="Refresh tip"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                    >
                        <RefreshCw className="w-3 h-3 text-white/40 group-hover:text-white group-hover:rotate-180 transition-all duration-300" />
                    </button>
                )}
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
                {loading && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2"
                    >
                        {[100, 85, 60].map((w, i) => (
                            <div
                                key={i}
                                className="h-3 rounded-full bg-white/5 animate-pulse"
                                style={{ width: `${w}%`, animationDelay: `${i * 100}ms` }}
                            />
                        ))}
                    </motion.div>
                )}

                {!loading && error && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <p className="text-sm text-white/40 italic">
                            Couldn't load today's tip. Check your connection and try again.
                        </p>
                        <button
                            onClick={fetchTip}
                            className="mt-3 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
                        >
                            Retry →
                        </button>
                    </motion.div>
                )}

                {!loading && !error && tip && (
                    <motion.div
                        key="tip"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.3 }}
                    >
                        <p className="text-sm text-white/80 leading-relaxed italic">{tip.tip}</p>

                        {/* Free-tier upsell hint */}
                        {!isPaid && (
                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                <Lock className="w-3 h-3 text-amber-500/60" />
                                <span>Upgrade to Pro for tips tailored to your weak areas</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </EnhancedCard>
    );
}