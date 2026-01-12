import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  CreditCard,
  HelpCircle,
  Crown,
  ChevronDown,
  Activity,
  Target,
  Trophy,
  Flame,
  Calendar,
  MessageSquare,
  TrendingUp,
  Mic
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

// Custom Dashboard Components
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";
import { AnimatedCounter } from "../components/dashboard/AnimatedCounter";
import { RadialProgress } from "../components/dashboard/RadialProgress";
import { FluencyChart } from "../components/dashboard/FluencyChart";
import { Sparkline } from "../components/dashboard/Sparkline";
import { StreakHeatmap } from "../components/dashboard/StreakHeatmap";
import { RotatingQuotes } from "../components/dashboard/RotatingQuotes";
import { QuickActions } from "../components/dashboard/QuickActions";
import { KeyboardHints } from "../components/dashboard/KeyboardHints";

export function Dashboard({ username = "Alex" }: { username?: string }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Celebration on load for milestone reaching
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#2dd4bf']
      });
    }, 1500);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <DashboardBackground>
      <div className="flex flex-col min-h-screen">
        {/* Navigation Bar */}
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-xl transition-all duration-300">
          <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/50">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tighter">
                FLUENTLY
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              {['Home', 'Practice', 'Progress', 'Exercises', 'Community'].map((item) => (
                <button
                  key={item}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    item === 'Home' ? "bg-white/10 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-white/60 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0a1a]" />
              </button>

              <div className="h-8 w-[1px] bg-white/10 mx-2" />

              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-3 p-1 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all active:scale-95"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-xs ring-2 ring-white/10">
                    {username[0].toUpperCase()}
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-white/60 transition-transform", isMenuOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-64 bg-slate-900/90 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/10 bg-white/5">
                        <p className="text-sm font-medium text-white">{username}</p>
                        <p className="text-xs text-white/40">Pro Member</p>
                      </div>
                      <div className="p-2">
                        {[
                          { icon: <User className="w-4 h-4" />, label: "View Profile" },
                          { icon: <Settings className="w-4 h-4" />, label: "Account Settings" },
                          { icon: <CreditCard className="w-4 h-4" />, label: "Billing & Plans" },
                          { icon: <Crown className="w-4 h-4 text-amber-400" />, label: "Upgrade to Pro" },
                        ].map((item) => (
                          <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            {item.icon}
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-white/10">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow max-w-[1400px] mx-auto w-full px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Rail: Stats & Missions */}
            <div className="lg:col-span-3 space-y-6">
              <EnhancedCard className="bg-gradient-to-br from-blue-600/20 to-transparent border-blue-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white tracking-tight">Today's Performance</h3>
                </div>

                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 group hover:border-blue-500/30 transition-all">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Fluency Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">
                        <AnimatedCounter value={78} suffix="/100" />
                      </span>
                      <span className="text-xs font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">+5%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 group hover:border-green-500/30 transition-all">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Practice time</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">
                        <AnimatedCounter value={12} suffix="m" />
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 group hover:border-purple-500/30 transition-all">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Sessions today</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">
                        <AnimatedCounter value={2} />
                      </span>
                    </div>
                  </div>
                </div>
              </EnhancedCard>

              <EnhancedCard className="bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-white tracking-tight">Your Missions</h3>
                </div>

                <div className="space-y-4">
                  {[
                    { title: "Master the 'th' sound", progress: 60, color: "#3b82f6", trend: [10, 25, 20, 45, 60] },
                    { title: "Reduce filler words", progress: 40, color: "#10b981", trend: [60, 55, 65, 50, 40] },
                    { title: "Vocabulary Range", progress: 80, color: "#8b5cf6", trend: [20, 40, 50, 75, 80] },
                  ].map((mission) => (
                    <div key={mission.title} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-3 group hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{mission.title}</p>
                        <Sparkline data={mission.trend} color={mission.color} />
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${mission.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: mission.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </EnhancedCard>
            </div>

            {/* Center Area: Hero & Trend */}
            <div className="lg:col-span-6 space-y-8">
              <EnhancedCard className="relative overflow-visible pb-12 bg-gradient-to-br from-indigo-600/20 via-slate-900/40 to-transparent border-indigo-500/30">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-blue-600 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                  <Mic className="w-12 h-12 text-white -rotate-12" />
                </div>

                <div className="mt-12 text-center space-y-4">
                  <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-4xl md:text-5xl font-black text-white tracking-tight"
                  >
                    {greeting}, {username}!
                  </motion.h1>

                  <RotatingQuotes />

                  <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-4xl font-black text-blue-400">7</p>
                      <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center justify-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" /> Day Streak
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-4xl font-black text-emerald-400">82%</p>
                      <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" /> Avg. Fluency
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-4xl font-black text-purple-400">14</p>
                      <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center justify-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-500" /> Medals Won
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-4xl font-black text-indigo-400">Lv.8</p>
                      <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest flex items-center justify-center gap-1">
                        <Crown className="w-3 h-3 text-indigo-500" /> Speaker Rank
                      </p>
                    </div>
                  </div>

                  <div className="pt-10">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group relative px-12 py-5 rounded-2xl bg-white text-slate-950 font-black text-lg shadow-2xl shadow-white/10 hover:shadow-white/20 transition-all overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 group-hover:text-white flex items-center gap-3">
                        <Mic className="w-6 h-6" /> START NEW ASSESSMENT
                      </span>
                    </motion.button>
                  </div>
                </div>
              </EnhancedCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <EnhancedCard className="md:col-span-2">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Activity className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white tracking-tight">Fluency Trend</h3>
                        <p className="text-xs text-white/40 font-medium tracking-tight">Your progress over the last 7 days</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {['7D', '1M', '3M', 'All'].map(t => (
                        <button key={t} className={cn("px-2 py-1 text-[10px] font-bold rounded-md", t === '7D' ? "bg-blue-600 text-white" : "bg-white/5 text-white/40")}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <FluencyChart />
                </EnhancedCard>
              </div>
            </div>

            {/* Right Rail: Goals & Heatmap */}
            <div className="lg:col-span-3 space-y-6">
              <EnhancedCard className="bg-gradient-to-br from-indigo-600/10 to-transparent border-indigo-500/20 flex flex-col items-center">
                <div className="flex items-center gap-3 mb-8 w-full">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-white tracking-tight">Weekly Goal</h3>
                </div>

                <RadialProgress progress={80} color="#6366f1" size={160} strokeWidth={12} />

                <div className="mt-8 text-center">
                  <p className="text-sm font-medium text-white/80">You're smashing it! 🚀</p>
                  <p className="text-xs text-white/40 mt-1">Practice 1 more session to reach your weekly milestone.</p>
                </div>
              </EnhancedCard>

              <EnhancedCard className="bg-gradient-to-br from-green-600/10 to-transparent border-green-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Flame className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="font-bold text-white tracking-tight">Practice Streak</h3>
                </div>

                <StreakHeatmap />

                <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <span>Less Active</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-[1px] bg-white/5" />
                    <div className="w-2 h-2 rounded-[1px] bg-green-500/30" />
                    <div className="w-2 h-2 rounded-[1px] bg-green-500/60" />
                    <div className="w-2 h-2 rounded-[1px] bg-green-500/90" />
                  </div>
                  <span>Most Active</span>
                </div>
              </EnhancedCard>

              <EnhancedCard className="bg-gradient-to-br from-orange-600/10 to-transparent border-orange-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className="font-bold text-white tracking-tight">Tip of the Day</h3>
                </div>

                <p className="text-sm text-white/80 leading-relaxed italic">
                  "Your 'v/w' confusion is improving. Focus on lip placement today: bite your lower lip gently for 'v' sounds."
                </p>
              </EnhancedCard>
            </div>

          </div>
        </main>

        <QuickActions />
        <KeyboardHints />

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 bg-black/40 backdrop-blur-md">
          <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2 opacity-50">
              <Mic className="w-4 h-4 text-white" />
              <span className="text-sm font-black tracking-tighter">FLUENTLY</span>
            </div>

            <div className="flex flex-wrap justify-center gap-8">
              {['Help Center', 'Feedback', 'Report Bug', 'Share'].map(link => (
                <button key={link} className="text-xs font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest">
                  {link}
                </button>
              ))}
            </div>

            <div className="p-2 rounded-full bg-white/5 border border-white/10">
              <HelpCircle className="w-4 h-4 text-white/40" />
            </div>
          </div>
        </footer>
      </div>
    </DashboardBackground>
  );
}
