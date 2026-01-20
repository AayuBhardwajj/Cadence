import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    Target,
    Pencil,
    Trash2,
    MoreHorizontal,
    Star,
    Award,
    TrendingUp,
    Zap,
    MessageSquare,
    Instagram,
    Linkedin,
    Github,
    Twitter,
    ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { ProfileDropdown } from "../../components/navigation/ProfileDropdown";
import { ImageCropper } from "../../components/profile/ImageCropper";
import { EnhancedCard } from '../../components/dashboard/EnhancedCard';
import { AnimatedCounter } from '../../components/dashboard/AnimatedCounter';
import { MediaUtils } from '../../lib/MediaUtils';

const PROFILE_SECTIONS = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'learning', label: 'Learning & AI' },
    { id: 'social', label: 'Social & Visibility' }
];

export const ProfilePage = () => {
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>({
        avgScore: 0,
        hours: 0,
        level: 'Beginner',
        matrix: { fluency: 0, clarity: 0, vocab: 0, confidence: 0 }
    });
    const [latestAssessment, setLatestAssessment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [croppingImage, setCroppingImage] = useState<{ src: string, type: 'avatar' | 'cover' } | null>(null);
    const [activeSection, setActiveSection] = useState('personal');
    const [bannerAspect, setBannerAspect] = useState(4); // Default 4:1
    const bannerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateAspect = () => {
            if (bannerRef.current) {
                const { width, height } = bannerRef.current.getBoundingClientRect();
                setBannerAspect(width / height);
            }
        };
        updateAspect();
        window.addEventListener('resize', updateAspect);
        return () => window.removeEventListener('resize', updateAspect);
    }, [bannerRef.current]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await fetchProfile(user.id);
                await fetchStats(user.id);

                // Real-time Subscriptions
                const profileSub = supabase
                    .channel('profile_changes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`
                    }, (payload) => {
                        setProfile(payload.new);
                    })
                    .subscribe();

                const assessmentSub = supabase
                    .channel('assessment_changes')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'assessments',
                        filter: `user_id=eq.${user.id}`
                    }, () => {
                        fetchStats(user.id);
                    })
                    .subscribe();

                return () => {
                    profileSub.unsubscribe();
                    assessmentSub.unsubscribe();
                };
            }
        };
        init();
    }, []);

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) setProfile(data);
        else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
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
    };

    const fetchStats = async (userId: string) => {
        const { data: assessments, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (assessments && assessments.length > 0) {
            setLatestAssessment(assessments[0]);

            const totalScore = assessments.reduce((acc, curr) => acc + (curr.overall_score || 0), 0);
            const avgScore = Math.round(totalScore / assessments.length);

            // Learning Hours: total assessments * 10 mins approx
            const hours = (assessments.length * 10) / 60;

            // Level based on avg score
            const level = avgScore > 85 ? 'Expert' : avgScore > 70 ? 'Advanced' : avgScore > 50 ? 'Intermediate' : 'Beginner';

            // Skill Matrix (Aggregation of recent)
            const recent = assessments.slice(0, 5);
            const matrix = {
                fluency: Math.round(recent.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / recent.length),
                confidence: Math.round(recent.reduce((acc, curr) => acc + (curr.eye_contact_score || 0), 0) / recent.length),
                clarity: Math.round(recent.reduce((acc, curr) => acc + (100 - (curr.filler_word_count || 0) * 2), 0) / recent.length),
                vocab: Math.round(recent.reduce((acc, curr) => acc + (curr.overall_score * 0.9), 0) / recent.length) // Mock vocab for now
            };

            setStats({ avgScore, hours: hours.toFixed(1), level, matrix });
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setCroppingImage({ src: reader.result as string, type });
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedFile: File) => {
        if (!croppingImage) return;
        const { type } = croppingImage;
        setCroppingImage(null);

        // Optimistic UI: Create local preview
        const localUrl = URL.createObjectURL(croppedFile);
        setProfile((prev: any) => ({ ...prev, [type === 'avatar' ? 'avatar_url' : 'cover_url']: localUrl }));

        setSaving(type === 'avatar' ? 'Compressing & Uploading...' : 'Compressing & Uploading...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // 1. Compress Image Client-Side
            const compressedFile = await MediaUtils.compressImage(croppedFile, type);

            // 2. Prepare Upload Path (Versioning with timestamp ensures CDN updates)
            const fileExt = 'webp';
            const filePath = `${user.id}/${type}_${Date.now()}.${fileExt}`;

            // 3. Upload with Aggressive Caching
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, compressedFile, {
                    upsert: true,
                    contentType: 'image/webp',
                    cacheControl: '31536000' // 1 year cache
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 4. Persist to DB
            await updateProfile({ [type === 'avatar' ? 'avatar_url' : 'cover_url']: publicUrl });
            setSaving(null);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload image. Please try again.');
            // Revert on error - fetch fresh data
            fetchProfile(user.id);
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* 🔹 1. Visual Identity Components */}
            <div className="relative">
                {/* Banner / Cover Image */}
                <div
                    ref={bannerRef}
                    className="group relative h-72 rounded-[2rem] overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 border border-white/10 shadow-2xl"
                >
                    {profile?.cover_url ? (
                        <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                        <label className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 cursor-pointer border border-white/10 active:scale-95 transition-all">
                            <Upload className="w-4 h-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
                        </label>
                        {profile?.cover_url && (
                            <button
                                onClick={() => updateProfile({ cover_url: null })}
                                className="p-3 bg-red-500/20 backdrop-blur-md rounded-2xl text-red-400 hover:bg-red-500/30 border border-red-500/20 active:scale-95 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Banner Overlay Info (Quote/Goal) */}
                    <div className="absolute bottom-8 right-10 text-right space-y-2 hidden md:block">
                        <p className="text-white/80 font-medium italic text-sm max-w-xs ml-auto">
                            "{profile?.banner_quote || "Believe you can and you're halfway there."}"
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                                Goal: {profile?.current_goal || 'Fluency Master'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Picture Overlay */}
                <div className="absolute left-12 -bottom-16 flex items-end gap-8">
                    <div className="relative group/avatar">
                        <div className="w-44 h-44 rounded-[2.5rem] bg-[#0a0a1a] border-[6px] border-[#0a0a1a] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-5xl font-black text-white">
                                    {profile?.username?.[0].toUpperCase()}
                                </div>
                            )}

                            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer">
                                <Camera className="w-8 h-8 text-white" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Change Photo</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                            </label>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute -right-2 -bottom-2 px-4 py-1.5 bg-blue-600 rounded-2xl border-4 border-[#0a0a1a] shadow-xl">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3 h-3 text-white fill-white" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{stats.level} Speaker</span>
                            </div>
                        </div>
                    </div>

                    <div className="pb-6 space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-0">
                                {profile?.full_name || profile?.username}
                            </h1>
                            {profile?.verified && (
                                <div className="bg-blue-500 p-0.5 rounded-full">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-white/40 font-bold text-xs uppercase tracking-[0.15em]">
                            <span className="flex items-center gap-1.5"><Briefcase className="w-3 h-3" /> {profile?.occupation || 'Linguistics Enthusiast'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {profile?.location_country || 'Global Citizen'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* 🔹 2. Personal Info Section (Structured Cards) */}
                <div className="lg:col-span-8 space-y-8">
                    <EnhancedCard className="border-none bg-white/[0.02] backdrop-blur-3xl p-8">
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
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Current Goal</label>
                                        <input
                                            type="text"
                                            name="current_goal"
                                            value={profile?.current_goal || ''}
                                            onChange={handleInputChange}
                                            onBlur={(e) => handleBlur('current_goal', e.target.value)}
                                            placeholder="e.g. Master Fluency"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                        />
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Banner Quote</label>
                                            <input
                                                type="text"
                                                name="banner_quote"
                                                value={profile?.banner_quote || ''}
                                                onChange={handleInputChange}
                                                onBlur={(e) => handleBlur('banner_quote', e.target.value)}
                                                placeholder="e.g. Believe you can..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                            />
                                        </div>
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                            <Globe className="w-3 h-3" /> Country
                                        </label>
                                        <input
                                            type="text"
                                            name="location_country"
                                            value={profile?.location_country || ''}
                                            onChange={handleInputChange}
                                            onBlur={(e) => handleBlur('location_country', e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3" /> Timezone
                                        </label>
                                        <input
                                            type="text"
                                            name="timezone"
                                            value={profile?.timezone || 'GMT+5:30'}
                                            onChange={handleInputChange}
                                            onBlur={(e) => handleBlur('timezone', e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'learning' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* 🔹 3. Learning & Progress Components */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-400" /> Skill Proficiency
                                        </h3>
                                        {[
                                            { label: 'Fluency', value: stats.matrix.fluency, color: 'bg-blue-500' },
                                            { label: 'Confidence', value: stats.matrix.confidence, color: 'bg-emerald-500' },
                                            { label: 'Clarity', value: stats.matrix.clarity, color: 'bg-purple-500' },
                                            { label: 'Pronunciation', value: stats.matrix.vocab, color: 'bg-amber-500' }
                                        ].map((skill) => (
                                            <div key={skill.label} className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                                                    <span>{skill.label}</span>
                                                    <span className="text-white">{skill.value}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${skill.value}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className={cn("h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", skill.color)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
                                            <Award className="w-4 h-4 text-amber-400" /> Recent Achievements
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: '7-Day Streak', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                                                { label: 'Confidence Up', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                                                { label: 'Top 10% Club', icon: Award, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                                                { label: 'Fast Talker', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
                                            ].map((badge) => (
                                                <div key={badge.label} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-2 group hover:bg-white/10 transition-all cursor-default">
                                                    <div className={cn("p-3 rounded-xl", badge.bg)}>
                                                        <badge.icon className={cn("w-5 h-5", badge.color)} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest text-center">{badge.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 🔹 4. AI Insights Section */}
                                <div className="space-y-6 pt-10 border-t border-white/5">
                                    <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-blue-400" /> AI Profile Summary
                                    </h3>
                                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-600/10 to-purple-600/5 border border-white/10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                                            <MessageSquare className="w-24 h-24 text-blue-500" />
                                        </div>
                                        <p className="text-lg text-white/80 leading-relaxed font-medium relative z-10 italic">
                                            “{latestAssessment?.feedback || profile?.ai_summary || "You haven't completed any assessments yet. Start your first session to get AI insights!"}”
                                        </p>

                                        <div className="mt-8 flex flex-wrap gap-3 relative z-10">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest w-full mb-2">Focus Areas</span>
                                            {[
                                                { label: 'Improve Eye Contact', variant: 'blue' },
                                                { label: 'Reduce Filler Words', variant: 'purple' },
                                                { label: 'Slow Down Pace', variant: 'emerald' }
                                            ].map((pill) => (
                                                <span key={pill.label} className={cn(
                                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border",
                                                    pill.variant === 'blue' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                                        pill.variant === 'purple' ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                                                            "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                )}>
                                                    {pill.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Preferences & Languages */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-white/5">
                                    <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-blue-500/30 transition-all group">
                                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-blue-400" /> Native Languages
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(profile?.native_languages || ['English']).map((lang: string) => (
                                                <span key={lang} className="px-5 py-2.5 bg-blue-600/10 text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-500/20 flex items-center gap-2 group/lang">
                                                    {lang}
                                                    <button
                                                        onClick={() => {
                                                            const newLangs = (profile?.native_languages || []).filter((l: string) => l !== lang);
                                                            updateProfile({ native_languages: newLangs });
                                                        }}
                                                        className="opacity-0 group-hover/lang:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3 h-3 text-red-400" />
                                                    </button>
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
                                                className="px-5 py-2.5 bg-white/5 text-white/40 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                                            >
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-purple-500/30 transition-all group">
                                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                            <Target className="w-4 h-4 text-purple-400" /> Goal Profile
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Career', 'Travel', 'Public Speaking', 'Social'].map(goal => {
                                                const isActive = profile?.learning_motivation?.includes(goal);
                                                return (
                                                    <button
                                                        key={goal}
                                                        onClick={() => {
                                                            const current = profile?.learning_motivation || [];
                                                            const next = isActive ? current.filter((g: string) => g !== goal) : [...current, goal];
                                                            updateProfile({ learning_motivation: next });
                                                        }}
                                                        className={cn(
                                                            "p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest text-left transition-all active:scale-95",
                                                            isActive ? "bg-purple-600/20 border-purple-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {goal}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'social' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* 🔹 6. Social & Visibility */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 space-y-6">
                                        <h3 className="text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-sky-400" /> Account Connections
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { name: 'linkedin_url', label: 'LinkedIn URL', icon: Linkedin },
                                                { name: 'twitter_url', label: 'Twitter URL', icon: Twitter },
                                                { name: 'github_url', label: 'GitHub URL', icon: Github },
                                                { name: 'instagram_url', label: 'Instagram URL', icon: Instagram }
                                            ].map((link) => (
                                                <div key={link.name} className="space-y-2">
                                                    <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                        <link.icon className="w-3 h-3" /> {link.label}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name={link.name}
                                                        value={profile?.[link.name] || ''}
                                                        onChange={handleInputChange}
                                                        onBlur={(e) => handleBlur(link.name, e.target.value)}
                                                        placeholder={`https://${link.label.split(' ')[0].toLowerCase()}.com/in/username`}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 space-y-6">
                                        <h3 className="text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-purple-400" /> Profile Visibility
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { id: 'public', label: 'Public Profile', desc: 'Anyone can see your progress' },
                                                { id: 'private', label: 'Private', desc: 'Only you can see your profile' },
                                                { id: 'recruiter', label: 'Recruiter View', desc: 'Visible to verified employers' }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => updateProfile({ visibility: opt.id })}
                                                    className={cn(
                                                        "w-full p-4 rounded-2xl border text-left transition-all active:scale-95 group relative overflow-hidden",
                                                        profile?.visibility === opt.id
                                                            ? "bg-purple-600/10 border-purple-500/50 shadow-xl"
                                                            : "bg-white/5 border-white/5 hover:border-white/20"
                                                    )}
                                                >
                                                    <div className="relative z-10 flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-black text-white">{opt.label}</p>
                                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{opt.desc}</p>
                                                        </div>
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center",
                                                            profile?.visibility === opt.id ? "bg-purple-600 border-purple-600" : "border-white/10 group-hover:border-white/30"
                                                        )}>
                                                            {profile?.visibility === opt.id && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </EnhancedCard>
                </div>

                {/* Right Col - Sidebar Info */}
                <div className="lg:col-span-4 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <EnhancedCard className="bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent border-blue-500/20 shadow-2xl p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp className="w-24 h-24 text-white" />
                            </div>

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Performance Insights</h3>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Real-time Stats</p>
                                </div>
                                <button className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <MoreHorizontal className="w-4 h-4 text-white/40" />
                                </button>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {[
                                    { label: 'Learning Hours', value: `${stats.hours}h`, icon: History, color: 'text-blue-400' },
                                    { label: 'Average Score', value: stats.avgScore, icon: Star, color: 'text-amber-400' },
                                    { label: 'Current Level', value: stats.level, icon: Zap, color: 'text-purple-400' }
                                ].map((stat) => (
                                    <div key={stat.label} className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 group/stat hover:bg-white/[0.07] transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-2xl bg-white/5 group-hover/stat:scale-110 transition-transform">
                                                <stat.icon className={cn("w-4 h-4", stat.color)} />
                                            </div>
                                            <span className="text-white/40 text-[10px] font-black uppercase tracking-wider">{stat.label}</span>
                                        </div>
                                        <span className="text-white font-black italic text-lg px-2">{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </EnhancedCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <EnhancedCard className="p-8 bg-white/[0.02] border-white/5 backdrop-blur-3xl">
                            <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-8">Connected Identities</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { icon: Linkedin, color: "text-blue-400", label: 'LinkedIn', url: profile?.linkedin_url },
                                    { icon: Twitter, color: "text-sky-400", label: 'Twitter', url: profile?.twitter_url },
                                    { icon: Github, color: "text-white", label: 'GitHub', url: profile?.github_url },
                                    { icon: Instagram, color: "text-pink-400", label: 'Instagram', url: profile?.instagram_url }
                                ].map((item, idx) => (
                                    <a
                                        key={idx}
                                        href={item.url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                            "aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all transform active:scale-95 group relative overflow-hidden",
                                            !item.url && "opacity-20 cursor-not-allowed grayscale"
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <item.icon className={cn("w-5 h-5 relative z-10", item.color, "group-hover:scale-110 transition-transform")} />
                                    </a>
                                ))}
                            </div>
                        </EnhancedCard>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        {/* Quick Link Card - Enhanced */}
                        <EnhancedCard className="bg-blue-600 border-none p-8 flex items-center justify-between group cursor-pointer hover:shadow-[0_20px_40px_rgba(37,99,235,0.3)] transition-all relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="p-4 bg-white/20 backdrop-blur-md rounded-[1.5rem] shadow-xl border border-white/10 group-hover:scale-110 transition-transform">
                                    <Award className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Mastered Skills</p>
                                    <p className="text-base font-black text-white mt-0.5">Top 1% Phonetic Clear</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-2 transition-all relative z-10" />
                        </EnhancedCard>
                    </motion.div>
                </div>
            </div>

            {/* 7. Quick Actions Panel (Floating) */}
            <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3 group">
                <div className="flex flex-col gap-2 scale-0 group-hover:scale-100 transition-all origin-bottom items-end duration-300 pointer-events-none group-hover:pointer-events-auto">
                    {[
                        { label: 'Edit Profile', icon: Pencil, color: 'bg-blue-600', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                        { label: 'View Reports', icon: History, color: 'bg-purple-600', action: () => { } },
                        { label: 'Achievements', icon: Award, color: 'bg-amber-600', action: () => setActiveSection('learning') }
                    ].map((btn, idx) => (
                        <button
                            key={idx}
                            onClick={btn.action}
                            className="flex items-center gap-3 pr-4 pl-6 py-3 rounded-2xl text-white shadow-2xl hover:scale-110 active:scale-95 transition-all group/btn"
                            style={{ backgroundColor: 'transparent' }}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                                {btn.label}
                            </span>
                            <div className={cn("p-4 rounded-2xl shadow-xl", btn.color)}>
                                <btn.icon className="w-5 h-5" />
                            </div>
                        </button>
                    ))}
                </div>

                <button className="w-20 h-20 rounded-[2.5rem] bg-white text-black shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group-hover:rotate-45 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                    <Plus className="w-8 h-8" />
                </button>
            </div>

            {/* 8. Image Cropper Modal */}
            <AnimatePresence>
                {croppingImage && (
                    <ImageCropper
                        image={croppingImage.src}
                        aspect={croppingImage.type === 'cover' ? bannerAspect : 1 / 1}
                        title={croppingImage.type === 'cover' ? 'Adjust Banner' : 'Adjust Profile Photo'}
                        onCropComplete={handleCropComplete}
                        onCancel={() => setCroppingImage(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
