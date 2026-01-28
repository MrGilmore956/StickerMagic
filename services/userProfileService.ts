/**
 * User Profile Service - Firestore persistence for Saucy user profiles
 */

import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    getDocs,
    orderBy,
    limit,
    addDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    role: 'user' | 'admin' | 'owner';

    // Referrals (track now, reward later)
    referralCode: string;
    referredBy?: string;
    referralCount: number;

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Owner - Brian Taylor has ultimate authority over everything
const OWNER_EMAIL = 'brntay956@gmail.com';

// Admin emails list - can be moved to Firestore later
const ADMIN_EMAILS = [
    'admin@saucy.com',
    'ted@432labs.io', // Ted Samuels
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

    // Determine role based on email (owner > admin > user)
    const emailLower = email.toLowerCase();
    const role = emailLower === OWNER_EMAIL
        ? 'owner'
        : ADMIN_EMAILS.includes(emailLower)
            ? 'admin'
            : 'user';

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
 * Check if a user is an admin (or owner - owners have all admin privileges)
 */
export const isUserAdmin = async (uid: string): Promise<boolean> => {
    const profile = await getUserProfile(uid);
    return profile?.role === 'admin' || profile?.role === 'owner';
};

/**
 * Check if a user is the owner (ultimate authority)
 */
export const isUserOwner = async (uid: string): Promise<boolean> => {
    const profile = await getUserProfile(uid);
    return profile?.role === 'owner';
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
        // Determine what role the user SHOULD have based on email
        const emailLower = email.toLowerCase();
        const correctRole = emailLower === OWNER_EMAIL
            ? 'owner'
            : ADMIN_EMAILS.includes(emailLower)
                ? 'admin'
                : existing.role; // Keep their current role if not owner/admin

        // Update basic info and role if needed
        const needsUpdate =
            existing.displayName !== displayName ||
            existing.photoURL !== photoURL ||
            existing.role !== correctRole;

        if (needsUpdate) {
            await updateUserProfile(uid, {
                displayName,
                photoURL,
                role: correctRole
            });
            console.log(`Updated user ${email} role from '${existing.role}' to '${correctRole}'`);
        }
        return { ...existing, displayName, photoURL, role: correctRole };
    }
    return createUserProfile(uid, email, displayName, photoURL);
};

// ============================================
// ADMIN USER MANAGEMENT FUNCTIONS
// ============================================

export interface RoleChangeAudit {
    id?: string;
    targetUid: string;
    targetEmail: string;
    previousRole: UserProfile['role'];
    newRole: UserProfile['role'];
    changedByUid: string;
    changedByEmail: string;
    reason?: string;
    timestamp: Timestamp;
}

/**
 * Get all registered users (admin only)
 */
export const getAllUsers = async (maxResults: number = 100): Promise<UserProfile[]> => {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'), limit(maxResults));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
        console.error('Failed to get all users:', error);
        return [];
    }
};

/**
 * Change a user's role (owner only can change admins, admins can change regular users)
 */
export const changeUserRole = async (
    targetUid: string,
    newRole: UserProfile['role'],
    changedByUid: string,
    reason?: string
): Promise<{ success: boolean; message: string }> => {
    try {
        // Get the admin making the change
        const adminProfile = await getUserProfile(changedByUid);
        if (!adminProfile) {
            return { success: false, message: 'Admin profile not found' };
        }

        // Only owners and admins can change roles
        if (adminProfile.role !== 'owner' && adminProfile.role !== 'admin') {
            return { success: false, message: 'Insufficient permissions' };
        }

        // Get target user
        const targetProfile = await getUserProfile(targetUid);
        if (!targetProfile) {
            return { success: false, message: 'Target user not found' };
        }

        // Only owner can modify admin roles or create new owners
        if (newRole === 'owner' || targetProfile.role === 'admin' || newRole === 'admin') {
            if (adminProfile.role !== 'owner') {
                return { success: false, message: 'Only owner can modify admin roles' };
            }
        }

        // Cannot change owner's role
        if (targetProfile.role === 'owner') {
            return { success: false, message: 'Cannot change owner role' };
        }

        // Cannot demote yourself if you're owner
        if (targetUid === changedByUid && adminProfile.role === 'owner') {
            return { success: false, message: 'Owner cannot demote themselves' };
        }

        const previousRole = targetProfile.role;

        // Update user role
        await updateUserProfile(targetUid, { role: newRole });

        // Create audit log entry
        const auditEntry: Omit<RoleChangeAudit, 'id' | 'timestamp'> & { timestamp: any } = {
            targetUid,
            targetEmail: targetProfile.email,
            previousRole,
            newRole,
            changedByUid,
            changedByEmail: adminProfile.email,
            reason,
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'role_change_audit'), auditEntry);

        console.log(`Role changed: ${targetProfile.email} from '${previousRole}' to '${newRole}' by ${adminProfile.email}`);

        return {
            success: true,
            message: `Changed ${targetProfile.displayName}'s role from ${previousRole} to ${newRole}`
        };
    } catch (error) {
        console.error('Failed to change user role:', error);
        return { success: false, message: 'Failed to change role' };
    }
};

/**
 * Get role change history (audit log)
 */
export const getRoleChangeHistory = async (maxResults: number = 50): Promise<RoleChangeAudit[]> => {
    try {
        const auditRef = collection(db, 'role_change_audit');
        const q = query(auditRef, orderBy('timestamp', 'desc'), limit(maxResults));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as RoleChangeAudit));
    } catch (error) {
        console.error('Failed to get role change history:', error);
        return [];
    }
};
