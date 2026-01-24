
import { GoogleGenAI } from "@google/genai";
import { Message, StickerSize } from "../types";
import { getStickifyApiKey } from "./authService";
import { removeBackgroundML, removeBackgroundSimple } from "./backgroundRemover";

/**
 * SIMULATED Text Removal for Demo Mode
 * This masks the bottom portion of the image where text usually resides
 * to provide a visual demonstration without needing a real API call.
 */
const simulateTextRemoval = async (base64Data: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Mask bottom 25% (typical text area)
      const maskHeight = Math.floor(img.height * 0.25);
      const maskY = img.height - maskHeight;

      // Sample color from the middle to use as filler
      const sample = ctx.getImageData(10, maskHeight, 1, 1).data;
      ctx.fillStyle = `rgb(${sample[0]}, ${sample[1]}, ${sample[2]})`;
      ctx.fillRect(0, maskY, img.width, maskHeight);

      // Mask top right (typical watermark area)
      ctx.fillRect(img.width - 150, 0, 150, 60);

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = base64Data;
  });
};

export const removeTextMagic = async (base64Data: string, mimeType: string): Promise<string> => {
  const { key, isDemo } = await getStickifyApiKey();

  if (isDemo) {
    console.log("Running in DEMO MODE - Simulating text removal...");
    await new Promise(r => setTimeout(r, 1200));
    return await simulateTextRemoval(base64Data);
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: cleanBase64, mimeType: mimeType || 'image/png' } },
        {
          text: "MANDATORY INSTRUCTION: Remove all written text, captions, watermarks, and logos. Re-create the background accurately where the text was. The final image must contain ZERO words or letters. Focus on keeping the main character/person. CRITICAL: Output must be PNG format with a fully transparent background (alpha channel). No grey, white, or colored backgrounds - only transparency."
        },
      ],
    },
  });


  const candidates = response.candidates;
  if (candidates?.[0]?.content?.parts?.[0]?.inlineData) {
    const base64Image = `data:image/png;base64,${candidates[0].content.parts[0].inlineData.data}`;

    // Remove background to ensure transparency
    try {
      const transparentImage = await removeBackgroundML(base64Image);
      return transparentImage;
    } catch (err) {
      console.warn("ML background removal failed, trying simple removal:", err);
      try {
        return await removeBackgroundSimple(base64Image);
      } catch (err2) {
        console.warn("All background removal failed, returning original:", err2);
        return base64Image;
      }
    }
  }
  throw new Error("Gemini produced an empty result. Try a clearer image.");
};

export const generateStickerFromPrompt = async (prompt: string, size: StickerSize): Promise<string> => {
  const { key, isDemo } = await getStickifyApiKey();

  if (isDemo) {
    await new Promise(r => setTimeout(r, 2000));
    return "https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=1000&auto=format&fit=crop";
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: `Professional high-detail sticker style: ${prompt}, PNG with fully transparent background (alpha channel), no text, no grey background, pure transparency.` }] },
    config: { imageConfig: { aspectRatio: "1:1", imageSize: size } },
  });


  if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
    const base64Image = `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData.data}`;

    // Remove background to ensure transparency
    try {
      const transparentImage = await removeBackgroundML(base64Image);
      return transparentImage;
    } catch (err) {
      console.warn("ML background removal failed, trying simple removal:", err);
      try {
        return await removeBackgroundSimple(base64Image);
      } catch (err2) {
        console.warn("All background removal failed, returning original:", err2);
        return base64Image;
      }
    }
  }
  throw new Error("Failed to generate sticker.");
};

export const chatWithAssistant = async (messages: Message[]): Promise<string> => {
  const { key, isDemo } = await getStickifyApiKey();

  if (isDemo) {
    return "I'm currently in DEMO MODE. I can show you how the UI works, but for real AI text removal and sticker generation, you'll need to click 'ACTIVATE PRO' and enter your Gemini API key.";
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: { systemInstruction: "You are Sticko, the Stickify Assistant. You're a sentient neon-emerald 'S' character who's a little nerdy about design and tech. Help users remove text from images, optimize stickers for Slack, and write better prompts. Be concise, friendly, and use a slightly tech-bro vibe (but stay helpful and professional)." },
  });

  const lastUserMsg = messages[messages.length - 1].content;
  const response = await chat.sendMessage({ message: lastUserMsg });
  return response.text || "I'm sorry, I encountered an error.";
};
