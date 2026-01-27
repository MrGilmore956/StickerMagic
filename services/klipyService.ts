/**
 * Klipy GIF Service - Real API Integration
 * 
 * KLIPY is a free GIF API (alternative to Tenor/Giphy premium tiers).
 * Register at: https://partner.klipy.com to get your free API key.
 * 
 * Endpoints:
 * - /gifs/trending - Get trending GIFs
 * - /gifs/search - Search GIFs by query
 * - /stickers/trending - Get trending stickers
 * - /stickers/search - Search stickers
 * - /memes/trending - Get trending memes
 * - /memes/search - Search memes
 */

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { isMockAdminActive } from './authService';

// API Configuration
const KLIPY_API_KEY = import.meta.env.VITE_KLIPY_API_KEY || '';
const KLIPY_BASE_URL = 'https://api.klipy.com/api/v1';

// Types
export interface KlipyMediaFormat {
    url: string;
    width: number;
    height: number;
    size?: number;
}

export interface KlipyItem {
    id: string;
    url: string;           // Full-size GIF URL
    preview_url: string;   // Thumbnail/preview URL
    width: number;
    height: number;
    type: 'gif' | 'sticker' | 'clip' | 'meme';
    title?: string;
    tags?: string[];
    // Additional media formats from API
    media_formats?: {
        gif?: KlipyMediaFormat;
        mp4?: KlipyMediaFormat;
        webp?: KlipyMediaFormat;
        preview?: KlipyMediaFormat;
        thumbnail?: KlipyMediaFormat;
    };
}

export interface KlipySearchResult {
    data: KlipyItem[];
    pagination?: {
        total_count: number;
        count: number;
        offset: number;
        next?: string;
    };
}

export interface KlipyCategory {
    name: string;
    search_term: string;
    image_url?: string;
}

// Content type mapping
type ContentType = 'gifs' | 'stickers' | 'memes' | 'clips';

/**
 * Check if Klipy API key is configured
 */
export function isKlipyConfigured(): boolean {
    return !!KLIPY_API_KEY && KLIPY_API_KEY.length > 0;
}

/**
 * Build API URL with key
 */
function buildApiUrl(endpoint: string): string {
    if (!KLIPY_API_KEY) {
        console.warn('Klipy API key not configured. Add VITE_KLIPY_API_KEY to your .env file.');
        throw new Error('Klipy API key not configured');
    }
    return `${KLIPY_BASE_URL}/${KLIPY_API_KEY}${endpoint}`;
}

/**
 * Transform API response to our format
 */
function transformKlipyResponse(item: any, type: ContentType): KlipyItem {
    // Klipy returns items with structure: { id, slug, title, file: { hd: { gif: { url, width, height } }, sd: {...} } }
    const file = item.file || {};
    const hdGif = file.hd?.gif || file.hd?.webp || {};
    const sdGif = file.sd?.gif || file.sd?.webp || {};
    const previewGif = file.preview?.gif || file.preview?.webp || file.thumbnail?.gif || {};

    // Also check for old/alternative formats
    const mediaFormats = item.media_formats || item.media || {};
    const gifFormat = mediaFormats.gif || mediaFormats.original || {};
    const previewFormat = mediaFormats.thumbnail || mediaFormats.preview || mediaFormats.tinygif || {};

    // Build the URL - try HD first, then SD, then fallback formats
    const url = hdGif.url || sdGif.url || item.url || gifFormat.url || item.gif?.url || '';
    const preview_url = previewGif.url || sdGif.url || item.preview_url || previewFormat.url || item.thumbnail?.url || url || '';

    return {
        id: String(item.id || item._id || Math.random()),
        url,
        preview_url,
        width: hdGif.width || sdGif.width || item.width || gifFormat.width || 480,
        height: hdGif.height || sdGif.height || item.height || gifFormat.height || 270,
        type: type === 'gifs' ? 'gif' : type === 'stickers' ? 'sticker' : type === 'memes' ? 'meme' : 'clip',
        title: item.title || item.content_description || item.slug?.replace(/-/g, ' ') || '',
        tags: item.tags || [],
        media_formats: file
    };
}

/**
 * Search for GIFs/content using Klipy API
 */
