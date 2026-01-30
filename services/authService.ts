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
 * Initialize auth state listener
 * Also checks for demo user in localStorage for bypassing Firebase auth
 */
export const initAuthListener = (callback: (user: User | null) => void) => {
    // First, check for demo user in localStorage
    const checkDemoUser = () => {
        const demoUserData = localStorage.getItem('saucy_demo_user');
        if (demoUserData) {
            try {
                const parsedData = JSON.parse(demoUserData);
                // Create a mock User object for the demo user
                const demoUser = {
                    uid: parsedData.uid,
                    email: parsedData.email,
                    displayName: parsedData.displayName,
                    emailVerified: true,
                    isAnonymous: false,
                    metadata: {},
                    providerData: [],
                    refreshToken: '',
                    tenantId: null,
                    delete: async () => { },
                    getIdToken: async () => 'demo-token',
                    getIdTokenResult: async () => ({ token: 'demo-token', claims: {}, expirationTime: '', authTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null }),
                    reload: async () => { },
                    toJSON: () => ({}),
                    phoneNumber: null,
                    photoURL: null,
                    providerId: 'demo'
                } as unknown as User;
                currentUser = demoUser;
                return demoUser;
            } catch (e) {
                console.warn('Failed to parse demo user from localStorage:', e);
                localStorage.removeItem('saucy_demo_user');
            }
        }
        return null;
    };

    // Check demo user immediately
    const demoUser = checkDemoUser();
    if (demoUser) {
        console.log('Demo user restored from localStorage');
        // Trigger callback with demo user immediately
        setTimeout(() => callback(demoUser), 0);
    }

    // Also listen for Firebase auth changes
    return onAuthStateChanged(auth, (user) => {
        // If demo user is active and Firebase returns null, keep demo user
        const demoUserStored = localStorage.getItem('saucy_demo_user');
        if (!user && demoUserStored) {
            const demoUser = checkDemoUser();
            if (demoUser) {
                callback(demoUser);
                return;
            }
        }
        currentUser = user;
        callback(user);
    });
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<User> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error('Google sign-in failed:', error);
        throw error;
    }
};

/**
 * Sign in with Email/Password
 * Supports a demo mode for admin@saucy.com/admin123 that bypasses Firebase
 */
export const signInWithEmail = async (email: string, password: string): Promise<{ user: User | null; error: string | null; isDemo?: boolean }> => {
    // Demo mode bypass for local testing (when Firebase Email/Password is not enabled)
    if (email === 'admin@saucy.com' && password === 'admin123') {
        console.log('Demo admin login activated');
        // Create a mock user object for demo purposes
        const demoUser = {
            uid: 'demo-admin-uid',
            email: 'admin@saucy.com',
            displayName: 'Brian Taylor (Demo)',
            emailVerified: true,
            isAnonymous: false,
            metadata: {},
            providerData: [],
            refreshToken: '',
            tenantId: null,
            delete: async () => { },
            getIdToken: async () => 'demo-token',
            getIdTokenResult: async () => ({ token: 'demo-token', claims: {}, expirationTime: '', authTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null }),
            reload: async () => { },
            toJSON: () => ({}),
            phoneNumber: null,
            photoURL: null,
            providerId: 'demo'
        } as unknown as User;

        // Store demo user in localStorage for persistence
        localStorage.setItem('saucy_demo_user', JSON.stringify({
            uid: demoUser.uid,
            email: demoUser.email,
            displayName: demoUser.displayName
        }));

        // Update currentUser
        currentUser = demoUser;

        return { user: demoUser, error: null, isDemo: true };
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
        if (error.code === 'auth/operation-not-allowed') errorMessage = 'Email/Password sign-in is not enabled.';
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
/**
 * Get the current API key to use for Gemini operations
 * Priority: 1. AI Studio Bridge, 2. Firestore, 3. LocalStorage, 4. Environment Variable
 */
export const getSaucyApiKey = async (): Promise<{ key: string; error?: string }> => {
    // 1. Try AI Studio Bridge (Official environment)
    // @ts-ignore
    if (window.aistudio?.getApiKey) {
        try {
            // @ts-ignore
            const key = await window.aistudio.getApiKey();
            if (key && key !== 'PLACEHOLDER_API_KEY' && key.length > 10) {
                return { key };
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
                return { key: firestoreKey };
            }
        } catch (e) {
            console.warn("Firestore API key fetch failed", e);
        }
    }

    // 3. Try Local Storage (Manual entry fallback)
    const savedKey = localStorage.getItem('stickify_api_key');
    if (savedKey && savedKey.length > 20) {
        return { key: savedKey };
    }

    // 4. Try Environment Variables (Local dev with .env)
    const envKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey.length > 10) {
        return { key: envKey };
    }

    return {
        key: '',
        error: "No active API Key found. Please add a Gemini API key in settings."
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
