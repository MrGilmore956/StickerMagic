/**
 * GIF Creator - Admin Page for Creating Captioned GIFs
 * 
 * 3-Step Workflow:
 * 1. Source Selection (Pexels Stock Video, Existing GIF URL, Upload)
 * 2. Caption Preview & Refinement (AI suggestions + manual editing)
 * 3. Save to Library
 * 
 * Owner-only access (Brian Taylor)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    Upload,
    Video,
    Link as LinkIcon,
    Wand2,
    RefreshCw,
    Save,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Check,
    X,
    Type,
    MoveVertical,
    AlignVerticalJustifyStart,
    AlignVerticalJustifyEnd,
    Zap,
    Flame,
    Heart,
    MessageCircle,
    Scissors,
    AlertCircle,
    ImageIcon,
    Film
} from 'lucide-react';
import {
    createCaptionedGif,
    previewCaption,
    formatFileSize,
    isSlackCompatible,
    CaptionStyle,
    CaptionPosition,
    CaptionOptions
} from '../../services/captionOverlayService';
import {
    generateCaptionSuggestions,
    refineCaption,
    CaptionMood,
    CaptionRefinement
} from '../../services/veoService';

// =============================================================================
// TYPES
// =============================================================================

type Step = 'source' | 'caption' | 'save';
type SourceType = 'pexels' | 'url' | 'upload';

interface GifSource {
    type: SourceType;
    url: string;
    thumbnail?: string;
    title?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function GifCreator() {
    // Step management
    const [currentStep, setCurrentStep] = useState<Step>('source');

    // Source selection
    const [sourceType, setSourceType] = useState<SourceType>('url');
    const [gifUrl, setGifUrl] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [source, setSource] = useState<GifSource | null>(null);

    // Caption options
    const [captionText, setCaptionText] = useState('');
    const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('classic');
    const [captionPosition, setCaptionPosition] = useState<CaptionPosition>('top');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // Preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Processing
    const [processing, setProcessing] = useState(false);
    const [processStatus, setProcessStatus] = useState('');
    const [processPercent, setProcessPercent] = useState(0);
    const [result, setResult] = useState<{
        blob: Blob;
        url: string;
        fileSize: number;
    } | null>(null);

    // Errors
    const [error, setError] = useState<string | null>(null);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ==========================================================================
    // STEP HANDLERS
    // ==========================================================================

    const handleSourceConfirm = () => {
        if (sourceType === 'url' && gifUrl) {
            setSource({ type: 'url', url: gifUrl });
            setCurrentStep('caption');
            generateSuggestions();
        } else if (sourceType === 'upload' && uploadedFile) {
            const objectUrl = URL.createObjectURL(uploadedFile);
            setSource({ type: 'upload', url: objectUrl, title: uploadedFile.name });
            setCurrentStep('caption');
            generateSuggestions();
        }
    };

    const generateSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
            // Get context from the source if available
            const context = source?.title || 'reaction gif';
            const captions = await generateCaptionSuggestions(context);
            setSuggestions(captions);
            if (captions.length > 0 && !captionText) {
                setCaptionText(captions[0]);
            }
        } catch (err) {
            console.error('Failed to generate suggestions:', err);
            setSuggestions([
                "When you realize it's only Tuesday",
                "Me pretending to understand",
                "This is fine",
                "Plot twist",
                "Nobody told me about this"
            ]);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const refreshSuggestions = () => {
        generateSuggestions();
    };

    const handleRefinement = async (refinement: CaptionRefinement) => {
        if (!captionText) return;
        setLoadingSuggestions(true);
        try {
            const refined = await refineCaption(captionText, refinement);
            setCaptionText(refined);
        } catch (err) {
            console.error('Refinement failed:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const updatePreview = async () => {
        if (!source || !captionText) return;

        setLoadingPreview(true);
        try {
            const options: CaptionOptions = {
                text: captionText,
                style: captionStyle,
                position: captionPosition
            };
            const preview = await previewCaption(source.url, options);
            setPreviewUrl(preview);
        } catch (err) {
            console.error('Preview failed:', err);
            setError('Failed to generate preview');
        } finally {
            setLoadingPreview(false);
        }
    };

    // Update preview when caption changes
    useEffect(() => {
        if (currentStep === 'caption' && source && captionText) {
            const timer = setTimeout(() => {
                updatePreview();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [captionText, captionStyle, captionPosition, source, currentStep]);

    const handleCreateGif = async () => {
        if (!source || !captionText) return;

        setProcessing(true);
        setError(null);
        setProcessStatus('Starting...');
        setProcessPercent(0);

        try {
            const options: CaptionOptions = {
                text: captionText,
                style: captionStyle,
                position: captionPosition
            };

            const processed = await createCaptionedGif(
                source.url,
                options,
                (status, percent) => {
                    setProcessStatus(status);
                    setProcessPercent(percent);
                }
            );

            setResult({
                blob: processed.blob,
                url: processed.url,
                fileSize: processed.fileSize
            });
            setCurrentStep('save');
        } catch (err) {
            console.error('GIF creation failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to create GIF');
        } finally {
            setProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result) return;

        const a = document.createElement('a');
        a.href = result.url;
        a.download = `saucy-gif-${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleSaveToLibrary = async () => {
        // TODO: Implement save to saucyLibraryService
        alert('Save to library coming soon!');
    };

    const resetCreator = () => {
        setCurrentStep('source');
        setSource(null);
        setGifUrl('');
        setUploadedFile(null);
        setCaptionText('');
        setSuggestions([]);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
        { key: 'source', label: 'Source', icon: <Film className="w-4 h-4" /> },
        { key: 'caption', label: 'Caption', icon: <Type className="w-4 h-4" /> },
        { key: 'save', label: 'Save', icon: <Save className="w-4 h-4" /> }
    ];

    const stepIndex = steps.findIndex(s => s.key === currentStep);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-red-400" />
                    GIF Creator
                </h1>
                <p className="text-slate-400">Create captioned GIFs for the Saucy library</p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.key}>
                        <div
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${idx <= stepIndex
                                ? 'bg-white/10 text-white border border-white/30'
                                : 'bg-transparent text-slate-500 border border-white/10'
                                }`}
                        >
                            {step.icon}
                            <span className="hidden sm:inline">{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-200">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto p-1 hover:bg-white/10 rounded"
                        title="Dismiss error"
                        aria-label="Dismiss error"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Step Content */}
            <div className="bg-black rounded-2xl border border-white/10 overflow-hidden">
                {currentStep === 'source' && (
                    <SourceStep
                        sourceType={sourceType}
                        setSourceType={setSourceType}
                        gifUrl={gifUrl}
                        setGifUrl={setGifUrl}
                        uploadedFile={uploadedFile}
                        setUploadedFile={setUploadedFile}
                        fileInputRef={fileInputRef}
                        onConfirm={handleSourceConfirm}
                    />
                )}

                {currentStep === 'caption' && source && (
                    <CaptionStep
                        source={source}
                        captionText={captionText}
                        setCaptionText={setCaptionText}
                        captionStyle={captionStyle}
                        setCaptionStyle={setCaptionStyle}
                        captionPosition={captionPosition}
                        setCaptionPosition={setCaptionPosition}
                        suggestions={suggestions}
                        loadingSuggestions={loadingSuggestions}
                        refreshSuggestions={refreshSuggestions}
                        onRefinement={handleRefinement}
                        previewUrl={previewUrl}
                        loadingPreview={loadingPreview}
                        processing={processing}
                        processStatus={processStatus}
                        processPercent={processPercent}
                        onBack={() => setCurrentStep('source')}
                        onCreate={handleCreateGif}
                    />
                )}

                {currentStep === 'save' && result && (
                    <SaveStep
                        result={result}
                        captionText={captionText}
                        onDownload={handleDownload}
                        onSaveToLibrary={handleSaveToLibrary}
                        onCreateAnother={resetCreator}
                    />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// STEP 1: SOURCE SELECTION
// =============================================================================

interface SourceStepProps {
    sourceType: SourceType;
    setSourceType: (type: SourceType) => void;
    gifUrl: string;
    setGifUrl: (url: string) => void;
    uploadedFile: File | null;
    setUploadedFile: (file: File | null) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onConfirm: () => void;
}

function SourceStep({
    sourceType,
    setSourceType,
    gifUrl,
    setGifUrl,
    uploadedFile,
    setUploadedFile,
    fileInputRef,
    onConfirm
}: SourceStepProps) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'image/gif' || file.type.startsWith('video/'))) {
            setUploadedFile(file);
        }
    };

    const canProceed = (sourceType === 'url' && gifUrl.trim()) ||
        (sourceType === 'upload' && uploadedFile);

    return (
        <div className="p-6 space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-bold mb-2">Choose Your Source</h2>
                <p className="text-slate-400">Select a GIF to add captions to</p>
            </div>

            {/* Source Type Tabs */}
            <div className="flex gap-2 justify-center">
                {[
                    { type: 'pexels' as SourceType, icon: Video, label: 'Stock Video', disabled: true },
                    { type: 'url' as SourceType, icon: LinkIcon, label: 'GIF URL', disabled: false },
                    { type: 'upload' as SourceType, icon: Upload, label: 'Upload', disabled: false }
                ].map(({ type, icon: Icon, label, disabled }) => (
                    <button
                        key={type}
                        onClick={() => !disabled && setSourceType(type)}
                        disabled={disabled}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${sourceType === type
                            ? 'bg-white/10 text-white border border-white/30'
                            : disabled
                                ? 'bg-transparent text-slate-600 border border-white/5 cursor-not-allowed'
                                : 'bg-transparent text-slate-400 border border-white/10 hover:border-red-500/50 hover:text-white'
                            }`}
                    >
                        <Icon className="w-5 h-5" />
                        {label}
                        {disabled && <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">Soon</span>}
                    </button>
                ))}
            </div>

            {/* Source Input */}
            <div className="max-w-2xl mx-auto">
                {sourceType === 'url' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                GIF URL
                            </label>
                            <input
                                type="url"
                                value={gifUrl}
                                onChange={(e) => setGifUrl(e.target.value)}
                                placeholder="https://media.giphy.com/..."
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
                            />
                        </div>

                        {/* Preview */}
                        {gifUrl && (
                            <div className="bg-white/5 rounded-xl p-4 flex items-center justify-center">
                                <img
                                    src={gifUrl}
                                    alt="Preview"
                                    className="max-h-64 rounded-lg"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {sourceType === 'upload' && (
                    <div className="space-y-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/gif,video/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="gif-upload"
                            aria-label="Upload GIF or video file"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-48 border-2 border-dashed border-white/20 rounded-xl hover:border-red-500/50 transition-colors flex flex-col items-center justify-center gap-3"
                        >
                            <Upload className="w-8 h-8 text-slate-400" />
                            <div className="text-center">
                                <p className="text-white font-medium">Click to upload</p>
                                <p className="text-sm text-slate-500">GIF or video file</p>
                            </div>
                        </button>

                        {uploadedFile && (
                            <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4">
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                                <div className="flex-1">
                                    <p className="font-medium truncate">{uploadedFile.name}</p>
                                    <p className="text-sm text-slate-500">{formatFileSize(uploadedFile.size)}</p>
                                </div>
                                <button
                                    onClick={() => setUploadedFile(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                    title="Remove file"
                                    aria-label="Remove uploaded file"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {sourceType === 'pexels' && (
                    <div className="text-center py-12">
                        <Video className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">Pexels integration coming soon!</p>
                        <p className="text-sm text-slate-500">Search free stock videos to caption</p>
                    </div>
                )}
            </div>

            {/* Continue Button */}
            <div className="flex justify-center">
                <button
                    onClick={onConfirm}
                    disabled={!canProceed}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 hover:border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// STEP 2: CAPTION PREVIEW
// =============================================================================

interface CaptionStepProps {
    source: GifSource;
    captionText: string;
    setCaptionText: (text: string) => void;
    captionStyle: CaptionStyle;
    setCaptionStyle: (style: CaptionStyle) => void;
    captionPosition: CaptionPosition;
    setCaptionPosition: (pos: CaptionPosition) => void;
    suggestions: string[];
    loadingSuggestions: boolean;
    refreshSuggestions: () => void;
    onRefinement: (refinement: CaptionRefinement) => void;
    previewUrl: string | null;
    loadingPreview: boolean;
    processing: boolean;
    processStatus: string;
    processPercent: number;
    onBack: () => void;
    onCreate: () => void;
}

function CaptionStep({
    source,
    captionText,
    setCaptionText,
    captionStyle,
    setCaptionStyle,
    captionPosition,
    setCaptionPosition,
    suggestions,
    loadingSuggestions,
    refreshSuggestions,
    onRefinement,
    previewUrl,
    loadingPreview,
    processing,
    processStatus,
    processPercent,
    onBack,
    onCreate
}: CaptionStepProps) {
    const refinementButtons: { refinement: CaptionRefinement; icon: React.ReactNode; label: string }[] = [
        { refinement: 'funnier', icon: <Zap className="w-3.5 h-3.5" />, label: 'Funnier' },
        { refinement: 'spicier', icon: <Flame className="w-3.5 h-3.5" />, label: 'Spicier' },
        { refinement: 'shorter', icon: <Scissors className="w-3.5 h-3.5" />, label: 'Shorter' },
        { refinement: 'more_wholesome', icon: <Heart className="w-3.5 h-3.5" />, label: 'Wholesome' },
        { refinement: 'weirder', icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Weirder' }
    ];

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Caption Controls */}
                <div className="space-y-6">
                    <div className="text-center lg:text-left">
                        <h2 className="text-xl font-bold mb-2">Add Your Caption</h2>
                        <p className="text-slate-400">AI suggestions or write your own</p>
                    </div>

                    {/* Caption Input */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Caption Text
                        </label>
                        <textarea
                            value={captionText}
                            onChange={(e) => setCaptionText(e.target.value)}
                            placeholder="Enter your caption..."
                            rows={2}
                            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 resize-none"
                        />
                    </div>

                    {/* AI Suggestions */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-red-400" />
                                AI Suggestions
                            </label>
                            <button
                                onClick={refreshSuggestions}
                                disabled={loadingSuggestions}
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                            >
                                <RefreshCw className={`w-3 h-3 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {loadingSuggestions ? (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </div>
                            ) : (
                                suggestions.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCaptionText(suggestion)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-all ${captionText === suggestion
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : 'bg-white/5 text-slate-300 border border-white/10 hover:border-red-500/50'
                                            }`}
                                    >
                                        {suggestion}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Refinement Buttons */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Make it...
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {refinementButtons.map(({ refinement, icon, label }) => (
                                <button
                                    key={refinement}
                                    onClick={() => onRefinement(refinement)}
                                    disabled={!captionText || loadingSuggestions}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:border-red-500/50 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {icon}
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Style Options */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Caption Style */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Style
                            </label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'classic' as CaptionStyle, label: 'Classic' },
                                    { value: 'modern' as CaptionStyle, label: 'Modern' }
                                ].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setCaptionStyle(value)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${captionStyle === value
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : 'bg-white/5 text-slate-400 border border-white/10 hover:border-red-500/50'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Caption Position */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Position
                            </label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'top' as CaptionPosition, icon: AlignVerticalJustifyStart, label: 'Top' },
                                    { value: 'center' as CaptionPosition, icon: MoveVertical, label: 'Center' },
                                    { value: 'bottom' as CaptionPosition, icon: AlignVerticalJustifyEnd, label: 'Bottom' }
                                ].map(({ value, icon: Icon, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setCaptionPosition(value)}
                                        title={label}
                                        className={`flex-1 px-3 py-2 rounded-lg transition-all flex items-center justify-center ${captionPosition === value
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : 'bg-white/5 text-slate-400 border border-white/10 hover:border-red-500/50'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="space-y-4">
                    <div className="text-center lg:text-left">
                        <h3 className="text-lg font-semibold mb-1">Preview</h3>
                        <p className="text-sm text-slate-400">First frame with caption</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 flex items-center justify-center min-h-[300px]">
                        {loadingPreview ? (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm">Generating preview...</span>
                            </div>
                        ) : previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Caption preview"
                                className="max-h-80 rounded-lg"
                            />
                        ) : (
                            <img
                                src={source.url}
                                alt="Source"
                                className="max-h-80 rounded-lg opacity-50"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Processing Status */}
            {processing && (
                <div className="mt-6 bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                        <span className="font-medium">{processStatus}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
                            style={{ width: `${processPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-between">
                <button
                    onClick={onBack}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>

                <button
                    onClick={onCreate}
                    disabled={!captionText || processing}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {processing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-4 h-4" />
                            Create GIF
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// STEP 3: SAVE
// =============================================================================

interface SaveStepProps {
    result: {
        blob: Blob;
        url: string;
        fileSize: number;
    };
    captionText: string;
    onDownload: () => void;
    onSaveToLibrary: () => void;
    onCreateAnother: () => void;
}

function SaveStep({
    result,
    captionText,
    onDownload,
    onSaveToLibrary,
    onCreateAnother
}: SaveStepProps) {
    const slackOk = isSlackCompatible(result.fileSize);

    return (
        <div className="p-6 space-y-6">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                    <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">GIF Created!</h2>
                <p className="text-slate-400">Your captioned GIF is ready</p>
            </div>

            {/* Preview */}
            <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center gap-4">
                <img
                    src={result.url}
                    alt="Created GIF"
                    className="max-h-80 rounded-lg"
                />
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">
                        Size: <span className="text-white font-medium">{formatFileSize(result.fileSize)}</span>
                    </span>
                    {slackOk ? (
                        <span className="text-green-400 flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Slack compatible
                        </span>
                    ) : (
                        <span className="text-yellow-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Exceeds 5MB
                        </span>
                    )}
                </div>
            </div>

            {/* Caption Display */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Caption</p>
                <p className="text-lg font-bold">{captionText}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={onDownload}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all"
                >
                    <Save className="w-4 h-4" />
                    Download
                </button>

                <button
                    onClick={onSaveToLibrary}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-semibold hover:opacity-90 transition-all"
                >
                    <Sparkles className="w-4 h-4" />
                    Save to Library
                </button>

                <button
                    onClick={onCreateAnother}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-xl font-semibold hover:bg-white/20 transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    Create Another
                </button>
            </div>
        </div>
    );
}
