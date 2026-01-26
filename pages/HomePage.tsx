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
import {
    Search,
    Download,
    Copy,
    Share2,
    Flame,
    Calendar,
    TrendingUp,
    Crown,
    Loader2,
    User,
    LogIn,
    X,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { signInWithGoogle, signOut, initAuthListener } from '../services/authService';
import { searchKlipy, getTrendingKlipy, isKlipyConfigured, KlipyItem } from '../services/klipyService';
import { trackDownload, trackSearch, trackPageView } from '../services/analyticsService';

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

const CATEGORIES: Category[] = [
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
    const [gifs, setGifs] = useState<LibraryGIF[]>([]);
    const [gifOfTheDay, setGifOfTheDay] = useState<LibraryGIF | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [trendingPeriod, setTrendingPeriod] = useState<TrendingPeriod>('today');
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
    const [aiSuggestedSubs, setAiSuggestedSubs] = useState<string[]>([]); // IDs of AI-suggested subcategories
    const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);
    const categoriesRef = useRef<HTMLDivElement>(null);
    const subcategoriesRef = useRef<HTMLDivElement>(null);

    // Store current query to use for loadMore
    const currentQueryRef = useRef<string>('');

    // Auth listener
    useEffect(() => {
        const unsubscribe = initAuthListener((authUser) => {
            setUser(authUser);
        });
        return () => unsubscribe();
    }, []);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Call Klipy API when debounced search changes
    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearch.trim()) {
                setSearchResults([]);
                return;
            }

            // Track search for analytics
            trackSearch(debouncedSearch);

            // Clear category when searching
            setSelectedCategory(null);
            setIsSearching(true);
            try {
                const results = await searchKlipy(debouncedSearch, { limit: 30 });
                setSearchResults(results);
                console.log(`Search returned ${results.length} results for "${debouncedSearch}"`);
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
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
    }, [hasMore, loadingMore, loading, debouncedSearch, offset]);

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

    // Map trending periods to different search queries for variety
    const getTrendingQuery = (period: TrendingPeriod): string => {
        const queries: Record<TrendingPeriod, string[]> = {
            today: ['trending', 'viral', 'hot now', 'popular today'],
            week: ['funny', 'reaction', 'mood', 'relatable'],
            month: ['celebration', 'excited', 'happy', 'dance party'],
            allTime: ['classic', 'iconic', 'legendary', 'best ever']
        };
        const periodQueries = queries[period];
        return periodQueries[Math.floor(Math.random() * periodQueries.length)];
    };

    const loadGifs = async (reset = false) => {
        setLoading(true);
        try {
            // Use Klipy API with different search terms per period
            const query = getTrendingQuery(trendingPeriod);
            currentQueryRef.current = query;
            console.log(`Loading GIFs for ${trendingPeriod} with query: "${query}"`);

            const klipyItems = await searchKlipy(query, { limit: 24, offset: 0 });

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
            setOffset(24);
            setHasMore(klipyItems.length >= 24);
        } catch (error) {
            console.error('Failed to load GIFs:', error);
            setGifs([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreGifs = async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            // Use same query but with offset for more results
            const query = currentQueryRef.current || getTrendingQuery(trendingPeriod);
            console.log(`Loading more GIFs with offset: ${offset}`);

            const klipyItems = await searchKlipy(query, { limit: 24, offset });

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

            setGifs(prev => [...prev, ...newItems]);
            setOffset(prev => prev + 24);
            setHasMore(klipyItems.length >= 24);
        } catch (error) {
            console.error('Failed to load more GIFs:', error);
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

    const handleDownload = async (gif: LibraryGIF, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDownloading(gif.id);
        try {
            // Track download for analytics
            trackDownload('website');

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

    const handleCopy = async (gif: LibraryGIF, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            await navigator.clipboard.writeText(gif.url);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    };

    const handleShare = async (gif: LibraryGIF, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (navigator.share) {
            await navigator.share({
                title: gif.title || 'Saucy GIF',
                url: gif.url
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
                <div className="w-full px-6 py-2.5 flex items-center justify-between gap-6">
                    {/* Logo - Far Left */}
                    <a href="/" className="flex items-center shrink-0">
                        <img
                            src="/logos/saucy_drip_dark.png"
                            alt="Saucy"
                            className="h-40 w-auto object-contain"
                        />
                    </a>

                    {/* Search - Center */}
                    <div className="flex-1 max-w-xl mx-auto">
                        <div className="relative">
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
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium">{user.displayName}</p>
                                <p className="text-xs text-slate-400">Free tier</p>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden"
                            >
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => signInWithGoogle()}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-semibold hover:bg-slate-100 transition-colors text-sm shrink-0"
                        >
                            <LogIn className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign In</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Categories Section - Now First */}
            <section className="relative py-6 bg-black">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span className="text-2xl">🎯</span>
                            Browse Categories
                        </h2>
                    </div>

                    <div
                        ref={categoriesRef}
                        className="flex flex-wrap gap-3 pb-2"
                    >
                        {CATEGORIES.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryClick(category)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold whitespace-nowrap transition-all duration-200 transform hover:scale-105 ${selectedCategory?.id === category.id
                                    ? 'bg-white/10 text-white border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    : 'bg-transparent text-slate-300 border border-white/10 hover:border-red-500/50 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                    }`}
                            >
                                <span className="text-xl">{category.emoji}</span>
                                <span>{category.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Time Period & Filters - Below Categories, Above GIF of the Day */}
            <section className="bg-black py-4 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 ${trendingPeriod === id && !selectedCategory
                                    ? 'bg-white/10 text-white border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    : 'bg-transparent text-slate-400 border border-white/10 hover:border-red-500/50 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}

                        <div className="w-px h-8 bg-white/10 mx-2" />

                        {/* Rating Filter */}
                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value as ContentRating)}
                            className="px-4 py-2.5 bg-transparent border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/20 hover:border-red-500/50 transition-all duration-200"
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

            {/* Sauce of the Day - Now Below Categories and Filters */}
            {gifOfTheDay && (
                <section className="relative overflow-hidden bg-black">
                    <div className="max-w-7xl mx-auto px-4 py-12">
                        <div className="flex flex-col lg:flex-row items-center gap-8">
                            {/* GIF Preview */}
                            <div
                                className="relative group cursor-pointer"
                                onClick={() => setSelectedGif(gifOfTheDay)}
                            >
                                <div className="absolute -inset-1 bg-gradient-to-r from-red-500/50 to-orange-500/50 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
                                <div className="relative w-80 h-80 rounded-2xl overflow-hidden border-2 border-white/20">
                                    <img
                                        src={gifOfTheDay.url}
                                        alt={gifOfTheDay.title || 'Sauce of the Day'}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-full text-sm font-bold mb-4 text-white">
                                    <Flame className="w-4 h-4" />
                                    SAUCE OF THE DAY
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black mb-4">
                                    {gifOfTheDay.title || 'Trending Now'}
                                </h1>
                                <p className="text-slate-400 text-lg mb-6">
                                    {gifOfTheDay.description || 'The hottest sauce right now'}
                                </p>
                                <div className="flex items-center justify-center lg:justify-start gap-6 text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <Download className="w-5 h-5" />
                                        <span className="font-semibold">{formatDownloads(gifOfTheDay.downloads || 0)}</span>
                                        <span className="text-slate-500">downloads</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center lg:justify-start gap-3 mt-6">
                                    <button
                                        onClick={(e) => handleDownload(gifOfTheDay, e)}
                                        className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white rounded-xl font-bold hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-200"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download
                                    </button>
                                    <button
                                        onClick={(e) => handleCopy(gifOfTheDay, e)}
                                        className="flex items-center gap-2 px-6 py-3 bg-transparent border border-white/10 text-white rounded-xl font-bold hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-all duration-200"
                                    >
                                        <Copy className="w-5 h-5" />
                                        Copy Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}


            {/* GIF Grid */}
            <main className="max-w-7xl mx-auto px-4 py-8">
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={(e) => handleDownload(gif, e)}
                                        className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
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
                                        className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                        title="Copy Link"
                                    >
                                        <Copy className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={(e) => handleShare(gif, e)}
                                        className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                        title="Share"
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>
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
                        className="bg-[#1a1a1f] rounded-3xl max-w-2xl w-full overflow-hidden"
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
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-bold hover:opacity-90 transition-opacity"
                                >
                                    {downloading === selectedGif.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Download className="w-5 h-5" />
                                    )}
                                    Download
                                </button>
                                <button
                                    onClick={(e) => handleCopy(selectedGif, e)}
                                    className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition-colors"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => handleShare(selectedGif, e)}
                                    className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition-colors"
                                >
                                    <Share2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
