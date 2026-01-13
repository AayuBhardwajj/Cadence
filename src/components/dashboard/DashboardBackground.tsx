import React from 'react';
import { motion } from 'framer-motion';

export const DashboardBackground = React.memo<{ children: React.ReactNode }>(({ children }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a1a] text-white">
            {/* Animated Gradients */}
            <div className="fixed inset-0 -z-20 pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 20, 0],
                    }}
                    transition={{
                        duration: 30,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-[100px] will-change-transform"
                />
                <motion.div
                    animate={{
                        scale: [1.1, 1, 1.1],
                        rotate: [20, 0, 20],
                    }}
                    transition={{
                        duration: 35,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -bottom-[20%] -right-[10%] h-[70%] w-[70%] rounded-full bg-gradient-to-br from-teal-500/10 to-indigo-600/20 blur-[100px] will-change-transform"
                />
            </div>

            {/* Grid Pattern overlay */}
            <div className="fixed inset-0 -z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />

            {/* Floating Particles - Reduced to 8 for performance */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: Math.random() * 100 + "%",
                            y: Math.random() * 100 + "%",
                            opacity: Math.random() * 0.3 + 0.1
                        }}
                        animate={{
                            y: ["-5%", "105%"],
                            opacity: [0, 0.4, 0]
                        }}
                        transition={{
                            duration: Math.random() * 15 + 15,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 10
                        }}
                        className="absolute h-0.5 w-0.5 rounded-full bg-white will-change-transform"
                    />
                ))}
            </div>

            <div className="relative z-0">
                {children}
            </div>
        </div>
    );
});
