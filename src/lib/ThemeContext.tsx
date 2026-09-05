import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorMode } from '@chakra-ui/react';

export type AccentColor = 'blue' | 'purple' | 'pink' | 'green' | 'orange';
export type LayoutMode = 'default' | 'compact' | 'split';
export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
    theme: ThemeMode;
    resolvedTheme: 'dark' | 'light';
    setTheme: (theme: ThemeMode) => void;
    accent: AccentColor;
    setAccent: (accent: AccentColor) => void;
    layout: LayoutMode;
    setLayout: (layout: LayoutMode) => void;
    glassmorphism: boolean;
    setGlassmorphism: (enabled: boolean) => void;
    microAnimations: boolean;
    setMicroAnimations: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage keys
const PREFERENCE_KEY = 'cadence-theme-preference'; // Stores user intent: 'light' | 'dark' | 'system'
const CHAKRA_KEY = 'chakra-ui-color-mode';          // Stores resolved mode: 'light' | 'dark' (for ColorModeScript)

const resolveSystemTheme = (): 'dark' | 'light' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

export const resolveTheme = (pref: ThemeMode): 'dark' | 'light' => {
    if (pref === 'system') {
        return resolveSystemTheme();
    }
    return pref;
};

const getInitialPreference = (): ThemeMode => {
    if (typeof window === 'undefined') return 'light';
    const savedPref = localStorage.getItem(PREFERENCE_KEY) as ThemeMode;
    if (savedPref === 'dark' || savedPref === 'light' || savedPref === 'system') {
        return savedPref;
    }
    // Fallback: check legacy chakra key if present
    const legacy = localStorage.getItem(CHAKRA_KEY);
    if (legacy === 'dark' || legacy === 'light') {
        return legacy;
    }
    return 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colorMode, setColorMode } = useColorMode();
    const [theme, setThemeState] = useState<ThemeMode>(getInitialPreference);
    const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => resolveTheme(getInitialPreference()));
    const [accent, setAccent] = useState<AccentColor>('blue');
    const [layout, setLayout] = useState<LayoutMode>('default');
    const [glassmorphism, setGlassmorphism] = useState(true);
    const [microAnimations, setMicroAnimations] = useState(true);

    const setTheme = useCallback((newTheme: ThemeMode) => {
        setThemeState(newTheme);
        localStorage.setItem(PREFERENCE_KEY, newTheme);
        const resolved = resolveTheme(newTheme);
        setResolvedTheme(resolved);
        localStorage.setItem(CHAKRA_KEY, resolved);
        setColorMode(resolved);
    }, [setColorMode]);

    // Handle OS preference changes dynamically when theme preference is 'system'
    useEffect(() => {
        if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            const resolved = e.matches ? 'dark' : 'light';
            setResolvedTheme(resolved);
            localStorage.setItem(CHAKRA_KEY, resolved);
            setColorMode(resolved);
            document.documentElement.setAttribute('data-theme', resolved);
            document.documentElement.classList.toggle('dark', resolved === 'dark');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, setColorMode]);

    // Cross-tab theme sync via storage event
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleStorage = (e: StorageEvent) => {
            if (e.key === PREFERENCE_KEY && e.newValue) {
                const newPref = e.newValue as ThemeMode;
                if (newPref === 'light' || newPref === 'dark' || newPref === 'system') {
                    setThemeState(newPref);
                    const resolved = resolveTheme(newPref);
                    setResolvedTheme(resolved);
                    setColorMode(resolved);
                    document.documentElement.setAttribute('data-theme', resolved);
                    document.documentElement.classList.toggle('dark', resolved === 'dark');
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [setColorMode]);

    // Synchronize Theme, Accent, and Chakra ColorMode
    useEffect(() => {
        const root = document.documentElement;
        const resolvedMode = resolveTheme(theme);
        setResolvedTheme(resolvedMode);

        // Ensure chakra-ui-color-mode key always holds resolved 'dark' | 'light'
        localStorage.setItem(CHAKRA_KEY, resolvedMode);
        localStorage.setItem(PREFERENCE_KEY, theme);

        if (colorMode !== resolvedMode) {
            setColorMode(resolvedMode);
        }

        const colors = {
            blue: '#3b82f6',
            purple: '#8b5cf6',
            pink: '#ec4899',
            green: '#10b981',
            orange: '#f59e0b'
        };

        root.style.setProperty('--primary', colors[accent]);
        root.style.setProperty('--primary-alpha', colors[accent] + '33');

        root.setAttribute('data-layout', layout);
        root.setAttribute('data-glass', String(glassmorphism));
        root.setAttribute('data-animations', String(microAnimations));
        root.setAttribute('data-theme', resolvedMode);
        root.classList.toggle('dark', resolvedMode === 'dark');

    }, [theme, accent, layout, glassmorphism, microAnimations, colorMode, setColorMode]);

    return (
        <ThemeContext.Provider value={{
            theme, resolvedTheme, setTheme,
            accent, setAccent,
            layout, setLayout,
            glassmorphism, setGlassmorphism,
            microAnimations, setMicroAnimations
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
