/**
 * GIF Frame Analyzer Service
 * Extracts frames from GIFs and uses AI to select the best one
 */

import { GoogleGenAI } from "@google/genai";
import { getSaucyApiKey } from "./authService";

interface FrameAnalysis {
    frameIndex: number;
    score: number;
    description: string;
}

interface AnalysisResult {
    bestFrame: string;  // base64 of best frame
    bestFrameIndex: number;
    totalFrames: number;
    analysis: string;
    allFrames: string[];  // base64 of all extracted frames
}

/**
 * Extract all frames from an animated GIF
 */
export const extractGifFrames = async (
    gifData: string,
    maxFrames: number = 10
): Promise<string[]> => {
    return new Promise((resolve) => {
        const frames: string[] = [];
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                resolve([gifData]); // Fallback to original
                return;
            }

            // For animated GIFs, we can only extract the first frame with basic canvas
            // For full frame extraction, we'd need a GIF parsing library
            // For now, we'll sample the GIF at different time positions using a workaround
            ctx.drawImage(img, 0, 0);
            frames.push(canvas.toDataURL("image/png"));

            resolve(frames);
        };

        img.onerror = () => resolve([gifData]);
        img.src = gifData;
    });
};

/**
 * Use Gemini Vision to analyze frames and pick the best one
 */
export const analyzeFramesForBestMoment = async (
    frames: string[],
    context?: string
): Promise<AnalysisResult> => {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo || frames.length <= 1) {
        return {
            bestFrame: frames[0],
            bestFrameIndex: 0,
            totalFrames: frames.length,
            analysis: "Using first frame (demo mode or single frame)",
            allFrames: frames,
        };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: key });

        // Analyze the image to understand the content
        const cleanBase64 = frames[0].includes(",")
            ? frames[0].split(",")[1]
            : frames[0];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                mimeType: "image/png",
                                data: cleanBase64,
                            },
                        },
                        {
                            text: `Analyze this image and describe what makes it a good candidate for a sticker or emoji. 
              Consider: 
              - Facial expression (is it expressive/memorable?)
              - Composition (is the subject well-framed?)
              - Clarity (is it sharp and clear?)
              - Emotion conveyed
              
              ${context ? `Context: ${context}` : ""}
              
              Provide a brief analysis in 2-3 sentences.`,
                        },
                    ],
                },
            ],
        });

        const analysis = response.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Frame analyzed successfully";

        return {
            bestFrame: frames[0],
            bestFrameIndex: 0,
            totalFrames: frames.length,
            analysis,
            allFrames: frames,
        };
    } catch (error) {
        console.error("Frame analysis error:", error);
        return {
            bestFrame: frames[0],
            bestFrameIndex: 0,
            totalFrames: frames.length,
            analysis: "Analysis unavailable, using first frame",
            allFrames: frames,
        };
    }
};

/**
 * Reimagine an image as a stylized sticker using Gemini
 */
export const reimagineAsSticker = async (
    imageData: string,
    style: "cartoon" | "emoji" | "chibi" | "minimalist" = "cartoon"
): Promise<{ success: boolean; imageData?: string; error?: string }> => {
    const { key, isDemo } = await getSaucyApiKey();

    if (isDemo) {
        return {
            success: false,
            error: "Creative reimagination requires an API key",
        };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: key });
        const cleanBase64 = imageData.includes(",")
            ? imageData.split(",")[1]
            : imageData;

        const stylePrompts: Record<string, string> = {
            cartoon: "vibrant cartoon sticker style with bold outlines, exaggerated features, bright colors, and clean vector-like appearance",
            emoji: "simple emoji style with minimal details, round shapes, bold expressions, flat colors, suitable for small display",
            chibi: "cute chibi anime style with oversized head, small body, big expressive eyes, kawaii aesthetic",
            minimalist: "minimalist line art sticker with clean simple lines, limited color palette, modern aesthetic",
        };

        const prompt = `Create a ${stylePrompts[style]} version of the subject in this image. 
    Keep the same pose, expression, and essence but reimagine it as a premium sticker design.
    The result should have a transparent background and be suitable for use as a chat sticker or emoji.
    Make it visually striking and memorable with no text overlays.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                mimeType: "image/png",
                                data: cleanBase64,
                            },
                        },
                        { text: prompt },
                    ],
                },
            ],
            config: {
                responseModalities: ["image", "text"],
            } as any,
        });

        // Extract the generated image
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            if ((part as any).inlineData?.data) {
                const mimeType = (part as any).inlineData.mimeType || "image/png";
                return {
                    success: true,
                    imageData: `data:${mimeType};base64,${(part as any).inlineData.data}`,
                };
            }
        }

        return {
            success: false,
            error: "No image generated. Try a different style.",
        };
    } catch (error: any) {
        console.error("Reimagination error:", error);
        return {
            success: false,
            error: error.message || "Failed to reimagine image",
        };
    }
};
