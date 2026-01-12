import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, Book, BarChart, Settings, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const QuickActions: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const actions = [
        { icon: <Mic className="w-5 h-5" />, label: "New Assessment", color: "bg-blue-500" },
        { icon: <Book className="w-5 h-5" />, label: "Practice Session", color: "bg-green-500" },
        { icon: <BarChart className="w-5 h-5" />, label: "View Insights", color: "bg-purple-500" },
        { icon: <Settings className="w-5 h-5" />, label: "Settings", color: "bg-gray-500" },
    ];

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            <AnimatePresence>
                {isOpen && (
                    <div className="flex flex-col-reverse gap-4 mb-4 items-end">
                        {actions.map((action, i) => (
                            <motion.button
                                key={action.label}
                                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {action.label}
                                </span>
                                <div className={cn("p-4 rounded-full shadow-lg text-white", action.color)}>
                                    {action.icon}
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "p-5 rounded-full shadow-2xl text-white transition-colors duration-300",
                    isOpen ? "bg-red-500 rotate-0" : "bg-blue-600 shadow-blue-500/50"
                )}
            >
                {isOpen ? <X className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
            </motion.button>
        </div>
    );
};
