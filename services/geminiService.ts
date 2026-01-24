
import { GoogleGenAI } from "@google/genai";
import { Message, StickerSize } from "../types";
import { getSaucyApiKey } from "./authService";
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
  const { key, isDemo } = await getSaucyApiKey();

  if (isDemo) {
    console.log("Running in DEMO MODE - Simulating text removal...");
    await new Promise(r => setTimeout(r, 1200));
    return await simulateTextRemoval(base64Data);
  }

  const ai = new GoogleGenAI({ apiKey: key });
  let cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  let processedMimeType = mimeType;

  // Convert GIF to PNG since Gemini doesn't support image/gif
  if (mimeType === 'image/gif') {
    console.log("Converting GIF to PNG for Gemini processing...");
    const pngBase64 = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const pngData = canvas.toDataURL('image/png');
        resolve(pngData.split(',')[1]);
      };
      img.onerror = () => reject(new Error("Failed to load GIF"));
      img.src = base64Data;
    });
    cleanBase64 = pngBase64;
    processedMimeType = 'image/png';
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: cleanBase64, mimeType: processedMimeType } },
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
  const { key, isDemo } = await getSaucyApiKey();

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
  const { key, isDemo } = await getSaucyApiKey();

  if (isDemo) {
    return "I'm currently in DEMO MODE. I can show you how the UI works, but for real AI text removal and sticker generation, you'll need to click 'ACTIVATE PRO' and enter your Gemini API key.";
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: { systemInstruction: "You are Saucy, the creative generative AI assistant. You're a sentient neon-red 'S' character who's a little nerdy about design and tech. Help users remove text from images, optimize stickers for Slack, and write better prompts. Be concise, friendly, and use a slightly tech-bro vibe (but stay helpful and professional)." },
  });

  const lastUserMsg = messages[messages.length - 1].content;
  const response = await chat.sendMessage({ message: lastUserMsg });
  return response.text || "I'm sorry, I encountered an error.";
};

/**
 * Ask Saucy for creative brainstorm suggestions with image analysis
 */
export const askSaucy = async (
  userIdea: string,
  imageData: { base64: string; mimeType: string }[],
  mode: 'sticker' | 'animation'
): Promise<string> => {
  const { key, isDemo } = await getSaucyApiKey();

  if (isDemo) {
    return mode === 'animation'
      ? `Great mashup potential! Try: "Epic crossover moment with dramatic reactions and comedic timing"`
      : `Nice images! Try: "Bold cartoon mashup with exaggerated expressions"`;
  }

  const ai = new GoogleGenAI({ apiKey: key });

  // Build content parts with images for vision analysis
  const parts: any[] = [];

  // Add images first for vision analysis
  for (const img of imageData.slice(0, 3)) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64.replace(/^data:[^;]+;base64,/, ''),
      }
    });
  }

  // Add the text prompt
  const textPrompt = mode === 'animation'
    ? `You are Saucy, a silly and funny AI assistant. Look at these images carefully - identify WHO or WHAT is in each one.
       
       Then generate ONE short, hilarious prompt idea for an animated mashup video featuring these specific people/characters.
       Be specific about what's IN the images. Reference their expressions, who they are, and create a funny scenario.
       
       Example format: "Bob Marley vibing while Elon looks confused and MLK gives an inspiring speech about crypto"
       
       Keep it under 20 words. Be silly, irreverent, and specific to these actual images.
       ${userIdea ? `User's idea to incorporate: ${userIdea}` : ''}`
    : `You are Saucy, a silly and funny AI assistant. Look at these images carefully - identify WHO or WHAT is in each one.
       
       Then generate ONE short, funny sticker concept featuring these specific people/characters.
       Be specific about what's IN the images. Reference their expressions and who they are.
       
       Keep it under 15 words. Be silly and specific to these actual images.
       ${userIdea ? `User's idea: ${userIdea}` : ''}`;

  parts.push({ text: textPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Hmm, I couldn't analyze those images. Try describing what you want!";
};
