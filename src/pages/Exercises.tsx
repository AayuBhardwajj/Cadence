import React from 'react';
import { motion } from 'framer-motion';
import { 
    Dumbbell, 
    Sparkles, 
    ArrowRight, 
    Timer, 
    Zap,
    Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { Navbar } from "../components/navigation/Navbar";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";

export function ExercisesPage({ username = "Alex" }: { username?: string }) {
    const navigate = useNavigate();

    return (
        <DashboardBackground>
            <div className="flex flex-col min-h-screen">
                <Navbar username={username} />
                
                <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
                    {/* Background Decorative Elements */}
                    <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-3xl w-full"
                    >
                        <EnhancedCard className="relative overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-3xl p-12 md:p-20 text-center">
                            {/* Subtle Grid Pattern */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
                            
                            <div className="space-y-12 relative z-10">
                                {/* Icon Badge */}
                                <div className="flex justify-center">
                                    <motion.div 
                                        animate={{ 
                                            scale: [1, 1.05, 1],
                                            rotate: [0, 5, -5, 0]
                                        }}
                                        transition={{ 
                                            duration: 4, 
                                            repeat: Infinity,
                                            ease: "easeInOut" 
                                        }}
                                        className="p-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl shadow-[0_0_40px_rgba(37,99,235,0.3)]"
                                    >
                                        <Dumbbell className="w-12 h-12 text-white" />
                                    </motion.div>
                                </div>

                                <div className="space-y-4">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex items-center justify-center gap-2 text-blue-400 font-black tracking-[0.2em] uppercase text-sm"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span>New Feature</span>
                                        <Sparkles className="w-4 h-4" />
                                    </motion.div>
                                    
                                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                                        Exercises <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-300% animate-gradient">
                                            Coming Soon
                                        </span>
                                    </h1>
                                    
                                    <p className="text-white/40 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed">
                                        We're crafting personalized training modules designed to refine your speech patterns and master professional communication.
                                    </p>
                                </div>

                                {/* Features Preview */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                                    {[
                                        { icon: Zap, label: "AI Feedback", color: "text-amber-400" },
                                        { icon: Timer, label: "Guided Drills", color: "text-emerald-400" },
                                        { icon: Layout, label: "Curated Paths", color: "text-blue-400" }
                                    ].map((feat, i) => (
                                        <motion.div
                                            key={feat.label}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 + (i * 0.1) }}
                                            className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5"
                                        >
                                            <feat.icon className={`w-4 h-4 ${feat.color}`} />
                                            <span className="text-xs font-bold text-white/60 uppercase tracking-wider">{feat.label}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="pt-8"
                                >
                                    <button 
                                        onClick={() => navigate('/dashboard')}
                                        className="group relative px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            Return to Dashboard
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </button>
                                </motion.div>
                            </div>
                        </EnhancedCard>
                    </motion.div>
                </main>
            </div>
        </DashboardBackground>
    );
}
