/**
 * Veo Video Generation Service
 * Uses Google's Veo 3.1 API to regenerate animations from reference images
 */

import { GoogleGenAI } from "@google/genai";
import { getSaucyApiKey } from "./authService";

interface ReferenceImage {
    image: { imageBytes: string; mimeType: string };
    referenceType: "asset" | "style";
}

interface VeoGenerationResult {
    success: boolean;
    videoUrl?: string;
    videoBase64?: string;
    error?: string;
}

/**
 * Extract key frame from a GIF or video for use as reference
 */
export const extractKeyFrame = (base64Data: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            // Return just the base64 data without the prefix
            const pngData = canvas.toDataURL("image/png");
            resolve(pngData.split(",")[1]);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = base64Data;
    });
};

/**
 * Generate an animated video from reference images using Veo 3.1
 * @param prompt - Description of the desired animation
 * @param referenceImages - Array of reference images (up to 3)
 * @param onProgress - Optional callback for progress updates
 * @param aspectRatio - Aspect ratio for the video (16:9 or 9:16)
 */
export const generateAnimation = async (
    prompt: string,
    referenceImages: { base64: string; mimeType: string }[],
    onProgress?: (status: string) => void,
    aspectRatio: "16:9" | "9:16" | "1:1" = "16:9"
): Promise<VeoGenerationResult> => {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo) {
        console.log("DEMO MODE - Simulating animation generation...");
        onProgress?.("Simulating video generation in demo mode...");
        await new Promise((r) => setTimeout(r, 3000));
        return {
            success: true,
            error: "Demo mode: Video generation requires a Gemini API key with Veo access.",
        };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: key });

        // Build reference images array for Veo - up to 3 asset images
        const references: ReferenceImage[] = referenceImages.slice(0, 3).map((img, index) => {
            console.log(`Processing reference image ${index + 1}/${Math.min(referenceImages.length, 3)}`);
            return {
                image: {
                    imageBytes: img.base64.includes(",") ? img.base64.split(",")[1] : img.base64,
                    mimeType: img.mimeType || "image/png",
                },
                referenceType: "asset" as const,
            };
        });

        console.log(`Veo generation starting with ${references.length} reference image(s)`);
        onProgress?.(`Starting video generation with ${references.length} reference image(s)...`);

        // Start the video generation
        let operation = await (ai.models as any).generateVideos({
            model: "veo-3.1-fast-generate-preview", // Using fast version for quicker results
            prompt: prompt,
            config: {
                referenceImages: references,
                aspectRatio: aspectRatio, // Use the passed aspect ratio
                numberOfVideos: 1,
            },
        });

        // Poll for completion
        let pollCount = 0;
        const maxPolls = 60; // 10 minutes max (10 second intervals)

        while (!operation.done && pollCount < maxPolls) {
            pollCount++;
            const waitTime = 10000; // 10 seconds
            onProgress?.(`Generating animation... (${pollCount * 10}s elapsed)`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            operation = await (ai.operations as any).getVideosOperation({ operation });
        }

        if (!operation.done) {
            return {
                success: false,
                error: "Video generation timed out. Please try again.",
            };
        }

        // Get the generated video
        const video = operation.response?.generatedVideos?.[0];
        if (!video) {
            return {
                success: false,
                error: "No video was generated. Please try a different prompt.",
            };
        }

        onProgress?.("Video generated! Preparing download...");

        // Return the video URL or data
        return {
            success: true,
            videoUrl: video.video?.uri || video.video?.url,
            videoBase64: video.video?.videoBytes,
        };
    } catch (error: any) {
        console.error("Veo generation error:", error);

        // Check for specific error types
        if (error.message?.includes("not found") || error.message?.includes("404")) {
            return {
                success: false,
                error: "Veo API not available. Make sure your API key has Veo access enabled.",
            };
        }

        if (error.message?.includes("permission") || error.message?.includes("403")) {
            return {
                success: false,
                error: "Your API key doesn't have permission to use Veo. Enable it in Google AI Studio.",
            };
        }

        return {
            success: false,
            error: error.message || "Failed to generate animation",
        };
    }
};

