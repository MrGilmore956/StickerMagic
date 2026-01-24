# Stickify 🎨✨

AI-powered sticker creator that removes text from images and animated GIFs, or generates brand new stickers from prompts.

**Live App**: [View in AI Studio](https://ai.studio/apps/drive/1aujC17MTeaV1lHRtuVC578iwJU0WE0Lo)

## Features

- **Magic Remover** - Upload an image or GIF, AI removes all text/watermarks
- **Animated GIF Support** - Preserves animation while removing text (frame-by-frame processing)
- **Sticker Creator** - Generate new stickers from text prompts
- **Help Chat** - AI assistant for design tips and prompt writing

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   ```bash
   npm run dev
   ```

## Rate Limits

- **25 uses per user per day** for GIF processing

---

© 2025 Stickify • Powered by Gemini
