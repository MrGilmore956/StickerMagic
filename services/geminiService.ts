
import { GoogleGenAI } from "@google/genai";
import { Message, StickerSize, KanbanTask, TaskStatus, TaskPriority } from "../types";
import { getSaucyApiKey } from "./authService";
import { removeBackgroundML, removeBackgroundSimple } from "./backgroundRemover";



export const removeTextMagic = async (base64Data: string, mimeType: string): Promise<string> => {
  const { key, error } = await getSaucyApiKey();

  if (error) {
    throw new Error(error);
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
  const { key, error } = await getSaucyApiKey();

  if (error) {
    throw new Error(error);
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
  const { key, error } = await getSaucyApiKey();

  if (error) {
    return `Error: ${error}`;
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
  const { key, error } = await getSaucyApiKey();

  if (error) {
    return "Please add a Gemini API key in settings to get AI suggestions!";
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
  const { key, error } = await getSaucyApiKey();

  if (error) {
    return currentPrompt;
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
  const { key, error } = await getSaucyApiKey();

  if (error) {
    return {
      type: 'trending',
      title: "Trending Choice",
      description: "Connect your Gemini API key to get personalized recommendations.",
      sourceQuery: query
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

/**
 * AI Command Processor for Kanban Tasks
 * Translates natural language into structured actions
 */
export const processTaskCommand = async (
  command: string,
  currentTasks: KanbanTask[]
): Promise<{
  success: boolean;
  message: string;
  actions: any[];
}> => {
  const { key, error } = await getSaucyApiKey();

  if (error) {
    return { success: false, message: "Gemini API key missing", actions: [] };
  }

  const ai = new GoogleGenAI({ apiKey: key });

  // Create a condensed version of tasks for the prompt to save tokens
  const taskSummary = currentTasks.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status
  }));

  const prompt = `You are Saucy's AI Project Manager. A user is managing a Kanban board with three columns: 'todo', 'in-progress', and 'done'.
  
  CURRENT TASKS:
  ${JSON.stringify(taskSummary, null, 2)}
  
  USER COMMAND: "${command}"
  
  Analyze the command and determine the necessary actions. You can CREATE, UPDATE, MOVE, or DELETE tasks.
  
  Output ONLY a JSON object in this format:
  {
    "success": true,
    "message": "Friendly confirmation of what you did",
    "actions": [
      {
        "type": "create",
        "payload": { "title": "...", "description": "...", "status": "todo", "priority": "medium" }
      },
      {
        "type": "move",
        "taskId": "task_id_here",
        "payload": { "status": "in-progress" }
      },
      {
        "type": "update",
        "taskId": "task_id_here",
        "payload": { "title": "New Title", "priority": "high" }
      },
      {
        "type": "delete",
        "taskId": "task_id_here"
      }
    ]
  }
  
  RULES:
  1. If moving a task, try to find the matching task by title.
  2. If the user says "mark as completed" or "finish", move to 'done'.
  3. If multiple actions are needed (e.g., "move task A to in progress and create task B"), include all in the actions array.
  4. If you cannot find the task or understand the command, set success to false and explain why in the message.
  5. BE CONCISE. BE HELPUL. RESPOND ONLY WITH THE JSON.`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || '';
    const parsedResult = JSON.parse(jsonStr);

    return parsedResult;
  } catch (err) {
    console.error('AI Task Command failed:', err);
    return {
      success: false,
      message: "I hit a glitch trying to process that. Could you try rephrasing?",
      actions: []
    };
  }
};
