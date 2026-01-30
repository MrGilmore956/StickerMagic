/**
 * Caption Overlay Service
 * 
 * Core service for burning text captions onto GIF frames.
 * Uses Canvas API for rendering and gif.js for encoding.
 * 
 * Supports two caption styles:
 * - Classic Meme: Impact font, ALL CAPS, white with black outline (default)
 * - Modern Clean: Sans-serif, lowercase, subtle shadow
 */

import { parseGIF, decompressFrames } from 'gifuct-js';

// =============================================================================
// TYPES
// =============================================================================

export type CaptionPosition = 'top' | 'bottom' | 'center';
export type CaptionStyle = 'classic' | 'modern';

export interface CaptionOptions {
    text: string;
    position: CaptionPosition;
    style: CaptionStyle;
    // Advanced options (optional)
    fontSize?: number;        // Auto-calculated if not provided
    textColor?: string;       // Default: white
    strokeColor?: string;     // Default: black (for classic)
    strokeWidth?: number;     // Default: 4 (for classic)
    padding?: number;         // Default: 20px
}

export interface GifFrame {
    imageData: ImageData;
    delay: number; // Frame delay in ms
}

export interface ProcessedGif {
    blob: Blob;
    url: string;
    width: number;
    height: number;
    frameCount: number;
    duration: number; // Total duration in ms
    fileSize: number; // Size in bytes
}

// Max file size for Slack compatibility (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// =============================================================================
// STYLE PRESETS
// =============================================================================

const STYLE_PRESETS = {
    classic: {
        fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
        textTransform: 'uppercase' as const,
        textColor: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 4,
        shadowBlur: 0,
        shadowColor: 'transparent',
        lineHeight: 1.1,
    },
    modern: {
        fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
        textTransform: 'none' as const,
        textColor: '#FFFFFF',
        strokeColor: 'transparent',
        strokeWidth: 0,
        shadowBlur: 8,
        shadowColor: 'rgba(0, 0, 0, 0.8)',
        lineHeight: 1.3,
    },
};

// =============================================================================
// CORE FUNCTIONS
// =============================================================================

/**
 * Extract frames from a GIF URL
 */
export async function extractFramesFromGif(gifUrl: string): Promise<{
    frames: GifFrame[];
    width: number;
    height: number;
}> {
    // Fetch the GIF as ArrayBuffer
    const response = await fetch(gifUrl);
    const arrayBuffer = await response.arrayBuffer();

    // Parse the GIF
    const gif = parseGIF(arrayBuffer);
    const frames = decompressFrames(gif, true);

    if (frames.length === 0) {
        throw new Error('No frames found in GIF');
    }

    const width = frames[0].dims.width;
    const height = frames[0].dims.height;

    // Create a canvas for compositing frames
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Previous frame for disposal handling
    let previousImageData: ImageData | null = null;

    const processedFrames: GifFrame[] = [];

    for (const frame of frames) {
        // Handle disposal method
        if (frame.disposalType === 2) {
            // Restore to background (clear)
            ctx.clearRect(0, 0, width, height);
        } else if (frame.disposalType === 3 && previousImageData) {
            // Restore to previous
            ctx.putImageData(previousImageData, 0, 0);
        }

        // Save current state for potential restore
        previousImageData = ctx.getImageData(0, 0, width, height);

        // Create ImageData from frame patch
        const frameImageData = new ImageData(
            new Uint8ClampedArray(frame.patch),
            frame.dims.width,
            frame.dims.height
        );

        // Create temporary canvas for the frame patch
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frame.dims.width;
        tempCanvas.height = frame.dims.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(frameImageData, 0, 0);

        // Draw frame patch at correct position
        ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);

        // Get the full composited frame
        const fullFrameImageData = ctx.getImageData(0, 0, width, height);

        processedFrames.push({
            imageData: fullFrameImageData,
            delay: frame.delay * 10, // Convert to ms (GIF delay is in centiseconds)
        });
    }

    return {
        frames: processedFrames,
        width,
        height,
    };
}

/**
 * Calculate optimal font size based on GIF dimensions and text length
 */
function calculateFontSize(
    width: number,
    height: number,
    text: string,
    style: CaptionStyle
): number {
    // Base size as percentage of width
    const baseSize = width * 0.08;

    // Adjust for text length
    const charCount = text.length;
    let sizeMultiplier = 1;

    if (charCount > 30) sizeMultiplier = 0.7;
    else if (charCount > 20) sizeMultiplier = 0.85;
    else if (charCount > 10) sizeMultiplier = 1;
    else sizeMultiplier = 1.2;

    // Classic style tends to be bolder, modern more subtle
    const styleMultiplier = style === 'classic' ? 1 : 0.85;

    const size = Math.round(baseSize * sizeMultiplier * styleMultiplier);

    // Clamp to reasonable range
    return Math.max(16, Math.min(size, 72));
}

/**
 * Overlay caption text on a single frame
 */
