"use strict";
/**
 * Firebase Cloud Functions - OG Meta Tag Injection
 *
 * This function intercepts requests to /gif/:id and injects dynamic
 * Open Graph meta tags for social media link unfurling (Slack, Twitter, etc.)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ogMeta = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
const app = (0, express_1.default)();
// Klipy API Configuration
const KLIPY_API_KEY = process.env.KLIPY_API_KEY || '';
const KLIPY_BASE_URL = 'https://api.klipy.com/api/v1';
// User agent patterns for social media crawlers
const CRAWLER_USER_AGENTS = [
    'facebookexternalhit',
    'Facebot',
    'Twitterbot',
    'LinkedInBot',
    'WhatsApp',
    'Slackbot',
    'TelegramBot',
    'Discordbot',
    'Pinterest',
    'Googlebot',
    'bingbot',
    'Applebot',
    'iMessage'
];
/**
 * Check if the request is from a social media crawler
 */
function isCrawler(userAgent) {
    if (!userAgent)
        return false;
    const lowerUA = userAgent.toLowerCase();
    return CRAWLER_USER_AGENTS.some(crawler => lowerUA.includes(crawler.toLowerCase()));
}
/**
 * Fetch GIF data from Klipy API
 */
async function fetchGifData(gifId) {
    if (!KLIPY_API_KEY) {
        console.error('Klipy API key not configured');
        return null;
    }
    try {
        // Try to get GIF by ID endpoint first
        const response = await fetch(`${KLIPY_BASE_URL}/${KLIPY_API_KEY}/gifs/${gifId}`);
        if (response.ok) {
            const data = await response.json();
            const gif = data.data || data;
            // Extract URL from various possible formats
            const file = gif.file || {};
            const hdGif = file.hd?.gif || file.hd?.webp || {};
            const sdGif = file.sd?.gif || file.sd?.webp || {};
            return {
                url: hdGif.url || sdGif.url || gif.url || '',
                title: gif.title || gif.slug?.replace(/-/g, ' ') || 'GIF',
                width: hdGif.width || sdGif.width || gif.width || 480,
                height: hdGif.height || sdGif.height || gif.height || 270
            };
        }
        // Fallback: Search by ID as query
        const searchResponse = await fetch(`${KLIPY_BASE_URL}/${KLIPY_API_KEY}/gifs/search?q=${gifId}&limit=1`);
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const items = searchData.data?.data || searchData.data || searchData || [];
            if (items.length > 0) {
                const gif = items[0];
                const file = gif.file || {};
                const hdGif = file.hd?.gif || file.hd?.webp || {};
                const sdGif = file.sd?.gif || file.sd?.webp || {};
                return {
                    url: hdGif.url || sdGif.url || gif.url || '',
                    title: gif.title || gif.slug?.replace(/-/g, ' ') || 'GIF',
                    width: hdGif.width || sdGif.width || gif.width || 480,
                    height: hdGif.height || sdGif.height || gif.height || 270
                };
            }
        }
        return null;
    }
    catch (error) {
        console.error('Error fetching GIF data:', error);
        return null;
    }
}
/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m] || m);
}
/**
 * Generate HTML with dynamic OG meta tags for crawlers
 * This is a minimal HTML document specifically for social media crawlers
 */