/**
 * Convert a video (MP4) to an animated GIF
 * This is a client-side conversion using canvas
 */
export const videoToGif = async (
    videoUrl: string,
    onProgress?: (status: string) => void
): Promise<string> => {
    onProgress?.("Converting video to GIF...");

    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            // Set canvas size (max 512px for Slack emoji)
            const maxSize = 512;
            const scale = Math.min(maxSize / video.videoWidth, maxSize / video.videoHeight);
            canvas.width = Math.floor(video.videoWidth * scale);
            canvas.height = Math.floor(video.videoHeight * scale);

            // For now, just capture frames and return as animated webp/gif
            // A full GIF encoder would be needed for proper animated GIF output
            // This is a simplified version that returns the first frame
            video.currentTime = 0;

            await new Promise<void>((r) => {
                video.onseeked = () => r();
            });

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/png"));
        };

        video.onerror = () => reject(new Error("Failed to load video"));
        video.src = videoUrl;
        video.load();
    });
};

// ============================================
// Gemini-powered AI Helper Functions
// ============================================

/**
 * Use Gemini to enhance/refine a video generation prompt
 */
export async function enhancePromptWithGemini(prompt: string): Promise<string> {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || !key) {
        return prompt;
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: key });

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `You are a video prompt engineer. Enhance this prompt for AI video generation, making it more descriptive and visually specific. Keep it under 200 characters.

Original prompt: "${prompt}"

Enhanced prompt:`,
        });

        const enhanced = response.text?.trim() || prompt;
        console.log(`Prompt enhanced: "${prompt}" -> "${enhanced}"`);
        return enhanced;

    } catch (error) {
        console.warn('Prompt enhancement failed, using original:', error);
        return prompt;
    }
}

/**
 * Generate multiple GIF ideas using Gemini
 */
export async function generateGifIdeas(
    topic: string,
    count: number = 5,
    style?: 'reaction' | 'meme' | 'aesthetic' | 'funny'
): Promise<string[]> {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || !key) {
        return getDefaultIdeas(topic, count);
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: key });

        const styleInstruction = style ? `Style: ${style} GIFs.` : '';

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Generate ${count} creative GIF ideas for the topic: "${topic}". ${styleInstruction}

Each idea should be a short, vivid description that would make a great looping GIF animation.
Format: Return only the ideas, one per line, no numbering.

Ideas:`,
        });

        const text = response.text || '';
        const ideas = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 5 && !line.startsWith('-'))
            .slice(0, count);

        return ideas.length > 0 ? ideas : getDefaultIdeas(topic, count);

    } catch (error) {
        console.error('Failed to generate ideas:', error);
        return getDefaultIdeas(topic, count);
    }
}

/**
 * Generate tags for a GIF using Gemini
 */
export async function generateTags(description: string): Promise<string[]> {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || !key) {
        return extractBasicTags(description);
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: key });

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Generate 8-10 relevant search tags for this GIF description. Include emotion words, actions, and common search terms.

Description: "${description}"

Return only the tags, comma-separated, lowercase:`,
        });

        const text = response.text || '';
        const tags = text.split(',')
            .map(tag => tag.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ''))
            .filter(tag => tag.length > 1 && tag.length < 20);

        return tags.length > 3 ? tags : extractBasicTags(description);

    } catch (error) {
        console.warn('Tag generation failed:', error);
        return extractBasicTags(description);
    }
}

/**
 * Classify content rating using Gemini
 */
export async function classifyContentRating(
    description: string
): Promise<'pg' | 'pg13' | 'r' | 'unhinged'> {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || !key) {
        return 'pg';
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: key });

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Classify the content rating for this GIF description. Choose exactly one:
- pg: Family-friendly, no adult content
- pg13: Mild crude humor, mild language
- r: Strong language, crude humor, suggestive content
- unhinged: Inappropriate workplace content, wild humor

Description: "${description}"

