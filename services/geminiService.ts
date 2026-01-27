
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

  // Helper to convert GIF to PNG
  const convertGifToPng = async (base64Data: string): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
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
        resolve({ data: pngData.split(',')[1], mimeType: 'image/png' });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = base64Data.includes(',') ? base64Data : `data:image/gif;base64,${base64Data}`;
    });
  };

  // Add images first for vision analysis (convert GIFs to PNG)
  for (const img of imageData.slice(0, 3)) {
    let processedData = img.base64.replace(/^data:[^;]+;base64,/, '');
    let processedMimeType = img.mimeType;

    // Convert GIF to PNG since Gemini doesn't support image/gif
    if (img.mimeType === 'image/gif') {
      try {
        console.log("Converting GIF to PNG for AI analysis...");
        const fullBase64 = img.base64.includes(',') ? img.base64 : `data:image/gif;base64,${img.base64}`;
        const converted = await convertGifToPng(fullBase64);
        processedData = converted.data;
        processedMimeType = converted.mimeType;
      } catch (err) {
        console.warn("GIF conversion failed, skipping image:", err);
        continue; // Skip this image if conversion fails
      }
    }

    parts.push({
      inlineData: {
        mimeType: processedMimeType,
        data: processedData,
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
       RESPOND WITH ONLY THE CONCEPT - no labels, no prefixes, just the idea itself.
       ${userIdea ? `User's idea to incorporate: ${userIdea}` : ''}`
    : `You are Saucy, a silly and funny AI assistant. Look at these images carefully - identify WHO or WHAT is in each one.
       
       Then generate ONE short, funny sticker concept featuring these specific people/characters.
       Be specific about what's IN the images. Reference their expressions and who they are.
       
       Keep it under 15 words. Be silly and specific to these actual images.
       RESPOND WITH ONLY THE CONCEPT - no labels like "Sticker concept:" or "Who is in the image:", just the idea itself.
       ${userIdea ? `User's idea: ${userIdea}` : ''}`;

  parts.push({ text: textPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Hmm, I couldn't analyze those images. Try describing what you want!";
};

/**
 * Refine a suggestion based on user feedback
 * Part of the Creative Director Loop
 */
export const refineSuggestion = async (
  currentPrompt: string,
  userFeedback: string,
  imageData: { base64: string; mimeType: string }[],
  mode: 'sticker' | 'animation'
): Promise<string> => {
  const { key, isDemo } = await getSaucyApiKey();

  if (isDemo) {
    // Simulate refinement in demo mode
    await new Promise(r => setTimeout(r, 800));
    const demoResponses: Record<string, string> = {
      'funnier': `${currentPrompt} but with exaggerated silly expressions and meme energy`,
      'spicier': `${currentPrompt} with intense dramatic flair and bold energy`,
      'softer': `${currentPrompt} but gentler, more subtle and calming`,
      'dramatic': `${currentPrompt} in an epic cinematic style with intense emotions`,
    };
    const key = Object.keys(demoResponses).find(k => userFeedback.toLowerCase().includes(k));
    return key ? demoResponses[key] : `Refined version: ${currentPrompt} with ${userFeedback}`;
  }

  const ai = new GoogleGenAI({ apiKey: key });

  // Build content parts with images
  const parts: any[] = [];

  // Helper to convert GIF to PNG with timeout
  const convertGifToPng = async (base64Data: string): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("GIF conversion timed out"));
      }, 5000); // 5 second timeout

      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        try {
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
          resolve({ data: pngData.split(',')[1], mimeType: 'image/png' });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Failed to load image"));
      };
      img.src = base64Data.includes(',') ? base64Data : `data:image/gif;base64,${base64Data}`;
    });
  };

  // Add images for context - process them in parallel with individual error handling
  const imagePromises = imageData.slice(0, 3).map(async (img) => {
    try {
      let processedData = img.base64.replace(/^data:[^;]+;base64,/, '');
      let processedMimeType = img.mimeType;

      if (img.mimeType === 'image/gif') {
        const fullBase64 = img.base64.includes(',') ? img.base64 : `data:image/gif;base64,${img.base64}`;
        const converted = await convertGifToPng(fullBase64);
        processedData = converted.data;
        processedMimeType = converted.mimeType;
      }

      return {
        inlineData: {
          mimeType: processedMimeType,
          data: processedData,
        }
      };
    } catch (err) {
      console.log('Image processing skipped:', err);
      return null;
    }
  });

  const processedImages = await Promise.all(imagePromises);
  processedImages.filter(Boolean).forEach(img => parts.push(img));

  // Build the refinement prompt
  const textPrompt = `You are Saucy, a creative AI assistant helping refine ${mode} ideas.

Current creative direction: "${currentPrompt}"

User feedback: "${userFeedback}"

Based on the images provided and the user's feedback, generate a REFINED creative direction.
- Address the user's specific feedback
- Keep the core idea but adjust the tone/style as requested
- Be specific about what's in the images
- Keep it under 20 words
- Be creative and fun!

Respond with ONLY the refined prompt, nothing else.`;

  parts.push({ text: textPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
  });

  const refined = response.candidates?.[0]?.content?.parts?.[0]?.text;
  return refined?.trim() || currentPrompt;
};

/**
 * Get a dynamic recommendation/remix challenge based on search intent
 */
export const getSaucyRecommendation = async (query: string): Promise<{
  type: 'trending' | 'remix';
  title: string;
  description: string;
  sourceQuery: string;
  remixAction?: string;
}> => {
  const { key, isDemo } = await getSaucyApiKey();

  if (isDemo) {
    // Return clever demo responses for common queries
    const q = query.toLowerCase();
    if (q.includes('birthday') || q.includes('party')) {
      return {
        type: 'remix',
        title: "The Ultimate Birthday Glow-Up",
        description: "That cat is cute, but imagine it with a neon party hat and 3D confetti! 🔥",
        sourceQuery: "funny festive cat",
        remixAction: "Add a 3D party hat and rainbow confetti burst"
      };
    }
    return {
      type: 'trending',
      title: `The ${q.charAt(0).toUpperCase() + q.slice(1)} Vault`,
      description: `I've scoured the depths of the internet to find the absolut best ${q} sauce for you.`,
      sourceQuery: q
    };
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const prompt = `You are Saucy, the sentient AI creative director for a premium GIF library. 
  A user just searched for: "${query}"
  
  Analyze the INTENT. Is it for a specific event (birthday, wedding, congrats)? Or a general emotion (happy, sad)?
  
  Generate ONE creative recommendation in JSON format:
  {
    "type": "trending" (for general sentiment) or "remix" (for specific events/goals where editing would add value),
    "title": "Short catchy title (max 5 words)",
    "description": "Witty, slightly tech-bro response explaining why this is perfect (max 15 words)",
    "sourceQuery": "A more specific Klipy search term to find the perfect BASE GIF",
    "remixAction": "ONLY IF type is remix: A specific creative edit like 'Add a birthday hat' or 'Make it rain gold nuggets'"
  }
  
  BE SPECIFIC. RESPOND ONLY WITH THE JSON.`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '';
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Saucy recommendation failed:', err);
    return {
      type: 'trending',
      title: "The trending choice",
      description: "Found some fire content for you.",
      sourceQuery: query
    };
  }
};
