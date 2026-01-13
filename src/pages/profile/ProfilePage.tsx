import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Camera,
    MapPin,
    Globe,
    Briefcase,
    Link as LinkIcon,
    Mail,
    Phone,
    Calendar,
    Check,
    Loader2,
    Upload,
    User as UserIcon,
    Plus,
    History,
    Target
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';
import { AnimatedCounter } from '../../components/dashboard/AnimatedCounter';

const PROFILE_SECTIONS = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'learning', label: 'Learning Profile' },
    { id: 'social', label: 'Social & Visibility' }
];

export const ProfilePage = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState('personal');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) setProfile(data);
            else {
                // Create profile if it doesn't exist
                const newProfile = {
                    id: user.id,
                    username: user.email?.split('@')[0],
                    full_name: user.user_metadata?.full_name || '',
                    avatar_url: '',
                    cover_url: '',
                    bio: ''
                };
                const { data: createdData } = await supabase.from('profiles').insert(newProfile).select().single();
                if (createdData) setProfile(createdData);
            }
        }
        setLoading(false);
    };

    const updateProfile = async (updates: any) => {
        setSaving('Saving...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase
                .from('profiles')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (!error) {
                setProfile((prev: any) => ({ ...prev, ...updates }));
                setTimeout(() => setSaving(null), 1000);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleBlur = (name: string, value: any) => {
        updateProfile({ [name]: value });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="relative group">
                {/* Cover Image */}
                <div className="h-64 rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900 to-purple-900 border border-white/10 relative">
                    {profile?.cover_url && (
                        <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
                    )}
                    <button className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                        <Camera className="w-5 h-5" />
                    </button>
                </div>

                {/* Profile Info Overlay */}
                <div className="px-10 -mt-20 flex flex-col md:flex-row items-end gap-6 relative z-10">
                    <div className="relative group/avatar">
                        <div className="w-40 h-40 rounded-3xl bg-slate-900 border-4 border-[#0a0a1a] overflow-hidden shadow-2xl relative">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white">
                                    {profile?.username?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <button className="absolute bottom-2 right-2 p-2 bg-blue-600 rounded-xl text-white shadow-lg opacity-0 group-hover/avatar:opacity-100 transition-all hover:scale-110 active:scale-95">
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-grow pb-4 text-center md:text-left">
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">
                            {profile?.username}
                        </h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-2 text-white/50 text-sm bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <MapPin className="w-3 h-3" />
                                <span>{profile?.location_city || 'Add Location'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/50 text-sm bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <Calendar className="w-3 h-3" />
                                <span>Member since {new Date(profile?.created_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pb-4 hidden lg:flex items-center gap-4">
                        <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 min-w-[120px]">
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Completion</p>
                            <div className="text-2xl font-black text-blue-400">
                                <AnimatedCounter value={profile?.profile_completion_percent || 45} suffix="%" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Col - Info */}
                <div className="lg:col-span-8 space-y-8">
                    <EnhancedCard>
                        <div className="flex items-center justify-between mb-8">
                            <nav className="flex gap-2">
                                {PROFILE_SECTIONS.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setActiveSection(s.id)}
                                        className={cn(
                                            "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                            activeSection === s.id
                                                ? "bg-white text-black shadow-xl"
                                                : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                                        )}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </nav>
                            {saving && (
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 animate-pulse bg-blue-400/10 px-3 py-1.5 rounded-full border border-blue-400/20">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    {saving}
                                </div>
                            )}
                        </div>

                        {activeSection === 'personal' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Full Name</label>
                                        <input
                                            type="text"
                                            name="full_name"
                                            value={profile?.full_name || ''}
                                            onChange={handleInputChange}
                                            onBlur={(e) => handleBlur('full_name', e.target.value)}
                                            placeholder="e.g. John Doe"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Occupation</label>
                                        <input
                                            type="text"
                                            name="occupation"
                                            value={profile?.occupation || ''}
                                            onChange={handleInputChange}
                                            onBlur={(e) => handleBlur('occupation', e.target.value)}
                                            placeholder="e.g. UI Designer"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Bio</label>
                                    <textarea
                                        name="bio"
                                        value={profile?.bio || ''}
                                        onChange={handleInputChange}
                                        onBlur={(e) => handleBlur('bio', e.target.value)}
                                        rows={4}
                                        placeholder="Tell us about yourself..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1 flex items-center gap-2">
                                            <Globe className="w-3 h-3" /> Country
                                        </label>
                                        <input
                                            type="text"
                                            name="location_country"
                                            value={profile?.location_country || ''}
                                            onChange={handleInputChange}
                                            onBlur={(e) => handleBlur('location_country', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Website</label>
                                        <input
                                            type="url"
                                            name="website"
                                            value={profile?.website || ''}
                                            onChange={handleInputChange}
                                            onBlur={(e) => handleBlur('website', e.target.value)}
                                            placeholder="https://"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'learning' && (
                            <div className="space-y-8">
                                <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <History className="w-4 h-4 text-blue-400" />
                                        Native Languages
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(profile?.native_languages || ['English']).map((lang: string) => (
                                            <span key={lang} className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-sm font-bold border border-blue-500/20 flex items-center gap-2 group/lang">
                                                {lang}
                                                <button
                                                    onClick={() => {
                                                        const newLangs = (profile?.native_languages || []).filter((l: string) => l !== lang);
                                                        updateProfile({ native_languages: newLangs });
                                                    }}
                                                    className="opacity-0 group-hover/lang:opacity-100 transition-opacity"
                                                >
                                                    <Plus className="w-3 h-3 rotate-45 text-red-400 hover:text-red-300" />
                                                </button>
                                                {!profile?.native_languages?.includes(lang) && <Check className="w-3 h-3" />}
                                            </span>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const lang = prompt("Enter language name:");
                                                if (lang && !profile?.native_languages?.includes(lang)) {
                                                    const newLangs = [...(profile?.native_languages || []), lang];
                                                    updateProfile({ native_languages: newLangs });
                                                }
                                            }}
                                            className="px-4 py-2 bg-white/5 text-white/40 rounded-xl text-sm font-bold border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" /> Add Language
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <Target className="w-4 h-4 text-purple-400" />
                                        Learning Motivation
                                    </h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {['Career', 'Travel', 'Education', 'Social', 'Culture', 'Hobby'].map(goal => {
                                            const isActive = profile?.learning_motivation?.includes(goal);
                                            return (
                                                <button
                                                    key={goal}
                                                    onClick={() => {
                                                        const current = profile?.learning_motivation || [];
                                                        const next = isActive
                                                            ? current.filter((g: string) => g !== goal)
                                                            : [...current, goal];
                                                        updateProfile({ learning_motivation: next });
                                                    }}
                                                    className={cn(
                                                        "p-4 rounded-2xl border font-bold text-sm text-left transition-all active:scale-95 group",
                                                        isActive
                                                            ? "bg-purple-600/20 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                                                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        {goal}
                                                        <div className={cn(
                                                            "w-4 h-4 rounded-full border transition-all",
                                                            isActive ? "bg-white border-white" : "border-white/20 group-hover:border-blue-500"
                                                        )} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </EnhancedCard>
                </div>

                {/* Right Col - Sidebar Info */}
                <div className="lg:col-span-4 space-y-6">
                    <EnhancedCard className="bg-gradient-to-br from-blue-600/10 to-transparent">
                        <h3 className="text-white font-black uppercase tracking-tighter mb-4 text-sm">Quick Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-white/40 text-xs font-bold uppercase">Learning Hours</span>
                                <span className="text-white font-black italic">124.5h</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-white/40 text-xs font-bold uppercase">Average Score</span>
                                <span className="text-blue-400 font-black italic">85.2</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                <span className="text-white/40 text-xs font-bold uppercase">Level</span>
                                <span className="text-purple-400 font-black italic">Advanced</span>
                            </div>
                        </div>
                    </EnhancedCard>

                    <EnhancedCard>
                        <h3 className="text-white font-black uppercase tracking-tighter mb-4 text-sm">Social Connections</h3>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-3 rounded-2xl bg-black px-4 text-white font-bold text-sm border border-white/5 active:scale-95 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">G</div>
                                    Google
                                </div>
                                <span className="text-xs text-green-400 font-black uppercase tracking-widest italic outline-none">Connected</span>
                            </button>
                            <button className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#1877F2] px-4 text-white font-bold text-sm active:scale-95 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">F</div>
                                    Facebook
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest italic animate-pulse">Connect</span>
                            </button>
                        </div>
                    </EnhancedCard>
                </div>
            </div>
        </div>
    );
};