function generateCrawlerHtml(gif, gifId) {
    const siteUrl = 'https://saucy-ai.web.app';
    const gifPageUrl = `${siteUrl}/gif/${gifId}`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(gif.title)} | Saucy</title>
    
    <!-- Open Graph / Facebook / Slack -->
    <meta property="og:type" content="video.other">
    <meta property="og:site_name" content="Saucy">
    <meta property="og:title" content="${escapeHtml(gif.title)} | Saucy">
    <meta property="og:description" content="Shared via Saucy 🔥 The Spotify of GIFs">
    <meta property="og:url" content="${gifPageUrl}">
    
    <!-- The key: og:image must be the actual GIF URL -->
    <meta property="og:image" content="${gif.url}">
    <meta property="og:image:type" content="image/gif">
    <meta property="og:image:width" content="${gif.width}">
    <meta property="og:image:height" content="${gif.height}">
    
    <!-- Video alternative for platforms that prefer it -->
    <meta property="og:video" content="${gif.url}">
    <meta property="og:video:type" content="video/mp4">
    <meta property="og:video:width" content="${gif.width}">
    <meta property="og:video:height" content="${gif.height}">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@SaucyGIFs">
    <meta name="twitter:title" content="${escapeHtml(gif.title)} | Saucy">
    <meta name="twitter:description" content="Shared via Saucy 🔥">
    <meta name="twitter:image" content="${gif.url}">
    <meta name="twitter:image:alt" content="${escapeHtml(gif.title)}">
    
    <!-- Redirect to the actual page for any real browsers that follow the link -->
    <meta http-equiv="refresh" content="0;url=${gifPageUrl}">
</head>
<body>
    <p>Redirecting to <a href="${gifPageUrl}">Saucy</a>...</p>
</body>
</html>`;
}
/**
 * Generate default fallback HTML for crawlers when GIF not found
 */
function getDefaultCrawlerHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saucy - The Spotify of GIFs</title>
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Saucy">
    <meta property="og:title" content="Saucy - The Spotify of GIFs">
    <meta property="og:description" content="Discover trending GIFs, save your favorites, and share the sauce 🔥">
    <meta property="og:image" content="https://saucy-ai.web.app/logos/saucy_drip_dark.png">
    <meta property="og:url" content="https://saucy-ai.web.app">
    <meta http-equiv="refresh" content="0;url=https://saucy-ai.web.app">
</head>
<body>
    <p>Redirecting to <a href="https://saucy-ai.web.app">Saucy</a>...</p>
</body>
</html>`;
}
/**
 * Handle /gif/:id requests
 * - For crawlers: Return HTML with dynamic OG meta tags
 * - For regular users: Serve the production index.html (let React Router handle it)
 */
app.get('/gif/:id', async (req, res) => {
    const gifId = String(req.params.id);
    const userAgent = req.get('User-Agent') || '';
    console.log(`GIF request: ${gifId}, UA: ${userAgent.substring(0, 50)}...`);
    // For regular users (not crawlers), serve the SPA index.html
    if (!isCrawler(userAgent)) {
        try {
            // Fetch the production index.html from hosting
            const indexResponse = await fetch('https://saucy-ai.web.app/index.html');
            if (indexResponse.ok) {
                const html = await indexResponse.text();
                res.set('Content-Type', 'text/html');
                res.set('Cache-Control', 'public, max-age=60');
                return res.send(html);
            }
        }
        catch (error) {
            console.error('Error fetching index.html:', error);
        }
        // Fallback: redirect to home page if fetching fails
        return res.redirect(302, 'https://saucy-ai.web.app/');
    }
    // For crawlers, inject dynamic OG meta tags
    console.log(`Crawler detected: ${userAgent.substring(0, 30)}...`);
    try {
        const gifData = await fetchGifData(gifId);
        if (!gifData || !gifData.url) {
            console.log(`GIF not found: ${gifId}`);
            // Return default HTML with Saucy branding
            const html = getDefaultCrawlerHtml();
            res.set('Content-Type', 'text/html');
            return res.send(html);
        }
        console.log(`GIF found: ${gifData.title} - ${gifData.url}`);
        const html = generateCrawlerHtml(gifData, gifId);
        res.set('Content-Type', 'text/html');
        res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
        return res.send(html);
    }
    catch (error) {
        console.error('Error processing GIF request:', error);
        const html = getDefaultCrawlerHtml();
        res.set('Content-Type', 'text/html');
        return res.send(html);
    }
});
// Export the Express app as a Firebase Cloud Function
exports.ogMeta = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map