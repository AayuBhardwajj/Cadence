import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Globe,
    MapPin,
    Clock,
    Type,
    Eye,
    EyeOff,
    Accessibility,
    Languages,
    ChevronDown,
    Check,
    Zap,
    Move
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';
import { useAccessibility } from '../../lib/AccessibilityContext';
import { useLanguage } from '../../lib/LanguageContext';



const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
];

export const LanguageSettings = () => {
    const {
        textSize, setTextSize,
        highContrast, setHighContrast,
        reduceMotion, setReduceMotion,
        dyslexicFont, setDyslexicFont
    } = useAccessibility();

    const { language, setLanguage, t } = useLanguage();

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">{t('settings.title')}</h1>
                <p className="text-white/40 font-bold text-sm mt-1 uppercase italic tracking-widest">{t('settings.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Language Selection */}
                <div className="lg:col-span-8 space-y-8">
                    <EnhancedCard>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
                                <Languages className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">{t('settings.interface_language')}</h3>
                                <p className="text-xs text-white/30 font-bold">{t('settings.interface_language_desc')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setLanguage(lang.code as any)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-95 group",
                                        language === lang.code
                                            ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20 text-white"
                                            : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/20"
                                    )}
                                >
                                    <div className="flex items-center gap-4 font-bold">
                                        <span className="text-2xl">{lang.flag}</span>
                                        <div className="text-left">
                                            <p className={cn("text-sm", language === lang.code ? "text-white" : "text-white/60")}>{lang.name}</p>
                                            <p className="text-[10px] uppercase opacity-50 tracking-widest">{lang.native}</p>
                                        </div>
                                    </div>
                                    {language === lang.code && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </EnhancedCard>

                    {/* Regional Settings */}
                    <EnhancedCard>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-400">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">{t('settings.regional_formats')}</h3>
                                <p className="text-xs text-white/30 font-bold uppercase tracking-widest">{t('settings.regional_formats_desc')}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">{t('settings.timezone')}</label>
                                    <div className="relative">
                                        <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none font-bold text-sm tracking-tight cursor-pointer">
                                            <option>GMT+05:30 (India Standard Time)</option>
                                            <option>GMT+00:00 (UTC)</option>
                                            <option>GMT-05:00 (Eastern Standard Time)</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">{t('settings.date_format')}</label>
                                    <div className="relative">
                                        <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none font-bold text-sm tracking-tight cursor-pointer">
                                            <option>DD/MM/YYYY</option>
                                            <option>MM/DD/YYYY</option>
                                            <option>YYYY-MM-DD</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </EnhancedCard>
                </div>

                {/* Accessibility Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <EnhancedCard>
                        <h3 className="text-white font-black uppercase tracking-tighter mb-6 text-sm italic flex items-center gap-2">
                            <Accessibility className="w-4 h-4 text-green-400" /> {t('settings.accessibility')}
                        </h3>
                        <div className="space-y-5">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white tracking-tight">{t('settings.text_size')}</span>
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                        {textSize === 'S' ? t('settings.text_size_s') : textSize === 'M' ? t('settings.text_size_m') : textSize === 'L' ? t('settings.text_size_l') : t('settings.text_size_xl')}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    {(['S', 'M', 'L', 'XL'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setTextSize(s)}
                                            className={cn(
                                                "flex-grow py-2 rounded-xl text-[10px] font-black border transition-all",
                                                textSize === s ? "bg-white text-black border-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                                            )}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-4">
                                {[
                                    {
                                        icon: <Eye className="w-4 h-4" />,
                                        label: t('settings.high_contrast'),
                                        active: highContrast,
                                        toggle: () => setHighContrast(!highContrast)
                                    },
                                    {
                                        icon: <Move className="w-4 h-4" />,
                                        label: t('settings.reduce_motion'),
                                        active: reduceMotion,
                                        toggle: () => setReduceMotion(!reduceMotion)
                                    },
                                    {
                                        icon: <Type className="w-4 h-4" />,
                                        label: t('settings.dyslexic_font'),
                                        active: dyslexicFont,
                                        toggle: () => setDyslexicFont(!dyslexicFont)
                                    },
                                ].map((a, i) => (
                                    <div
                                        key={i}
                                        onClick={a.toggle}
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-white/20">{a.icon}</div>
                                            <span className="text-[11px] font-bold text-white/60 tracking-tight">{a.label}</span>
                                        </div>
                                        <div className={cn(
                                            "w-8 h-4 rounded-full p-1 transition-all",
                                            a.active ? "bg-blue-600" : "bg-white/10"
                                        )}>
                                            <div className={cn(
                                                "w-2 h-2 bg-white rounded-full transition-all transform",
                                                a.active ? "translate-x-4" : "translate-x-0"
                                            )} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard className="bg-slate-950/40 relative overflow-hidden">
                        <Zap className="absolute top-[-20px] left-[-20px] w-40 h-40 text-blue-500/5 rotate-12" />
                        <div className="relative z-10 text-center">
                            <h4 className="text-xs font-black text-white uppercase italic tracking-widest mb-2">{t('settings.sync_settings')}</h4>
                            <p className="text-[10px] text-white/20 font-bold mb-4">{t('settings.sync_settings_desc')}</p>
                            <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all">
                                {t('settings.apply_globally')}
                            </button>
                        </div>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};