Rating (one word only):`,
        });

        const rating = response.text?.toLowerCase().trim() || 'pg';

        if (['pg', 'pg13', 'r', 'unhinged'].includes(rating)) {
            return rating as 'pg' | 'pg13' | 'r' | 'unhinged';
        }

        return 'pg';

    } catch (error) {
        console.warn('Rating classification failed:', error);
        return 'pg';
    }
}

/**
 * Generate a title for a GIF
 */
export async function generateTitle(description: string): Promise<string> {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || !key) {
        return description.split(' ').slice(0, 3).join(' ');
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: key });

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Create a short, catchy title (3-5 words) for this GIF:

Description: "${description}"

Title:`,
        });

        return response.text?.trim() || description.split(' ').slice(0, 3).join(' ');

    } catch (error) {
        console.warn('Title generation failed:', error);
        return description.split(' ').slice(0, 3).join(' ');
    }
}

/**
 * Perform real-time AI moderation on a prompt
 */
export async function checkContentSafety(prompt: string): Promise<{ isSafe: boolean; reason?: string }> {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || !key) {
        return { isSafe: true };
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: key });

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `As an AI moderator for a GIF search engine called Saucy, evaluate the following prompt for safety. 
Check for: explicit adult content, hate speech, severe violence, or harassment.

Prompt: "${prompt}"

Return your decision in JSON format:
{ "isSafe": boolean, "reason": "brief explanation if unsafe" }`,
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback to text parsing
        const isSafe = !text.toLowerCase().includes('"issafe": false');
        return { isSafe };

    } catch (error) {
        console.warn('Safety check failed, defaulting to safe:', error);
        return { isSafe: true };
    }
}

// Helper functions

function getDefaultIdeas(topic: string, count: number): string[] {
    const templates = [
        `${topic} celebration dance`,
        `${topic} reaction face`,
        `${topic} funny moment`,
        `${topic} excited animation`,
        `${topic} relatable moment`,
        `${topic} dramatic reveal`,
        `${topic} satisfying loop`,
        `${topic} mood`,
    ];
    return templates.slice(0, count);
}

function extractBasicTags(description: string): string[] {
    const words = description.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && w.length < 15);

    // Deduplicate and limit
    return [...new Set(words)].slice(0, 8);
}

// =============================================================================
// CAPTION GENERATION FOR GIF OVERLAY
// =============================================================================

export type CaptionMood = 'funny' | 'spicy' | 'wholesome' | 'sarcastic' | 'relatable';
export type CaptionRefinement = 'funnier' | 'spicier' | 'shorter' | 'weirder' | 'more_wholesome';

/**
 * Generate meme-style caption suggestions for a GIF
 * @param context - Description of the GIF content (e.g., "birthday reaction", "cat falling")
 * @param mood - Optional mood/style for the captions
 * @param count - Number of suggestions (default: 5)
 */
export async function generateCaptionSuggestions(
    context: string,
    mood?: CaptionMood,
    count: number = 5
): Promise<string[]> {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || !key) {
        return getDefaultCaptions(context, mood, count);
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: key });

        const moodInstruction = mood
            ? `The captions should have a ${mood} vibe.`
            : 'Mix different vibes: funny, relatable, sarcastic.';

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `You are a meme caption writer for GIFs. Generate ${count} short, punchy captions for a GIF showing: "${context}"

${moodInstruction}

Rules:
- Keep captions SHORT (under 8 words ideally, max 12)
- Use internet humor style (relatable, self-deprecating, absurdist)
- No hashtags, emojis, or @mentions
- Make them work for reaction GIFs in Slack/workplace settings
- Avoid anything offensive or inappropriate for work

Return ONLY a JSON array of strings, no explanation:
["caption 1", "caption 2", ...]`,
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            const captions = JSON.parse(jsonMatch[0]) as string[];
            return captions.slice(0, count);
        }

        return getDefaultCaptions(context, mood, count);

    } catch (error) {
        console.error('Caption generation failed:', error);
        return getDefaultCaptions(context, mood, count);
    }
}

/**
 * Refine an existing caption based on feedback
 * @param originalCaption - The caption to refine
 * @param refinement - How to adjust the caption
 */
