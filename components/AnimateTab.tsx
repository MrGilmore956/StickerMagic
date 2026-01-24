import React, { useState, useCallback } from "react";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { generateAnimation, extractKeyFrame } from "../services/veoService";

interface UploadedMedia {
    id: string;
    preview: string;
    base64: string;
    mimeType: string;
    name: string;
}

export default function AnimateTab() {
    const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState("");
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);

    const handleFileUpload = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const fileList = e.target.files;
            if (!fileList) return;
            const files: File[] = Array.from(fileList);
            if (uploadedMedia.length + files.length > 3) {
                setError("Maximum 3 reference images allowed");
                return;
            }

            for (const file of files) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target?.result as string;

                    // Extract key frame if it's a GIF
                    let frameBase64 = base64;
                    if (file.type === "image/gif") {
                        try {
                            const extracted = await extractKeyFrame(base64);
                            frameBase64 = `data:image/png;base64,${extracted}`;
                        } catch (err) {
                            console.error("Failed to extract frame:", err);
                        }
                    }

                    const media: UploadedMedia = {
                        id: crypto.randomUUID(),
                        preview: frameBase64,
                        base64: frameBase64,
                        mimeType: "image/png",
                        name: file.name,
                    };

                    setUploadedMedia((prev) => [...prev, media]);
                };
                reader.readAsDataURL(file);
            }

            e.target.value = "";
        },
        [uploadedMedia.length]
    );

    const removeMedia = (id: string) => {
        setUploadedMedia((prev) => prev.filter((m) => m.id !== id));
    };

    const fetchFromUrl = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput.trim()) return;
        if (uploadedMedia.length >= 3) {
            setError("Maximum 3 reference images allowed");
            return;
        }

        setIsLoadingUrl(true);
        setError(null);

        try {
            const response = await fetch(urlInput);
            if (!response.ok) throw new Error("Failed to fetch image");

            const blob = await response.blob();
            const reader = new FileReader();

            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                let frameBase64 = base64;

                // Extract key frame if it's a GIF
                if (blob.type === "image/gif") {
                    try {
                        const extracted = await extractKeyFrame(base64);
                        frameBase64 = `data:image/png;base64,${extracted}`;
                    } catch (err) {
                        console.error("Failed to extract frame:", err);
                    }
                }

                const urlParts = urlInput.split("/");
                const fileName = urlParts[urlParts.length - 1].split("?")[0] || "url-image";

                const media: UploadedMedia = {
                    id: crypto.randomUUID(),
                    preview: frameBase64,
                    base64: frameBase64,
                    mimeType: "image/png",
                    name: fileName,
                };

                setUploadedMedia((prev) => [...prev, media]);
                setUrlInput("");
            };

            reader.readAsDataURL(blob);
        } catch (err: any) {
            setError("Could not load image from URL. This may be due to CORS restrictions. Try downloading and uploading instead.");
        } finally {
            setIsLoadingUrl(false);
        }
    };

    const handleGenerate = async () => {
        if (uploadedMedia.length === 0) {
            setError("Please upload at least one reference image or GIF");
            return;
        }

        if (!prompt.trim()) {
            setError("Please describe the animation you want to create");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setResult(null);
        setProgress("Preparing reference images...");

        try {
            const references = uploadedMedia.map((m) => ({
                base64: m.base64,
                mimeType: m.mimeType,
            }));

            const response = await generateAnimation(prompt, references, setProgress);

            if (response.success) {
                if (response.videoUrl) {
                    setResult(response.videoUrl);
                } else if (response.videoBase64) {
                    setResult(`data:video/mp4;base64,${response.videoBase64}`);
                }
                setProgress("");
            } else {
                setError(response.error || "Failed to generate animation");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadResult = () => {
        if (!result) return;
        const link = document.createElement("a");
        link.href = result;
        link.download = `stickify-animation-${Date.now()}.mp4`;
        link.click();
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
                    🎬 Animation Studio
                </h2>
                <p className="text-gray-600 mt-2">
                    Upload GIFs to regenerate as clean animations, or mashup multiple sources!
                </p>
            </div>

            {/* Upload Section */}
            <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-2xl border border-emerald-200 p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-emerald-800 mb-4">
                    Reference Images ({uploadedMedia.length}/3)
                </h3>

                {/* Upload Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {uploadedMedia.map((media) => (
                        <div
                            key={media.id}
                            className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-300 bg-white"
                        >
                            <img
                                src={media.preview}
                                alt={media.name}
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => removeMedia(media.id)}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                            >
                                ×
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                {media.name}
                            </div>
                        </div>
                    ))}

                    {/* Add More Button */}
                    {uploadedMedia.length < 3 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer flex flex-col items-center justify-center">
                            <input
                                type="file"
                                accept="image/*,.gif"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <span className="text-3xl text-emerald-400">+</span>
                            <span className="text-sm text-emerald-600 mt-1">Add GIF/Image</span>
                        </label>
                    )}
                </div>

                {/* OR Separator */}
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-emerald-200"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-gradient-to-br from-white via-green-50 to-emerald-50 px-3 text-gray-500 font-bold">OR paste URL</span>
                    </div>
                </div>

                {/* URL Input */}
                <form onSubmit={fetchFromUrl} className="flex gap-2">
                    <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Paste GIF or image URL"
                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-emerald-200 bg-white text-gray-800 focus:ring-2 focus:ring-emerald-400 outline-none transition-all text-sm placeholder:text-gray-400"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            disabled={uploadedMedia.length >= 3 || isLoadingUrl}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoadingUrl || uploadedMedia.length >= 3 || !urlInput.trim()}
                        className="bg-emerald-600 text-white px-5 rounded-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingUrl ? <Loader2 className="animate-spin w-4 h-4" /> : 'Add'}
                    </button>
                </form>

                <p className="text-sm text-gray-500 mt-4">
                    💡 Tip: Upload 1-3 GIFs or images. The AI will create a new animation inspired by them!
                </p>
            </div>

            {/* Prompt Section */}
            <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-2xl border border-emerald-200 p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-emerald-800 mb-4">
                    Describe Your Animation
                </h3>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A person yelling excitedly with dramatic expression, cinematic close-up, expressive face, smooth animation"
                    className="w-full h-32 p-4 rounded-xl border border-emerald-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />

                {/* Quick prompts */}
                <div className="flex flex-wrap gap-2 mt-3">
                    {[
                        "excited reaction",
                        "shocked expression",
                        "laughing hard",
                        "slow clap",
                        "mind blown",
                    ].map((tag) => (
                        <button
                            key={tag}
                            onClick={() => setPrompt((p) => p + (p ? ", " : "") + tag)}
                            className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm hover:bg-emerald-200 transition-colors"
                        >
                            + {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating || uploadedMedia.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isGenerating || uploadedMedia.length === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:shadow-lg hover:scale-[1.02]"
                    }`}
            >
                {isGenerating ? "🎬 Generating..." : "✨ Generate Animation"}
            </button>

            {/* Progress */}
            {progress && (
                <div className="text-center py-4">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-100 rounded-full">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-emerald-700">{progress}</span>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                    ⚠️ {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-2xl border border-emerald-200 p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-emerald-800 mb-4">
                        🎉 Your Animation
                    </h3>

                    <div className="rounded-xl overflow-hidden bg-black aspect-square max-w-md mx-auto">
                        <video
                            src={result}
                            controls
                            autoPlay
                            loop
                            muted
                            className="w-full h-full object-contain"
                        />
                    </div>

                    <div className="flex gap-4 mt-4 justify-center">
                        <button
                            onClick={downloadResult}
                            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
                        >
                            ⬇️ Download MP4
                        </button>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                <strong>⚡ Powered by Veo 3.1</strong> — Video generation takes ~30-60 seconds
                and uses your Gemini API key. Each generation uses API credits.
            </div>
        </div>
    );
}
