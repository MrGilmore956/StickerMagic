/**
 * Analytics Service - Track and retrieve platform analytics
 * 
 * Stores in Firestore:
 * - analytics/stats (aggregate counts)
 * - analytics/searches (search term counts)
 * - analytics/daily/{date} (daily snapshots)
 */

import { db } from './firebaseConfig';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { isMockAdminActive } from './authService';

// Types
export interface AnalyticsStats {
    totalDownloads: number;
    totalViews: number;
    totalShares: number;
    totalSearches: number;
    uniqueVisitors: number;
    lastUpdated: Date;
}

export interface SearchTerm {
    term: string;
    count: number;
    lastSearched: Date;
}

export interface TopGif {
    id: string;
    title: string;
    thumbnailUrl: string;
    downloads: number;
    views: number;
}

export interface DailyStats {
    date: string;
    downloads: number;
    downloads_website?: number;
    downloads_klipy?: number;
    downloads_giphy?: number;
    downloads_tenor?: number;
    downloads_api?: number;
    views: number;
    shares: number;
    searches: number;
    visitors: number;
}

export interface DownloadEvent {
    id: string;
    gifId: string;
    gifTitle: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    timestamp: Date;
    source: DownloadSource;
}


/**
 * Download sources for tracking
 */
export type DownloadSource = 'website' | 'klipy' | 'giphy' | 'tenor' | 'api' | 'unknown';

// Collection references
const STATS_DOC = 'analytics/stats';
const SEARCHES_COLLECTION = 'analytics_searches';
const DAILY_COLLECTION = 'analytics_daily';
const DOWNLOADS_COLLECTION = 'analytics_downloads';


/**
 * Get current date string for daily tracking
 */
function getTodayString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Initialize or get aggregate stats document
 */
async function ensureStatsDoc(): Promise<void> {
    const statsRef = doc(db, STATS_DOC);
    const statsSnap = await getDoc(statsRef);

    if (!statsSnap.exists()) {
        await setDoc(statsRef, {
            totalDownloads: 0,
            totalViews: 0,
            totalShares: 0,
            totalSearches: 0,
            uniqueVisitors: 0,
            lastUpdated: serverTimestamp()
        });
    }
}

/**
 * Track a page view / session
 */
export async function trackPageView(): Promise<void> {
    try {
        await ensureStatsDoc();
        const statsRef = doc(db, STATS_DOC);
        await updateDoc(statsRef, {
            totalViews: increment(1),
            lastUpdated: serverTimestamp()
        });

        // Also update daily stats
        const dailyRef = doc(db, DAILY_COLLECTION, getTodayString());
        const dailySnap = await getDoc(dailyRef);

        if (dailySnap.exists()) {
            await updateDoc(dailyRef, { views: increment(1) });
        } else {
            await setDoc(dailyRef, {
                date: getTodayString(),
                downloads: 0,
                views: 1,
                shares: 0,
                searches: 0,
                visitors: 1
            });
        }
    } catch (error) {
        if (!isMockAdminActive()) {
            console.error('Error tracking page view:', error);
        }
    }
}

/**
 * Track a download event with source and metadata
 */
export async function trackDownload(options: {
    gifId: string;
    gifTitle: string;
    source?: DownloadSource;
    user?: User | null;
}): Promise<void> {
    const { gifId, gifTitle, source = 'website', user } = options;

    try {
        await ensureStatsDoc();
        const statsRef = doc(db, STATS_DOC);
        await updateDoc(statsRef, {
            totalDownloads: increment(1),
            [`downloads_${source}`]: increment(1), // Track by source
            lastUpdated: serverTimestamp()
        });

        // Update daily stats with source breakdown
        const dailyRef = doc(db, DAILY_COLLECTION, getTodayString());
        const dailySnap = await getDoc(dailyRef);

        if (dailySnap.exists()) {
            await updateDoc(dailyRef, {
                downloads: increment(1),
                [`downloads_${source}`]: increment(1)
            });
        } else {
            await setDoc(dailyRef, {
                date: getTodayString(),
                downloads: 1,
                downloads_website: source === 'website' ? 1 : 0,
                downloads_klipy: source === 'klipy' ? 1 : 0,
                downloads_giphy: source === 'giphy' ? 1 : 0,
                downloads_tenor: source === 'tenor' ? 1 : 0,
                downloads_api: source === 'api' ? 1 : 0,
                views: 0,
                shares: 0,
                searches: 0,
                visitors: 0
            });
        }

        // Record detailed download event
        const downloadsRef = collection(db, DOWNLOADS_COLLECTION);
        await addDoc(downloadsRef, {
            gifId,
            gifTitle,
            userId: user?.uid || null,
            userName: user?.displayName || null,
            userEmail: user?.email || null,
            timestamp: serverTimestamp(),
            source
        });

    } catch (error) {
        if (!isMockAdminActive()) {
            console.error('Error tracking download:', error);
        }
    }
}

