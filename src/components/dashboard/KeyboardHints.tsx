import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard } from 'lucide-react';

export const KeyboardHints: React.FC = () => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '?' && (e.metaKey || e.ctrlKey)) {
                setShow(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const shortcuts = [
        { key: 'A', action: 'Start Assessment' },
        { key: 'P', action: 'Quick Practice' },
        { key: 'L', action: 'Logout' },
        { key: 'M', action: 'Toggle Menu' },
    ];

    return (
        <>
            <div className="fixed bottom-8 left-8 z-50">
                <button
                    onClick={() => setShow(!show)}
                    className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                    title="Keyboard Shortcuts (Cmd + ?)"
                >
                    <Keyboard className="w-5 h-5" />
                </button>
            </div>

            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: -20 }}
                        className="fixed bottom-24 left-8 z-50 p-6 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/20 shadow-2xl w-64"
                    >
                        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Keyboard className="w-4 h-4" /> Keyboard Shortcuts
                        </h4>
                        <div className="space-y-3">
                            {shortcuts.map(s => (
                                <div key={s.key} className="flex items-center justify-between text-xs">
                                    <span className="text-white/60">{s.action}</span>
                                    <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-white font-mono">
                                        {s.key}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-[10px] text-white/30 text-center italic">
                            Press Cmd + ? to toggle this menu
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
