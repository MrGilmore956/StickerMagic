/**
 * Centralized Authentication & API Key Management for Saucy AI
 */

import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
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
 * Check if mock admin session is active
 */
export const isMockAdminActive = (): boolean => {
    const savedUser = localStorage.getItem('saucy_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            return user.email === 'admin@saucy.com';
        } catch (e) {
            return false;
        }
    }
    return false;
};

/**
 * Initialize auth state listener
 */
export const initAuthListener = (callback: (user: User | null) => void) => {
    // Check if we have a mock admin session in localStorage
    const savedUser = localStorage.getItem('saucy_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            if (user.email === 'admin@saucy.com') {
                console.log('DEMO MODE: Activating mock admin session from storage');
                currentUser = user as User;
                callback(currentUser);
                // Return no-op unsubscribe
                return () => { };
            }
        } catch (e) {
            console.error('Failed to parse mock user:', e);
        }
    }

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
 * Sign in with Email/Password
 */
export const signInWithEmail = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    // Demo/Test Bypass for admin
    if (email === 'admin@saucy.com' && password === 'admin123') {
        console.log('DEMO MODE: Bypassing Firebase Auth for admin test account');
        const mockUser = {
            uid: 'admin-test-uid',
            email: 'admin@saucy.com',
            displayName: 'Admin (Test)',
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
            emailVerified: true,
            isAnonymous: false,
            metadata: {},
            providerData: [],
            refreshToken: '',
            tenantId: null,
            delete: async () => { },
            getIdToken: async () => 'test-token',
            getIdTokenResult: async () => ({}) as any,
            reload: async () => { },
            toJSON() {
                return {
                    uid: this.uid,
                    email: this.email,
                    displayName: this.displayName,
                    photoURL: this.photoURL
                }
            }
        } as any;

        // Save to localStorage so initAuthListener picks it up
        localStorage.setItem('saucy_user', JSON.stringify(mockUser));
        currentUser = mockUser;

        return {
            user: mockUser,
            error: null
        };
    }

    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { user: result.user, error: null };
    } catch (error: any) {
        console.error('Email sign-in failed:', error);
        let errorMessage = 'Sign in failed. Please try again.';
        if (error.code === 'auth/user-not-found') errorMessage = 'No account found with this email.';
        if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password.';
        if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address.';
        if (error.code === 'auth/invalid-credential') errorMessage = 'Invalid email or password.';
        return { user: null, error: errorMessage };
    }
};

/**
 * Sign up with Email/Password
 */
export const signUpWithEmail = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        return { user: result.user, error: null };
    } catch (error: any) {
        console.error('Email sign-up failed:', error);
        let errorMessage = 'Sign up failed. Please try again.';
        if (error.code === 'auth/email-already-in-use') errorMessage = 'An account with this email already exists.';
        if (error.code === 'auth/weak-password') errorMessage = 'Password should be at least 6 characters.';
        if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address.';
        return { user: null, error: errorMessage };
    }
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string): Promise<{ success: boolean; error: string | null }> => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, error: null };
    } catch (error: any) {
        console.error('Password reset failed:', error);
        let errorMessage = 'Failed to send reset email.';
        if (error.code === 'auth/user-not-found') errorMessage = 'No account found with this email.';
        if (error.code === 'auth/invalid-email') errorMessage = 'Invalid email address.';
        return { success: false, error: errorMessage };
    }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
    try {
        await firebaseSignOut(auth);
        currentUser = null;
        localStorage.removeItem('saucy_user');
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
