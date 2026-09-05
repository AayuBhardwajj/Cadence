import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { cn } from '../../lib/utils';

export interface CadenceThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
}

export const CadenceThemeToggle: React.FC<CadenceThemeToggleProps> = ({ className, ...props }) => {
    const { resolvedTheme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    const isDark = resolvedTheme === 'dark';
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={label}
            title={label}
            className={cn(
                'relative flex items-center justify-center p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-surface transition-colors duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                className
            )}
            {...props}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.span
                        key="sun"
                        initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex items-center justify-center text-amber-400"
                    >
                        <Sun className="w-5 h-5" aria-hidden="true" />
                    </motion.span>
                ) : (
                    <motion.span
                        key="moon"
                        initial={{ opacity: 0, rotate: 45, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -45, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="inline-flex items-center justify-center text-indigo-500"
                    >
                        <Moon className="w-5 h-5" aria-hidden="true" />
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
};

export default CadenceThemeToggle;
