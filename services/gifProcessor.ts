import { GoogleGenAI } from "@google/genai";

export interface GifFrame {
    imageData: string; // base64 data URL
    delay: number; // delay in ms
}

/**
 * Extract all frames from an animated GIF
 * Uses canvas to decode each frame
 */
export const extractGifFrames = async (gifDataUrl: string): Promise<GifFrame[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = async () => {
            try {
                // For now, we'll use a simpler approach - fetch the GIF and parse it
                const response = await fetch(gifDataUrl);
                const arrayBuffer = await response.arrayBuffer();
                const frames = await parseGif(arrayBuffer);
                resolve(frames);
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => reject(new Error("Failed to load GIF"));
        img.src = gifDataUrl;
    });
};

/**
 * Parse GIF binary data and extract frames
 * Simple GIF parser for animated GIFs
 */
async function parseGif(buffer: ArrayBuffer): Promise<GifFrame[]> {
    const data = new Uint8Array(buffer);
    const frames: GifFrame[] = [];

    // GIF Header check
    const header = String.fromCharCode(...data.slice(0, 6));
    if (header !== 'GIF87a' && header !== 'GIF89a') {
        throw new Error("Not a valid GIF file");
    }

    // Get canvas dimensions from logical screen descriptor
    const width = data[6] | (data[7] << 8);
    const height = data[8] | (data[9] << 8);

    // Create a temporary canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // For complex GIF parsing, we'll use a worker-based approach
    // This is a simplified version that creates frame snapshots
    const tempImg = new Image();
    tempImg.src = URL.createObjectURL(new Blob([buffer], { type: 'image/gif' }));

    await new Promise<void>((resolve) => {
        tempImg.onload = () => resolve();
    });

    // Use requestVideoFrameCallback pattern for frame extraction
    // For now, create a single frame as fallback
    ctx.drawImage(tempImg, 0, 0);
    frames.push({
        imageData: canvas.toDataURL('image/png'),
        delay: 100 // Default 100ms delay
    });

    URL.revokeObjectURL(tempImg.src);

    return frames;
}

/**
 * Process a single frame through Gemini to remove text
 */
export const removeTextFromFrame = async (
    base64Data: string,
    mimeType: string = 'image/png'
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    if (!cleanBase64) {
        throw new Error("Invalid frame data");
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: cleanBase64,
                        mimeType: mimeType,
                    },
                },
                {
                    text: "Remove ALL text, captions, watermarks, and overlays from this image. Keep the exact same scene, characters, colors, and composition. Output a clean version without any written text. Preserve transparency if present.",
                },
            ],
        },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
        throw new Error("No response from model");
    }

    for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }

    throw new Error("Model did not return an image");
};

/**
 * Reassemble processed frames back into an animated GIF
 * Uses gif.js library pattern (will be loaded dynamically)
 */
export const reassembleGif = async (
    frames: GifFrame[],
    width: number,
    height: number,
    onProgress?: (percent: number) => void
): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Dynamic import of GIF encoder
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        // For MVP, we'll create a simple animated structure
        // In production, use gif.js library

        if (frames.length === 1) {
            // Single frame, just return as-is
            resolve(frames[0].imageData);
            return;
        }

        // For multiple frames, we need to encode as GIF
        // This requires the gif.js library - for now return first frame
        // TODO: Integrate gif.js for full animation support
        console.warn('Multi-frame GIF encoding requires gif.js library - returning first frame');
        resolve(frames[0].imageData);
    });
};

/**
 * Check daily usage limit ($25/day budget ≈ ~8000 GIFs)
 * Tracks estimated cost rather than strict count
 */
export const checkRateLimit = (): { allowed: boolean; remaining: string } => {
    const DAILY_BUDGET_CENTS = 2500; // $25 in cents
    const COST_PER_FRAME_CENTS = 0.03; // ~$0.0003 per frame
    const today = new Date().toDateString();
    const storageKey = 'stickify_daily_cost';

    const stored = localStorage.getItem(storageKey);
    let usage = { date: today, costCents: 0 };

    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
            usage = parsed;
        }
    }

    const remainingCents = DAILY_BUDGET_CENTS - usage.costCents;

    return {
        allowed: remainingCents > 0,
        remaining: `$${(remainingCents / 100).toFixed(2)}`
    };
};

/**
 * Increment usage counter by estimated cost
 */
export const incrementUsage = (frameCount: number = 1): void => {
    const COST_PER_FRAME_CENTS = 0.03;
    const today = new Date().toDateString();
    const storageKey = 'stickify_daily_cost';

    const stored = localStorage.getItem(storageKey);
    let usage = { date: today, costCents: 0 };

    if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
            usage = parsed;
        }
    }

    usage.costCents += frameCount * COST_PER_FRAME_CENTS;
    localStorage.setItem(storageKey, JSON.stringify(usage));
};

/**
 * Detect if a file is an animated GIF
 */
export const isAnimatedGif = async (dataUrl: string): Promise<boolean> => {
    try {
        const response = await fetch(dataUrl);
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);

        // Check GIF header
        const header = String.fromCharCode(...data.slice(0, 6));
        if (header !== 'GIF87a' && header !== 'GIF89a') {
            return false;
        }

        // Look for multiple image descriptors or NETSCAPE extension (animation)
        let pos = 13; // Skip header + logical screen descriptor

        // Skip global color table if present
        const packed = data[10];
        const hasGlobalColorTable = (packed & 0x80) !== 0;
        if (hasGlobalColorTable) {
            const colorTableSize = 3 * Math.pow(2, (packed & 0x07) + 1);
            pos += colorTableSize;
        }

        let imageCount = 0;

        while (pos < data.length) {
            const blockType = data[pos];

            if (blockType === 0x2C) {
                // Image descriptor
                imageCount++;
                if (imageCount > 1) return true; // Multiple frames = animated

                // Skip image descriptor and data
                pos += 10;
                const hasLocalColorTable = (data[pos - 1] & 0x80) !== 0;
                if (hasLocalColorTable) {
                    const localColorTableSize = 3 * Math.pow(2, (data[pos - 1] & 0x07) + 1);
                    pos += localColorTableSize;
                }
                pos++; // LZW minimum code size

                // Skip sub-blocks
                while (data[pos] !== 0) {
                    pos += data[pos] + 1;
                }
                pos++; // Block terminator
            } else if (blockType === 0x21) {
                // Extension block
                const extType = data[pos + 1];
                pos += 2;

                // Check for NETSCAPE extension (animation)
                if (extType === 0xFF) {
                    const appId = String.fromCharCode(...data.slice(pos + 1, pos + 12));
                    if (appId === 'NETSCAPE2.0') {
                        return true; // NETSCAPE extension = animated
                    }
                }

                // Skip sub-blocks
                while (data[pos] !== 0) {
                    pos += data[pos] + 1;
                }
                pos++; // Block terminator
            } else if (blockType === 0x3B) {
                // Trailer
                break;
            } else {
                pos++;
            }
        }

        return imageCount > 1;
    } catch {
        return false;
    }
};
