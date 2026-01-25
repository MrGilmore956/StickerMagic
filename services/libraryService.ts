/**
 * Library Service - Manages the community GIF library in Firestore
 */

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    doc,
    Timestamp,
    deleteDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface LibraryItem {
    id?: string;
    url: string;
    thumbnailUrl?: string;
    base64Thumbnail?: string;
    status: 'pending' | 'approved' | 'flagged' | 'rejected';
    hasText: boolean | null;
    textRemoved: boolean;
    cleanedUrl?: string;
    addedBy?: string;
    addedAt: Date;
    tags: string[];
    upvotes: number;
    source: 'giphy' | 'upload' | 'url';
    mimeType?: string;
}

const LIBRARY_COLLECTION = 'gif_library';

/**
 * Resize image to create a small thumbnail (max 200x200)
 * This keeps the base64 under Firestore's 1MB document limit
 */
async function createThumbnail(base64Data: string, maxSize: number = 200): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Scale down to fit within maxSize
            if (width > height) {
                if (width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            // Use lower quality JPEG for smaller size
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
        img.src = base64Data;
    });
}

/**
 * Add a new item to the library
 */
export async function addToLibrary(
    url: string,
    base64Thumbnail: string,
    source: 'giphy' | 'upload' | 'url',
    mimeType?: string,
    userId?: string
): Promise<string> {
    try {
        // Check if URL already exists
        const existingQuery = query(
            collection(db, LIBRARY_COLLECTION),
            where('url', '==', url),
            limit(1)
        );
        const existing = await getDocs(existingQuery);

        if (!existing.empty) {
            console.log('URL already in library:', url);
            return existing.docs[0].id;
        }

        // Create a small thumbnail to fit Firestore limits
        let thumbnail: string;
        try {
            thumbnail = await createThumbnail(base64Thumbnail);
        } catch (err) {
            console.warn('Thumbnail creation failed, skipping:', err);
            thumbnail = ''; // Save without thumbnail
        }

        const item: Omit<LibraryItem, 'id'> = {
            url,
            base64Thumbnail: thumbnail,
            status: 'pending',
            hasText: null, // Will be set by AI detection
            textRemoved: false,
            addedBy: userId || 'anonymous',
            addedAt: new Date(),
            tags: [],
            upvotes: 0,
            source,
            mimeType
        };

        const docRef = await addDoc(collection(db, LIBRARY_COLLECTION), {
            ...item,
            addedAt: Timestamp.fromDate(item.addedAt)
        });

        console.log('Added to library:', docRef.id);

        // Trigger async text detection (non-blocking)
        detectTextInMedia(docRef.id, base64Thumbnail).catch(err => {
            console.error('Text detection failed:', err);
        });

        return docRef.id;
    } catch (error) {
        console.error('Error adding to library:', error);
        throw error;
    }
}

/**
 * Get library items with optional filters
 */
export async function getLibrary(
    filters?: {
        status?: 'pending' | 'approved' | 'flagged' | 'rejected';
        hasText?: boolean;
        source?: 'giphy' | 'upload' | 'url';
        limit?: number;
    }
): Promise<LibraryItem[]> {
    try {
        let q = query(
            collection(db, LIBRARY_COLLECTION),
            orderBy('addedAt', 'desc')
        );

        // Note: Firestore requires composite indexes for multiple where clauses
        // For now, we'll filter client-side for flexibility
        if (filters?.limit) {
            q = query(q, limit(filters.limit));
        }

        const snapshot = await getDocs(q);
        let items: LibraryItem[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            addedAt: doc.data().addedAt?.toDate() || new Date()
        } as LibraryItem));

        // Client-side filtering
        if (filters?.status) {
            items = items.filter(item => item.status === filters.status);
        }
        if (filters?.hasText !== undefined) {
            items = items.filter(item => item.hasText === filters.hasText);
        }
        if (filters?.source) {
            items = items.filter(item => item.source === filters.source);
        }

        return items;
    } catch (error) {
        console.error('Error fetching library:', error);
        throw error;
    }
}

/**
 * Update item status
 */
export async function updateLibraryStatus(
    id: string,
    status: 'pending' | 'approved' | 'flagged' | 'rejected'
): Promise<void> {
    try {
        const docRef = doc(db, LIBRARY_COLLECTION, id);
        await updateDoc(docRef, { status });
        console.log('Updated status:', id, status);
    } catch (error) {
        console.error('Error updating status:', error);
        throw error;
    }
}

/**
 * Delete item from library
 */
export async function deleteFromLibrary(id: string): Promise<void> {
    try {
        const docRef = doc(db, LIBRARY_COLLECTION, id);
        await deleteDoc(docRef);
        console.log('Deleted from library:', id);
    } catch (error) {
        console.error('Error deleting from library:', error);
        throw error;
    }
}

/**
 * Use AI to detect if the media contains text
 * This runs asynchronously after adding to library
 */
async function detectTextInMedia(docId: string, base64: string): Promise<void> {
    try {
        // Call Gemini to analyze the image for text
        const response = await fetch('/api/detect-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64 })
        });

        if (!response.ok) {
            // If API doesn't exist yet, use client-side detection
            const hasText = await detectTextClientSide(base64);
            await updateTextDetection(docId, hasText);
            return;
        }

        const { hasText } = await response.json();
        await updateTextDetection(docId, hasText);
    } catch (error) {
        console.error('Text detection error:', error);
        // Fall back to pending status
    }
}

/**
 * Client-side text detection using Gemini
 */
async function detectTextClientSide(base64: string): Promise<boolean> {
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const { getSaucyApiKey } = await import('./authService');

        const { key, isDemo } = await getSaucyApiKey();

        if (isDemo) {
            // In demo mode, randomly flag some as having text for testing
            return Math.random() > 0.7;
        }

        const ai = new GoogleGenAI({ apiKey: key });

        const prompt = `Analyze this image and determine if it contains any visible text, captions, watermarks, or written words. 
        Respond with ONLY "YES" if text is present, or "NO" if the image has no text.`;

        // Clean base64 data
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
                    { text: prompt }
                ]
            }]
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || '';
        return text.includes('YES');
    } catch (error) {
        console.error('Client-side text detection failed:', error);
        return false; // Default to no text on error
    }
}

/**
 * Update text detection result
 */
async function updateTextDetection(docId: string, hasText: boolean): Promise<void> {
    try {
        const docRef = doc(db, LIBRARY_COLLECTION, docId);
        await updateDoc(docRef, {
            hasText,
            status: hasText ? 'flagged' : 'approved'
        });
        console.log('Text detection updated:', docId, hasText ? 'HAS TEXT' : 'NO TEXT');
    } catch (error) {
        console.error('Error updating text detection:', error);
    }
}

/**
 * Upvote a library item
 */
export async function upvoteLibraryItem(id: string): Promise<void> {
    try {
        const docRef = doc(db, LIBRARY_COLLECTION, id);
        // Note: For proper atomic increments, use FieldValue.increment()
        // For now, we'll do a simple update
        const items = await getLibrary();
        const item = items.find(i => i.id === id);
        if (item) {
            await updateDoc(docRef, { upvotes: (item.upvotes || 0) + 1 });
        }
    } catch (error) {
        console.error('Error upvoting:', error);
        throw error;
    }
}
