/**
 * HomePage - User-facing library browser
 * 
 * Features:
 * - GIF of the Day hero section
 * - Category navigation with icons
 * - Trending tabs (Today, Week, Month, All Time)
 * - Search functionality
 * - Download tracking
 * - Content rating filters
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Download,
    Flame,
    Calendar,
    TrendingUp,
    Crown,
    Loader2,
    User,
    LogIn,
    X,
    ChevronRight,
    ChevronLeft,
    FlaskConical,
    Heart,
    Copy,
    Share2,
    Settings,
    Type,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { signInWithGoogle, signOut, initAuthListener } from '../services/authService';
import { ensureUserProfile, UserProfile } from '../services/userProfileService';
import { searchKlipy, getTrendingKlipy, isKlipyConfigured, KlipyItem } from '../services/klipyService';
import { trackDownload, trackSearch, trackPageView } from '../services/analyticsService';
import { toggleFavorite, isFavorited } from '../services/favoritesService';
import MemeEditor from '../components/MemeEditor';
import SauceShowdown from '../components/SauceShowdown';
import { subscribeToSettings } from '../services/settingsService';

type TrendingPeriod = 'today' | 'week' | 'month' | 'allTime';
type ContentRating = 'all' | 'pg' | 'pg13' | 'r' | 'unhinged';

// LibraryGIF type for local use
interface LibraryGIF {
    id: string;
    url: string;
    thumbnailUrl?: string;
    title?: string;
    description?: string;
    tags?: string[];
    downloads?: number;
    rating?: string;
    status: 'published' | 'pending' | 'rejected';
    createdAt: Date;
}

// Subcategory definition
interface SubCategory {
    id: string;
    name: string;
    emoji: string;
    searchTerm: string;
}

// Category definitions with emojis, colors, search terms, and subcategories
interface Category {
    id: string;
    name: string;
    emoji: string;
    searchTerm: string;
    gradient: string;
    hoverGradient: string;
    subcategories: SubCategory[];
}

const DEFAULT_CATEGORIES: Category[] = [
    {
        id: 'saucys-pick',
        name: "Saucy's Pick",
        emoji: '🔥',
        searchTerm: 'tuesday',
        gradient: 'from-red-500 to-red-700',
        hoverGradient: 'from-red-600 to-red-800',
        subcategories: [
            { id: 'tuesday-vibes', name: 'Tuesday Vibes', emoji: '📅', searchTerm: 'tuesday mood vibes' },
            { id: 'taco-tuesday', name: 'Taco Tuesday', emoji: '🌮', searchTerm: 'taco tuesday food' },
            { id: 'transformation', name: 'Transformation', emoji: '✨', searchTerm: 'transformation tuesday glow up' },
        ]
    },
    {
        id: 'reactions',
        name: 'Reactions',
        emoji: '😂',
        searchTerm: 'reaction',
        gradient: 'from-pink-500 to-rose-500',
        hoverGradient: 'from-pink-600 to-rose-600',
        subcategories: [
            { id: 'laugh', name: 'Laughing', emoji: '🤣', searchTerm: 'laughing lol haha' },
            { id: 'shock', name: 'Shocked', emoji: '😱', searchTerm: 'shocked surprised omg' },
            { id: 'eyeroll', name: 'Eye Roll', emoji: '🙄', searchTerm: 'eye roll annoyed whatever' },
            { id: 'facepalm', name: 'Facepalm', emoji: '🤦', searchTerm: 'facepalm fail cringe' },
            { id: 'clap', name: 'Clapping', emoji: '👏', searchTerm: 'clapping applause bravo' },
            { id: 'thumbsup', name: 'Thumbs Up', emoji: '👍', searchTerm: 'thumbs up good approve' },
        ]
    },
    {
        id: 'animals',
        name: 'Animals',
        emoji: '🐾',
        searchTerm: 'animals cute',
        gradient: 'from-amber-500 to-orange-500',
        hoverGradient: 'from-amber-600 to-orange-600',
        subcategories: [
            { id: 'cats', name: 'Cats', emoji: '🐱', searchTerm: 'cat kitten kitty meow' },
            { id: 'dogs', name: 'Dogs', emoji: '🐕', searchTerm: 'dog puppy doggo woof' },
            { id: 'birds', name: 'Birds', emoji: '🦜', searchTerm: 'bird parrot owl flying' },
            { id: 'wildlife', name: 'Wildlife', emoji: '🦁', searchTerm: 'wildlife lion tiger bear nature' },
            { id: 'ocean', name: 'Ocean Life', emoji: '🐬', searchTerm: 'ocean fish dolphin whale shark' },
            { id: 'pets', name: 'Exotic Pets', emoji: '🐹', searchTerm: 'hamster bunny rabbit reptile exotic' },
        ]
    },
    {
        id: 'memes',
        name: 'Memes',
        emoji: '🔥',
        searchTerm: 'meme viral',
        gradient: 'from-red-500 to-orange-500',
        hoverGradient: 'from-red-600 to-orange-600',
        subcategories: [
            { id: 'classic', name: 'Classic', emoji: '🏆', searchTerm: 'classic meme iconic legendary' },
            { id: 'dank', name: 'Dank', emoji: '💀', searchTerm: 'dank meme edgy cursed' },
            { id: 'wholesome', name: 'Wholesome', emoji: '🥰', searchTerm: 'wholesome meme cute sweet' },
            { id: 'trending', name: 'Trending', emoji: '📈', searchTerm: 'trending viral hot popular' },
            { id: 'relatable', name: 'Relatable', emoji: '💯', searchTerm: 'relatable mood same vibes' },
            { id: 'cringe', name: 'Cringe', emoji: '😬', searchTerm: 'cringe awkward fail embarrassing' },
        ]
    },
    {
        id: 'love',
        name: 'Love',
        emoji: '❤️',
        searchTerm: 'love heart romance',
        gradient: 'from-rose-500 to-pink-500',
        hoverGradient: 'from-rose-600 to-pink-600',
        subcategories: [
            { id: 'romantic', name: 'Romantic', emoji: '💕', searchTerm: 'romantic love couple kiss' },
            { id: 'crush', name: 'Crush', emoji: '😍', searchTerm: 'crush heart eyes love struck' },
            { id: 'flirty', name: 'Flirty', emoji: '😘', searchTerm: 'flirty wink kiss blowing' },
            { id: 'heartbreak', name: 'Heartbreak', emoji: '💔', searchTerm: 'heartbreak sad breakup crying' },
            { id: 'wedding', name: 'Wedding', emoji: '💒', searchTerm: 'wedding marriage bride groom' },
            { id: 'friendship', name: 'Friendship', emoji: '🤝', searchTerm: 'friendship bff best friends' },
        ]
    },
    {
        id: 'happy',
        name: 'Happy',
        emoji: '😊',
        searchTerm: 'happy joy excited',
        gradient: 'from-yellow-500 to-amber-500',
        hoverGradient: 'from-yellow-600 to-amber-600',
        subcategories: [
            { id: 'celebrate', name: 'Celebrate', emoji: '🎉', searchTerm: 'celebrate party confetti woohoo' },
            { id: 'dance', name: 'Dance', emoji: '💃', searchTerm: 'dance dancing happy moves' },
            { id: 'excited', name: 'Excited', emoji: '🤩', searchTerm: 'excited yay pumped stoked' },
            { id: 'grateful', name: 'Grateful', emoji: '🙏', searchTerm: 'grateful thankful blessed appreciate' },
            { id: 'success', name: 'Success', emoji: '🏅', searchTerm: 'success win victory champion' },
            { id: 'chill', name: 'Chill', emoji: '😎', searchTerm: 'chill relaxed cool vibes' },
        ]
    },
    {
        id: 'sad',
        name: 'Sad',
        emoji: '😢',
        searchTerm: 'sad cry tears',
        gradient: 'from-blue-500 to-indigo-500',
        hoverGradient: 'from-blue-600 to-indigo-600',
        subcategories: [
            { id: 'crying', name: 'Crying', emoji: '😭', searchTerm: 'crying tears sobbing weeping' },
            { id: 'lonely', name: 'Lonely', emoji: '🥺', searchTerm: 'lonely alone missing sad' },
            { id: 'disappointed', name: 'Disappointed', emoji: '😞', searchTerm: 'disappointed letdown failed' },
            { id: 'frustrated', name: 'Frustrated', emoji: '😤', searchTerm: 'frustrated angry upset mad' },
            { id: 'tired', name: 'Tired', emoji: '😴', searchTerm: 'tired sleepy exhausted done' },
            { id: 'bored', name: 'Bored', emoji: '😑', searchTerm: 'bored boring meh whatever' },
        ]
    },
    {
        id: 'funny',
        name: 'Funny',
        emoji: '🤣',
        searchTerm: 'funny hilarious lol',
        gradient: 'from-green-500 to-emerald-500',
        hoverGradient: 'from-green-600 to-emerald-600',
        subcategories: [
            { id: 'fails', name: 'Fails', emoji: '🤕', searchTerm: 'fail epic fails fall oops' },
            { id: 'pranks', name: 'Pranks', emoji: '🃏', searchTerm: 'prank joke trick gotcha' },
            { id: 'comedy', name: 'Comedy', emoji: '🎭', searchTerm: 'comedy standup funny comedian' },
            { id: 'sarcasm', name: 'Sarcasm', emoji: '😏', searchTerm: 'sarcasm sarcastic irony oh really' },
            { id: 'awkward', name: 'Awkward', emoji: '😅', searchTerm: 'awkward cringe uncomfortable oops' },
            { id: 'wtf', name: 'WTF', emoji: '🤯', searchTerm: 'wtf what confused mind blown' },
        ]
    },
    {
        id: 'sports',
        name: 'Sports',
        emoji: '⚽',
        searchTerm: 'sports win goal',
        gradient: 'from-sky-500 to-blue-500',
        hoverGradient: 'from-sky-600 to-blue-600',
        subcategories: [
            { id: 'football', name: 'Football', emoji: '🏈', searchTerm: 'football nfl touchdown' },
            { id: 'soccer', name: 'Soccer', emoji: '⚽', searchTerm: 'soccer goal football worldcup' },
            { id: 'basketball', name: 'Basketball', emoji: '🏀', searchTerm: 'basketball nba dunk slam' },
            { id: 'baseball', name: 'Baseball', emoji: '⚾', searchTerm: 'baseball mlb homerun' },
            { id: 'combat', name: 'Combat', emoji: '🥊', searchTerm: 'boxing mma ufc wrestling' },
            { id: 'extreme', name: 'Extreme', emoji: '🏄', searchTerm: 'extreme sports skateboard surf ski' },
        ]
    },
    {
        id: 'gaming',
        name: 'Gaming',
        emoji: '🎮',
        searchTerm: 'gaming video game',
        gradient: 'from-purple-500 to-violet-500',
        hoverGradient: 'from-purple-600 to-violet-600',
        subcategories: [
            { id: 'retro', name: 'Retro', emoji: '👾', searchTerm: 'retro gaming 8bit pixel classic' },
            { id: 'esports', name: 'Esports', emoji: '🏆', searchTerm: 'esports tournament pro gaming' },
            { id: 'console', name: 'Console', emoji: '🎮', searchTerm: 'playstation xbox nintendo switch' },
            { id: 'pc', name: 'PC Gaming', emoji: '🖥️', searchTerm: 'pc gaming steam keyboard mouse' },
            { id: 'mobile', name: 'Mobile', emoji: '📱', searchTerm: 'mobile gaming phone tablet' },
            { id: 'streamers', name: 'Streamers', emoji: '📺', searchTerm: 'streamer twitch youtube gaming' },
        ]
    },
    {
        id: 'music',
        name: 'Music',
        emoji: '🎵',
        searchTerm: 'music dance party',
        gradient: 'from-fuchsia-500 to-pink-500',
        hoverGradient: 'from-fuchsia-600 to-pink-600',
        subcategories: [
            { id: 'dancing', name: 'Dancing', emoji: '💃', searchTerm: 'dance dancing moves groove' },
            { id: 'concerts', name: 'Concerts', emoji: '🎤', searchTerm: 'concert live music performance' },
            { id: 'hiphop', name: 'Hip Hop', emoji: '🎧', searchTerm: 'hip hop rap beats dj' },
            { id: 'rock', name: 'Rock', emoji: '🤘', searchTerm: 'rock metal guitar headbang' },
            { id: 'pop', name: 'Pop', emoji: '⭐', searchTerm: 'pop music kpop singer' },
            { id: 'instruments', name: 'Instruments', emoji: '🎸', searchTerm: 'guitar piano drums playing' },
        ]
    },
    {
        id: 'food',
        name: 'Food',
        emoji: '🍕',
        searchTerm: 'food delicious yummy',
        gradient: 'from-orange-500 to-red-500',
        hoverGradient: 'from-orange-600 to-red-600',
        subcategories: [
            { id: 'fastfood', name: 'Fast Food', emoji: '🍔', searchTerm: 'burger pizza fries fastfood' },
            { id: 'desserts', name: 'Desserts', emoji: '🍰', searchTerm: 'dessert cake ice cream sweet' },
            { id: 'coffee', name: 'Coffee', emoji: '☕', searchTerm: 'coffee tea latte morning' },
            { id: 'cooking', name: 'Cooking', emoji: '👨‍🍳', searchTerm: 'cooking chef kitchen recipe' },
            { id: 'drinks', name: 'Drinks', emoji: '🍹', searchTerm: 'drinks cocktail cheers beer wine' },
            { id: 'asian', name: 'Asian Food', emoji: '🍜', searchTerm: 'sushi ramen noodles asian food' },
        ]
    },
    {
        id: 'movies',
        name: 'Movies',
        emoji: '🎬',
        searchTerm: 'movie film cinema',
        gradient: 'from-slate-500 to-gray-600',
        hoverGradient: 'from-slate-600 to-gray-700',
        subcategories: [
            { id: 'action', name: 'Action', emoji: '💥', searchTerm: 'action movie explosion hero' },
            { id: 'horror', name: 'Horror', emoji: '👻', searchTerm: 'horror scary spooky ghost' },
            { id: 'romance', name: 'Romance', emoji: '💋', searchTerm: 'romance movie love drama' },
            { id: 'scifi', name: 'Sci-Fi', emoji: '🚀', searchTerm: 'scifi space alien futuristic' },
            { id: 'disney', name: 'Disney', emoji: '🏰', searchTerm: 'disney princess pixar animated' },
            { id: 'tvshows', name: 'TV Shows', emoji: '📺', searchTerm: 'tv show series netflix sitcom' },
        ]
    },
    {
        id: 'anime',
        name: 'Anime',
        emoji: '🌸',
        searchTerm: 'anime manga',
        gradient: 'from-pink-400 to-purple-500',
        hoverGradient: 'from-pink-500 to-purple-600',
        subcategories: [
            { id: 'shonen', name: 'Shonen', emoji: '⚔️', searchTerm: 'shonen naruto one piece dragonball' },
            { id: 'kawaii', name: 'Kawaii', emoji: '🥰', searchTerm: 'kawaii cute anime adorable' },
            { id: 'mecha', name: 'Mecha', emoji: '🤖', searchTerm: 'mecha gundam robot anime' },
            { id: 'slice', name: 'Slice of Life', emoji: '🍵', searchTerm: 'slice of life anime peaceful' },
            { id: 'romance2', name: 'Romance', emoji: '💖', searchTerm: 'anime romance love shoujo' },
            { id: 'fantasy', name: 'Fantasy', emoji: '🧙', searchTerm: 'anime fantasy magic isekai' },
        ]
    },
    {
        id: 'celebs',
        name: 'Celebs',
        emoji: '⭐',
        searchTerm: 'celebrity famous',
        gradient: 'from-yellow-400 to-orange-500',
        hoverGradient: 'from-yellow-500 to-orange-600',
        subcategories: [
            { id: 'actors', name: 'Actors', emoji: '🎭', searchTerm: 'actor actress movie star hollywood' },
            { id: 'musicians', name: 'Musicians', emoji: '🎤', searchTerm: 'singer musician pop star artist' },
            { id: 'athletes', name: 'Athletes', emoji: '🏅', searchTerm: 'athlete sports star champion' },
            { id: 'influencers', name: 'Influencers', emoji: '📱', searchTerm: 'influencer tiktok youtube star' },
            { id: 'royalty', name: 'Royalty', emoji: '👑', searchTerm: 'royal queen king prince princess' },
            { id: 'moments', name: 'Iconic Moments', emoji: '📸', searchTerm: 'iconic moment celebrity red carpet' },
        ]
    },
    {
        id: 'nature',
        name: 'Nature',
        emoji: '🌿',
        searchTerm: 'nature beautiful scenery',
        gradient: 'from-green-500 to-teal-500',
        hoverGradient: 'from-green-600 to-teal-600',
        subcategories: [
            { id: 'weather', name: 'Weather', emoji: '⛈️', searchTerm: 'weather rain storm lightning snow' },
            { id: 'sunset', name: 'Sunset', emoji: '🌅', searchTerm: 'sunset sunrise sky beautiful' },
            { id: 'flowers', name: 'Flowers', emoji: '🌺', searchTerm: 'flowers bloom garden spring' },
            { id: 'mountains', name: 'Mountains', emoji: '🏔️', searchTerm: 'mountain hiking nature landscape' },
            { id: 'ocean2', name: 'Ocean', emoji: '🌊', searchTerm: 'ocean waves beach sea water' },
            { id: 'space', name: 'Space', emoji: '🌌', searchTerm: 'space galaxy stars universe cosmos' },
        ]
    },
    {
        id: 'work',
        name: 'Work',
        emoji: '💼',
        searchTerm: 'work office monday',
        gradient: 'from-slate-400 to-slate-600',
        hoverGradient: 'from-slate-500 to-slate-700',
        subcategories: [
            { id: 'monday', name: 'Monday Mood', emoji: '😩', searchTerm: 'monday morning work tired' },
            { id: 'meeting', name: 'Meetings', emoji: '👔', searchTerm: 'meeting zoom call office' },
            { id: 'deadline', name: 'Deadlines', emoji: '⏰', searchTerm: 'deadline stress rush hurry' },
            { id: 'friday', name: 'Friday', emoji: '🎊', searchTerm: 'friday weekend finally free' },
            { id: 'coffee2', name: 'Coffee Break', emoji: '☕', searchTerm: 'coffee break work caffeine' },
            { id: 'wfh', name: 'WFH', emoji: '🏠', searchTerm: 'work from home remote wfh' },
        ]
    },
    {
        id: 'events',
        name: 'Events',
        emoji: '🎉',
        searchTerm: 'celebration party event',
        gradient: 'from-violet-500 to-purple-600',
        hoverGradient: 'from-violet-600 to-purple-700',
        subcategories: [
            { id: 'birthday', name: 'Birthday', emoji: '🎂', searchTerm: 'happy birthday cake party celebrate' },
            { id: 'christmas', name: 'Christmas', emoji: '🎄', searchTerm: 'christmas santa holiday xmas merry' },
            { id: 'halloween', name: 'Halloween', emoji: '🎃', searchTerm: 'halloween spooky scary costume trick treat' },
            { id: 'newyear', name: 'New Year', emoji: '🥂', searchTerm: 'new year celebrate countdown cheers' },
            { id: 'valentines', name: 'Valentine\'s', emoji: '💝', searchTerm: 'valentines day love heart romance cupid' },
            { id: 'thanksgiving', name: 'Thanksgiving', emoji: '🦃', searchTerm: 'thanksgiving turkey grateful thankful feast' },
            { id: 'easter', name: 'Easter', emoji: '🐰', searchTerm: 'easter bunny eggs spring holiday' },
            { id: 'stpatricks', name: 'St. Patrick\'s', emoji: '☘️', searchTerm: 'st patricks day irish lucky green' },
            { id: 'july4th', name: '4th of July', emoji: '🇺🇸', searchTerm: 'fourth of july fireworks independence america' },
            { id: 'mothersday', name: 'Mother\'s Day', emoji: '👩‍👧', searchTerm: 'mothers day mom love mother' },
            { id: 'fathersday', name: 'Father\'s Day', emoji: '👨‍👧', searchTerm: 'fathers day dad father love' },
            { id: 'graduation', name: 'Graduation', emoji: '🎓', searchTerm: 'graduation graduate congrats diploma' },
        ]
    },
];

export default function HomePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [gifs, setGifs] = useState<LibraryGIF[]>([]);
    const [dynamicCategories, setDynamicCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [activeCategory, setActiveCategory] = useState<Category>(DEFAULT_CATEGORIES[0]);
    const [showMemeEditor, setShowMemeEditor] = useState(false);
    const [gifOfTheDay, setGifOfTheDay] = useState<LibraryGIF | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [trendingPeriod, setTrendingPeriod] = useState<TrendingPeriod>('today');
    const [isFavorite, setIsFavorite] = useState(false);
    const [togglingFavorite, setTogglingFavorite] = useState(false);
    const [ratingFilter, setRatingFilter] = useState<ContentRating>('all');
    const [selectedGif, setSelectedGif] = useState<LibraryGIF | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<KlipyItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [offset, setOffset] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<SubCategory | null>(null);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'download' | 'copy' | 'share' | 'favorite'; gif: LibraryGIF } | null>(null);
    const [isAiRecommending, setIsAiRecommending] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState<{ type: 'trending' | 'remix'; title: string; description: string; sourceQuery: string; remixAction?: string } | null>(null);
    const [showRemixEditor, setShowRemixEditor] = useState(false);
    const [remixGif, setRemixGif] = useState<LibraryGIF | null>(null);

    // RESTORED: Refs and AI suggestion states
    const categoriesRef = useRef<HTMLDivElement>(null);
    const subcategoriesRef = useRef<HTMLDivElement>(null);
    const [aiSuggestedSubs, setAiSuggestedSubs] = useState<string[]>([]);
    const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);

    // Store current query to use for loadMore
    const currentQueryRef = useRef<string>('');

    // Day of the week logic for fallback
    const getDayTerm = () => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[new Date().getDay()];
    };

    // Auth listener
    useEffect(() => {
        const unsubscribe = initAuthListener(async (authUser) => {
            setUser(authUser);

            // Load user profile if authenticated
            if (authUser) {
                try {
                    const profile = await ensureUserProfile(
                        authUser.uid,
                        authUser.email || '',
                        authUser.displayName || '',
                        authUser.photoURL || ''
                    );
                    setUserProfile(profile);
                } catch (error) {
                    console.error('Failed to load user profile:', error);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // Listen to global app settings (for landing category override)
    useEffect(() => {
        const unsubscribe = subscribeToSettings((settings) => {
            if (settings.landingCategoryOverride) {
                console.log("Applying Landing Category override:", settings.landingCategoryOverride);
                setDynamicCategories(prev => {
                    const newCats = [...prev];
                    if (newCats.length > 0) {
                        newCats[0] = {
                            ...newCats[0],
                            searchTerm: settings.landingCategoryOverride || getDayTerm()
                        };
                    }
                    return newCats;
                });
            } else {
                // Return to default day-of-week logic
                setDynamicCategories(prev => {
                    const newCats = [...prev];
                    if (newCats.length > 0) {
                        newCats[0] = {
                            ...newCats[0],
                            searchTerm: getDayTerm()
                        };
                    }
                    return newCats;
                });
            }
        });
        return () => unsubscribe();
    }, []);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Call Klipy API when debounced search changes
    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearch.trim()) {
                setSearchResults([]);
                setAiRecommendation(null);
                loadGifOfTheDay(); // Revert to standard trending
                return;
            }

            // Track search for analytics
            trackSearch(debouncedSearch);

            // Clear category when searching
            setSelectedCategory(null);
            setIsSearching(true);
            setIsAiRecommending(true);

            try {
                // Parallel fetch: Search results + AI recommendation
                const [results, recommendation] = await Promise.all([
                    searchKlipy(debouncedSearch, { limit: 30 }),
                    import('../services/geminiService').then(m => m.getSaucyRecommendation(debouncedSearch))
                ]);

                // Deduplicate search results by ID
                const uniqueResults = results.filter((item, index, self) =>
                    index === self.findIndex((t) => t.id === item.id)
                );

                setSearchResults(uniqueResults);
                setAiRecommendation(recommendation);

                // Fetch a special GIF for the recommendation
                const aiGifs = await searchKlipy(recommendation.sourceQuery, { limit: 1 });
                if (aiGifs.length > 0) {
                    const featured = aiGifs[0];
                    setGifOfTheDay({
                        id: featured.id,
                        url: featured.url,
                        thumbnailUrl: featured.preview_url,
                        title: recommendation.title,
                        description: recommendation.description,
                        tags: featured.tags || [],
                        downloads: Math.floor(Math.random() * 5000),
                        status: 'published',
                        createdAt: new Date(),
                    });
                }

                console.log(`Search & AI recommendation ready for "${debouncedSearch}"`);
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
                setIsAiRecommending(false);
            }
        };

        performSearch();
    }, [debouncedSearch]);

    // Load GIFs based on trending period
    useEffect(() => {
        // Reset pagination when period changes
        setOffset(0);
        setHasMore(true);
        // Only load if no category is selected
        if (!selectedCategory) {
            loadGifs(true);
        }
    }, [trendingPeriod, ratingFilter]);

    // Handle category selection
    useEffect(() => {
        if (selectedCategory) {
            setSearchTerm('');
            setDebouncedSearch('');
            setOffset(0);
            setHasMore(true);
            loadCategoryGifs(selectedCategory);
        }
    }, [selectedCategory]);

    // Load GIF of the Day on mount
    useEffect(() => {
        loadGifOfTheDay();
    }, []);

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && !debouncedSearch) {
                    loadMoreGifs();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, debouncedSearch, offset, selectedCategory]);

    // Favorites check
    useEffect(() => {
        if (selectedGif && user) {
            checkFavoriteStatus();
        }
    }, [selectedGif, user]);

    const checkFavoriteStatus = async () => {
        if (!selectedGif || !user) return;
        const status = await isFavorited(user.uid, selectedGif.id);
        setIsFavorite(status);
    };

    const handleToggleFavorite = async () => {
        if (!selectedGif) return;

        if (!user) {
            setPendingAction({ type: 'favorite', gif: selectedGif });
            setShowAuthPrompt(true);
            return;
        }

        setTogglingFavorite(true);
        try {
            const status = await toggleFavorite(user.uid, selectedGif);
            setIsFavorite(status);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setTogglingFavorite(false);
        }
    };

    // Scroll category bar
    const scrollCategories = (direction: 'left' | 'right') => {
        if (categoriesRef.current) {
            const scrollAmount = 300;
            categoriesRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Scroll subcategory bar
    const scrollSubcategories = (direction: 'left' | 'right') => {
        if (subcategoriesRef.current) {
            const scrollAmount = 200;
            subcategoriesRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // AI-powered subcategory suggestion logic
    const getAiSuggestedSubcategories = async (category: Category): Promise<string[]> => {
        // Smart suggestion algorithm based on:
        // 1. Upcoming holidays and major events
        // 2. Time of day (morning = coffee/work, evening = entertainment)
        // 3. Day of week (Monday = work mood, Friday = celebration)
        // 4. Seasonal relevance

        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const month = now.getMonth(); // 0-indexed
        const date = now.getDate();
        const subs = category.subcategories;

        const suggested: string[] = [];

        // Helper to check if a date is within range (for holidays)
        const isNearDate = (targetMonth: number, targetDate: number, daysBeforeEvent = 7, daysAfterEvent = 2) => {
            const targetYear = month > targetMonth || (month === targetMonth && date > targetDate + daysAfterEvent)
                ? now.getFullYear() + 1
                : now.getFullYear();
            const target = new Date(targetYear, targetMonth, targetDate);
            const diff = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return diff >= -daysAfterEvent && diff <= daysBeforeEvent;
        };

        // Holiday-based suggestions for Events category
        if (category.id === 'events') {
            // Check for upcoming holidays
            if (isNearDate(11, 25, 14, 2)) suggested.push('christmas'); // Dec 25
            if (isNearDate(9, 31, 14, 2)) suggested.push('halloween'); // Oct 31
            if (isNearDate(0, 1, 7, 2)) suggested.push('newyear'); // Jan 1
            if (isNearDate(1, 14, 7, 2)) suggested.push('valentines'); // Feb 14
            if (isNearDate(10, 28, 7, 2)) suggested.push('thanksgiving'); // ~Nov 28 (approximate)
            if (isNearDate(2, 17, 7, 2)) suggested.push('stpatricks'); // Mar 17
            if (isNearDate(6, 4, 7, 2)) suggested.push('july4th'); // Jul 4

            // Birthday is ALWAYS popular - suggest it if nothing else matches
            if (suggested.length === 0) {
                suggested.push('birthday');
            }

            // Graduation season (May-June)
            if (month === 4 || month === 5) suggested.push('graduation');

            // Mother's Day (May) / Father's Day (June)
            if (month === 4 && date >= 1 && date <= 14) suggested.push('mothersday');
            if (month === 5 && date >= 1 && date <= 21) suggested.push('fathersday');
        }

        // Cross-category holiday boosts
        if (category.id === 'love') {
            if (isNearDate(1, 14, 7, 2)) { // Valentine's
                suggested.push('romantic', 'flirty', 'crush');
            }
        }

        if (category.id === 'movies' || category.id === 'funny') {
            if (isNearDate(9, 31, 14, 2)) { // Halloween season
                suggested.push('horror');
            }
        }

        if (category.id === 'happy') {
            if (isNearDate(11, 25, 7, 2) || isNearDate(0, 1, 3, 2)) { // Christmas/NY
                suggested.push('celebrate');
            }
        }

        // Time-based suggestions (if holiday didn't fill suggestions)
        if (suggested.length < 2) {
            if (hour >= 6 && hour < 12) {
                // Morning - pick first subcategories (usually more common/general)
                suggested.push(subs[0]?.id);
                if (subs.length > 2) suggested.push(subs[2]?.id);
            } else if (hour >= 12 && hour < 18) {
                // Afternoon - middle subcategories
                const mid = Math.floor(subs.length / 2);
                suggested.push(subs[mid]?.id);
                if (subs.length > mid + 1) suggested.push(subs[mid + 1]?.id);
            } else {
                // Evening/Night - last subcategories (often more niche/entertainment)
                suggested.push(subs[subs.length - 1]?.id);
                if (subs.length > 1) suggested.push(subs[subs.length - 2]?.id);
            }
        }

        // Day-based boost
        if (day === 1 && category.id === 'work') { // Monday
            suggested.unshift('monday');
        } else if (day === 5 && category.id === 'work') { // Friday
            suggested.unshift('friday');
        }

        // Weekend party vibes
        if ((day === 5 || day === 6) && (category.id === 'happy' || category.id === 'music')) {
            suggested.unshift('celebrate', 'dancing');
        }

        // Always include one random for variety if we haven't reached 3
        if (suggested.length < 3) {
            const randomIdx = Math.floor(Math.random() * subs.length);
            if (!suggested.includes(subs[randomIdx]?.id)) {
                suggested.push(subs[randomIdx]?.id);
            }
        }

        // Filter to only include IDs that actually exist in this category
        const validIds = subs.map(s => s.id);
        const filtered = suggested.filter(id => validIds.includes(id));

        // Return unique top 3
        return [...new Set(filtered)].slice(0, 3);
    };

    // Handle category click
    const handleCategoryClick = async (category: Category) => {
        if (selectedCategory?.id === category.id) {
            // Deselect if clicking same category
            setSelectedCategory(null);
            setSelectedSubcategory(null);
            setAiSuggestedSubs([]);
            loadGifs(true);
        } else {
            setSelectedCategory(category);
            setSelectedSubcategory(null);

            // Get AI suggestions for subcategories
            setLoadingAiSuggestions(true);
            try {
                const suggestions = await getAiSuggestedSubcategories(category);
                setAiSuggestedSubs(suggestions);
            } catch (error) {
                console.error('Failed to get AI suggestions:', error);
                // Fall back to first 2 subcategories
                setAiSuggestedSubs(category.subcategories.slice(0, 2).map(s => s.id));
            } finally {
                setLoadingAiSuggestions(false);
            }
        }
    };

    // Handle subcategory click
    const handleSubcategoryClick = (subcategory: SubCategory) => {
        if (selectedSubcategory?.id === subcategory.id) {
            // Deselect subcategory, go back to main category
            setSelectedSubcategory(null);
            if (selectedCategory) {
                loadCategoryGifs(selectedCategory);
            }
        } else {
            setSelectedSubcategory(subcategory);
            loadSubcategoryGifs(subcategory);
        }
    };

    // Load GIFs for a specific subcategory
    const loadSubcategoryGifs = async (subcategory: SubCategory) => {
        setLoading(true);
        try {
            console.log(`Loading GIFs for subcategory: ${subcategory.name} (${subcategory.searchTerm})`);
            const klipyItems = await searchKlipy(subcategory.searchTerm, { limit: 48, offset: 0 });

            const items: LibraryGIF[] = klipyItems.map(item => ({
                id: item.id,
                url: item.url,
                thumbnailUrl: item.preview_url,
                title: item.title || '',
                tags: item.tags || [],
                downloads: Math.floor(Math.random() * 5000),
                status: 'published' as const,
                createdAt: new Date(),
            }));

            setGifs(items);
            setOffset(48);
            setHasMore(klipyItems.length >= 48);
            currentQueryRef.current = subcategory.searchTerm;
        } catch (error) {
            console.error('Failed to load subcategory GIFs:', error);
            setGifs([]);
        } finally {
            setLoading(false);
        }
    };

    // Load GIFs for a specific category
    const loadCategoryGifs = async (category: Category) => {
        setLoading(true);
        try {
            console.log(`Loading GIFs for category: ${category.name} (${category.searchTerm})`);
            const klipyItems = await searchKlipy(category.searchTerm, { limit: 48, offset: 0 });

            const items: LibraryGIF[] = klipyItems.map(item => ({
                id: item.id,
                url: item.url,
                thumbnailUrl: item.preview_url,
                title: item.title || '',
                tags: item.tags || [],
                downloads: Math.floor(Math.random() * 5000),
                status: 'published' as const,
                createdAt: new Date(),
            }));

            setGifs(items);
            setOffset(48);
            setHasMore(klipyItems.length >= 48);
            currentQueryRef.current = category.searchTerm;
        } catch (error) {
            console.error('Failed to load category GIFs:', error);
            setGifs([]);
        } finally {
            setLoading(false);
        }
    };

    const loadGifs = async (reset = false) => {
        setLoading(true);
        try {
            // Use the actual Klipy trending API endpoint which returns GIFs 
            // based on real popularity/download metrics, not text search
            console.log(`Loading trending GIFs for period: ${trendingPeriod}`);
            currentQueryRef.current = ''; // Clear query ref since we're using trending endpoint

            // getTrendingKlipy uses the /gifs/trending endpoint which returns
            // actually popular GIFs based on views/downloads, not text matching
            const klipyItems = await getTrendingKlipy({ limit: 48 });

            // Convert Klipy items to LibraryGIF format
            const items: LibraryGIF[] = klipyItems.map(item => ({
                id: item.id,
                url: item.url,
                thumbnailUrl: item.preview_url,
                title: item.title || '',
                tags: item.tags || [],
                downloads: Math.floor(Math.random() * 5000),
                status: 'published' as const,
                createdAt: new Date(),
            }));

            setGifs(items);
            setOffset(48);
            setHasMore(klipyItems.length >= 48);
        } catch (error) {
            console.error('Failed to load trending GIFs:', error);
            setGifs([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreGifs = async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            // For trending, fetch a larger batch since the API 
            // returns actually popular GIFs based on real metrics
            console.log(`Loading more trending GIFs`);

            // Klipy's trending endpoint doesn't support offset well,
            // so we'll fetch more and dedupe with existing GIFs
            const klipyItems = await getTrendingKlipy({ limit: 96 });

            if (klipyItems.length === 0) {
                setHasMore(false);
                return;
            }

            // Convert and append to existing GIFs
            const newItems: LibraryGIF[] = klipyItems.map(item => ({
                id: item.id,
                url: item.url,
                thumbnailUrl: item.preview_url,
                title: item.title || '',
                tags: item.tags || [],
                downloads: Math.floor(Math.random() * 5000),
                status: 'published' as const,
                createdAt: new Date(),
            }));

            setGifs(prev => {
                const combined = [...prev, ...newItems];
                // Deduplicate by ID
                return combined.filter((item, index, self) =>
                    index === self.findIndex((t) => t.id === item.id)
                );
            });
            // After this load, we've likely fetched all trending - disable further loading
            setHasMore(false);
        } catch (error) {
            console.error('Failed to load more trending GIFs:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const loadGifOfTheDay = async () => {
        try {
            // Get a featured/trending GIF from Klipy for GIF of the Day
            const trendingItems = await getTrendingKlipy({ limit: 10 });

            if (trendingItems.length > 0) {
                // Pick a random one from the top trending
                const featured = trendingItems[Math.floor(Math.random() * Math.min(5, trendingItems.length))];

                const gotd: LibraryGIF = {
                    id: featured.id,
                    url: featured.url,
                    thumbnailUrl: featured.preview_url,
                    title: featured.title || 'Trending Now',
                    description: 'The hottest GIF of the day',
                    tags: featured.tags || [],
                    downloads: Math.floor(Math.random() * 10000) + 5000,
                    status: 'published' as const,
                    createdAt: new Date(),
                };

                setGifOfTheDay(gotd);
            }
        } catch (error) {
            console.error('Failed to load GIF of the Day:', error);
        }
    };

    // Check if user is authenticated before performing action
    const requireAuth = (actionType: 'download' | 'copy' | 'share' | 'favorite', gif: LibraryGIF, e?: React.MouseEvent): boolean => {
        e?.stopPropagation();
        if (!user) {
            setPendingAction({ type: actionType, gif });
            setShowAuthPrompt(true);
            return false;
        }
        return true;
    };

    const handleDownload = async (gif: LibraryGIF, e?: React.MouseEvent) => {
        if (!requireAuth('download', gif, e)) return;
        setDownloading(gif.id);
        try {
            // Track download for analytics
            trackDownload({
                gifId: gif.id,
                gifTitle: gif.title || 'Untitled',
                source: 'website',
                user: user
            });

            // Trigger download
            const response = await fetch(gif.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `saucy-${gif.title?.replace(/\s+/g, '-') || gif.id}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloading(null);
        }
    };

    // Generate a shareable Saucy URL for a GIF
    const getSaucyShareUrl = (gif: LibraryGIF): string => {
        // Create a Saucy-branded share URL
        const baseUrl = window.location.origin;
        return `${baseUrl}/gif/${encodeURIComponent(gif.id)}`;
    };

    const handleCopy = async (gif: LibraryGIF, e?: React.MouseEvent) => {
        if (!requireAuth('copy', gif, e)) return;
        try {
            // Copy the Saucy share URL, not the raw API URL
            const shareUrl = getSaucyShareUrl(gif);
            await navigator.clipboard.writeText(shareUrl);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    };

    const handleShare = async (gif: LibraryGIF, e?: React.MouseEvent) => {
        if (!requireAuth('share', gif, e)) return;
        const shareUrl = getSaucyShareUrl(gif);
        e?.stopPropagation();

        // Use Web Share API if available
        if (navigator.share) {
            await navigator.share({
                title: gif.title || 'Check out this GIF on Saucy! 🔥',
                text: `${gif.title || 'Awesome GIF'} - Found on Saucy, the Spotify of GIFs`,
                url: shareUrl
            });
        } else {
            await handleCopy(gif, e);
        }
    };

    const formatDownloads = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
        return count.toString();
    };

    const getRatingBadge = (rating?: string) => {
        const badges: Record<string, { color: string; label: string }> = {
            'pg': { color: 'bg-green-500', label: 'PG' },
            'pg13': { color: 'bg-yellow-500', label: 'PG-13' },
            'r': { color: 'bg-orange-500', label: 'R' },
            'unhinged': { color: 'bg-red-600', label: '🔥' }
        };
        return badges[rating || 'pg'] || badges['pg'];
    };

    // Convert Klipy items to display format
    const searchResultsAsGifs: LibraryGIF[] = useMemo(() =>
        searchResults.map(item => ({
            id: item.id,
            url: item.url,
            thumbnailUrl: item.preview_url,
            title: item.title || '',
            tags: item.tags || [],
            downloads: 0,
            status: 'published' as const,
            createdAt: new Date(),
        })),
        [searchResults]
    );

    // Use search results if searching, otherwise filter local GIFs
    const displayGifs = debouncedSearch.trim()
        ? searchResultsAsGifs
        : gifs;

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/5">
                {/* Mobile: stacked layout, Desktop: horizontal */}
                <div className="w-full px-4 sm:px-6 py-2">
                    {/* Top row: Logo + Auth */}
                    <div className="flex items-center justify-between gap-3">
                        {/* Logo - Responsive sizing */}
                        <a href="/" className="flex items-center shrink-0">
                            <img
                                src="/logos/saucy_bottle_flame.png"
                                alt="Saucy"
                                className="h-12 sm:h-16 md:h-20 w-auto object-contain transition-all hover:scale-110 duration-300"
                            />
                        </a>

                        {/* Search - Hidden on mobile top row, shown in own row below */}
                        <div className="hidden sm:flex flex-1 max-w-xl mx-auto">
                            <div className="relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search GIFs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Auth - Far Right */}
                        {user ? (
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                {/* Sauce Lab Button - Admin or Owner */}
                                {(userProfile?.role === 'admin' || userProfile?.role === 'owner') && (
                                    <Link
                                        to="/admin"
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-full font-semibold hover:bg-white/10 hover:border-red-500/50 transition-all text-sm group"
                                    >
                                        <FlaskConical className="w-4 h-4 text-red-500 group-hover:text-red-400 transition-all" />
                                        <span className="hidden md:inline">Sauce Lab</span>
                                    </Link>
                                )}

                                {/* Sauce Box (Favorites) */}
                                <Link
                                    to="/saucebox"
                                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 text-white rounded-full font-semibold hover:bg-white/10 hover:border-red-500/50 transition-all text-sm group"
                                >
                                    <Heart className="w-4 h-4 text-red-500 group-hover:fill-red-500 transition-all" />
                                    <span className="hidden sm:inline">Sauce Box</span>
                                </Link>

                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-medium">{user.displayName}</p>
                                    <p className={`text-xs font-semibold ${userProfile?.role === 'owner' ? 'text-amber-400' :
                                        userProfile?.role === 'admin' ? 'text-red-400' :
                                            'text-slate-400'
                                        }`}>
                                        {userProfile?.role === 'owner' ? '👑 Owner' :
                                            userProfile?.role === 'admin' ? '🔥 Admin' :
                                                '✨ Free tier'}
                                    </p>
                                </div>

                                {/* User Avatar with Dropdown */}
                                <div className="relative group">
                                    <button
                                        className="w-9 h-9 min-w-[44px] min-h-[44px] rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden ring-2 ring-transparent hover:ring-red-500/50"
                                    >
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4" />
                                        )}
                                    </button>

                                    {/* Dropdown Menu */}
                                    <div className="absolute right-0 top-full mt-2 py-2 px-1 bg-slate-900 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[180px] z-50">
                                        {/* Mobile: Show name in dropdown */}
                                        <div className="md:hidden px-3 py-2 border-b border-white/10 mb-1">
                                            <p className="text-sm font-medium text-white">{user.displayName}</p>
                                            <p className={`text-xs ${userProfile?.role === 'owner' ? 'text-amber-400' : userProfile?.role === 'admin' ? 'text-red-400' : 'text-slate-400'}`}>
                                                {userProfile?.role === 'owner' ? '👑 Owner' : userProfile?.role === 'admin' ? '🔥 Admin' : '✨ Free tier'}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => signOut()}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <LogIn className="w-4 h-4 rotate-180" />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => signInWithGoogle()}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white text-black rounded-full font-semibold hover:bg-slate-100 transition-colors text-sm shrink-0 min-h-[44px]"
                            >
                                <LogIn className="w-4 h-4" />
                                <span className="hidden sm:inline">Sign In</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile Search Row - Full width, own row on small screens */}
                    <div className="sm:hidden mt-2">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search GIFs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-full text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-base"
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Categories Section - Horizontal scroll on mobile, wrap on desktop */}
            <section className="relative py-3 sm:py-4 bg-black">
                <div className="w-full px-4 sm:px-6">
                    {/* Header - hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-2 mb-3 text-slate-400">
                        <span className="text-lg">🎯</span>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">Browse Categories</h2>
                    </div>

                    {/* Categories: horizontal scroll on mobile, wrap on larger screens */}
                    <div
                        ref={categoriesRef}
                        className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:gap-3"
                    >
                        {dynamicCategories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryClick(category)}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-200 transform hover:scale-105 active:scale-95 shrink-0 sm:shrink min-h-[44px] ${selectedCategory?.id === category.id
                                    ? 'bg-white text-black'
                                    : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <span>{category.emoji}</span>
                                <span>{category.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Time Period & Filters - Below Categories, Above GIF of the Day */}
            <section className="bg-black py-2 sm:py-4 border-b border-white/5">
                <div className="w-full px-4 sm:px-6">
                    <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            { id: 'today', label: 'Today', icon: Flame },
                            { id: 'week', label: 'This Week', icon: Calendar },
                            { id: 'month', label: 'This Month', icon: TrendingUp },
                            { id: 'allTime', label: 'All Time', icon: Crown }
                        ].map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => {
                                    setSelectedCategory(null);
                                    setSelectedSubcategory(null);
                                    setAiSuggestedSubs([]);
                                    setTrendingPeriod(id as TrendingPeriod);
                                }}
                                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium sm:font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 shrink-0 min-h-[44px] ${trendingPeriod === id && !selectedCategory
                                    ? 'bg-white/10 text-white border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    : 'bg-transparent text-slate-400 border border-white/10 hover:border-red-500/50 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline sm:inline">{label}</span>
                                <span className="xs:hidden">{id === 'today' ? '🔥' : id === 'week' ? '📅' : id === 'month' ? '📈' : '👑'}</span>
                            </button>
                        ))}

                        <div className="w-px h-6 sm:h-8 bg-white/10 mx-1 sm:mx-2 shrink-0" />

                        {/* Rating Filter */}
                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value as ContentRating)}
                            className="px-3 sm:px-4 py-2 sm:py-2.5 bg-transparent border border-white/10 rounded-lg sm:rounded-xl text-white font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-white/20 hover:border-red-500/50 transition-all duration-200 min-h-[44px] shrink-0"
                        >
                            <option value="all">All Ratings</option>
                            <option value="pg">🟢 PG</option>
                            <option value="pg13">🟡 PG-13</option>
                            <option value="r">🟠 R</option>
                            <option value="unhinged">🔴 Unhinged</option>
                        </select>

                        {/* Active Category Indicator */}
                        {selectedCategory && (
                            <div className="flex items-center gap-2 ml-4">
                                <span className="text-slate-400">Browsing:</span>
                                <span className={`px-3 py-1.5 rounded-full bg-white/10 border border-white/30 text-white font-semibold flex items-center gap-2`}>
                                    <span>{selectedCategory.emoji}</span>
                                    {selectedCategory.name}
                                    <button
                                        onClick={() => {
                                            setSelectedCategory(null);
                                            loadGifs(true);
                                        }}
                                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </section>


            {/* Subcategories Section - Shows when a category is selected */}
            {selectedCategory && (
                <section className="relative py-4 bg-black border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <span className="text-xl">{selectedCategory.emoji}</span>
                                <span>{selectedCategory.name}</span>
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                                <span className="text-slate-400 font-normal">Subcategories</span>
                                {loadingAiSuggestions && (
                                    <Loader2 className="w-4 h-4 animate-spin text-purple-400 ml-2" />
                                )}
                            </h3>
                        </div>

                        <div
                            ref={subcategoriesRef}
                            className="flex flex-wrap gap-2 pb-2"
                        >
                            {/* AI Suggested subcategories first */}
                            {selectedCategory.subcategories
                                .filter(sub => aiSuggestedSubs.includes(sub.id))
                                .map((subcategory) => (
                                    <button
                                        key={subcategory.id}
                                        onClick={() => handleSubcategoryClick(subcategory)}
                                        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 transform hover:scale-105 ${selectedSubcategory?.id === subcategory.id
                                            ? 'bg-white/10 text-white border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                            : 'bg-transparent text-white border border-red-500/30 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                            }`}
                                    >
                                        {/* Saucy AI Badge */}
                                        <span className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-red-600 to-orange-500 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-lg">
                                            <img src="/logos/final_icon_white.png" alt="" className="w-3 h-3" />
                                            <span className="italic">saucy</span>
                                        </span>
                                        <span className="text-lg">{subcategory.emoji}</span>
                                        <span className="text-sm">{subcategory.name}</span>
                                    </button>
                                ))}

                            {/* Divider if there are AI suggestions */}
                            {aiSuggestedSubs.length > 0 && (
                                <div className="w-px h-8 bg-white/10 mx-1 self-center" />
                            )}

                            {/* Regular subcategories */}
                            {selectedCategory.subcategories
                                .filter(sub => !aiSuggestedSubs.includes(sub.id))
                                .map((subcategory) => (
                                    <button
                                        key={subcategory.id}
                                        onClick={() => handleSubcategoryClick(subcategory)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 transform hover:scale-105 ${selectedSubcategory?.id === subcategory.id
                                            ? 'bg-white/10 text-white border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                            : 'bg-transparent text-slate-300 border border-white/10 hover:border-red-500/50 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                            }`}
                                    >
                                        <span className="text-lg">{subcategory.emoji}</span>
                                        <span className="text-sm">{subcategory.name}</span>
                                    </button>
                                ))}
                        </div>

                        {/* Active filter indicator */}
                        {selectedSubcategory && (
                            <div className="mt-3 flex items-center gap-2 text-sm">
                                <span className="text-slate-500">Showing:</span>
                                <span className={`px-3 py-1 rounded-full bg-white/10 border border-white/30 text-white font-medium flex items-center gap-2`}>
                                    <span>{selectedSubcategory.emoji}</span>
                                    {selectedSubcategory.name}
                                    <button
                                        onClick={() => {
                                            setSelectedSubcategory(null);
                                            loadCategoryGifs(selectedCategory);
                                        }}
                                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Sauce Showdown - Daily Voting Battle (hidden during search) */}
            {!debouncedSearch && (
                <section className="relative bg-black py-8">
                    <div className="w-full px-6">
                        <SauceShowdown user={userProfile || user} />
                    </div>
                </section>
            )}


            {/* GIF Grid */}
            <main className="w-full px-6 py-8">
                {/* Search indicator */}
                {debouncedSearch && isKlipyConfigured() && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
                        <Search className="w-4 h-4" />
                        <span>Searching for "{debouncedSearch}"</span>
                        {isSearching && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    </div>
                )}

                {loading || isSearching ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                    </div>
                ) : displayGifs.length === 0 ? (
                    <div className="text-center py-24">
                        <p className="text-slate-400 text-lg">
                            {debouncedSearch ? `No GIFs found for "${debouncedSearch}"` : 'No GIFs found'}
                        </p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-red-400 hover:text-red-300"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4">
                        {displayGifs.map((gif) => (
                            <div
                                key={gif.id}
                                onClick={() => setSelectedGif(gif)}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-white/5 cursor-pointer hover:scale-105 transition-transform duration-200"
                            >
                                <img
                                    src={gif.thumbnailUrl || gif.url}
                                    alt={gif.title || 'GIF'}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />

                                {/* Rating Badge */}
                                {gif.rating && gif.rating !== 'pg' && (
                                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white ${getRatingBadge(gif.rating).color}`}>
                                        {getRatingBadge(gif.rating).label}
                                    </div>
                                )}

                                {/* Download Count */}
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-white">
                                    <Download className="w-3 h-3" />
                                    {formatDownloads(gif.downloads || 0)}
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                                    <div className="flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <button
                                            onClick={(e) => handleDownload(gif, e)}
                                            className="p-3 bg-white/20 hover:bg-red-500/80 backdrop-blur-md rounded-full transition-all border border-white/20 hover:border-white/40 hover:scale-110"
                                            title="Download"
                                        >
                                            {downloading === gif.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Download className="w-5 h-5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => handleCopy(gif, e)}
                                            className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-all border border-white/20 hover:border-white/40 hover:scale-110"
                                            title="Copy Link"
                                        >
                                            <Copy className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => handleShare(gif, e)}
                                            className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full transition-all border border-white/20 hover:border-white/40 hover:scale-110"
                                            title="Share"
                                        >
                                            <Share2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Infinite Scroll Observer */}
                {!debouncedSearch && (
                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                        {loadingMore && (
                            <div className="flex items-center gap-3 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                                <span>Loading more GIFs...</span>
                            </div>
                        )}
                        {!hasMore && gifs.length > 0 && (
                            <p className="text-slate-500 text-sm">You've seen them all! 🎉</p>
                        )}
                    </div>
                )}
            </main>

            {/* GIF Detail Modal */}
            {selectedGif && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedGif(null)}
                >
                    <div
                        className="bg-black border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* GIF */}
                        <div className="relative aspect-video bg-black">
                            <img
                                src={selectedGif.url}
                                alt={selectedGif.title || 'GIF'}
                                className="w-full h-full object-contain"
                            />
                            <button
                                onClick={() => setSelectedGif(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-2">
                                {selectedGif.title || 'Untitled GIF'}
                            </h2>
                            {selectedGif.description && (
                                <p className="text-slate-400 mb-4">{selectedGif.description}</p>
                            )}

                            {/* Tags */}
                            {selectedGif.tags && selectedGif.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {selectedGif.tags.map((tag, i) => (
                                        <span key={i} className="px-3 py-1 bg-white/10 rounded-full text-sm text-slate-300">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-6 mb-6 text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Download className="w-4 h-4" />
                                    <span>{formatDownloads(selectedGif.downloads || 0)} downloads</span>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-bold text-white ${getRatingBadge(selectedGif.rating).color}`}>
                                    {getRatingBadge(selectedGif.rating).label}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={(e) => handleDownload(selectedGif, e)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl font-bold hover:from-red-500 hover:to-orange-500 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/20"
                                >
                                    {downloading === selectedGif.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Download className="w-5 h-5" />
                                    )}
                                    Download
                                </button>
                                <button
                                    onClick={() => setShowMemeEditor(true)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 hover:border-red-500/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <Type className="w-5 h-5 text-red-500" />
                                    Customize
                                </button>
                                <button
                                    onClick={handleToggleFavorite}
                                    disabled={togglingFavorite}
                                    className={`flex items-center justify-center p-3.5 border rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${isFavorite
                                        ? 'bg-red-500/10 border-red-500/50 text-red-500'
                                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-red-500/50'
                                        }`}
                                    title={isFavorite ? "Remove from Sauce Box" : "Add to Sauce Box"}
                                >
                                    {togglingFavorite ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500' : ''}`} />
                                    )}
                                </button>
                                <button
                                    onClick={(e) => handleShare(selectedGif, e)}
                                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-red-500/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    title="Share or Copy Link"
                                >
                                    <Share2 className="w-5 h-5" />
                                    <span className="text-sm font-medium">Share</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Auth Prompt Modal */}
            {showAuthPrompt && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
                    onClick={() => {
                        setShowAuthPrompt(false);
                        setPendingAction(null);
                    }}
                >
                    <div
                        className="bg-[#1a1a1f] border border-white/10 rounded-3xl max-w-md w-full p-8 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => {
                                setShowAuthPrompt(false);
                                setPendingAction(null);
                            }}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                            {pendingAction?.type === 'download' && <Download className="w-8 h-8 text-red-400" />}
                            {pendingAction?.type === 'copy' && <Copy className="w-8 h-8 text-red-400" />}
                            {pendingAction?.type === 'share' && <Share2 className="w-8 h-8 text-red-400" />}
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-white mb-2">
                            Sign in to {pendingAction?.type === 'download' ? 'Download' : pendingAction?.type === 'copy' ? 'Copy' : 'Share'}
                        </h3>
                        <p className="text-slate-400 mb-8">
                            Join Saucy to {pendingAction?.type} this GIF and unlock your full sauce potential 🔥
                        </p>

                        {/* Google Sign In Button */}
                        <button
                            onClick={async () => {
                                await signInWithGoogle();
                                setShowAuthPrompt(false);
                                // After sign in, retry the pending action
                                if (pendingAction) {
                                    const { type, gif } = pendingAction;
                                    setPendingAction(null);
                                    // The user state will update and they can try again
                                }
                            }}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-black rounded-2xl font-semibold text-lg hover:bg-slate-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg mb-4"
                        >
                            {/* Google Icon */}
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        {/* Cancel link */}
                        <button
                            onClick={() => {
                                setShowAuthPrompt(false);
                                setPendingAction(null);
                            }}
                            className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            )}

            {/* Meme Editor Modals */}
            {(showMemeEditor && selectedGif) && (
                <MemeEditor
                    gifUrl={selectedGif.url}
                    onClose={() => setShowMemeEditor(false)}
                />
            )}

            {(showRemixEditor && remixGif) && (
                <MemeEditor
                    gifUrl={remixGif.url}
                    onClose={() => {
                        setShowRemixEditor(false);
                        setRemixGif(null);
                    }}
                />
            )}
        </div>
    );
}
