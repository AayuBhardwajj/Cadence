import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface EnhancedCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    hoverScale?: boolean;
}

export const EnhancedCard = React.memo<EnhancedCardProps>(({
    children,
    className,
    delay = 0,
    hoverScale = true
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={hoverScale ? { y: -5, transition: { duration: 0.2 } } : {}}
            className={cn(
                "relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md transition-all duration-300",
                "shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]",
                "before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-white/10 before:to-transparent",
                "will-change-transform",
                className
            )}
        >
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/0 to-purple-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
            {children}
        </motion.div>
    );
});
