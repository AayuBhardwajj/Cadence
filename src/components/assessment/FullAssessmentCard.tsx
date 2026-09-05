import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Timer, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CadenceButton } from '../ui/CadenceButton';
import { cn } from '../../lib/utils';

export const FullAssessmentCard = () => {
    const navigate = useNavigate();

    const handleStart = () => {
        navigate('/assessment');
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative cursor-pointer w-full"
            onClick={handleStart}
        >
            <div className="relative overflow-hidden group min-h-[200px] p-6 sm:p-8 rounded-3xl bg-surface border border-border hover:border-brand/40 shadow-sm transition-all duration-300">
                {/* Background Accent Sparkle */}
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none text-brand">
                    <Sparkles className="w-24 h-24" />
                </div>

                <div className="flex flex-col justify-between gap-6 h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20">
                                Featured
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-2.5">
                                FULL ASSESSMENT
                            </h2>
                        </div>
                        <div className="p-3.5 bg-elevated-surface text-brand rounded-2xl border border-border shrink-0">
                            <Mic className="w-7 h-7" />
                        </div>
                    </div>

                    {/* Description & Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-sm text-text-muted max-w-lg leading-relaxed">
                            Comprehensive 5-minute speech analysis covering 6 core metrics and CEFR level estimation.
                        </p>

                        <CadenceButton
                            size="md"
                            variant="primary"
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                            className="hidden sm:inline-flex uppercase tracking-wider text-xs font-bold px-6 shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleStart();
                            }}
                        >
                            Start Now
                        </CadenceButton>
                    </div>

                    {/* Badges / Metrics */}
                    <div className="flex items-center gap-6 pt-1 border-t border-border/50 text-xs font-bold tracking-wider uppercase">
                        <div className="flex items-center gap-1.5 text-success">
                            <Timer className="w-4 h-4" />
                            <span>5 MINS</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-brand">
                            <TrendingUp className="w-4 h-4" />
                            <span>CEFR SCORING</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

