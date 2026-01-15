import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, LanguageCode, TranslationDictionary } from './translations';

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default to 'en' or load from localStorage if previously set
    const [language, setLanguage] = useState<LanguageCode>(() => {
        const saved = localStorage.getItem('cadence-language');
        return (saved as LanguageCode) || 'en';
    });

    useEffect(() => {
        localStorage.setItem('cadence-language', language);
    }, [language]);

    // Helper function to get nested translation values
    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to English if key missing in current language/nested path broken
                // Or better yet, fallback to English dictionary
                let fallbackValue: any = translations['en'];
                for (const fk of keys) {
                    if (fallbackValue && typeof fallbackValue === 'object' && fk in fallbackValue) {
                        fallbackValue = fallbackValue[fk];
                    } else {
                        return key; // Return key if not found anywhere
                    }
                }
                return fallbackValue as string;
            }
        }
        return value as string;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
