import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const quotes = [
    "Practice makes progress, not perfection.",
    "Your voice deserves to be heard.",
    "Every small step is a giant leap in your journey.",
    "Confidence is the best accessory – practice it!",
    "Communication is a skill you can learn.",
    "The only way to fail is to stop trying."
];

export const RotatingQuotes: React.FC = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % quotes.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="h-12 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-lg text-blue-200/80 italic text-center px-4"
                >
                    "{quotes[index]}"
                </motion.p>
            </AnimatePresence>
        </div>
    );
};
