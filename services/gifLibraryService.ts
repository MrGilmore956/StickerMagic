/**
 * GIF Library Service - Enhanced for the new architecture
 * 
 * Features:
 * - Content ratings (PG, PG-13, R, Unhinged)
 * - Trending scores with time-based periods
 * - Download tracking
 * - Admin approval workflow
 * - GIF of the Day selection
 */

import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    doc,
    Timestamp,
    deleteDoc,
    increment,
    DocumentData
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Content rating types
export type ContentRating = 'pg' | 'pg13' | 'r' | 'unhinged';
export type GifStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type TrendingPeriod = 'today' | 'week' | 'month' | 'allTime';

// Source of content generation
export type ContentSource =
    | 'news'
    | 'holiday'
    | 'scheduled'
    | 'viral'
    | 'user_request'
    | 'search_trends'
    | 'sports'
    | 'entertainment'
    | 'memes'
    | 'seasonal'
    | 'gaming'
    | 'work_culture'
    | 'pets'
    | 'food'
    | 'fitness'
    | 'tech'
    | 'education'
    | 'relationships'
    | 'manual';

export interface LibraryGIF {
    id: string;

    // Content
    url: string;
    thumbnailUrl?: string;
    title?: string;
    description?: string;
    tags: string[];

    // Rating & Status
    rating: ContentRating;
    status: GifStatus;

    // AI Generation Info
    source: ContentSource;
    aiPrompt?: string;
    generatedAt?: Date;

    // Approval
    approvedBy?: string;
    approvedAt?: Date;

    // Engagement
    downloads: number;
    shares: number;
    trendingScore: number;

    // GIF of the Day
    isGifOfTheDay?: boolean;
    gifOfTheDayDate?: Date;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

// Firestore collection
const GIF_COLLECTION = 'library_gifs';
const GOTD_COLLECTION = 'gif_of_the_day';

/**
 * Calculate trending score based on recent activity
 */
function calculateTrendingScore(downloads: number, shares: number, createdAt: Date): number {
    const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    const engagement = downloads * 1 + shares * 2;
    // Decay factor: newer content ranks higher
    const decayFactor = Math.pow(0.95, ageInHours / 24);
    return engagement * decayFactor;
}

/**
 * Get published (approved) GIFs with filters
 */
export async function getPublishedGifs(options?: {
    period?: TrendingPeriod;
    rating?: ContentRating;
    source?: ContentSource;
    search?: string;
    limit?: number;
}): Promise<LibraryGIF[]> {
    try {
        let q = query(
            collection(db, GIF_COLLECTION),
            where('status', '==', 'approved'),
            orderBy('trendingScore', 'desc'),
            limit(options?.limit || 24)
        );

        const snapshot = await getDocs(q);
        let gifs: LibraryGIF[] = snapshot.docs.map(docToGif);

        // Client-side filtering for flexibility
        if (options?.rating) {
            gifs = gifs.filter(gif => gif.rating === options.rating);
        }
        if (options?.source) {
            gifs = gifs.filter(gif => gif.source === options.source);
        }
        if (options?.period && options.period !== 'allTime') {
            const cutoff = getPeriodCutoff(options.period);
            gifs = gifs.filter(gif => gif.createdAt >= cutoff);
        }
        if (options?.search) {
            const searchLower = options.search.toLowerCase();
            gifs = gifs.filter(gif =>
                gif.title?.toLowerCase().includes(searchLower) ||
                gif.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
                gif.description?.toLowerCase().includes(searchLower)
            );
        }

        return gifs;
    } catch (error) {
        console.error('Error fetching published GIFs:', error);
        return [];
    }
}

/**
 * Get GIF of the Day
 */
export async function getGifOfTheDay(): Promise<LibraryGIF | null> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if we have a GOTD set for today
        const gotdQuery = query(
            collection(db, GOTD_COLLECTION),
            where('date', '>=', Timestamp.fromDate(today)),
            limit(1)
        );
        const gotdSnapshot = await getDocs(gotdQuery);

        if (!gotdSnapshot.empty) {
            const gotdData = gotdSnapshot.docs[0].data();
            const gifDoc = await getDoc(doc(db, GIF_COLLECTION, gotdData.gifId));
            if (gifDoc.exists()) {
                return docToGif(gifDoc);
            }
        }

        // Fallback: Get the highest trending GIF
        const topQuery = query(
            collection(db, GIF_COLLECTION),
            where('status', '==', 'approved'),
            orderBy('trendingScore', 'desc'),
            limit(1)
        );
        const topSnapshot = await getDocs(topQuery);

        if (!topSnapshot.empty) {
            return docToGif(topSnapshot.docs[0]);
        }

        return null;
    } catch (error) {
        console.error('Error fetching GIF of the Day:', error);
        return null;
    }
}

/**
 * Increment download count
 */
