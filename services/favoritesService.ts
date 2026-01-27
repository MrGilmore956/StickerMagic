/**
 * Favorites Service - Manage user favorite GIFs
 * 
 * Stores in Firestore:
 * - favorites/{userId}_{gifId} (association document)
 */

import { db } from './firebaseConfig';
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { LibraryGIF } from './gifLibraryService';

const FAVORITES_COLLECTION = 'favorites';

/**
 * Toggle a GIF as favorite for a user
 */
export async function toggleFavorite(userId: string, gif: LibraryGIF): Promise<boolean> {
    const favoriteId = `${userId}_${gif.id}`;
    const favRef = doc(db, FAVORITES_COLLECTION, favoriteId);

    try {
        const favSnap = await getDoc(favRef);

        if (favSnap.exists()) {
            await deleteDoc(favRef);
            return false; // Removed
        } else {
            await setDoc(favRef, {
                userId,
                gifId: gif.id,
                gifUrl: gif.url,
                gifThumbnail: gif.thumbnailUrl || gif.url,
                gifTitle: gif.title || '',
                createdAt: serverTimestamp()
            });
            return true; // Added
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        throw error;
    }
}

/**
 * Check if a GIF is favorited by a user
 */
export async function isFavorited(userId: string, gifId: string): Promise<boolean> {
    const favoriteId = `${userId}_${gifId}`;
    const favRef = doc(db, FAVORITES_COLLECTION, favoriteId);

    try {
        const favSnap = await getDoc(favRef);
        return favSnap.exists();
    } catch (error) {
        console.error('Error checking favorite status:', error);
        return false;
    }
}

/**
 * Get all favorites for a user
 */
export async function getUserFavorites(userId: string): Promise<any[]> {
    try {
        const favsRef = collection(db, FAVORITES_COLLECTION);
        const q = query(favsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting user favorites:', error);
        return [];
    }
}
