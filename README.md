# Saucy AI 🌶️✨

**The Spotify of GIFs** - AI-powered GIF discovery and creation platform.

**🔴 LIVE**: https://saucy-ai.web.app

## Features

### 🔍 GIF Discovery
- **Smart Search** - Find the perfect GIF with AI-enhanced search
- **Categories** - Browse curated collections by mood and theme
- **Sauce Showdown** - Daily GIF battles with community voting

### 🎨 GIF Creation
- **Magic Remover** - Remove text/watermarks from images & GIFs
- **AI Generator** - Create custom GIFs from text prompts
- **Animated Support** - Frame-by-frame processing for animations

### ❤️ Personal Library
- **Sauce Box** - Save your favorite GIFs
- **Download & Share** - Easy export options
- **Sync Across Devices** - Cloud-saved favorites

### 👑 Admin Portal
- **Showdown Manager** - Seed, reset, and manage daily battles
- **User Management** - Role-based access control (Owner/Admin/User)
- **Analytics Dashboard** - Track platform engagement and downloads
- **Content Library** - Curate and approve GIF submissions

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **AI**: Google Gemini API
- **GIF Sources**: Klipy API, GIPHY, Tenor

## Run Locally

```bash
# Install dependencies
npm install

# Set API key in .env.local
VITE_GEMINI_API_KEY=your_key_here

# Start dev server
npm run dev
```

## Deployment

```bash
# Build for production
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## Version History

### v8.6.0 (January 27, 2026)
- ✅ Full production launch
- ✅ Saucy-Specific Analytics dashboard
- ✅ User Management with role changes
- ✅ Showdown Admin controls (reset/end/seed)
- ✅ Pure Black theme refinements
- ✅ Mobile optimization phase

---

**Live at**: https://saucy-ai.web.app
