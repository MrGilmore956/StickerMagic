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
 */
export const generateAnimation = async (
    prompt: string,
    referenceImages: { base64: string; mimeType: string }[],
    onProgress?: (status: string) => void
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

        // Build reference images array for Veo
        const references: ReferenceImage[] = referenceImages.slice(0, 3).map((img) => ({
            image: {
                imageBytes: img.base64.includes(",") ? img.base64.split(",")[1] : img.base64,
                mimeType: img.mimeType || "image/png",
            },
            referenceType: "asset" as const,
        }));

        onProgress?.("Starting video generation with Veo 3.1...");

        // Start the video generation
        let operation = await (ai.models as any).generateVideos({
            model: "veo-3.1-fast-generate-preview", // Using fast version for quicker results
            prompt: prompt,
            config: {
                referenceImages: references,
                aspectRatio: "1:1", // Square for stickers/emojis
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
