import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    Link as LinkIcon,
    Loader2,
    Upload,
    X,
    Sparkles,
    Film,
    Image as ImageIcon,
    Download,
    MessageCircle,
    Lightbulb,
} from "lucide-react";
import { removeTextMagic, askSaucy } from "../services/geminiService";
import { reimagineAsSticker } from "../services/gifFrameAnalyzer";
import { generateAnimation } from "../services/veoService";

type OutputMode = "sticker" | "animation";
type StickerStyle = "cartoon" | "emoji" | "chibi" | "minimalist";

interface UploadedMedia {
    id: string;
    preview: string;
    base64: string;
    mimeType: string;
    name: string;
}

export default function CreateTab() {
    // Upload state
    const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
    const [urlInput, setUrlInput] = useState("");
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mode & options state
    const [outputMode, setOutputMode] = useState<OutputMode>("sticker");
    const [stickerStyle, setStickerStyle] = useState<StickerStyle>("cartoon");
    const [prompt, setPrompt] = useState("");
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [resolution, setResolution] = useState("2K");
    const [showOptionsModal, setShowOptionsModal] = useState(false);

    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isBrainstorming, setIsBrainstorming] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

    // Results
    const [cleanResult, setCleanResult] = useState<string | null>(null);
    const [creativeResult, setCreativeResult] = useState<string | null>(null);
    const [animationResult, setAnimationResult] = useState<string | null>(null);

    // Auto-regenerate suggestion when media changes
    const regenerateSuggestion = useCallback(async () => {
        if (uploadedMedia.length > 0 && !isProcessing) {
            setIsBrainstorming(true);
            setAiSuggestion(null);
            try {
                console.log('Requesting AI suggestion for', uploadedMedia.length, 'images');
                const imageData = uploadedMedia.map(m => ({ base64: m.base64, mimeType: m.mimeType }));
                console.log('Image data prepared, calling askSaucy...');
                const suggestion = await askSaucy('', imageData, outputMode);
                console.log('AI suggestion received:', suggestion);
                setAiSuggestion(suggestion);
            } catch (err: any) {
                console.error('Auto-suggest failed:', err?.message || err);
                // Show error to user instead of silently failing
                setError(`AI suggestion failed: ${err?.message || 'Unknown error'}`);
            } finally {
                setIsBrainstorming(false);
            }
        }
    }, [outputMode, uploadedMedia, isProcessing]);

    // Watch for media changes
    const prevMediaCount = useRef(0);
    useEffect(() => {
        if (uploadedMedia.length !== prevMediaCount.current && uploadedMedia.length > 0) {
            regenerateSuggestion();
        }
        if (uploadedMedia.length === 0) {
            setAiSuggestion(null);
        }
        prevMediaCount.current = uploadedMedia.length;
    }, [uploadedMedia.length, regenerateSuggestion]);

    // File upload handler
    const handleFileUpload = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const fileList = e.target.files;
            if (!fileList) return;
            const files: File[] = Array.from(fileList);

            for (const file of files) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target?.result as string;
                    const base64 = dataUrl.split(",")[1];
                    const newMedia: UploadedMedia = {
                        id: crypto.randomUUID(),
                        preview: dataUrl,
                        base64,
                        mimeType: file.type,
                        name: file.name,
                    };
                    setUploadedMedia((prev) => [...prev, newMedia]);
                };
                reader.readAsDataURL(file);
            }
            e.target.value = "";
        },
        []
    );

    // URL fetch handler
    const fetchFromUrl = async () => {
        if (!urlInput.trim()) return;
        setIsLoadingUrl(true);
        setError(null);

        try {
            const response = await fetch(urlInput);
            if (!response.ok) throw new Error("Failed to fetch image");

            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                const base64 = dataUrl.split(",")[1];
                const newMedia: UploadedMedia = {
                    id: crypto.randomUUID(),
                    preview: dataUrl,
                    base64,
                    mimeType: blob.type || "image/png",
                    name: urlInput.split("/").pop() || "image",
                };
                setUploadedMedia((prev) => [...prev, newMedia]);
                setUrlInput("");
            };
            reader.readAsDataURL(blob);
        } catch (err: any) {
            setError("Failed to load image. Try downloading and uploading directly.");
        } finally {
            setIsLoadingUrl(false);
        }
    };

    // Remove media
    const removeMedia = (id: string) => {
        setUploadedMedia((prev) => prev.filter((m) => m.id !== id));
    };

    // Reset all
    const resetAll = () => {
        setUploadedMedia([]);
        setPrompt("");
        setCleanResult(null);
        setCreativeResult(null);
        setAnimationResult(null);
        setError(null);
        setAiSuggestion(null);
    };

    // AI Brainstorm
    const handleBrainstorm = async () => {
        setIsBrainstorming(true);
        setError(null);

        try {
            const imageData = uploadedMedia.map(m => ({ base64: m.base64, mimeType: m.mimeType }));
            const suggestion = await askSaucy(prompt, imageData, outputMode);
            setAiSuggestion(suggestion);
        } catch (err: any) {
            setError("Couldn't get AI suggestions. Try again!");
        } finally {
            setIsBrainstorming(false);
        }
    };

    // Apply suggestion
    const applySuggestion = () => {
        if (aiSuggestion) {
            setPrompt(aiSuggestion);
            setAiSuggestion(null);
        }
    };

    // Generate
    const handleGenerate = async () => {
        if (uploadedMedia.length === 0) {
            setError("Upload at least one image to continue.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setCleanResult(null);
        setCreativeResult(null);
        setAnimationResult(null);

        try {
            if (outputMode === "sticker") {
                setProcessingStatus("Creating stickers...");
                const [cleanRes, creativeRes] = await Promise.all([
                    removeTextMagic(uploadedMedia[0].base64, "image/png"),
                    reimagineAsSticker(uploadedMedia[0].base64, stickerStyle),
                ]);
                setCleanResult(cleanRes);
                if (creativeRes.success && creativeRes.imageData) {
                    setCreativeResult(creativeRes.imageData);
                }
            } else if (outputMode === "animation") {
                setProcessingStatus("Generating animation...");
                const references = uploadedMedia.map((m) => ({
                    base64: m.base64,
                    mimeType: m.mimeType,
                }));
                const response = await generateAnimation(prompt, references, setProcessingStatus);
                if (response.success) {
                    if (response.videoUrl) {
                        setAnimationResult(response.videoUrl);
                    } else if (response.videoBase64) {
                        setAnimationResult(`data:video/mp4;base64,${response.videoBase64}`);
                    }
                } else {
                    setError(response.error || "Failed to generate animation");
                }
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsProcessing(false);
            setProcessingStatus("");
        }
    };

    // Download result
    const downloadResult = (dataUrl: string, filename: string) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        link.click();
    };

    const hasResult = cleanResult || creativeResult || animationResult;

    return (
        <>
            <div className="min-h-screen bg-[#0a0a0b] text-white">
                {/* Mode Tabs */}
                <div className="flex justify-center pt-6 pb-8">
                    <div className="inline-flex bg-[#1a1a1f] p-1.5 rounded-full border border-white/5">
                        <button
                            onClick={() => setOutputMode("sticker")}
                            className={`px-8 py-3 rounded-full font-semibold text-sm transition-all ${outputMode === "sticker"
                                ? "bg-transparent border-2 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                : "text-slate-400 hover:text-white border-2 border-transparent"
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Sticker
                            </span>
                        </button>
                        <button
                            onClick={() => setOutputMode("animation")}
                            className={`px-8 py-3 rounded-full font-semibold text-sm transition-all ${outputMode === "animation"
                                ? "bg-transparent border-2 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                : "text-slate-400 hover:text-white border-2 border-transparent"
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Film className="w-4 h-4" />
                                Animation
                            </span>
                        </button>
                    </div>
                </div>

                {/* Main Two-Column Layout */}
                <div className="max-w-7xl mx-auto px-6 pb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* LEFT COLUMN - 3 Media Input Slots */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                {[0, 1, 2].map((slotIndex) => {
                                    const media = uploadedMedia[slotIndex];
                                    return (
                                        <div key={slotIndex} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                                            <label className="block text-xs font-medium text-slate-400 mb-2">
                                                Media {slotIndex + 1} {slotIndex === 0 && <span className="text-red-400">*</span>}
                                            </label>

                                            {media ? (
                                                <div className="relative group">
                                                    <img
                                                        src={media.preview}
                                                        alt={media.name}
                                                        className="w-full aspect-square object-cover rounded-xl border border-white/10"
                                                    />
                                                    <button
                                                        onClick={() => removeMedia(media.id)}
                                                        className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3 text-red-400" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                                        <input
                                                            type="text"
                                                            value={slotIndex === 0 ? urlInput : ""}
                                                            onChange={(e) => slotIndex === 0 && setUrlInput(e.target.value)}
                                                            onKeyDown={(e) => e.key === "Enter" && slotIndex === 0 && fetchFromUrl()}
                                                            placeholder="Paste URL..."
                                                            className="w-full pl-9 pr-3 py-2 bg-[#1a1a1f] border border-white/5 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50"
                                                            disabled={slotIndex !== 0 || uploadedMedia.length > slotIndex}
                                                        />
                                                    </div>
                                                    <div
                                                        onClick={() => slotIndex === uploadedMedia.length && fileInputRef.current?.click()}
                                                        className={`border border-dashed border-white/10 rounded-lg p-4 text-center cursor-pointer hover:border-red-500/50 hover:bg-red-500/5 transition-all aspect-square flex flex-col items-center justify-center ${slotIndex > uploadedMedia.length ? 'opacity-40 pointer-events-none' : ''}`}
                                                    >
                                                        <Upload className="w-5 h-5 text-slate-500 mb-1" />
                                                        <span className="text-[10px] text-slate-500">Upload</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,.gif"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>

                        {/* RIGHT COLUMN - Preview / Gallery */}
                        <div className="space-y-6">
                            {/* Preview Area */}
                            <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden min-h-[200px] flex flex-col">
                                {hasResult ? (
                                    <div className="flex-1 p-6">
                                        <h3 className="text-lg font-bold mb-4">Your Creation</h3>
                                        <div className="space-y-4">
                                            {cleanResult && (
                                                <div className="relative group">
                                                    <img
                                                        src={cleanResult}
                                                        alt="Clean result"
                                                        className="w-full rounded-xl border border-white/10"
                                                    />
                                                    <button
                                                        onClick={() => downloadResult(cleanResult, "saucy-clean.png")}
                                                        className="absolute bottom-3 right-3 p-2 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            {creativeResult && (
                                                <div className="relative group">
                                                    <img
                                                        src={creativeResult}
                                                        alt="Creative result"
                                                        className="w-full rounded-xl border border-white/10"
                                                    />
                                                    <button
                                                        onClick={() => downloadResult(creativeResult, "saucy-creative.png")}
                                                        className="absolute bottom-3 right-3 p-2 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            {animationResult && (
                                                <div className="relative group">
                                                    <video
                                                        src={animationResult}
                                                        controls
                                                        autoPlay
                                                        loop
                                                        muted
                                                        className="w-full rounded-xl border border-white/10"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : uploadedMedia.length > 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6">
                                        <img
                                            src={uploadedMedia[0].preview}
                                            alt="Preview"
                                            className="max-w-full max-h-64 rounded-xl border border-white/10 mb-3"
                                        />
                                        <p className="text-sm text-slate-400 text-center">
                                            Ready to generate!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center p-6 text-slate-500 text-sm">
                                        Add media to see preview
                                    </div>
                                )}
                            </div>

                            {/* Prompt Section */}
                            <div className="bg-[#111] rounded-2xl border border-white/5 p-5">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-medium text-slate-300">
                                        Prompt <span className="text-red-400">*</span>
                                    </label>
                                </div>

                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={
                                        outputMode === "sticker"
                                            ? "Describe what you want to create in detail... Be specific about style, mood, colors..."
                                            : "Describe the animation scene... Include mood, actions, and visual style..."
                                    }
                                    className="w-full h-24 p-4 bg-[#1a1a1f] border border-white/5 rounded-xl text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-red-500/50"
                                    maxLength={2000}
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-start gap-2 text-xs text-slate-500">
                                        <Sparkles className="w-3 h-3 mt-0.5 text-red-400" />
                                        <span>Be detailed for better results</span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                        {prompt.length} / 2000
                                    </span>
                                </div>

                                {/* AI Suggestion */}
                                {aiSuggestion && (
                                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm text-red-200">{aiSuggestion}</p>
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={applySuggestion}
                                                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-500"
                                                    >
                                                        Use This
                                                    </button>
                                                    <button
                                                        onClick={regenerateSuggestion}
                                                        disabled={isBrainstorming}
                                                        className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-xs font-medium hover:bg-white/10 disabled:opacity-50"
                                                    >
                                                        {isBrainstorming ? "Thinking..." : "Try Another"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Ask Sizzle Button */}
                                <button
                                    onClick={handleBrainstorm}
                                    disabled={isBrainstorming}
                                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1f] border border-white/5 rounded-xl text-sm font-medium text-slate-300 hover:bg-[#222] hover:text-white disabled:opacity-50 transition-all"
                                >
                                    {isBrainstorming ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <MessageCircle className="w-4 h-4" />
                                    )}
                                    {prompt.trim() ? "Refine My Idea" : "Ask Saucy for Ideas"}
                                </button>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Generate Button */}
                            <button
                                onClick={() => setShowOptionsModal(true)}
                                disabled={isProcessing || uploadedMedia.length === 0}
                                className="w-full py-4 bg-transparent border-2 border-red-500 text-red-400 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {processingStatus || "Generating..."}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Generate Sauce 🔥
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* Options Modal */}
            {showOptionsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-6">
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-2">Generation Options</h3>
                            <p className="text-sm text-slate-400">Choose your output settings</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["1:1", "16:9", "9:16"].map((ratio) => (
                                        <button
                                            key={ratio}
                                            onClick={() => setAspectRatio(ratio)}
                                            className={`py-3 rounded-xl text-sm font-medium transition-all ${aspectRatio === ratio
                                                ? "bg-transparent border-2 border-red-500 text-red-400"
                                                : "bg-[#1a1a1f] text-slate-400 hover:bg-[#222] border border-white/5"
                                                }`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Resolution</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["1K", "2K", "4K"].map((res) => (
                                        <button
                                            key={res}
                                            onClick={() => setResolution(res)}
                                            className={`py-3 rounded-xl text-sm font-medium transition-all ${resolution === res
                                                ? "bg-transparent border-2 border-red-500 text-red-400"
                                                : "bg-[#1a1a1f] text-slate-400 hover:bg-[#222] border border-white/5"
                                                }`}
                                        >
                                            {res}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowOptionsModal(false)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium text-slate-400 bg-[#1a1a1f] hover:bg-[#222] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowOptionsModal(false);
                                    handleGenerate();
                                }}
                                className="flex-1 py-3 rounded-xl text-sm font-bold bg-transparent border-2 border-red-500 text-red-400 hover:bg-red-500/10 transition-all"
                            >
                                Generate 🔥
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
