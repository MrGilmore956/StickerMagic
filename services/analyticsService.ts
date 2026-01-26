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
    query,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';

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

/**
 * Download sources for tracking
 */
export type DownloadSource = 'website' | 'klipy' | 'giphy' | 'tenor' | 'api' | 'unknown';

// Collection references
const STATS_DOC = 'analytics/stats';
const SEARCHES_COLLECTION = 'analytics_searches';
const DAILY_COLLECTION = 'analytics_daily';

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
        console.error('Error tracking page view:', error);
    }
}

/**
 * Track a download event with source
 */
export async function trackDownload(source: DownloadSource = 'website'): Promise<void> {
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
    } catch (error) {
        console.error('Error tracking download:', error);
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
        console.error('Error tracking share:', error);
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
        console.error('Error tracking search:', error);
    }
}

/**
 * Get aggregate analytics stats
 */
export async function getAnalyticsStats(): Promise<AnalyticsStats> {
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
