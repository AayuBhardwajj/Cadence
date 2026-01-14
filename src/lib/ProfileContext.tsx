import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

interface Profile {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    updated_at: string | null;
}

interface ProfileContextType {
    profile: Profile | null;
    loading: boolean;
    displayName: string;
    refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authDisplayName, setAuthDisplayName] = useState<string>('User');

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (data) {
                setProfile(data);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await fetchProfile(user.id);
        }
    };

    useEffect(() => {
        // Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                const user = session.user;
                // Set fallback from auth metadata
                const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
                const emailPrefix = user.email?.split('@')[0];
                setAuthDisplayName(metadataName || emailPrefix || 'User');
                fetchProfile(user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                const user = session.user;
                const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
                const emailPrefix = user.email?.split('@')[0];
                setAuthDisplayName(metadataName || emailPrefix || 'User');
                fetchProfile(user.id);
            } else {
                setProfile(null);
                setAuthDisplayName('User');
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Display Strategy: Full Name > Username > Auth Metadata Name > Email Prefix
    const displayName = profile?.full_name || profile?.username || authDisplayName;

    return (
        <ProfileContext.Provider value={{ profile, loading, displayName, refreshProfile }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};