/**
 * Track a share event
 */
export async function trackShare(): Promise<void> {
    try {
        await ensureStatsDoc();
        const statsRef = doc(db, STATS_DOC);
        await updateDoc(statsRef, {
            totalShares: increment(1),
            lastUpdated: serverTimestamp()
        });

        // Update daily stats
        const dailyRef = doc(db, DAILY_COLLECTION, getTodayString());
        const dailySnap = await getDoc(dailyRef);

        if (dailySnap.exists()) {
            await updateDoc(dailyRef, { shares: increment(1) });
        } else {
            await setDoc(dailyRef, {
                date: getTodayString(),
                downloads: 0,
                views: 0,
                shares: 1,
                searches: 0,
                visitors: 0
            });
        }
    } catch (error) {
        if (!isMockAdminActive()) {
            console.error('Error tracking share:', error);
        }
    }
}

/**
 * Track a search query
 */
export async function trackSearch(searchTerm: string): Promise<void> {
    if (!searchTerm || searchTerm.trim().length === 0) return;

    const normalizedTerm = searchTerm.trim().toLowerCase();

    try {
        // Update global search count
        await ensureStatsDoc();
        const statsRef = doc(db, STATS_DOC);
        await updateDoc(statsRef, {
            totalSearches: increment(1),
            lastUpdated: serverTimestamp()
        });

        // Update search term document
        const searchRef = doc(db, SEARCHES_COLLECTION, normalizedTerm);
        const searchSnap = await getDoc(searchRef);

        if (searchSnap.exists()) {
            await updateDoc(searchRef, {
                count: increment(1),
                lastSearched: serverTimestamp()
            });
        } else {
            await setDoc(searchRef, {
                term: normalizedTerm,
                count: 1,
                lastSearched: serverTimestamp()
            });
        }

        // Update daily stats
        const dailyRef = doc(db, DAILY_COLLECTION, getTodayString());
        const dailySnap = await getDoc(dailyRef);

        if (dailySnap.exists()) {
            await updateDoc(dailyRef, { searches: increment(1) });
        } else {
            await setDoc(dailyRef, {
                date: getTodayString(),
                downloads: 0,
                views: 0,
                shares: 0,
                searches: 1,
                visitors: 0
            });
        }
    } catch (error) {
        if (!isMockAdminActive()) {
            console.error('Error tracking search:', error);
        }
    }
}

/**
 * Get aggregate analytics stats
 */
export async function getAnalyticsStats(): Promise<AnalyticsStats> {
    if (isMockAdminActive()) {
        return {
            totalDownloads: 12500,
            totalViews: 45000,
            totalShares: 8900,
            totalSearches: 15200,
            uniqueVisitors: 5600,
            lastUpdated: new Date()
        };
    }

    try {
        await ensureStatsDoc();
        const statsRef = doc(db, STATS_DOC);
        const statsSnap = await getDoc(statsRef);

        if (statsSnap.exists()) {
            const data = statsSnap.data();
            return {
                totalDownloads: data.totalDownloads || 0,
                totalViews: data.totalViews || 0,
                totalShares: data.totalShares || 0,
                totalSearches: data.totalSearches || 0,
                uniqueVisitors: data.uniqueVisitors || 0,
                lastUpdated: data.lastUpdated?.toDate() || new Date()
            };
        }
    } catch (error) {
        console.error('Error getting analytics stats:', error);
    }

    return {
        totalDownloads: 0,
        totalViews: 0,
        totalShares: 0,
        totalSearches: 0,
        uniqueVisitors: 0,
        lastUpdated: new Date()
    };
}

/**
 * Get top search terms
 */
