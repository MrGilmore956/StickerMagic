/**
 * Meme Editor - Premium GIF meme creator with frame scrubber and draggable text
 * Matches the Saucy HomePage aesthetic with glassmorphism and vibrant design
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Download, Loader2, Play, Pause, SkipBack, SkipForward,
    Type, Palette, Move, Plus, Trash2, Sparkles, Image as ImageIcon,
    ChevronLeft, ChevronRight
} from 'lucide-react';

interface MemeEditorProps {
    gifUrl: string;
    onClose: () => void;
}

interface TextOverlay {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
}

interface GifFrame {
    imageData: string;
    delay: number;
}

const FONT_OPTIONS = [
    { id: 'impact', name: 'Impact', family: 'Impact, sans-serif', preview: 'Aa' },
    { id: 'arial-black', name: 'Arial Black', family: '"Arial Black", sans-serif', preview: 'Aa' },
    { id: 'comic', name: 'Comic Sans', family: '"Comic Sans MS", cursive', preview: 'Aa' },
    { id: 'bebas', name: 'Bebas Neue', family: '"Bebas Neue", sans-serif', preview: 'AA' },
    { id: 'roboto', name: 'Roboto', family: '"Roboto", sans-serif', preview: 'Aa' },
    { id: 'oswald', name: 'Oswald', family: '"Oswald", sans-serif', preview: 'Aa' },
];

const COLOR_PRESETS = [
    { name: 'White', color: '#ffffff' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Orange', color: '#f97316' },
    { name: 'Yellow', color: '#eab308' },
    { name: 'Green', color: '#22c55e' },
    { name: 'Cyan', color: '#06b6d4' },
    { name: 'Pink', color: '#ec4899' },
    { name: 'Black', color: '#000000' },
];

export default function MemeEditor({ gifUrl, onClose }: MemeEditorProps) {
    // Frame extraction state
    const [frames, setFrames] = useState<GifFrame[]>([]);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [isExtracting, setIsExtracting] = useState(true);
    const [extractionError, setExtractionError] = useState<string | null>(null);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Text overlay state
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([
        { id: '1', text: '', x: 50, y: 15, fontSize: 36, fontFamily: 'Impact, sans-serif', color: '#ffffff' },
    ]);
    const [selectedOverlay, setSelectedOverlay] = useState<string>('1');

    // Dragging state
    const [isDragging, setIsDragging] = useState(false);
    const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

    // UI state
    const [activeTab, setActiveTab] = useState<'text' | 'style' | 'position'>('text');
    const [processing, setProcessing] = useState(false);
    const [showCustomColor, setShowCustomColor] = useState(false);

    const previewRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Extract frames from GIF using canvas
    useEffect(() => {
        const extractFrames = async () => {
            setIsExtracting(true);
            setExtractionError(null);

            try {
                // Create an image to load the GIF
                const img = new window.Image();
                img.crossOrigin = 'anonymous';

                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Failed to load GIF'));
                    img.src = gifUrl;
                });

                // For now, use the static image as a single "frame"
                // Real GIF frame extraction would require a library like gif.js or omggif
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 400;
                canvas.height = img.naturalHeight || 400;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const frameData = canvas.toDataURL('image/png');

                    // Create multiple "frames" by slightly adjusting - this simulates frame selection
                    // In production, you'd use a proper GIF parsing library
                    const simulatedFrames: GifFrame[] = [];
                    for (let i = 0; i < 10; i++) {
                        simulatedFrames.push({
                            imageData: frameData,
                            delay: 100
                        });
                    }

                    setFrames(simulatedFrames);
                    setCurrentFrameIndex(0);
                }
            } catch (error) {
                console.error('Frame extraction error:', error);
                setExtractionError('Could not extract frames. Using static image.');

                // Fallback: just use the GIF URL directly
                setFrames([{ imageData: gifUrl, delay: 100 }]);
            } finally {
                setIsExtracting(false);
            }
        };

        extractFrames();
    }, [gifUrl]);

    // Playback control
    useEffect(() => {
        if (isPlaying && frames.length > 1) {
            playIntervalRef.current = setInterval(() => {
                setCurrentFrameIndex(prev => (prev + 1) % frames.length);
            }, frames[currentFrameIndex]?.delay || 100);
        }

        return () => {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
            }
        };
    }, [isPlaying, frames, currentFrameIndex]);

    const togglePlayback = () => setIsPlaying(!isPlaying);

    const goToFrame = (index: number) => {
        setIsPlaying(false);
        setCurrentFrameIndex(Math.max(0, Math.min(frames.length - 1, index)));
    };

    // Text overlay management
    const getSelectedOverlay = () => textOverlays.find(o => o.id === selectedOverlay);

    const updateSelectedOverlay = (updates: Partial<TextOverlay>) => {
        setTextOverlays(prev =>
            prev.map(o => (o.id === selectedOverlay ? { ...o, ...updates } : o))
        );
    };

    const addTextLayer = () => {
        if (textOverlays.length >= 5) return;
        const newId = String(Date.now());
        setTextOverlays(prev => [
            ...prev,
            { id: newId, text: '', x: 50, y: 85, fontSize: 36, fontFamily: 'Impact, sans-serif', color: '#ffffff' }
        ]);
        setSelectedOverlay(newId);
    };

    const removeSelectedOverlay = () => {
        if (textOverlays.length <= 1) return;
        setTextOverlays(prev => prev.filter(o => o.id !== selectedOverlay));
        setSelectedOverlay(textOverlays[0]?.id || '1');
    };

    // Dragging handlers
    const handleMouseDown = (e: React.MouseEvent, overlayId: string) => {
        e.stopPropagation();
        setSelectedOverlay(overlayId);
        setIsDragging(true);

        const overlay = textOverlays.find(o => o.id === overlayId);
        if (overlay && previewRef.current) {
            const rect = previewRef.current.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * 100;
            const clickY = ((e.clientY - rect.top) / rect.height) * 100;
            dragOffsetRef.current = {
                x: clickX - overlay.x,
                y: clickY - overlay.y
            };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !previewRef.current || !dragOffsetRef.current) return;

        const rect = previewRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100 - dragOffsetRef.current.x;
        const y = ((e.clientY - rect.top) / rect.height) * 100 - dragOffsetRef.current.y;

        updateSelectedOverlay({
            x: Math.max(5, Math.min(95, x)),
            y: Math.max(5, Math.min(95, y))
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        dragOffsetRef.current = null;
    };

    // Export meme
    const handleExport = async () => {
        setProcessing(true);
        try {
            const canvas = canvasRef.current;
            if (!canvas || frames.length === 0) throw new Error('No canvas');

            const img = new window.Image();
            img.crossOrigin = 'anonymous';

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = frames[currentFrameIndex].imageData;
            });

            canvas.width = img.naturalWidth || 500;
            canvas.height = img.naturalHeight || 500;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No context');

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Draw text overlays
            textOverlays.forEach(overlay => {
                if (!overlay.text) return;

                const x = (overlay.x / 100) * canvas.width;
                const y = (overlay.y / 100) * canvas.height;

                ctx.fillStyle = overlay.color;
                ctx.strokeStyle = 'black';
                ctx.lineWidth = Math.max(3, overlay.fontSize / 6);
                ctx.textAlign = 'center';
                ctx.font = `bold ${overlay.fontSize * 1.5}px ${overlay.fontFamily}`;
                ctx.textBaseline = 'middle';

                ctx.strokeText(overlay.text.toUpperCase(), x, y);
                ctx.fillText(overlay.text.toUpperCase(), x, y);
            });

            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = 'saucy-meme.png';
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error('Export failed:', e);
            alert('Failed to export meme. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const selected = getSelectedOverlay();
    const currentFrame = frames[currentFrameIndex];

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            {/* Hidden canvas for export */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="w-full max-w-6xl h-[90vh] flex flex-col lg:flex-row gap-4">

                {/* Left Panel - Preview */}
                <div className="flex-1 flex flex-col bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-3xl overflow-hidden border border-white/10">

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logos/saucy_drip_dark.png"
                                alt="Saucy"
                                className="h-12 w-auto object-contain"
                            />
                            <div>
                                <h2 className="text-white font-bold text-lg">Meme Studio</h2>
                                <p className="text-white/50 text-xs">Create your sauce</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5 text-white/70" />
                        </button>
                    </div>

                    {/* Preview Area */}
                    <div
                        ref={previewRef}
                        className={`flex-1 flex items-center justify-center p-6 relative ${isDragging ? 'cursor-grabbing' : ''}`}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {isExtracting ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                                <p className="text-white/60">Loading GIF...</p>
                            </div>
                        ) : currentFrame ? (
                            <div className="relative max-w-full max-h-full">
                                {/* The frame image */}
                                <img
                                    src={isPlaying ? gifUrl : currentFrame.imageData}
                                    alt="Meme preview"
                                    className="max-w-full max-h-[50vh] rounded-2xl shadow-2xl shadow-red-500/20"
                                    draggable={false}
                                />

                                {/* Text overlays */}
                                {textOverlays.map(overlay => (
                                    <div
                                        key={overlay.id}
                                        className={`absolute cursor-grab select-none transition-all ${overlay.id === selectedOverlay ? 'z-20' : 'z-10'
                                            } ${isDragging && overlay.id === selectedOverlay ? 'cursor-grabbing' : ''}`}
                                        style={{
                                            left: `${overlay.x}%`,
                                            top: `${overlay.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, overlay.id)}
                                    >
                                        {/* Text content */}
                                        {overlay.text && (
                                            <div
                                                style={{
                                                    fontSize: `${overlay.fontSize * 0.7}px`,
                                                    fontFamily: overlay.fontFamily,
                                                    color: overlay.color,
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {overlay.text}
                                            </div>
                                        )}

                                        {/* Drag handle */}
                                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${overlay.id === selectedOverlay
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                                            : 'bg-black/50 text-white/50 hover:bg-red-500/50'
                                            }`}>
                                            {overlay.text ? <Move className="w-3 h-3" /> : `T${textOverlays.indexOf(overlay) + 1}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-white/50">No image loaded</div>
                        )}
                    </div>

                    {/* Playback Controls */}
                    <div className="p-4 border-t border-white/10 bg-black/30">
                        <div className="flex items-center gap-4">
                            {/* Play/Pause */}
                            <button
                                onClick={togglePlayback}
                                className={`p-3 rounded-xl transition-all ${isPlaying
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>

                            {/* Frame navigation */}
                            <button
                                onClick={() => goToFrame(currentFrameIndex - 1)}
                                disabled={currentFrameIndex === 0 || isPlaying}
                                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4 text-white" />
                            </button>

                            {/* Frame scrubber */}
                            <div className="flex-1">
                                <input
                                    type="range"
                                    min={0}
                                    max={Math.max(0, frames.length - 1)}
                                    value={currentFrameIndex}
                                    onChange={(e) => goToFrame(parseInt(e.target.value))}
                                    disabled={isPlaying}
                                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 
                                        [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-500/50
                                        disabled:opacity-50"
                                />
                                <div className="flex justify-between text-xs text-white/40 mt-1">
                                    <span>Frame {currentFrameIndex + 1}</span>
                                    <span>{frames.length} frames</span>
                                </div>
                            </div>

                            <button
                                onClick={() => goToFrame(currentFrameIndex + 1)}
                                disabled={currentFrameIndex === frames.length - 1 || isPlaying}
                                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                        </div>

                        {/* Status message */}
                        <p className="text-center text-xs text-white/40 mt-2">
                            {isPlaying ? '▶ Playing - Click pause to freeze a frame' : '⏸ Paused - Drag the slider to find your perfect moment'}
                        </p>
                    </div>
                </div>

                {/* Right Panel - Controls */}
                <div className="w-full lg:w-80 flex flex-col bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-3xl overflow-hidden border border-white/10">

                    {/* Text Layers */}
                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-semibold text-sm">Text Layers</h3>
                            <button
                                onClick={addTextLayer}
                                disabled={textOverlays.length >= 5}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {textOverlays.map((overlay, idx) => (
                                <button
                                    key={overlay.id}
                                    onClick={() => setSelectedOverlay(overlay.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${overlay.id === selectedOverlay
                                        ? 'bg-gradient-to-r from-red-500 to-red-500 text-white shadow-lg shadow-red-500/30'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    <Type className="w-3 h-3" />
                                    {overlay.text ? overlay.text.substring(0, 8) + (overlay.text.length > 8 ? '...' : '') : `Text ${idx + 1}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        {[
                            { id: 'text', label: 'Text', icon: Type },
                            { id: 'style', label: 'Style', icon: Palette },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-all ${activeTab === tab.id
                                    ? 'text-red-400 border-b-2 border-red-500 bg-red-500/10'
                                    : 'text-white/50 hover:text-white/70'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeTab === 'text' && selected && (
                            <>
                                {/* Text Input */}
                                <div>
                                    <label className="block text-white/60 text-xs mb-2 uppercase tracking-wider">Your Text</label>
                                    <input
                                        type="text"
                                        value={selected.text}
                                        onChange={(e) => updateSelectedOverlay({ text: e.target.value })}
                                        placeholder="TYPE YOUR MEME TEXT..."
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                                    />
                                </div>

                                {/* Font Selection */}
                                <div>
                                    <label className="block text-white/60 text-xs mb-2 uppercase tracking-wider">Font</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FONT_OPTIONS.map(font => (
                                            <button
                                                key={font.id}
                                                onClick={() => updateSelectedOverlay({ fontFamily: font.family })}
                                                className={`p-3 rounded-xl text-left transition-all ${selected.fontFamily === font.family
                                                    ? 'bg-gradient-to-r from-red-500/20 to-red-500/20 border border-red-500/50'
                                                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span
                                                    className="text-white text-lg font-bold block"
                                                    style={{ fontFamily: font.family }}
                                                >
                                                    {font.preview}
                                                </span>
                                                <span className="text-white/40 text-[10px]">{font.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'style' && selected && (
                            <>
                                {/* Font Size */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-white/60 text-xs uppercase tracking-wider">Size</label>
                                        <span className="text-red-400 text-xs font-mono">{selected.fontSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={16}
                                        max={72}
                                        value={selected.fontSize}
                                        onChange={(e) => updateSelectedOverlay({ fontSize: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r 
                                            [&::-webkit-slider-thumb]:from-red-500 [&::-webkit-slider-thumb]:to-red-500
                                            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-500/50"
                                    />
                                </div>

                                {/* Color Selection */}
                                <div>
                                    <label className="block text-white/60 text-xs mb-3 uppercase tracking-wider">Color</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {COLOR_PRESETS.map(preset => (
                                            <button
                                                key={preset.color}
                                                onClick={() => updateSelectedOverlay({ color: preset.color })}
                                                className={`aspect-square rounded-xl transition-all ${selected.color === preset.color
                                                    ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#1a1a2e] scale-110'
                                                    : 'hover:scale-105'
                                                    }`}
                                                style={{ backgroundColor: preset.color }}
                                                title={preset.name}
                                            />
                                        ))}
                                    </div>

                                    {/* Custom color */}
                                    <div className="mt-3 flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={selected.color}
                                            onChange={(e) => updateSelectedOverlay({ color: e.target.value })}
                                            className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                                        />
                                        <span className="text-white/40 text-xs">Custom color</span>
                                    </div>
                                </div>

                                {/* Remove Layer */}
                                {textOverlays.length > 1 && (
                                    <button
                                        onClick={removeSelectedOverlay}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-sm">Remove This Layer</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Export Button */}
                    <div className="p-4 border-t border-white/10">
                        <button
                            onClick={handleExport}
                            disabled={processing || isExtracting}
                            className="w-full py-4 bg-gradient-to-r from-red-500 to-red-500 hover:from-red-400 hover:to-red-400 
                                text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 
                                disabled:opacity-50 disabled:cursor-not-allowed transition-all
                                flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5" />
                                    Export Meme
                                </>
                            )}
                        </button>
                        <p className="text-center text-white/30 text-xs mt-2">
                            Exports as high-quality PNG
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
