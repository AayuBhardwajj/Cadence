import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    ClipboardCheck,
    Timer,
    Zap,
    Users,
    Lock,
    ArrowRight,
    Camera,
    RotateCcw,
    CheckCircle2
} from 'lucide-react';
import { cn } from "../lib/utils";
import { useTier } from "../lib/TierContext";
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";
import { FullAssessmentCard } from "../components/assessment/FullAssessmentCard";
import { useNavigate } from "react-router-dom";

import { Navbar } from "../components/navigation/Navbar";

type PracticeMode = 'assessment' | 'quick' | 'realtime' | 'family';

export function PracticePage({ username = "Alex" }: { username?: string }) {
    const navigate = useNavigate();
    const { tier, isFeatureLocked } = useTier();
    const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const modes = [
        {
            id: 'assessment',
            title: 'Full Assessment',
            description: 'Complete 3-paragraph speech analysis for deep insights.',
            icon: ClipboardCheck,
            duration: '5-7 min',
            locked: false,
            color: 'blue'
        },
        {
            id: 'quick',
            title: 'Quick Practice',
            description: 'Focus on specific sounds or words with shorter sessions.',
            icon: Timer,
            duration: '2-3 min',
            locked: tier === 'FREE',
            color: 'emerald'
        },
        {
            id: 'realtime',
            title: 'Live Feedback',
            description: 'Get instant pronunciation corrections as you speak.',
            icon: Zap,
            duration: 'Flexible',
            locked: tier === 'FREE',
            color: 'amber'
        },
        {
            id: 'family',
            title: 'Family Session',
            description: 'Practice together and compare results in real-time.',
            icon: Users,
            duration: 'Flexible',
            locked: tier !== 'FAMILY',
            color: 'purple',
            familyOnly: true
        }
    ];

    const handleModeSelect = (modeId: PracticeMode, isLocked: boolean) => {
        if (isLocked) {
            setShowUpgradeModal(true);
            return;
        }
        setSelectedMode(modeId);
    };

    return (
        <DashboardBackground>
            <div className="flex flex-col min-h-screen">
                <Navbar username={username} />
                <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-12">
                    {/* Header */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/50">
                                <Mic className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Practice Session</h1>
                        </div>
                        <p className="text-white/40 font-medium ml-12">
                            {tier === 'FREE' ? "Session 1/1 available today" : "Choose your practice mode to begin"}
                        </p>
                    </div>

                    {/* Mode Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Featured Full Assessment Card */}
                        <div className="md:col-span-2 lg:col-span-3">
                            <FullAssessmentCard />
                        </div>

                        {/* Other Modes */}
                        {modes.filter(m => m.id !== 'assessment' && (!m.familyOnly || tier === 'FAMILY' || tier === 'PRO')).map((mode) => (
                            <motion.div
                                key={mode.id}
                                whileHover={{ scale: mode.locked ? 1 : 1.02 }}
                                onClick={() => handleModeSelect(mode.id as PracticeMode, mode.locked)}
                                className={cn(
                                    "group relative cursor-pointer",
                                    mode.locked && "opacity-75"
                                )}
                            >
                                <EnhancedCard className={cn(
                                    "h-full border-t-4 transition-all duration-300",
                                    mode.color === 'blue' ? "border-t-blue-500 bg-blue-500/5" :
                                        mode.color === 'emerald' ? "border-t-emerald-500 bg-emerald-500/5" :
                                            mode.color === 'amber' ? "border-t-amber-500 bg-amber-500/5" :
                                                "border-t-purple-500 bg-purple-500/5"
                                )}>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className={cn(
                                                "p-3 rounded-xl",
                                                mode.color === 'blue' ? "bg-blue-500/20 text-blue-400" :
                                                    mode.color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" :
                                                        mode.color === 'amber' ? "bg-amber-400/20 text-amber-400" :
                                                            "bg-purple-500/20 text-purple-400"
                                            )}>
                                                <mode.icon className="w-6 h-6" />
                                            </div>
                                            {mode.locked && <Lock className="w-4 h-4 text-white/20" />}
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-black text-white mb-1">{mode.title}</h3>
                                            <p className="text-xs text-white/40 font-medium leading-relaxed">{mode.description}</p>
                                        </div>

                                        <div className="flex items-center gap-3 pt-4">
                                            <div className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                                                {mode.duration}
                                            </div>
                                            {mode.locked && (
                                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                                    Pro Feature
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </EnhancedCard>
                            </motion.div>
                        ))}
                    </div>

                    {/* Upgrade Modal Overlay */}
                    <AnimatePresence>
                        {showUpgradeModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl"
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.9, y: 20 }}
                                    className="max-w-lg w-full"
                                >
                                    <EnhancedCard className="bg-gradient-to-br from-indigo-600/30 via-slate-900 to-transparent border-indigo-500/40 p-10 text-center space-y-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4">
                                            <button onClick={() => setShowUpgradeModal(false)} className="text-white/20 hover:text-white transition-colors">
                                                <RotateCcw className="w-5 h-5 rotate-45" />
                                            </button>
                                        </div>

                                        <div className="relative inline-block">
                                            <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-20 animate-pulse" />
                                            <Zap className="w-16 h-16 text-amber-400 relative" />
                                        </div>

                                        <div className="space-y-3">
                                            <h2 className="text-3xl font-black text-white tracking-tight">Unlock Unlimited Practice ✨</h2>
                                            <p className="text-white/60 text-sm font-medium">
                                                Join 10,000+ speakers using Pro to master their speech with real-time feedback and unlimited AI analysis.
                                            </p>
                                        </div>

                                        <div className="space-y-4 pt-4">
                                            {[
                                                'Unlimited practice sessions',
                                                'Real-time accent & pace feedback',
                                                'Phoneme-level performance analysis',
                                                'Downloadable progress reports'
                                            ].map((feature) => (
                                                <div key={feature} className="flex items-center gap-3 text-left">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                                    <span className="text-sm font-medium text-white/80">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-8 space-y-4">
                                            <button className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-blue-50 transition-colors uppercase tracking-widest text-sm shadow-xl shadow-white/5">
                                                Upgrade to Pro - $12.99/mo
                                            </button>
                                            <button onClick={() => setShowUpgradeModal(false)} className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest">
                                                Maybe Later
                                            </button>
                                        </div>
                                    </EnhancedCard>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Recording Interface Placeholder (To be swapped when mode selected) */}
                    {!selectedMode && (
                        <div className="pt-12 text-center opacity-20">
                            <Camera className="w-24 h-24 text-white mx-auto mb-4 opacity-10" />
                            <p className="text-white font-black uppercase tracking-[0.2em] text-sm">Select a mode to initialize recording matrix</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardBackground>
    );
}
