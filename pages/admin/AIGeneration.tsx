/**
 * AI Generation - Create GIFs using Gemini + Veo
 */

import React, { useState } from 'react';
import {
    Sparkles,
    Loader2,
    Wand2,
    Image,
    Film,
    AlertCircle,
    CheckCircle,
    Lightbulb,
    RefreshCw
} from 'lucide-react';
import { addGifToLibrary, ContentSource, ContentRating } from '../../services/gifLibraryService';
import {
    generateAnimation,
    enhancePromptWithGemini,
    generateGifIdeas,
    generateTags,
    classifyContentRating,
    generateTitle,
    checkContentSafety
} from '../../services/veoService';

// Content source options with descriptions
const SOURCE_OPTIONS: { value: ContentSource; label: string; description: string }[] = [
    { value: 'news', label: '📰 News', description: 'Breaking stories, current events' },
    { value: 'holiday', label: '🎄 Holiday', description: 'Seasonal celebrations' },
    { value: 'viral', label: '🔥 Viral', description: 'Trending topics, memes' },
    { value: 'sports', label: '🏆 Sports', description: 'Games, championships' },
    { value: 'entertainment', label: '🎬 Entertainment', description: 'Movies, TV, celebrities' },
    { value: 'memes', label: '😂 Memes', description: 'Meme formats, reactions' },
    { value: 'gaming', label: '🎮 Gaming', description: 'Gaming moments, esports' },
    { value: 'work_culture', label: '💼 Work', description: 'Office life, Monday blues' },
    { value: 'pets', label: '🐕 Pets', description: 'Dogs, cats, animals' },
    { value: 'food', label: '🍔 Food', description: 'Food reactions, cooking' },
    { value: 'relationships', label: '💕 Relationships', description: 'Dating, friendships' },
    { value: 'manual', label: '✏️ Custom', description: 'Free-form prompt' },
];

