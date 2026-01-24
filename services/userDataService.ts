/**
 * User Data Service - Firestore persistence for Saucy AI
 */

import {
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface UserPreferences {
    defaultSize?: string;
    theme?: string;
    autoRemoveBackground?: boolean;
}

export interface SavedCreation {
    id?: string;
    type: 'sticker' | 'animation';
    prompt: string;
    imageData: string;
    createdAt: Date;
}

/**
 * Save user's API key to Firestore (encrypted storage)
 */
export const saveUserApiKey = async (uid: string, apiKey: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        apiKey,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

/**
 * Get user's API key from Firestore
 */
export const getUserApiKey = async (uid: string): Promise<string | null> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data()?.apiKey || null;
    }
    return null;
};

/**
 * Save user preferences
 */
export const saveUserPreferences = async (uid: string, prefs: UserPreferences): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        preferences: prefs,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (uid: string): Promise<UserPreferences | null> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data()?.preferences || null;
    }
    return null;
};

/**
 * Save a creation to user's history
 */
export const saveUserCreation = async (uid: string, creation: Omit<SavedCreation, 'id' | 'createdAt'>): Promise<string> => {
    const creationsRef = collection(db, 'users', uid, 'creations');
    const docRef = await addDoc(creationsRef, {
        ...creation,
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

/**
 * Get user's creation history
 */
export const getUserCreations = async (uid: string, limitCount: number = 20): Promise<SavedCreation[]> => {
    const creationsRef = collection(db, 'users', uid, 'creations');
    const q = query(creationsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as SavedCreation[];
};
