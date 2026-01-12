import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export const StreakHeatmap: React.FC = () => {
    // Mock data for 4 weeks
    const data = Array.from({ length: 28 }, (_, i) => ({
        active: Math.random() > 0.4,
        day: i
    }));

    return (
        <div className="grid grid-cols-7 gap-1.5">
            {data.map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className={cn(
                        "h-3 w-full rounded-[2px] transition-colors duration-500",
                        item.active ? "bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "bg-white/5"
                    )}
                    title={`Day ${i + 1}`}
                />
            ))}
        </div>
    );
};