export async function searchKlipy(
    query: string,
    options: {
        type?: ContentType;
        limit?: number;
        offset?: number;
        locale?: string;
    } = {}
): Promise<KlipyItem[]> {
    const { type = 'gifs', limit = 24, offset = 0, locale = 'en' } = options;

    if (!query.trim()) {
        return getTrendingKlipy({ type, limit, locale });
    }

    // Check Cache first
    const cacheKey = `search_${type}_${query.toLowerCase().trim()}_${limit}`;
    try {
        const cacheRef = doc(db, 'search_cache', cacheKey);
        const cacheSnap = await getDoc(cacheRef);

        if (cacheSnap.exists()) {
            const cacheData = cacheSnap.data();
            const updatedAt = cacheData.updatedAt?.toDate() || new Date(0);
            const ageInHours = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);

            // Cache valid for 24 hours
            if (ageInHours < 24) {
                console.log(`Klipy Cache Hit: "${query}"`);
                return cacheData.results;
            }
        }
    } catch (e) {
        if (!isMockAdminActive()) {
            console.warn('Cache check failed:', e);
        }
    }

    try {
        const endpoint = `/${type}/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&locale=${locale}`;
        const url = buildApiUrl(endpoint);

        console.log(`Klipy search: "${query}" (${type})`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Klipy API error: ${response.status}`);
            return fallbackSearch(query, type, limit);
        }

        const data = await response.json();
        console.log('Klipy API raw response:', JSON.stringify(data).substring(0, 500));

        // Handle various possible response formats
        // Klipy returns: { result: true, data: { data: [...] } }
        let items: any[] = [];
        if (Array.isArray(data)) {
            items = data;
        } else if (data.data && Array.isArray(data.data)) {
            items = data.data;
        } else if (data.data && data.data.data && Array.isArray(data.data.data)) {
            // Nested format: { result: true, data: { data: [...] } }
            items = data.data.data;
        } else if (data.results && Array.isArray(data.results)) {
            items = data.results;
        } else if (data.gifs && Array.isArray(data.gifs)) {
            items = data.gifs;
        } else {
            console.warn('Unexpected Klipy response format:', typeof data, Object.keys(data || {}));
            return fallbackSearch(query, type, limit);
        }

        console.log(`Klipy returned ${items.length} items`);
        const transformedResults = items.map((item: any) => transformKlipyResponse(item, type));

        // Save to Cache (Background)
        try {
            setDoc(doc(db, 'search_cache', cacheKey), {
                term: query.toLowerCase().trim(),
                results: transformedResults,
                updatedAt: serverTimestamp()
            }).catch(e => {
                if (!isMockAdminActive()) {
                    console.warn('Cache save failed:', e);
                }
            });
        } catch (e) {
            // Non-blocking
        }

        return transformedResults;
    } catch (error) {
        console.error('Klipy search failed:', error);
        return fallbackSearch(query, type, limit);
    }
}

/**
 * Get trending GIFs/content
 */
export async function getTrendingKlipy(
    options: {
        type?: ContentType;
        limit?: number;
        locale?: string;
    } = {}
): Promise<KlipyItem[]> {
    const { type = 'gifs', limit = 24, locale = 'en' } = options;

    try {
        const endpoint = `/${type}/trending?limit=${limit}&locale=${locale}`;
        const url = buildApiUrl(endpoint);

        console.log(`Klipy trending: ${type}`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Klipy API error: ${response.status}`);
            return fallbackTrending(type, limit);
        }

        const data = await response.json();
        console.log('Klipy trending raw response:', JSON.stringify(data).substring(0, 500));

        // Handle various possible response formats
        // Klipy returns: { result: true, data: { data: [...] } }
        let items: any[] = [];
        if (Array.isArray(data)) {
            items = data;
        } else if (data.data && Array.isArray(data.data)) {
            items = data.data;
        } else if (data.data && data.data.data && Array.isArray(data.data.data)) {
            // Nested format: { result: true, data: { data: [...] } }
            items = data.data.data;
        } else if (data.results && Array.isArray(data.results)) {
            items = data.results;
        } else if (data.gifs && Array.isArray(data.gifs)) {
            items = data.gifs;
        } else {
            console.warn('Unexpected Klipy trending response format:', typeof data, Object.keys(data || {}));
            return fallbackTrending(type, limit);
        }

        return items.map((item: any) => transformKlipyResponse(item, type));
    } catch (error) {
        console.error('Klipy trending failed:', error);
        return fallbackTrending(type, limit);
    }
}

/**
 * Get content categories
 */
export async function getKlipyCategories(
    type: ContentType = 'gifs'
): Promise<KlipyCategory[]> {
    try {
        const endpoint = `/${type}/categories`;
        const url = buildApiUrl(endpoint);

        const response = await fetch(url);

        if (!response.ok) {
            return getDefaultCategories();
        }

        const data = await response.json();
        return data.categories || data.data || data || [];
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return getDefaultCategories();
    }
}

