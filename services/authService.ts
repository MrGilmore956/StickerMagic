/**
 * Centralized Authentication & API Key Management for Saucy AI
 */

import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth, googleProvider } from './firebaseConfig';
import { saveUserApiKey, getUserApiKey } from './userDataService';

export interface ApiKeyResult {
    key: string;
    isDemo: boolean;
    error?: string;
}

// Current user state
let currentUser: User | null = null;

/**
 * Initialize auth state listener
 */
export const initAuthListener = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
        currentUser = user;
        callback(user);
    });
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<User | null> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error('Google sign-in failed:', error);
        return null;
    }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
    try {
        await firebaseSignOut(auth);
        currentUser = null;
    } catch (error) {
        console.error('Sign out failed:', error);
    }
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => currentUser;

/**
 * Get API Key with Firebase + localStorage fallback
 */
export const getSaucyApiKey = async (): Promise<ApiKeyResult> => {
    // 1. Try AI Studio Bridge (Official environment)
    // @ts-ignore
    if (window.aistudio?.getApiKey) {
        try {
            // @ts-ignore
            const key = await window.aistudio.getApiKey();
            if (key && key !== 'PLACEHOLDER_API_KEY' && key.length > 10) {
                return { key, isDemo: false };
            }
        } catch (e) {
            console.warn("AI Studio bridge failed", e);
        }
    }

    // 2. Try Firestore (for logged-in users)
    if (currentUser) {
        try {
            const firestoreKey = await getUserApiKey(currentUser.uid);
            if (firestoreKey && firestoreKey.length > 20) {
                return { key: firestoreKey, isDemo: false };
            }
        } catch (e) {
            console.warn("Firestore API key fetch failed", e);
        }
    }

    // 3. Try Local Storage (Manual entry fallback)
    const savedKey = localStorage.getItem('stickify_api_key');
    if (savedKey && savedKey.length > 20) {
        return { key: savedKey, isDemo: false };
    }

    // 4. Try Environment Variables (Local dev with .env)
    const envKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey.length > 10) {
        return { key: envKey, isDemo: false };
    }

    // 5. Default to Demo Mode
    return {
        key: '',
        isDemo: true,
        error: "No API Key found. Using Demo Mode. (Click 'CONNECT KEY' to use real AI)"
    };
};

/**
 * Save API Key (Firestore for logged-in users, localStorage otherwise)
 */
export const saveSaucyApiKey = async (key: string): Promise<boolean> => {
    if (!key || key.length < 20) {
        return false;
    }

    const trimmedKey = key.trim();

    // Save to Firestore if logged in
    if (currentUser) {
        try {
            await saveUserApiKey(currentUser.uid, trimmedKey);
        } catch (e) {
            console.warn("Failed to save to Firestore, using localStorage:", e);
        }
    }

    // Always save to localStorage as backup
    localStorage.setItem('stickify_api_key', trimmedKey);
    return true;
};

export const clearSaucyApiKey = () => {
    localStorage.removeItem('stickify_api_key');
};