export function overlayTextOnFrame(
    imageData: ImageData,
    options: CaptionOptions
): ImageData {
    const { text, position, style } = options;
    const preset = STYLE_PRESETS[style];

    const width = imageData.width;
    const height = imageData.height;

    // Create canvas for the frame
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Draw the original frame
    ctx.putImageData(imageData, 0, 0);

    // Calculate font size
    const fontSize = options.fontSize || calculateFontSize(width, height, text, style);
    const padding = options.padding || 20;
    const strokeWidth = options.strokeWidth ?? preset.strokeWidth;

    // Apply text transform
    const displayText = preset.textTransform === 'uppercase' ? text.toUpperCase() : text;

    // Set up text rendering
    ctx.font = `bold ${fontSize}px ${preset.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate text position
    let textY: number;
    switch (position) {
        case 'top':
            textY = padding + fontSize / 2;
            break;
        case 'bottom':
            textY = height - padding - fontSize / 2;
            break;
        case 'center':
        default:
            textY = height / 2;
            break;
    }
    const textX = width / 2;

    // Word wrap if needed
    const maxWidth = width - padding * 2;
    const lines = wrapText(ctx, displayText, maxWidth);
    const lineHeight = fontSize * preset.lineHeight;

    // Adjust starting Y for multiple lines
    const totalTextHeight = lines.length * lineHeight;
    let startY = textY;
    if (lines.length > 1) {
        if (position === 'top') {
            startY = padding + fontSize / 2;
        } else if (position === 'bottom') {
            startY = height - padding - totalTextHeight + lineHeight / 2;
        } else {
            startY = textY - totalTextHeight / 2 + lineHeight / 2;
        }
    }

    // Draw each line
    for (let i = 0; i < lines.length; i++) {
        const lineY = startY + i * lineHeight;
        const line = lines[i];

        // Apply shadow for modern style
        if (preset.shadowBlur > 0) {
            ctx.shadowColor = preset.shadowColor;
            ctx.shadowBlur = preset.shadowBlur;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }

        // Draw stroke (for classic style)
        if (strokeWidth > 0) {
            ctx.strokeStyle = options.strokeColor || preset.strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeText(line, textX, lineY);
        }

        // Draw fill
        ctx.fillStyle = options.textColor || preset.textColor;
        ctx.fillText(line, textX, lineY);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }

    // Return the modified image data
    return ctx.getImageData(0, 0, width, height);
}

/**
 * Word wrap text to fit within max width
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Create a GIF with captions burned in
 */
export async function createCaptionedGif(
    sourceUrl: string,
    options: CaptionOptions,
    onProgress?: (status: string, percent: number) => void
): Promise<ProcessedGif> {
    onProgress?.('Extracting frames...', 0);

    // Extract frames from source GIF
    const { frames, width, height } = await extractFramesFromGif(sourceUrl);

    onProgress?.('Applying captions...', 20);

    // Apply caption to each frame
    const captionedFrames: GifFrame[] = [];
    for (let i = 0; i < frames.length; i++) {
        const captionedImageData = overlayTextOnFrame(frames[i].imageData, options);
        captionedFrames.push({
            imageData: captionedImageData,
            delay: frames[i].delay,
        });

        const progress = 20 + (i / frames.length) * 40;
        onProgress?.(`Processing frame ${i + 1}/${frames.length}...`, progress);
    }

    onProgress?.('Encoding GIF...', 60);

    // Encode to GIF using gif.js
    const blob = await encodeGif(captionedFrames, width, height, onProgress);

    // Check file size
    if (blob.size > MAX_FILE_SIZE) {
        console.warn(`GIF size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit`);
        // Could add quality reduction here in the future
    }

    const url = URL.createObjectURL(blob);
    const totalDuration = captionedFrames.reduce((sum, f) => sum + f.delay, 0);

    onProgress?.('Complete!', 100);

    return {
        blob,
        url,
        width,
        height,
        frameCount: captionedFrames.length,
        duration: totalDuration,
        fileSize: blob.size,
    };
}

/**
 * Encode frames to GIF using gif.js
 */
async function encodeGif(
    frames: GifFrame[],
    width: number,
    height: number,
    onProgress?: (status: string, percent: number) => void
): Promise<Blob> {
    // Dynamically import gif.js (it's a UMD module)
    const GIF = (await import('gif.js')).default;

    return new Promise((resolve, reject) => {
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width,
            height,
            workerScript: '/gif.worker.js', // Need to copy this to public folder
        });

        // Add each frame
        for (const frame of frames) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.putImageData(frame.imageData, 0, 0);

            gif.addFrame(canvas, { delay: frame.delay, copy: true });
        }

        gif.on('progress', (p: number) => {
            const progress = 60 + p * 40;
            onProgress?.('Encoding GIF...', progress);
        });

        gif.on('finished', (blob: Blob) => {
            resolve(blob);
        });

        gif.on('error', (err: Error) => {
            reject(err);
        });

        gif.render();
    });
}

/**
 * Preview caption on a single frame (for live preview)
 */
export async function previewCaption(
    sourceUrl: string,
    options: CaptionOptions
): Promise<string> {
    // Extract just the first frame
    const { frames, width, height } = await extractFramesFromGif(sourceUrl);

    if (frames.length === 0) {
        throw new Error('No frames found');
    }

    // Apply caption to first frame
    const captionedFrame = overlayTextOnFrame(frames[0].imageData, options);

    // Convert to data URL
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(captionedFrame, 0, 0);

    return canvas.toDataURL('image/png');
}

/**
 * Utility: Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Utility: Check if file size is within Slack limits
 */
export function isSlackCompatible(bytes: number): boolean {
    return bytes <= MAX_FILE_SIZE;
}