/**
 * Record a share event (for analytics)
 */
export async function recordKlipyShare(
    itemId: string,
    type: ContentType = 'gifs'
): Promise<void> {
    try {
        const endpoint = `/${type}/share`;
        const url = buildApiUrl(endpoint);

        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: itemId })
        });
    } catch (error) {
        // Non-critical, log only
        console.log('Share recording skipped:', error);
    }
}

/**
 * Convert GIF URL to base64 for download
 */
export async function klipyUrlToBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Failed to convert URL to base64:', error);
        throw error;
    }
}

// ============================================
// FALLBACK DATA (when API is unavailable)
// ============================================

const FALLBACK_GIFS: KlipyItem[] = [
    { id: 'g1', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview_url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200.gif', width: 480, height: 270, type: 'gif', title: 'Dance Happy', tags: ['dance', 'happy', 'excited', 'celebration'] },
    { id: 'g2', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif', preview_url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/200.gif', width: 480, height: 366, type: 'gif', title: 'Excited Jump', tags: ['excited', 'happy', 'jumping'] },
    { id: 'g3', url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif', preview_url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/200.gif', width: 480, height: 480, type: 'gif', title: 'Laughing Hard', tags: ['laugh', 'funny', 'lol'] },
    { id: 'g4', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', preview_url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200.gif', width: 480, height: 480, type: 'gif', title: 'Thumbs Up', tags: ['thumbs up', 'good', 'approve'] },
    { id: 'g5', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', preview_url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/200.gif', width: 480, height: 270, type: 'gif', title: 'Mind Blown', tags: ['mind blown', 'wow', 'amazing'] },
    { id: 'g6', url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif', preview_url: 'https://media.giphy.com/media/OPU6wzx8JrHna/200.gif', width: 390, height: 377, type: 'gif', title: 'Crying', tags: ['cry', 'sad', 'tears'] },
    { id: 'g7', url: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif', preview_url: 'https://media.giphy.com/media/mlvseq9yvZhba/200.gif', width: 245, height: 180, type: 'gif', title: 'Happy Cat', tags: ['cat', 'cute', 'happy'] },
    { id: 'g8', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', preview_url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/200.gif', width: 245, height: 137, type: 'gif', title: 'Cat Typing', tags: ['cat', 'typing', 'work', 'funny'] },
    { id: 'g9', url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/giphy.gif', preview_url: 'https://media.giphy.com/media/4Zo41lhzKt6iZ8xff9/200.gif', width: 480, height: 480, type: 'gif', title: 'Dog Excited', tags: ['dog', 'excited', 'happy'] },
    { id: 'g10', url: 'https://media.giphy.com/media/13GIgrGdslD9oQ/giphy.gif', preview_url: 'https://media.giphy.com/media/13GIgrGdslD9oQ/200.gif', width: 420, height: 315, type: 'gif', title: 'Success Kid', tags: ['success', 'work', 'yes', 'win'] },
    { id: 'g11', url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif', preview_url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/200.gif', width: 480, height: 472, type: 'gif', title: 'Eye Roll', tags: ['eye roll', 'annoyed', 'whatever'] },
    { id: 'g12', url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif', preview_url: 'https://media.giphy.com/media/62PP2yEIAZF6g/200.gif', width: 480, height: 480, type: 'gif', title: 'Deal With It', tags: ['cool', 'sunglasses', 'deal with it'] },
    { id: 'g13', url: 'https://media.giphy.com/media/a3zqvrH40Cdhu/giphy.gif', preview_url: 'https://media.giphy.com/media/a3zqvrH40Cdhu/200.gif', width: 480, height: 256, type: 'gif', title: 'Clapping', tags: ['clap', 'applause', 'bravo'] },
    { id: 'g14', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', preview_url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/200.gif', width: 480, height: 480, type: 'gif', title: 'Shock', tags: ['shocked', 'surprised', 'omg'] },
    { id: 'g15', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', preview_url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/200.gif', width: 480, height: 480, type: 'gif', title: 'Thinking', tags: ['think', 'thinking', 'hmm'] },
    { id: 'g16', url: 'https://media.giphy.com/media/xUPGcDDE4aj4wNKsaQ/giphy.gif', preview_url: 'https://media.giphy.com/media/xUPGcDDE4aj4wNKsaQ/200.gif', width: 480, height: 360, type: 'gif', title: 'Coffee Time', tags: ['coffee', 'morning', 'drink'] },
    { id: 'g17', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', preview_url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/200.gif', width: 480, height: 480, type: 'gif', title: 'Fire', tags: ['fire', 'hot', 'lit', 'awesome'] },
    { id: 'g18', url: 'https://media.giphy.com/media/xT9IgEZTTWLdfGv0I0/giphy.gif', preview_url: 'https://media.giphy.com/media/xT9IgEZTTWLdfGv0I0/200.gif', width: 480, height: 349, type: 'gif', title: 'Hello Wave', tags: ['hello', 'hi', 'wave', 'greeting'] },
    { id: 'g19', url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif', preview_url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/200.gif', width: 500, height: 300, type: 'gif', title: 'Thank You', tags: ['thanks', 'thank you', 'grateful'] },
    { id: 'g20', url: 'https://media.giphy.com/media/IeLOBZb7ZdQ1G/giphy.gif', preview_url: 'https://media.giphy.com/media/IeLOBZb7ZdQ1G/200.gif', width: 400, height: 225, type: 'gif', title: 'High Five', tags: ['high five', 'teamwork', 'celebrate'] },
];

const FALLBACK_STICKERS: KlipyItem[] = [
    { id: 's1', url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif', preview_url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/200.gif', width: 480, height: 480, type: 'sticker', title: 'Heart', tags: ['heart', 'love', 'romantic'] },
    { id: 's2', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', preview_url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/200.gif', width: 480, height: 480, type: 'sticker', title: 'Star', tags: ['star', 'sparkle', 'shine'] },
    { id: 's3', url: 'https://media.giphy.com/media/l0ExbnGIX9sMFS7PG/giphy.gif', preview_url: 'https://media.giphy.com/media/l0ExbnGIX9sMFS7PG/200.gif', width: 480, height: 480, type: 'sticker', title: 'Fire', tags: ['fire', 'hot', 'flames'] },
    { id: 's4', url: 'https://media.giphy.com/media/3o6ZsYm53kHOvgKWyI/giphy.gif', preview_url: 'https://media.giphy.com/media/3o6ZsYm53kHOvgKWyI/200.gif', width: 480, height: 480, type: 'sticker', title: 'Sparkles', tags: ['sparkle', 'glitter', 'magic'] },
    { id: 's5', url: 'https://media.giphy.com/media/3o7TKnO6Wve6502iJ2/giphy.gif', preview_url: 'https://media.giphy.com/media/3o7TKnO6Wve6502iJ2/200.gif', width: 480, height: 480, type: 'sticker', title: 'Thumbs Up', tags: ['thumbs up', 'good', 'yes'] },
];

function fallbackSearch(query: string, type: ContentType, limit: number): KlipyItem[] {
    console.log(`Using fallback search for: "${query}"`);
    const sources = type === 'stickers' ? FALLBACK_STICKERS : FALLBACK_GIFS;
    const searchTerms = query.toLowerCase().split(/\s+/);

    const scored = sources.map(item => {
        let score = 0;
        const title = (item.title || '').toLowerCase();
        const tags = item.tags || [];

        for (const term of searchTerms) {
            if (tags.some(tag => tag === term)) score += 10;
            else if (tags.some(tag => tag.includes(term))) score += 5;
            if (title.includes(term)) score += 3;
        }

        return { item, score };
    });

    const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.item);

    return matched.length > 0 ? matched.slice(0, limit) : sources.slice(0, limit);
}

function fallbackTrending(type: ContentType, limit: number): KlipyItem[] {
    console.log(`Using fallback trending for: ${type}`);
    const sources = type === 'stickers' ? FALLBACK_STICKERS : FALLBACK_GIFS;
    return [...sources].sort(() => 0.5 - Math.random()).slice(0, limit);
}

function getDefaultCategories(): KlipyCategory[] {
    return [
        { name: 'Reactions', search_term: 'reaction' },
        { name: 'Happy', search_term: 'happy' },
        { name: 'Sad', search_term: 'sad' },
        { name: 'Love', search_term: 'love' },
        { name: 'Funny', search_term: 'funny' },
        { name: 'Animals', search_term: 'animals' },
        { name: 'Cats', search_term: 'cat' },
        { name: 'Dogs', search_term: 'dog' },
        { name: 'Celebrate', search_term: 'celebrate' },
        { name: 'Work', search_term: 'work' },
    ];
}

// Export types for consumers
export type { ContentType };
