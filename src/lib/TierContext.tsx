import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserTier = 'FREE' | 'PRO' | 'FAMILY';

interface TierContextType {
    tier: UserTier;
    setTier: (tier: UserTier) => void;
    isFeatureLocked: (feature: string) => boolean;
}

const TierContext = createContext<TierContextType | undefined>(undefined);

export const TierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // In a real app, this would be fetched from Supabase/Stripe
    const [tier, setTier] = useState<UserTier>('FREE');

    const isFeatureLocked = (feature: string): boolean => {
        switch (tier) {
            case 'FREE':
                // List of locked features for FREE tier
                const freeLocked = [
                    'advanced_analytics',
                    'unlimited_history',
                    'real_time_feedback',
                    'all_exercises',
                    'ai_conversation',
                    'community_interaction',
                    'export_reports',
                    'family_features'
                ];
                return freeLocked.includes(feature);
            case 'PRO':
                const proLocked = ['family_features', 'family_comparison', 'family_leaderboard'];
                return proLocked.includes(feature);
            case 'FAMILY':
                return false;
            default:
                return true;
        }
    };

    return (
        <TierContext.Provider value={{ tier, setTier, isFeatureLocked }}>
            {children}
        </TierContext.Provider>
    );
};

export const useTier = () => {
    const context = useContext(TierContext);
    if (context === undefined) {
        throw new Error('useTier must be used within a TierProvider');
    }
    return context;
};
