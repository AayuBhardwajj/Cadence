import React from 'react';
import { motion } from 'framer-motion';

export const DashboardBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a1a] text-white">
            {/* Animated Gradients */}
            <div className="fixed inset-0 -z-20">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 45, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [45, 0, 45],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -bottom-[20%] -right-[10%] h-[70%] w-[70%] rounded-full bg-gradient-to-br from-teal-500/20 to-indigo-600/30 blur-[120px]"
                />
            </div>

            {/* Grid Pattern overlay */}
            <div className="fixed inset-0 -z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

            {/* Floating Particles */}
            <div className="fixed inset-0 -z-10 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: Math.random() * 100 + "%",
                            y: Math.random() * 100 + "%",
                            opacity: Math.random() * 0.5 + 0.2
                        }}
                        animate={{
                            y: ["-10%", "110%"],
                            opacity: [0, 0.5, 0]
                        }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 10
                        }}
                        className="absolute h-1 w-1 rounded-full bg-white"
                    />
                ))}
            </div>

            <div className="relative z-0">
                {children}
            </div>
        </div>
    );
};
