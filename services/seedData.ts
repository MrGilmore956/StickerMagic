/**
 * Seed Data Script - Add initial GIFs to the library
 * Run this once to populate the library with starter content
 */

import {
    collection,
    addDoc,
    Timestamp,
    getDocs,
    query,
    limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Sample GIF data from Giphy
const SEED_GIFS = [
    {
        url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200.gif',
        title: 'Monday Mood',
        description: 'That feeling when the weekend ends',
        tags: ['monday', 'mood', 'work', 'tired', 'relatable'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'manual' as const,
        downloads: Math.floor(Math.random() * 10000) + 1000,
        shares: Math.floor(Math.random() * 500) + 50,
        trendingScore: Math.random() * 100
    },
    {
        url: 'https://media.giphy.com/media/3oKIPwoeGErMmaI43S/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/3oKIPwoeGErMmaI43S/200.gif',
        title: 'Coffee Time',
        description: 'First coffee of the day hits different',
        tags: ['coffee', 'morning', 'caffeine', 'energy'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'manual' as const,
        downloads: Math.floor(Math.random() * 8000) + 500,
        shares: Math.floor(Math.random() * 400) + 30,
        trendingScore: Math.random() * 90
    },
    {
        url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200.gif',
        title: 'Friday Vibes',
        description: 'Finally, the weekend is here!',
        tags: ['friday', 'weekend', 'happy', 'celebration', 'party'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'manual' as const,
        downloads: Math.floor(Math.random() * 15000) + 2000,
        shares: Math.floor(Math.random() * 800) + 100,
        trendingScore: Math.random() * 120
    },
    {
        url: 'https://media.giphy.com/media/gLcUFh2TrdySs/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/gLcUFh2TrdySs/200.gif',
        title: 'Suspicious Look',
        description: 'When something seems off',
        tags: ['suspicious', 'reaction', 'side-eye', 'skeptical'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'memes' as const,
        downloads: Math.floor(Math.random() * 20000) + 3000,
        shares: Math.floor(Math.random() * 1000) + 200,
        trendingScore: Math.random() * 150
    },
    {
        url: 'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/200.gif',
        title: 'Mind Blown',
        description: 'When you learn something amazing',
        tags: ['mind-blown', 'reaction', 'shocked', 'wow'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'memes' as const,
        downloads: Math.floor(Math.random() * 12000) + 1500,
        shares: Math.floor(Math.random() * 600) + 80,
        trendingScore: Math.random() * 110
    },
    {
        url: 'https://media.giphy.com/media/2A75RyXVzzSI2bx4Gj/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/2A75RyXVzzSI2bx4Gj/200.gif',
        title: 'Excited Dog',
        description: 'Pure joy and excitement',
        tags: ['dog', 'excited', 'happy', 'cute', 'pets'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'pets' as const,
        downloads: Math.floor(Math.random() * 18000) + 2500,
        shares: Math.floor(Math.random() * 900) + 150,
        trendingScore: Math.random() * 140
    },
    {
        url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/200.gif',
        title: 'Coding Life',
        description: 'When the code finally works',
        tags: ['coding', 'programming', 'developer', 'tech', 'work'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'work_culture' as const,
        downloads: Math.floor(Math.random() * 9000) + 800,
        shares: Math.floor(Math.random() * 500) + 60,
        trendingScore: Math.random() * 95
    },
    {
        url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/200.gif',
        title: 'Facepalm',
        description: 'When you just cant believe it',
        tags: ['facepalm', 'reaction', 'disbelief', 'frustration'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'memes' as const,
        downloads: Math.floor(Math.random() * 25000) + 4000,
        shares: Math.floor(Math.random() * 1200) + 250,
        trendingScore: Math.random() * 180
    },
    {
        url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/200.gif',
        title: 'Celebration Dance',
        description: 'Victory dance when things go right',
        tags: ['dance', 'celebration', 'happy', 'victory', 'party'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'entertainment' as const,
        downloads: Math.floor(Math.random() * 14000) + 1800,
        shares: Math.floor(Math.random() * 700) + 90,
        trendingScore: Math.random() * 125
    },
    {
        url: 'https://media.giphy.com/media/LHZyixOnHwDDy/giphy.gif',
        thumbnailUrl: 'https://media.giphy.com/media/LHZyixOnHwDDy/200.gif',
        title: 'Typing Fast',
        description: 'When you need to reply ASAP',
        tags: ['typing', 'fast', 'urgent', 'work', 'computer'],
        rating: 'pg' as const,
        status: 'approved' as const,
        source: 'work_culture' as const,
        downloads: Math.floor(Math.random() * 11000) + 1200,
        shares: Math.floor(Math.random() * 550) + 70,
        trendingScore: Math.random() * 100
    }
];

/**
 * Seed the library with initial GIFs
 */
export async function seedLibrary(): Promise<{ added: number; skipped: number }> {
    const collectionRef = collection(db, 'library_gifs');

    // Check if library already has content
    const existing = await getDocs(query(collectionRef, limit(1)));
    if (!existing.empty) {
        console.log('Library already has content, skipping seed');
        return { added: 0, skipped: SEED_GIFS.length };
    }

    let added = 0;
    const now = new Date();

    for (const gif of SEED_GIFS) {
        try {
            await addDoc(collectionRef, {
                ...gif,
                createdAt: Timestamp.fromDate(now),
                updatedAt: Timestamp.fromDate(now),
                approvedAt: Timestamp.fromDate(now),
                approvedBy: 'system'
            });
            added++;
            console.log(`Added: ${gif.title}`);
        } catch (error) {
            console.error(`Failed to add ${gif.title}:`, error);
        }
    }

    return { added, skipped: SEED_GIFS.length - added };
}

// Export for use in React component
export const DEMO_GIF_COUNT = SEED_GIFS.length;
