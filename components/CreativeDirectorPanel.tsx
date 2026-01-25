/**
 * Creative Director Panel - AI-driven brainstorm loop
 * Users collaborate with Saucy to refine their creative direction
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';

interface CreativeDirectorPanelProps {
    images: { base64: string; mimeType: string }[];
    mode: 'sticker' | 'animation';
    initialSuggestion: string | null;
    isLoading: boolean;
    onPromptChange: (prompt: string) => void;
    onRefine: (feedback: string) => Promise<string>;
}

// Quick adjustment chips with their prompts
const QUICK_CHIPS = [
    { emoji: '😂', label: 'Funnier', prompt: 'Make it funnier, more playful and meme-like' },
    { emoji: '🌶️', label: 'Spicier', prompt: 'Make it more intense, bold, and dramatic' },
    { emoji: '🎲', label: 'Random', prompt: 'Surprise me with something unexpected and creative' },
    { emoji: '🎭', label: 'Dramatic', prompt: 'Make it epic, cinematic, with intense emotions' },
    { emoji: '🤪', label: 'Weirder', prompt: 'Make it weirder, more absurd and surreal' },
];

export default function CreativeDirectorPanel({
    images,
    mode,
    initialSuggestion,
    isLoading,
    onPromptChange,
    onRefine,
}: CreativeDirectorPanelProps) {
    const [editablePrompt, setEditablePrompt] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [hasUserEdited, setHasUserEdited] = useState(false);

    // Update editable prompt when AI suggestion changes
    useEffect(() => {
        if (initialSuggestion && !hasUserEdited) {
            setEditablePrompt(initialSuggestion);
            onPromptChange(initialSuggestion);
        }
    }, [initialSuggestion, hasUserEdited, onPromptChange]);

    // Handle user editing the prompt directly
    const handlePromptEdit = (value: string) => {
        setEditablePrompt(value);
        setHasUserEdited(true);
        onPromptChange(value);
    };

    // Handle refinement request
    const handleRefine = async (feedbackText: string) => {
        if (!feedbackText.trim() || isRefining) return;

        setIsRefining(true);
        try {
            const refined = await onRefine(feedbackText);
            // Set hasUserEdited to true FIRST to prevent useEffect from overwriting
            setHasUserEdited(true);
            setEditablePrompt(refined);
            onPromptChange(refined);
            setFeedback(''); // Clear feedback after successful refine
        } catch (err) {
            console.error('Refinement failed:', err);
        } finally {
            setIsRefining(false);
        }
    };

    // Handle quick chip click
    const handleChipClick = (chipPrompt: string) => {
        handleRefine(chipPrompt);
    };

    // Handle Enter key in feedback
    const handleFeedbackKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleRefine(feedback);
        }
    };

    return (
        <div className="space-y-4">
            {/* AI Suggestion Section */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    <Sparkles className="w-4 h-4 text-red-400" />
                    Saucy suggests:
                </label>
                <div className="relative">
                    <textarea
                        value={editablePrompt}
                        onChange={(e) => handlePromptEdit(e.target.value)}
                        placeholder={isLoading ? "Analyzing your images..." : "Upload media to get AI suggestions..."}
                        disabled={isLoading || images.length === 0}
                        rows={3}
                        className="w-full px-4 py-3 bg-[#1a1a1f] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none disabled:opacity-50"
                    />
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                            <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback Section */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                    💬 Tell Saucy what to change:
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        onKeyDown={handleFeedbackKeyDown}
                        placeholder="e.g. 'Make it sillier' or 'Less intense'"
                        disabled={isRefining || images.length === 0}
                        className="flex-1 px-4 py-2.5 bg-[#1a1a1f] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
                    />
                    <button
                        onClick={() => handleRefine(feedback)}
                        disabled={!feedback.trim() || isRefining || images.length === 0}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
                    >
                        {isRefining ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Refine
                    </button>
                </div>
            </div>

            {/* Quick Adjustment Chips */}
            <div>
                <div className="flex flex-wrap gap-2">
                    {QUICK_CHIPS.map((chip) => (
                        <button
                            key={chip.label}
                            onClick={() => handleChipClick(chip.prompt)}
                            disabled={isRefining || images.length === 0}
                            className="px-3 py-1.5 bg-[#1a1a1f] border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            <span>{chip.emoji}</span>
                            <span>{chip.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* User Edit Indicator */}
            {hasUserEdited && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                    ✏️ You've edited the prompt. Click Refine or a chip to get AI suggestions.
                </p>
            )}
        </div>
    );
}