export async function getTopSearches(limitCount: number = 10): Promise<SearchTerm[]> {
    if (isMockAdminActive()) {
        return [
            { term: 'reaction', count: 1200, lastSearched: new Date() },
            { term: 'funny', count: 950, lastSearched: new Date() },
            { term: 'excited', count: 840, lastSearched: new Date() },
            { term: 'oops', count: 720, lastSearched: new Date() },
            { term: 'dance', count: 650, lastSearched: new Date() },
            { term: 'cat', count: 590, lastSearched: new Date() },
            { term: 'bruh', count: 530, lastSearched: new Date() },
            { term: 'congrats', count: 480, lastSearched: new Date() },
            { term: 'sad', count: 420, lastSearched: new Date() },
            { term: 'shocked', count: 390, lastSearched: new Date() }
        ].slice(0, limitCount);
    }

    try {
        const searchesRef = collection(db, SEARCHES_COLLECTION);
        const q = query(searchesRef, orderBy('count', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                term: data.term,
                count: data.count,
                lastSearched: data.lastSearched?.toDate() || new Date()
            };
        });
    } catch (error) {
        console.error('Error getting top searches:', error);
        return [];
    }
}

/**
 * Get daily stats for the last N days
 */
export async function getDailyStats(days: number = 7): Promise<DailyStats[]> {
    if (isMockAdminActive()) {
        const stats: DailyStats[] = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            stats.push({
                date: dateStr,
                downloads: 150 + Math.floor(Math.random() * 100),
                views: 500 + Math.floor(Math.random() * 200),
                shares: 40 + Math.floor(Math.random() * 30),
                searches: 200 + Math.floor(Math.random() * 100),
                visitors: 100 + Math.floor(Math.random() * 50)
            });
        }
        return stats;
    }

    try {
        const dailyRef = collection(db, DAILY_COLLECTION);
        const q = query(dailyRef, orderBy('date', 'desc'), limit(days));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                date: data.date,
                downloads: data.downloads || 0,
                views: data.views || 0,
                shares: data.shares || 0,
                searches: data.searches || 0,
                visitors: data.visitors || 0
            };
        });
    } catch (error) {
        console.error('Error getting daily stats:', error);
        return [];
    }
}

/**
 * Get stats for today only
 */
export async function getTodayStats(): Promise<DailyStats | null> {
    if (isMockAdminActive()) {
        return {
            date: new Date().toISOString().split('T')[0],
            downloads: 185,
            views: 620,
            shares: 52,
            searches: 245,
            visitors: 124
        };
    }

    try {
        const dailyRef = doc(db, DAILY_COLLECTION, getTodayString());
        const dailySnap = await getDoc(dailyRef);

        if (dailySnap.exists()) {
            const data = dailySnap.data();
            return {
                date: data.date,
                downloads: data.downloads || 0,
                views: data.views || 0,
                shares: data.shares || 0,
                searches: data.searches || 0,
                visitors: data.visitors || 0
            };
        }
    } catch (error) {
        console.error('Error getting today stats:', error);
    }

    return null;
}

/**
 * Get recent download events
 */
export async function getRecentDownloads(limitCount: number = 20): Promise<DownloadEvent[]> {
    if (isMockAdminActive()) {
        const mockUsers = [
            { name: 'John Doe', email: 'john@example.com' },
            { name: 'Jane Smith', email: 'jane@test.org' },
            { name: 'Alex Johnson', email: 'alex.j@gmail.com' },
            { name: 'Sam Wilson', email: 'sam.w@company.com' },
            { name: 'Sarah Miller', email: 'sarah.m@dev.io' }
        ];

        const mockGifs = [
            { id: 'gif-1', title: 'Funny Cat Dance' },
            { id: 'gif-2', title: 'Excited Celebration' },
            { id: 'gif-3', title: 'Facepalm Reaction' },
            { id: 'gif-4', title: 'Success Kid Yes' },
            { id: 'gif-5', title: 'Mind Blown Galaxy' }
        ];

        return Array.from({ length: limitCount }).map((_, i) => {
            const user = mockUsers[i % mockUsers.length];
            const gif = mockGifs[i % mockGifs.length];
            const timestamp = new Date();
            timestamp.setMinutes(timestamp.getMinutes() - (i * 15 + Math.floor(Math.random() * 10)));

            return {
                id: `evt-${i}`,
                gifId: gif.id,
                gifTitle: gif.title,
                userId: `user-${i}`,
                userName: user.name,
                userEmail: user.email,
                timestamp,
                source: (['website', 'klipy', 'api'] as DownloadSource[])[i % 3]
            };
        });
    }

    try {
        const downloadsRef = collection(db, DOWNLOADS_COLLECTION);
        const q = query(downloadsRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                gifId: data.gifId,
                gifTitle: data.gifTitle,
                userId: data.userId,
                userName: data.userName,
                userEmail: data.userEmail,
                timestamp: data.timestamp?.toDate() || new Date(),
                source: data.source as DownloadSource
            };
        });
    } catch (error) {
        console.error('Error getting recent downloads:', error);
        return [];
    }
}