export async function incrementDownload(gifId: string): Promise<void> {
    try {
        const gifRef = doc(db, GIF_COLLECTION, gifId);
        await updateDoc(gifRef, {
            downloads: increment(1),
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error incrementing download:', error);
    }
}

/**
 * Increment share count
 */
export async function incrementShare(gifId: string): Promise<void> {
    try {
        const gifRef = doc(db, GIF_COLLECTION, gifId);
        await updateDoc(gifRef, {
            shares: increment(1),
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error incrementing share:', error);
    }
}

/**
 * Add a new GIF to the library (Admin)
 */
export async function addGifToLibrary(gif: Omit<LibraryGIF, 'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'shares' | 'trendingScore'>): Promise<string> {
    try {
        const now = new Date();
        const newGif = {
            ...gif,
            downloads: 0,
            shares: 0,
            trendingScore: 0,
            createdAt: Timestamp.fromDate(now),
            updatedAt: Timestamp.fromDate(now)
        };

        const docRef = await addDoc(collection(db, GIF_COLLECTION), newGif);
        return docRef.id;
    } catch (error) {
        console.error('Error adding GIF:', error);
        throw error;
    }
}

/**
 * Update GIF status (Admin)
 */
export async function updateGifStatus(
    gifId: string,
    status: GifStatus,
    approverUid?: string
): Promise<void> {
    try {
        const gifRef = doc(db, GIF_COLLECTION, gifId);
        const updateData: Record<string, any> = {
            status,
            updatedAt: Timestamp.now()
        };

        if (status === 'approved' && approverUid) {
            updateData.approvedBy = approverUid;
            updateData.approvedAt = Timestamp.now();
        }

        await updateDoc(gifRef, updateData);
    } catch (error) {
        console.error('Error updating GIF status:', error);
        throw error;
    }
}

/**
 * Update GIF details (Admin)
 */
export async function updateGif(
    gifId: string,
    updates: Partial<Omit<LibraryGIF, 'id' | 'createdAt'>>
): Promise<void> {
    try {
        const gifRef = doc(db, GIF_COLLECTION, gifId);
        await updateDoc(gifRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating GIF:', error);
        throw error;
    }
}

/**
 * Delete GIF from library (Admin)
 */
export async function deleteGif(gifId: string): Promise<void> {
    try {
        const gifRef = doc(db, GIF_COLLECTION, gifId);
        await deleteDoc(gifRef);
    } catch (error) {
        console.error('Error deleting GIF:', error);
        throw error;
    }
}

/**
 * Get pending review GIFs (Admin)
 */
export async function getPendingGifs(limitCount = 50): Promise<LibraryGIF[]> {
    try {
        const q = query(
            collection(db, GIF_COLLECTION),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToGif);
    } catch (error) {
        console.error('Error fetching pending GIFs:', error);
        return [];
    }
}

/**
 * Get all GIFs for admin (any status)
 */
export async function getAllGifs(options?: {
    status?: GifStatus;
    source?: ContentSource;
    limit?: number;
}): Promise<LibraryGIF[]> {
    try {
        let q = query(
            collection(db, GIF_COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(options?.limit || 100)
        );

        const snapshot = await getDocs(q);
        let gifs: LibraryGIF[] = snapshot.docs.map(docToGif);

        if (options?.status) {
            gifs = gifs.filter(gif => gif.status === options.status);
        }
        if (options?.source) {
            gifs = gifs.filter(gif => gif.source === options.source);
        }

        return gifs;
    } catch (error) {
        console.error('Error fetching all GIFs:', error);
        return [];
    }
}

/**
 * Set GIF of the Day (Admin)
 */
export async function setGifOfTheDay(gifId: string, date: Date = new Date()): Promise<void> {
    try {
        date.setHours(0, 0, 0, 0);

        await addDoc(collection(db, GOTD_COLLECTION), {
            gifId,
            date: Timestamp.fromDate(date),
            setAt: Timestamp.now()
        });
    } catch (error) {
        console.error('Error setting GIF of the Day:', error);
        throw error;
    }
}

/**
 * Recalculate trending scores (scheduled job)
 */
export async function recalculateTrendingScores(): Promise<void> {
    try {
        const snapshot = await getDocs(collection(db, GIF_COLLECTION));

        for (const gifDoc of snapshot.docs) {
            const data = gifDoc.data();
            const createdAt = data.createdAt?.toDate() || new Date();
            const newScore = calculateTrendingScore(
                data.downloads || 0,
                data.shares || 0,
                createdAt
            );

            await updateDoc(doc(db, GIF_COLLECTION, gifDoc.id), {
                trendingScore: newScore
            });
        }
    } catch (error) {
        console.error('Error recalculating trending scores:', error);
    }
}

// Helper functions

function docToGif(docSnapshot: DocumentData): LibraryGIF {
    const data = docSnapshot.data();
    return {
        id: docSnapshot.id,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        rating: data.rating || 'pg',
        status: data.status || 'pending',
        source: data.source || 'manual',
        aiPrompt: data.aiPrompt,
        generatedAt: data.generatedAt?.toDate(),
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt?.toDate(),
        downloads: data.downloads || 0,
        shares: data.shares || 0,
        trendingScore: data.trendingScore || 0,
        isGifOfTheDay: data.isGifOfTheDay,
        gifOfTheDayDate: data.gifOfTheDayDate?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
    };
}

function getPeriodCutoff(period: TrendingPeriod): Date {
    const now = new Date();
    switch (period) {
        case 'today':
            return new Date(now.setHours(0, 0, 0, 0));
        case 'week':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month':
            return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        default:
            return new Date(0);
    }
}