export async function refineCaption(
    originalCaption: string,
    refinement: CaptionRefinement
): Promise<string> {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || !key) {
        return applyBasicRefinement(originalCaption, refinement);
    }

    try {
        const genAI = new GoogleGenAI({ apiKey: key });

        const refinementInstructions: Record<CaptionRefinement, string> = {
            funnier: 'Make it funnier with more punchiness or absurdist humor',
            spicier: 'Add more edge or sass while staying workplace-appropriate',
            shorter: 'Make it shorter and snappier (under 5 words if possible)',
            weirder: 'Make it more absurd or surreal in a funny way',
            more_wholesome: 'Make it more positive and heartwarming',
        };

        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Refine this meme caption. Original: "${originalCaption}"

Instruction: ${refinementInstructions[refinement]}

Rules:
- Keep it SHORT (under 10 words)
- Stay workplace-appropriate
- Maintain the reaction-GIF vibe

Return ONLY the new caption, no quotes or explanation.`,
        });

        const text = response.text?.trim() || '';
        // Clean up any quotes
        return text.replace(/^["']|["']$/g, '').trim() || originalCaption;

    } catch (error) {
        console.error('Caption refinement failed:', error);
        return applyBasicRefinement(originalCaption, refinement);
    }
}

/**
 * Generate captions with context from the GIF visual content
 * (For when we have an actual GIF to analyze)
 */
export async function generateCaptionsForGif(
    gifDescription: string,
    gifContext: string, // e.g., "birthday", "monday mood", "office"
    count: number = 5
): Promise<string[]> {
    const combinedContext = `${gifDescription} (context: ${gifContext})`;
    return generateCaptionSuggestions(combinedContext, undefined, count);
}

// Default captions when API is unavailable
function getDefaultCaptions(context: string, mood?: CaptionMood, count: number = 5): string[] {
    const contextLower = context.toLowerCase();

    const genericCaptions = [
        "When you realize it's only Tuesday",
        "Me pretending to understand",
        "This is fine",
        "Plot twist",
        "Nobody told me about this",
        "My face when",
        "Live footage of me",
        "POV: you just found out",
    ];

    const birthdayCaptions = [
        "When the cake is fake",
        "Another year older, still no clue",
        "Birthday calories don't count",
        "Making wishes, lowering expectations",
        "Aged like fine wine, act like cheap beer",
    ];

    const workCaptions = [
        "Per my last email",
        "This meeting could've been an email",
        "Deadline? What deadline?",
        "Professional panic mode activated",
        "Out of office energy",
    ];

    const moodCaptions: Record<CaptionMood, string[]> = {
        funny: ["I can't even", "Nailed it", "Task failed successfully", "Big if true", "Story of my life"],
        spicy: ["Choose violence", "No thoughts just chaos", "And I took that personally", "Zero regrets", "Main character energy"],
        wholesome: ["You got this", "Proud of you", "Self care moment", "Good vibes only", "Sending hugs"],
        sarcastic: ["Oh definitely", "Sure Jan", "Shocking absolutely no one", "How surprising", "Wow who could've guessed"],
        relatable: ["It me", "Why are we like this", "Every single time", "Same", "100% accurate"],
    };

    // Select based on context
    let pool: string[];
    if (contextLower.includes('birthday') || contextLower.includes('cake')) {
        pool = birthdayCaptions;
    } else if (contextLower.includes('work') || contextLower.includes('office') || contextLower.includes('meeting')) {
        pool = workCaptions;
    } else if (mood && moodCaptions[mood]) {
        pool = moodCaptions[mood];
    } else {
        pool = genericCaptions;
    }

    // Shuffle and return requested count
    return pool.sort(() => Math.random() - 0.5).slice(0, count);
}

// Basic refinement when API unavailable
function applyBasicRefinement(caption: string, refinement: CaptionRefinement): string {
    switch (refinement) {
        case 'shorter':
            // Take first few words
            return caption.split(' ').slice(0, 4).join(' ') || caption;
        case 'funnier':
            return caption + ' tho';
        case 'spicier':
            return 'Honestly, ' + caption.toLowerCase();
        case 'weirder':
            return caption + ' but make it weird';
        case 'more_wholesome':
            return caption.replace(/^/, 'Lowkey ');
        default:
            return caption;
    }
}

