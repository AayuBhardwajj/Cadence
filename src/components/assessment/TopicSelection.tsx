import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { CadenceButton } from '../ui/CadenceButton';

const AVAILABLE_TOPICS = [
  { id: 'workplace', label: 'Workplace Communication', icon: '💼', description: 'Professional settings, meetings, presentations' },
  { id: 'technology', label: 'Technology', icon: '💻', description: 'Tech concepts, digital tools, innovation' },
  { id: 'social', label: 'Social Situations', icon: '🗣️', description: 'Everyday conversations, storytelling, opinions' },
  { id: 'academic', label: 'Academic English', icon: '📚', description: 'Formal language, arguments, research topics' },
  { id: 'interview', label: 'Job Interview', icon: '🎯', description: 'Interview questions, self-introduction, career goals' },
];

const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Simple vocabulary, short prompts' },
  { id: 'intermediate', label: 'Intermediate', description: 'Moderate complexity, structured responses' },
  { id: 'advanced', label: 'Advanced', description: 'Complex topics, extended responses' },
];

interface TopicSelectionProps {
  onSelect: (topicId: string, difficulty: string) => void;
}

export const TopicSelection: React.FC<TopicSelectionProps> = ({ onSelect }) => {
    const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>('intermediate');

    const handleStart = () => {
        if (selectedTopic) {
            onSelect(selectedTopic, selectedDifficulty);
        }
    };

    return (
        <div className="px-4 sm:px-6 md:px-10 lg:px-16 py-6 md:py-10 max-w-5xl mx-auto w-full">
            <div className="flex flex-col items-center gap-8 md:gap-10 w-full">
                {/* Header */}
                <div className="text-center max-w-xl">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
                        Choose Your Topic
                    </h1>
                    <p className="text-sm sm:text-base text-text-muted mt-2">
                        Select a topic and difficulty level for your assessment
                    </p>
                </div>

                {/* 1. Topic Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full">
                    {AVAILABLE_TOPICS.map((topic) => {
                        const isSelected = selectedTopic === topic.id;
                        return (
                            <motion.div
                                key={topic.id}
                                whileHover={{ y: -3, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div
                                    onClick={() => setSelectedTopic(topic.id)}
                                    className={`h-full p-4 md:p-5 rounded-2xl cursor-pointer transition-all duration-200 border text-left ${
                                        isSelected
                                            ? 'bg-brand/5 border-brand ring-2 ring-brand/20 shadow-sm'
                                            : 'bg-surface border-border hover:border-brand/40 hover:bg-elevated-surface'
                                    }`}
                                >
                                    <div className="flex flex-col items-start gap-3">
                                        <div className="p-3 bg-elevated-surface border border-border rounded-xl text-2xl leading-none">
                                            {topic.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-text-primary mb-1">
                                                {topic.label}
                                            </h3>
                                            <p className="text-xs text-text-muted leading-relaxed">
                                                {topic.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* 2. Difficulty Selector */}
                <div className="w-full pt-2">
                    <h2 className="text-sm font-semibold text-text-primary mb-3">
                        Select Difficulty Level
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 w-full">
                        {DIFFICULTY_LEVELS.map((level) => {
                            const isSelected = selectedDifficulty === level.id;
                            return (
                                <div
                                    key={level.id}
                                    onClick={() => setSelectedDifficulty(level.id)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border text-left ${
                                        isSelected
                                            ? 'bg-brand/5 border-brand ring-2 ring-brand/20 shadow-sm'
                                            : 'bg-surface border-border hover:border-brand/40 hover:bg-elevated-surface'
                                    }`}
                                >
                                    <p className="text-sm font-semibold text-text-primary mb-0.5">
                                        {level.label}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                        {level.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Start Button */}
                <div className="pt-2">
                    <CadenceButton
                        size="lg"
                        onClick={handleStart}
                        disabled={!selectedTopic}
                        leftIcon={<Sparkles className="w-5 h-5" />}
                        className="px-10 shadow-md"
                    >
                        Start Assessment
                    </CadenceButton>
                </div>
            </div>
        </div>
    );
};

