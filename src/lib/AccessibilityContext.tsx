import React, { createContext, useContext, useState, useEffect } from 'react';

type TextSize = 'S' | 'M' | 'L' | 'XL';

interface AccessibilityContextType {
    textSize: TextSize;
    setTextSize: (size: TextSize) => void;
    highContrast: boolean;
    setHighContrast: (enabled: boolean) => void;
    reduceMotion: boolean;
    setReduceMotion: (enabled: boolean) => void;
    dyslexicFont: boolean;
    setDyslexicFont: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [textSize, setTextSize] = useState<TextSize>('M');
    const [highContrast, setHighContrast] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [dyslexicFont, setDyslexicFont] = useState(false);

    useEffect(() => {
        const root = document.documentElement;

        // Apply Text Size
        root.setAttribute('data-text-size', textSize);

        // Apply High Contrast
        if (highContrast) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }

        // Apply Reduce Motion
        if (reduceMotion) {
            root.classList.add('reduce-motion');
        } else {
            root.classList.remove('reduce-motion');
        }

        // Apply Dyslexic Font
        if (dyslexicFont) {
            root.classList.add('dyslexic-font');
        } else {
            root.classList.remove('dyslexic-font');
        }

    }, [textSize, highContrast, reduceMotion, dyslexicFont]);

    return (
        <AccessibilityContext.Provider
            value={{
                textSize,
                setTextSize,
                highContrast,
                setHighContrast,
                reduceMotion,
                setReduceMotion,
                dyslexicFont,
                setDyslexicFont,
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
};