export default function AIGeneration() {
    const [prompt, setPrompt] = useState('');
    const [source, setSource] = useState<ContentSource>('manual');
    const [rating, setRating] = useState<ContentRating>('pg');
    const [generating, setGenerating] = useState(false);
    const [generatingIdeas, setGeneratingIdeas] = useState(false);
    const [ideas, setIdeas] = useState<string[]>([]);
    const [progressStatus, setProgressStatus] = useState<string>('');
    const [result, setResult] = useState<{ success: boolean; message: string; gifId?: string } | null>(null);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

    const handleGenerateIdeas = async () => {
        if (!source || source === 'manual') return;

        setGeneratingIdeas(true);
        try {
            const newIdeas = await generateGifIdeas(
                SOURCE_OPTIONS.find(s => s.value === source)?.description || source,
                5,
                'reaction'
            );
            setIdeas(newIdeas);
        } catch (error) {
            console.error('Failed to generate ideas:', error);
        } finally {
            setGeneratingIdeas(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setGenerating(true);
        setResult(null);
        setGeneratedUrl(null);
        try {
            // Step 0: Check content safety
            setProgressStatus('Checking safety...');
            const safety = await checkContentSafety(prompt);
            if (!safety.isSafe) {
                setResult({
                    success: false,
                    message: `Safety check failed: ${safety.reason || 'This prompt contains content that violates our policies.'}`
                });
                return;
            }

            // Step 1: Enhance the prompt with Gemini
            setProgressStatus('Enhancing prompt with AI...');
            const enhancedPrompt = await enhancePromptWithGemini(prompt);
            setProgressStatus('Generating video with Veo...');

            // Step 2: Generate the video/GIF with Veo
            const veoResult = await generateAnimation(
                enhancedPrompt,
                [], // No reference images for now
                (status) => setProgressStatus(status),
                '1:1'
            );

            if (!veoResult.success) {
                throw new Error(veoResult.error || 'Generation failed');
            }

            // Use generated URL or fallback for demo
            const gifUrl = veoResult.videoUrl ||
                `https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif`;

            setGeneratedUrl(gifUrl);
            setProgressStatus('Generating tags and metadata...');

            // Step 3: Generate tags and classify content
            const [tags, aiRating, title] = await Promise.all([
                generateTags(prompt),
                classifyContentRating(prompt),
                generateTitle(prompt)
            ]);

            setProgressStatus('Saving to library...');

            // Step 4: Save to library as pending review
            const gifId = await addGifToLibrary({
                url: gifUrl,
                title: title,
                description: prompt,
                tags,
                rating: aiRating || rating,
                status: 'pending',
                source,
                aiPrompt: enhancedPrompt
            });

            setResult({
                success: true,
                message: 'GIF generated and added to review queue!',
                gifId
            });
        } catch (error) {
            console.error('Generation failed:', error);
            setResult({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to generate GIF. Please try again.'
            });
        } finally {
            setGenerating(false);
            setProgressStatus('');
        }
    };


    const handleReset = () => {
        setPrompt('');
        setResult(null);
        setGeneratedUrl(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">AI Generation</h1>
                <p className="text-slate-400">Create GIFs using Gemini + Veo AI</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <div className="bg-black rounded-2xl border border-white/10 p-6 space-y-6">
                    {/* Source Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-3">Content Source</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {SOURCE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSource(opt.value)}
                                    className={`p-3 rounded-xl text-sm font-medium transition-all text-left ${source === opt.value
                                        ? 'bg-white/10 border border-white/30 text-white'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-transparent'
                                        }`}
                                    title={opt.description}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AI Ideas - Generate ideas based on source */}
                    {source !== 'manual' && (
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-red-400" />
                                    <span className="text-sm font-medium text-slate-300">AI Suggestions</span>
                                </div>
                                <button
                                    onClick={handleGenerateIdeas}
                                    disabled={generatingIdeas}
                                    className="text-xs px-3 py-1 bg-white/10 rounded-lg text-slate-300 hover:bg-white/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                    {generatingIdeas ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-3 h-3" />
                                            Get Ideas
                                        </>
                                    )}
                                </button>
                            </div>
                            {ideas.length > 0 ? (
                                <div className="space-y-2">
                                    {ideas.map((idea, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPrompt(idea)}
                                            className="w-full text-left text-sm px-3 py-2 bg-black/20 rounded-lg text-slate-300 hover:bg-black/30 hover:text-white transition-colors"
                                        >
                                            {idea}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500">Click "Get Ideas" to generate AI prompts for this category</p>
                            )}
                        </div>
                    )}

                    {/* Prompt */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the GIF you want to create...&#10;&#10;Example: A cat looking shocked when Monday arrives, cartoon style"
                            className="w-full h-32 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                        />
                        {progressStatus && (
                            <p className="mt-2 text-sm text-slate-400 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {progressStatus}
                            </p>
                        )}
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Content Rating</label>
                        <div className="flex gap-2">
                            {[
                                { value: 'pg', label: '🟢 PG', desc: 'Family-friendly' },
                                { value: 'pg13', label: '🟡 PG-13', desc: 'Mild language' },
                                { value: 'r', label: '🟠 R', desc: 'Adult humor' },
                                { value: 'unhinged', label: '🔴 Unhinged', desc: 'No limits' }
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setRating(opt.value as ContentRating)}
                                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${rating === opt.value
                                        ? 'bg-white text-black'
                                        : 'bg-white/10 text-slate-400 hover:bg-white/20'
                                        }`}
                                    title={opt.desc}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || !prompt.trim()}
                        className="w-full py-4 bg-white/10 border border-white/20 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-white/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-6 h-6" />
                                Generate GIF
                            </>
                        )}
                    </button>
                </div>

                {/* Preview Panel */}
                <div className="bg-black rounded-2xl border border-white/10 p-6 flex flex-col">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Film className="w-5 h-5 text-slate-400" />
                        Preview
                    </h3>

                    <div className="flex-1 flex items-center justify-center">
                        {generating ? (
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center animate-pulse">
                                    <Sparkles className="w-10 h-10" />
                                </div>
                                <p className="text-slate-400">Creating your GIF...</p>
                                <p className="text-sm text-slate-500 mt-2">This may take up to 60 seconds</p>
                            </div>
                        ) : generatedUrl ? (
                            <div className="text-center">
                                <img
                                    src={generatedUrl}
                                    alt="Generated GIF"
                                    className="max-w-full max-h-64 rounded-xl mx-auto mb-4"
                                />
                                {result?.success && (
                                    <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>{result.message}</span>
                                    </div>
                                )}
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-2 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
                                >
                                    Generate Another
                                </button>
                            </div>
                        ) : result?.success === false ? (
                            <div className="text-center">
                                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                <p className="text-red-400">{result.message}</p>
                                <button
                                    onClick={handleReset}
                                    className="mt-4 px-6 py-2 bg-white/10 rounded-xl font-medium hover:bg-white/20 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                                    <Image className="w-12 h-12 text-slate-600" />
                                </div>
                                <p className="text-slate-400">Enter a prompt and click Generate</p>
                                <p className="text-sm text-slate-500 mt-2">Your GIF preview will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="bg-black rounded-2xl border border-white/10 p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-400" />
                    Pro Tips for Better GIFs
                </h3>
                <ul className="text-sm text-slate-300 space-y-2">
                    <li>• <strong>Be specific:</strong> "Cat surprised by cucumber" works better than "funny cat"</li>
                    <li>• <strong>Add style:</strong> Include art style like "cartoon", "realistic", "pixel art"</li>
                    <li>• <strong>Set the mood:</strong> Describe the emotion you want to convey</li>
                    <li>• <strong>Keep it short:</strong> GIFs work best when focused on one action</li>
                </ul>
            </div>
        </div>
    );
}
