import React, { createContext, useContext, useState, useEffect } from 'react';

export type AccentColor = 'blue' | 'purple' | 'pink' | 'green' | 'orange';
export type LayoutMode = 'default' | 'compact' | 'split';
export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
    theme: ThemeMode;
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeMode>('dark');
    const [accent, setAccent] = useState<AccentColor>('blue');
    const [layout, setLayout] = useState<LayoutMode>('default');
    const [glassmorphism, setGlassmorphism] = useState(true);
    const [microAnimations, setMicroAnimations] = useState(true);

    // Apply Theme and Accent
    useEffect(() => {
        const root = document.documentElement;

        // Remove previous accent classes if any (optional if purely CSS variable based)
        // Reset CSS variables based on accent
        const colors = {
            blue: '#3b82f6',
            purple: '#8b5cf6',
            pink: '#ec4899',
            green: '#10b981',
            orange: '#f59e0b'
        };

        root.style.setProperty('--primary', colors[accent]);
        // Also set a lighter version for backgrounds
        root.style.setProperty('--primary-alpha', colors[accent] + '33'); // ~20% opacity

        // Apply Layout features
        root.setAttribute('data-layout', layout);
        root.setAttribute('data-glass', String(glassmorphism));
        root.setAttribute('data-animations', String(microAnimations));
        root.setAttribute('data-theme', theme);

    }, [theme, accent, layout, glassmorphism, microAnimations]);

    return (
        <ThemeContext.Provider value={{
            theme, setTheme,
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
