import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Palette,
    Moon,
    Sun,
    Monitor,
    Layout,
    Maximize2,
    Check,
    Sparkles,
    Zap,
    Columns,
    Square
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';

const THEMES = [
    { id: 'dark', name: 'Midnight', icon: <Moon className="w-5 h-5" />, desc: 'Soft dark textures' },
    { id: 'light', name: 'Solstice', icon: <Sun className="w-5 h-5" />, desc: 'Crisp light interface' },
    { id: 'system', name: 'System', icon: <Monitor className="w-5 h-5" />, desc: 'Follow device settings' },
];

const ACCENTS = [
    { id: 'blue', name: 'Ocean', color: '#3b82f6' },
    { id: 'purple', name: 'Nebula', color: '#8b5cf6' },
    { id: 'pink', name: 'Bloom', color: '#ec4899' },
    { id: 'green', name: 'Emerald', color: '#10b981' },
    { id: 'orange', name: 'Amber', color: '#f59e0b' },
];

export const AppearanceSettings = () => {
    const [theme, setTheme] = useState('dark');
    const [accent, setAccent] = useState('blue');
    const [layout, setLayout] = useState('default');

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Appearance</h1>
                <p className="text-white/40 font-bold text-sm mt-1 uppercase italic tracking-widest">Design your unique learning environment</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Theme Selection */}
                <div className="lg:col-span-8 space-y-8">
                    <EnhancedCard>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                <Palette className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Color Theme</h3>
                                <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Choose the overall look of the app</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {THEMES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={cn(
                                        "relative p-6 rounded-3xl border transition-all active:scale-95 group text-left",
                                        theme === t.id
                                            ? "bg-white border-white text-black shadow-2xl"
                                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20"
                                    )}
                                >
                                    {theme === t.id && (
                                        <div className="absolute top-4 right-4 text-black">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className={cn("mb-4", theme === t.id ? "text-black" : "text-white/40")}>
                                        {t.icon}
                                    </div>
                                    <h4 className="font-black uppercase italic tracking-tight">{t.name}</h4>
                                    <p className={cn("text-[10px] font-bold mt-1 uppercase opacity-60", theme === t.id ? "text-black" : "text-white/40")}>
                                        {t.desc}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </EnhancedCard>

                    {/* Accent Color Selection */}
                    <EnhancedCard>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-white/5 rounded-2xl text-white/40">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Accent Color</h3>
                                <p className="text-xs text-white/30 font-bold uppercase tracking-widest">Personalize the highlights and buttons</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {ACCENTS.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => setAccent(a.id)}
                                    className={cn(
                                        "flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all active:scale-95 group min-w-[100px]",
                                        accent === a.id
                                            ? "bg-white/10 border-white/20 shadow-xl"
                                            : "bg-white/5 border-white/5"
                                    )}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full shadow-inner relative flex items-center justify-center"
                                        style={{ backgroundColor: a.color }}
                                    >
                                        {accent === a.id && <Check className="w-4 h-4 text-white drop-shadow-lg" />}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        accent === a.id ? "text-white" : "text-white/40"
                                    )}>
                                        {a.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </EnhancedCard>
                </div>

                {/* Layout Preferences Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <EnhancedCard>
                        <h3 className="text-white font-black uppercase tracking-tighter mb-8 text-sm italic flex items-center gap-2">
                            <Layout className="w-4 h-4 text-purple-400" /> Layout
                        </h3>

                        <div className="space-y-4">
                            {[
                                { id: 'default', label: 'Classic View', icon: <Square className="w-4 h-4" /> },
                                { id: 'split', label: 'Split Pane', icon: <Columns className="w-4 h-4" /> },
                                { id: 'compact', label: 'Compact Mode', icon: <Maximize2 className="w-4 h-4 rotate-45" /> },
                            ].map(ls => (
                                <button
                                    key={ls.id}
                                    onClick={() => setLayout(ls.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group",
                                        layout === ls.id
                                            ? "bg-purple-600/20 border-purple-500/50 text-white"
                                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {ls.icon}
                                        <span className="text-xs font-black uppercase tracking-widest italic">{ls.label}</span>
                                    </div>
                                    {layout === ls.id && <Check className="w-3 h-3 text-purple-400" />}
                                </button>
                            ))}
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Monitor className="w-4 h-4 text-white/20" />
                                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Glassmorphism</span>
                                </div>
                                <div className="w-10 h-5 bg-blue-600 rounded-full p-1 cursor-pointer">
                                    <div className="w-3 h-3 bg-white rounded-full translate-x-5" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-white/20" />
                                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Micro-Animations</span>
                                </div>
                                <div className="w-10 h-5 bg-blue-600 rounded-full p-1 cursor-pointer">
                                    <div className="w-3 h-3 bg-white rounded-full translate-x-5" />
                                </div>
                            </div>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="bg-gradient-to-br from-indigo-900/10 to-transparent border-indigo-500/20">
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-white/5 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h4 className="text-xs font-black text-white uppercase italic tracking-widest">Custom Themes</h4>
                            <p className="text-[10px] text-white/20 font-bold mt-2 mb-6 uppercase tracking-tighter">Pro members can create and share custom UI themes.</p>
                            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                Explore Marketplace
                            </button>
                        </div>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
