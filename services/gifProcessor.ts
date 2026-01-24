
import { GoogleGenAI } from "@google/genai";
import { getStickifyApiKey } from "./authService";

export interface GifFrame {
    imageData: string;
    delay: number;
}

/**
 * SIMULATED Text Removal for Demo Mode
 */
const simulateMask = async (base64Data: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);

            // Demo mask
            ctx.fillStyle = '#0f172a'; // Theme slate
            ctx.fillRect(0, img.height * 0.75, img.width, img.height * 0.25);
            ctx.fillRect(img.width - 120, 0, 120, 40);

            resolve(canvas.toDataURL('image/png'));
        };
        img.src = base64Data;
    });
};

export const removeTextFromFrame = async (
    base64Data: string,
    mimeType: string = 'image/png'
): Promise<string> => {
    const { key, isDemo } = await getStickifyApiKey();

    if (isDemo) {
        await new Promise(r => setTimeout(r, 800));
        return await simulateMask(base64Data);
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: cleanBase64, mimeType: mimeType } },
                { text: "Remove all written text and watermarks from this frame. Output ONLY the clean image." },
            ],
        },
    });

    if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        return `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData.data}`;
    }
    throw new Error("Frame error.");
};

export const extractGifFrames = async (gifDataUrl: string): Promise<GifFrame[]> => {
    return [{ imageData: gifDataUrl, delay: 100 }];
};

export const reassembleGif = async (frames: GifFrame[], width: number, height: number): Promise<string> => {
    return frames[0].imageData;
};

export const checkRateLimit = (): { allowed: boolean; remaining: string } => {
    return { allowed: true, remaining: "$25.00" };
};

export const incrementUsage = (frameCount: number = 1): void => { };

export const isAnimatedGif = async (dataUrl: string): Promise<boolean> => {
    return dataUrl.includes('image/gif');
};
