/**
 * User Profile Service - Firestore persistence for Saucy user profiles
 */

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    role: 'user' | 'admin';

    // Referrals (track now, reward later)
    referralCode: string;
    referredBy?: string;
    referralCount: number;

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Admin emails list - can be moved to Firestore later
const ADMIN_EMAILS = [
    'brntay956@gmail.com',
    'admin@saucy.com',
];

/**
 * Generate a unique referral code for a user
 */
const generateReferralCode = (displayName: string): string => {
    const cleanName = displayName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 5);
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `SAUCY-${cleanName}${randomDigits}`;
};

/**
 * Create a new user profile on first sign-in
 */
export const createUserProfile = async (
    uid: string,
    email: string,
    displayName: string,
    photoURL: string,
    referredBy?: string
): Promise<UserProfile> => {
    const userRef = doc(db, 'users', uid);

    // Check if user already exists
    const existingDoc = await getDoc(userRef);
    if (existingDoc.exists()) {
        return existingDoc.data() as UserProfile;
    }

    // Determine role based on email
    const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';

    const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & { createdAt: any; updatedAt: any } = {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: photoURL || '',
        role,
        referralCode: generateReferralCode(displayName || email),
        referredBy,
        referralCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, profile);

    // If referred by someone, increment their referral count
    if (referredBy) {
        await incrementReferralCount(referredBy);
    }

    // Fetch the created profile to get proper timestamps
    const createdDoc = await getDoc(userRef);
    return createdDoc.data() as UserProfile;
};

/**
 * Get a user's profile
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    // Demo/Test bypass for admin
    if (uid === 'admin-test-uid') {
        return {
            uid: 'admin-test-uid',
            email: 'admin@saucy.com',
            displayName: 'Admin (Test)',
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
            role: 'admin',
            referralCode: 'SAUCY-ADMIN',
            referralCount: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
    }

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    }
    return null;
};

/**
 * Update a user's profile
 */
export const updateUserProfile = async (
    uid: string,
    updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    }, { merge: true });
};

/**
 * Check if a user is an admin
 */
export const isUserAdmin = async (uid: string): Promise<boolean> => {
    const profile = await getUserProfile(uid);
    return profile?.role === 'admin';
};

/**
 * Increment a user's referral count
 */
const incrementReferralCount = async (uid: string): Promise<void> => {
    const profile = await getUserProfile(uid);
    if (profile) {
        await updateUserProfile(uid, {
            referralCount: (profile.referralCount || 0) + 1,
        });
    }
};

/**
 * Get or create user profile on sign-in
 */
export const ensureUserProfile = async (
    uid: string,
    email: string,
    displayName: string,
    photoURL: string
): Promise<UserProfile> => {
    // Demo/Test bypass for admin
    if (uid === 'admin-test-uid' || email === 'admin@saucy.com') {
        return {
            uid: 'admin-test-uid',
            email: 'admin@saucy.com',
            displayName: 'Admin (Test)',
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
            role: 'admin',
            referralCode: 'SAUCY-ADMIN',
            referralCount: 0,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
    }

    const existing = await getUserProfile(uid);
    if (existing) {
        // Update basic info in case it changed
        if (existing.displayName !== displayName || existing.photoURL !== photoURL) {
            await updateUserProfile(uid, { displayName, photoURL });
        }
        return { ...existing, displayName, photoURL };
    }
    return createUserProfile(uid, email, displayName, photoURL);
};
