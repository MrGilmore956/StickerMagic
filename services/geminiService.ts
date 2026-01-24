
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Message, StickerSize } from "../types";

export const removeTextMagic = async (base64Data: string, mimeType: string): Promise<string> => {
  // Always use process.env.API_KEY directly for initialization as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Extract base64 part if it's a data URL, otherwise use as is
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  if (!cleanBase64) {
    throw new Error("Invalid image data provided.");
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/png',
          },
        },
        {
          text: "Analyze this image/GIF and re-generate a high-quality, static version of it without any text, overlays, watermarks, or captions. The output should be a clean, vibrant sticker-style image with a transparent or simple background, perfectly optimized for a Slack emoji. Keep the core character or subject but remove every single piece of written text.",
        },
      ],
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates returned from the model.");
  }

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("The model did not return a processed image part.");
};

export const generateStickerFromPrompt = async (prompt: string, size: StickerSize): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        {
          text: `Professional high-quality Slack sticker: ${prompt}. Isolated on a white or transparent-style neutral background, vibrant colors, clear bold outlines, sticker aesthetic, no text.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: size
      }
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No generation candidates returned.");
  }

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to generate sticker image.");
};

export const chatWithAssistant = async (messages: Message[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'You are the Stickify Assistant. You help users remove text from images or animated GIFs to make stickers, or help them write better prompts for generating brand new high-quality stickers. Be concise, friendly, and expert in design and Slack emoji best practices.',
    },
  });

  const lastUserMsg = messages[messages.length - 1].content;
  const response = await chat.sendMessage({ message: lastUserMsg });

  return response.text || "I'm sorry, I couldn't process that.";
};
