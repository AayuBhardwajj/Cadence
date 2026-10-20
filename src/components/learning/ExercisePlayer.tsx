import React, { useState } from 'react';
import { 
    CheckCircle2, 
    XCircle, 
    Lightbulb, 
    Send, 
    Sparkles, 
    RotateCcw,
    Volume2,
    Mic,
    HelpCircle
} from 'lucide-react';
import { ExerciseDto, ExerciseAttemptResponse, courseApi } from '../../services/courseApi';

interface ExercisePlayerProps {
    exercise: ExerciseDto;
    onAttemptSubmitted?: (response: ExerciseAttemptResponse) => void;
}

export const ExercisePlayer: React.FC<ExercisePlayerProps> = ({
    exercise,
    onAttemptSubmitted,
}) => {
    const [selectedOption, setSelectedOption] = useState<string>('');
    const [textResponse, setTextResponse] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [result, setResult] = useState<ExerciseAttemptResponse | null>(() => {
        if (exercise.completed && exercise.previousScore !== undefined && exercise.previousScore !== null) {
            return {
                id: 'prev',
                exerciseId: exercise.id,
                isCorrect: true,
                score: exercise.previousScore,
                feedback: exercise.previousFeedback || 'Completed previously',
                attemptedAt: new Date().toISOString()
            };
        }
        return null;
    });
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (responseOverride?: string) => {
        const responseText = responseOverride || (exercise.exerciseType === 'MULTIPLE_CHOICE' ? selectedOption : textResponse);
        if (!responseText || !responseText.trim()) {
            setError('Please provide an answer before submitting.');
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const attemptResult = await courseApi.submitExerciseAttempt(exercise.id, responseText.trim());
            setResult(attemptResult);
            if (onAttemptSubmitted) {
                onAttemptSubmitted(attemptResult);
            }
        } catch (err: any) {
            console.error('Failed to submit exercise:', err);
            setError(err?.message || 'Failed to submit attempt. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setSelectedOption('');
        setTextResponse('');
        setResult(null);
        setError(null);
        setShowHint(false);
    };

    const speakPrompt = () => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(exercise.promptText);
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div 
            className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-md transition-all"
            id={`exercise-${exercise.id}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand/10 text-brand">
                        {exercise.exerciseType.replace(/_/g, ' ')}
                    </span>
                    <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
                        {exercise.title}
                    </h4>
                </div>

                {result && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        result.isCorrect 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                        {result.isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span>Score: {result.score}/100</span>
                    </span>
                )}
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4 leading-relaxed font-medium">
                {exercise.instruction}
            </p>

            {/* Prompt Box */}
            <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 mb-5 relative group">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                            Practice Prompt
                        </span>
                        <p className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-50 leading-relaxed">
                            "{exercise.promptText}"
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={speakPrompt}
                        aria-label="Listen to prompt"
                        title="Listen to native pronunciation"
                        className="p-2.5 rounded-xl bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:text-brand hover:scale-105 transition shadow-sm shrink-0"
                    >
                        <Volume2 size={18} />
                    </button>
                </div>
            </div>

            {/* Input area based on type */}
            {exercise.exerciseType === 'MULTIPLE_CHOICE' && exercise.options && exercise.options.length > 0 && (
                <div className="space-y-3 mb-5">
                    {exercise.options.map((opt) => {
                        const isSelected = selectedOption === opt.id;
                        return (
                            <label
                                key={opt.id}
                                className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    isSelected 
                                        ? 'border-brand bg-brand/5 dark:bg-brand/10 shadow-sm' 
                                        : 'border-neutral-200 dark:border-neutral-700/80 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name={`ex-${exercise.id}`}
                                    value={opt.id}
                                    checked={isSelected}
                                    onChange={() => setSelectedOption(opt.id)}
                                    className="mt-1 text-brand focus:ring-brand h-4 w-4"
                                />
                                <div className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                                    <span className="font-medium">{opt.text}</span>
                                </div>
                            </label>
                        );
                    })}
                </div>
            )}

            {(exercise.exerciseType === 'SENTENCE_REPETITION' || exercise.exerciseType === 'SPEAKING_PROMPT') && (
                <div className="space-y-3 mb-5">
                    <div className="relative">
                        <textarea
                            value={textResponse}
                            onChange={(e) => setTextResponse(e.target.value)}
                            placeholder={exercise.exerciseType === 'SENTENCE_REPETITION' 
                                ? "Repeat the sentence exactly as spoken above..." 
                                : "Type or speak your complete thought response here..."}
                            rows={3}
                            className="w-full p-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                        />
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <p className="text-xs font-semibold text-red-500 mb-3">{error}</p>
            )}

            {/* Feedback / Result Banner */}
            {result && (
                <div className={`p-4 rounded-xl border mb-5 transition-all ${
                    result.isCorrect 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' 
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                }`}>
                    <div className="flex items-start gap-3">
                        {result.isCorrect ? (
                            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
                        ) : (
                            <Lightbulb className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                                {result.isCorrect ? 'Evaluation Result' : 'Speech Coach Guidance'}
                            </p>
                            <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                                {result.feedback}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
                <div>
                    {exercise.hints && exercise.hints.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowHint(!showHint)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-brand transition"
                        >
                            <HelpCircle size={15} />
                            <span>{showHint ? 'Hide Hint' : 'Need a hint?'}</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {result && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                        >
                            <RotateCcw size={14} />
                            <span>Try Again</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => handleSubmit()}
                        disabled={submitting || (exercise.exerciseType === 'MULTIPLE_CHOICE' ? !selectedOption : !textResponse.trim())}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition"
                    >
                        {submitting ? (
                            <span>Evaluating...</span>
                        ) : (
                            <>
                                <Send size={14} />
                                <span>Check Answer</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Hint Box */}
            {showHint && exercise.hints && exercise.hints.length > 0 && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-bold">Coach's Hint: </span>
                    {exercise.hints.join(' ')}
                </div>
            )}
        </div>
    );
};
