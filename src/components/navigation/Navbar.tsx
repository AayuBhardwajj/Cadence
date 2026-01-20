import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, Bell, ChevronDown, Users, User, Shield } from 'lucide-react';
import { cn } from "../../lib/utils";
import { useTier } from "../../lib/TierContext";
import { ProfileDropdown } from "./ProfileDropdown";
import { NotificationBell } from "./NotificationBell";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../lib/LanguageContext";


interface NavbarProps {
    username: string;
}

export function Navbar({ username: initialUsername }: NavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { tier } = useTier();
    const [profile, setProfile] = React.useState<any>(null);

    React.useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                if (data) setProfile(data);

                // Real-time synchronization
                const subscription = supabase
                    .channel('navbar_profile_sync')
                    .on('postgres_changes', {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`
                    }, (payload) => {
                        setProfile(payload.new);
                    })
                    .subscribe();

                return () => {
                    subscription.unsubscribe();
                };
            }
        };
        fetchProfile();
    }, []);

    const userEmail = profile?.email || `${(profile?.username || initialUsername).toLowerCase()}@example.com`;
    const avatarUrl = profile?.avatar_url;
    const currentUsername = profile?.full_name || profile?.username || initialUsername;

    const { t } = useLanguage();

    const navItems = [
        { name: t('nav.dashboard'), path: '/dashboard' },
        { name: t('nav.practice'), path: '/practice' },
        { name: t('nav.progress'), path: '/progress' },
        { name: t('nav.exercises'), path: '/exercises' },
        { name: t('nav.community'), path: '/community' },
    ];

    const currentItem = navItems.find(item => location.pathname === item.path)?.name || t('nav.dashboard');


    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-xl transition-all duration-300">
            <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/50">
                        <Mic className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tighter">
                        FLUENTLY
                    </span>
                    <div className={cn(
                        "ml-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        tier === 'FREE' ? "bg-white/10 text-white/60" :
                            tier === 'PRO' ? "bg-amber-400/20 text-amber-400 border border-amber-400/30" :
                                "bg-purple-400/20 text-purple-400 border border-purple-400/30"
                    )}>
                        {tier} PLAN
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                    {navItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                location.pathname === item.path ? "bg-white/10 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {item.name}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    {/* Family Switcher (Pro/Family only) */}
                    {(tier === 'PRO' || tier === 'FAMILY') && (
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white/60 hover:text-white transition-all">
                                <Users className="w-4 h-4" />
                                <span className="hidden lg:inline">Family Context</span>
                                <ChevronDown className="w-3 h-3 opacity-40" />
                            </button>
                            <div className="absolute right-0 mt-2 w-56 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[60] overflow-hidden">
                                <div className="p-3 border-b border-white/5 bg-white/5">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active Member</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 border border-white/20" />
                                        <span className="text-xs font-bold text-white">{currentUsername}</span>
                                        <Shield className="w-3 h-3 text-blue-400 ml-auto" />
                                    </div>
                                </div>
                                <div className="p-1">
                                    <button className="w-full px-3 py-2 text-left text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/5 transition-all rounded flex items-center gap-2">
                                        <User className="w-3 h-3" />
                                        Switch to Elena
                                    </button>
                                    <button className="w-full px-3 py-2 text-left text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/5 transition-all rounded flex items-center gap-2">
                                        <User className="w-3 h-3" />
                                        Switch to Marcus
                                    </button>
                                    {tier === 'PRO' && (
                                        <div className="p-3 bg-amber-400/10 m-1 rounded-lg border border-amber-400/20">
                                            <p className="text-[9px] font-bold text-amber-400 leading-tight">Upgrade to Family to add 4 more members!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <button className="relative p-2 text-white/60 hover:text-white transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0a1a]" />
                    </button>

                    <div className="h-8 w-[1px] bg-white/10 mx-2" />

                    <NotificationBell />

                    <ProfileDropdown user={{
                        username: currentUsername,
                        email: userEmail,
                        avatar_url: avatarUrl
                    }} />
                </div>
            </div>
        </nav>
    );
}
