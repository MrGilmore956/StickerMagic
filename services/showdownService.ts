import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    runTransaction
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface ShowdownGIF {
    id: string;
    title: string;
    url: string;
    votes: number;
}

export interface Showdown {
    id: string;
    gifA: ShowdownGIF;
    gifB: ShowdownGIF;
    endsAt: Date;
    status: 'active' | 'completed';
    winner: 'A' | 'B' | null;
    createdAt: Date;
}

export interface ShowdownVote {
    odId: string;
    odFor: 'A' | 'B';
    timestamp: Date;
}

export interface UserSauceStats {
    sauceSenseScore: number;
    totalVotes: number;
    correctPicks: number;
}

// ============================================================================
// SHOWDOWN SERVICE
// ============================================================================

/**
 * Get today's date string for document IDs
 */
const getTodayId = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // "2026-01-26"
};

/**
 * Get the current active showdown
 */
export const getCurrentShowdown = async (): Promise<Showdown | null> => {
    try {
        const todayId = getTodayId();
        const showdownRef = doc(db, 'showdowns', todayId);
        const showdownSnap = await getDoc(showdownRef);

        if (!showdownSnap.exists()) {
            return null;
        }

        const data = showdownSnap.data();
        return {
            id: showdownSnap.id,
            gifA: data.gifA,
            gifB: data.gifB,
            endsAt: data.endsAt.toDate(),
            status: data.status,
            winner: data.winner,
            createdAt: data.createdAt.toDate()
        };
    } catch (error) {
        console.error('Error fetching showdown:', error);
        return null;
    }
};

/**
 * Subscribe to real-time showdown updates
 */
export const subscribeToShowdown = (
    callback: (showdown: Showdown | null) => void
): (() => void) => {
    const todayId = getTodayId();
    const showdownRef = doc(db, 'showdowns', todayId);

    return onSnapshot(showdownRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }

        const data = snapshot.data();
        callback({
            id: snapshot.id,
            gifA: data.gifA,
            gifB: data.gifB,
            endsAt: data.endsAt.toDate(),
            status: data.status,
            winner: data.winner,
            createdAt: data.createdAt.toDate()
        });
    });
};

/**
 * Cast a vote in the current showdown
 * Now accepts email and displayName to store directly in vote record
 */
export const castVote = async (
    userId: string,
    choice: 'A' | 'B',
    userEmail?: string,
    userDisplayName?: string
): Promise<{ success: boolean; message: string }> => {
    try {
        const todayId = getTodayId();
        const voteId = `${todayId}_${userId}`;
        const voteRef = doc(db, 'showdownVotes', voteId);

        // Check if user already voted
        const existingVote = await getDoc(voteRef);
        if (existingVote.exists()) {
            return { success: false, message: 'You already voted today!' };
        }

        // Record vote and increment counter atomically
        await runTransaction(db, async (transaction) => {
            const showdownRef = doc(db, 'showdowns', todayId);
            const showdownSnap = await transaction.get(showdownRef);

            if (!showdownSnap.exists()) {
                throw new Error('No active showdown');
            }

            const showdownData = showdownSnap.data();

            // Check if showdown has ended
            const endsAt = showdownData.endsAt?.toDate?.() || showdownData.endsAt;
            if (endsAt && new Date() > endsAt) {
                throw new Error('Showdown has ended');
            }

            // Check if showdown is already completed
            if (showdownData.status === 'completed') {
                throw new Error('Showdown has ended');
            }

            // Record user's vote with email and displayName for reliable lookup
            transaction.set(voteRef, {
                odId: userId,
                votedFor: choice,
                timestamp: Timestamp.now(),
                // Store user info directly in vote record for reliable lookup
                email: userEmail || '',
                displayName: userDisplayName || ''
            });

            // Increment vote count
            const voteField = choice === 'A' ? 'gifA.votes' : 'gifB.votes';
            transaction.update(showdownRef, {
                [voteField]: increment(1)
            });
        });

        return { success: true, message: 'Vote recorded!' };
    } catch (error: any) {
        console.error('Error casting vote:', error);
        if (error.message === 'Showdown has ended') {
            return { success: false, message: 'This showdown has ended!' };
        }
        return { success: false, message: 'Failed to record vote' };
    }
};

/**
 * Check if user has already voted today
 */
export const hasUserVoted = async (userId: string): Promise<boolean> => {
    try {
        const todayId = getTodayId();
        const voteId = `${todayId}_${userId}`;
        const voteRef = doc(db, 'showdownVotes', voteId);
        const voteSnap = await getDoc(voteRef);
        return voteSnap.exists();
    } catch (error) {
        console.error('Error checking vote status:', error);
        return false;
    }
};

export interface VoterInfo {
    odId: string;
    votedFor: 'A' | 'B';
    timestamp: Date;
    email?: string;
    displayName?: string;
}

/**
 * Get all voters for today's showdown with user details (Admin only)
 * Now prefers email/displayName stored directly in vote record (for new votes)
 * Falls back to user profile lookup for older votes that don't have this info
 */
export const getShowdownVoters = async (): Promise<VoterInfo[]> => {
    try {
        const todayId = getTodayId();
        const votesRef = collection(db, 'showdownVotes');
        const q = query(
            votesRef,
            where('timestamp', '>=', Timestamp.fromDate(new Date(todayId + 'T00:00:00'))),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);
        const voters: VoterInfo[] = [];

        for (const voteDoc of snapshot.docs) {
            const data = voteDoc.data();
            const odId = data.odId;

            // First, check if email/displayName are stored directly in the vote record (new format)
            let email = data.email || '';
            let displayName = data.displayName || '';

            // If not found in vote record, fall back to user profile lookup (old format)
            if (!email && !displayName) {
                try {
                    const userRef = doc(db, 'users', odId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        email = userData.email || '';
                        displayName = userData.displayName || userData.name || '';
                    }
                } catch (e) {
                    // User profile not found, continue
                }
            }

            voters.push({
                odId,
                votedFor: data.votedFor,
                timestamp: data.timestamp?.toDate?.() || new Date(),
                email,
                displayName
            });
        }

        return voters;
    } catch (error) {
        console.error('Error fetching voters:', error);
        return [];
    }
};

/**
 * Get user's vote for today
 */
export const getUserVote = async (userId: string): Promise<'A' | 'B' | null> => {
    try {
        const todayId = getTodayId();
        const voteId = `${todayId}_${userId}`;
        const voteRef = doc(db, 'showdownVotes', voteId);
        const voteSnap = await getDoc(voteRef);

        if (!voteSnap.exists()) {
            return null;
        }

        return voteSnap.data().votedFor;
    } catch (error) {
        console.error('Error getting user vote:', error);
        return null;
    }
};

/**
 * Get user's Sauce Sense stats
 */
export const getUserSauceStats = async (userId: string): Promise<UserSauceStats> => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return { sauceSenseScore: 0, totalVotes: 0, correctPicks: 0 };
        }

        const data = userSnap.data();
        return {
            sauceSenseScore: data.sauceSenseScore || 0,
            totalVotes: data.showdownVotes || 0,
            correctPicks: data.sauceSenseScore || 0
        };
    } catch (error) {
        console.error('Error getting sauce stats:', error);
        return { sauceSenseScore: 0, totalVotes: 0, correctPicks: 0 };
    }
};

/**
 * Calculate time remaining until showdown ends
 */
export const getTimeRemaining = (endsAt: Date): { hours: number; minutes: number; seconds: number } => {
    const now = new Date();
    const diff = Math.max(0, endsAt.getTime() - now.getTime());

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
};

/**
 * Create a new showdown (Admin only)
 */
export const createShowdown = async (
    gifA: Omit<ShowdownGIF, 'votes'>,
    gifB: Omit<ShowdownGIF, 'votes'>
): Promise<{ success: boolean; message: string }> => {
    try {
        const todayId = getTodayId();
        const showdownRef = doc(db, 'showdowns', todayId);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        await setDoc(showdownRef, {
            gifA: { ...gifA, votes: 0 },
            gifB: { ...gifB, votes: 0 },
            endsAt: Timestamp.fromDate(endOfDay),
            status: 'active',
            winner: null,
            createdAt: Timestamp.now()
        });

        return { success: true, message: 'Showdown created successfully!' };
    } catch (error) {
        console.error('Error creating showdown:', error);
        return { success: false, message: 'Failed to create showdown' };
    }
};

/**
 * Seed a test showdown with Fire vs Mind Blown
 */
export const seedTestShowdown = async (): Promise<{ success: boolean; message: string }> => {
    return createShowdown(
        {
            id: 'gif-fire',
            title: 'Fire - Too Hot 🔥',
            url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif'
        },
        {
            id: 'gif-mindblown',
            title: 'Mind Blown 🤯',
            url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif'
        }
    );
};

// ============================================================================
// ADMIN CONTROLS
// ============================================================================

/**
 * Reset all votes for today's showdown (Admin only)
 */
export const resetShowdownVotes = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const todayId = getTodayId();
        const showdownRef = doc(db, 'showdowns', todayId);
        const showdownSnap = await getDoc(showdownRef);

        if (!showdownSnap.exists()) {
            return { success: false, message: 'No active showdown to reset' };
        }

        // Reset vote counts to 0
        await updateDoc(showdownRef, {
            'gifA.votes': 0,
            'gifB.votes': 0
        });

        // Note: Individual vote records in showdownVotes collection are kept for audit
        // but the counts are reset. To fully reset, you'd need to delete those too.

        return { success: true, message: 'Vote counters reset to 0!' };
    } catch (error) {
        console.error('Error resetting votes:', error);
        return { success: false, message: 'Failed to reset votes' };
    }
};

/**
 * End the current showdown early and optionally declare a winner (Admin only)
 */
export const endShowdownEarly = async (
    winner?: 'A' | 'B'
): Promise<{ success: boolean; message: string }> => {
    try {
        const todayId = getTodayId();
        const showdownRef = doc(db, 'showdowns', todayId);
        const showdownSnap = await getDoc(showdownRef);

        if (!showdownSnap.exists()) {
            return { success: false, message: 'No active showdown to end' };
        }

        const data = showdownSnap.data();

        // If no winner specified, determine by votes
        let finalWinner: 'A' | 'B' | null = winner || null;
        if (!finalWinner) {
            const votesA = data.gifA?.votes || 0;
            const votesB = data.gifB?.votes || 0;
            if (votesA > votesB) finalWinner = 'A';
            else if (votesB > votesA) finalWinner = 'B';
            // If tied, no winner
        }

        await updateDoc(showdownRef, {
            status: 'completed',
            winner: finalWinner,
            endsAt: Timestamp.now() // End immediately
        });

        return {
            success: true,
            message: finalWinner
                ? `Showdown ended! Winner: ${finalWinner === 'A' ? 'Challenger' : 'Defender'}`
                : 'Showdown ended (tie or no winner declared)'
        };
    } catch (error) {
        console.error('Error ending showdown:', error);
        return { success: false, message: 'Failed to end showdown' };
    }
};

/**
 * Update the GIFs in the current showdown (Admin only)
 */
export const updateShowdownGifs = async (
    gifA?: Omit<ShowdownGIF, 'votes'>,
    gifB?: Omit<ShowdownGIF, 'votes'>
): Promise<{ success: boolean; message: string }> => {
    try {
        const todayId = getTodayId();
        const showdownRef = doc(db, 'showdowns', todayId);
        const showdownSnap = await getDoc(showdownRef);

        if (!showdownSnap.exists()) {
            return { success: false, message: 'No active showdown to update' };
        }

        const data = showdownSnap.data();
        const updates: Record<string, any> = {};

        if (gifA) {
            updates['gifA'] = { ...gifA, votes: data.gifA?.votes || 0 };
        }
        if (gifB) {
            updates['gifB'] = { ...gifB, votes: data.gifB?.votes || 0 };
        }

        if (Object.keys(updates).length === 0) {
            return { success: false, message: 'No GIF changes provided' };
        }

        await updateDoc(showdownRef, updates);

        return { success: true, message: 'Showdown GIFs updated!' };
    } catch (error) {
        console.error('Error updating showdown GIFs:', error);
        return { success: false, message: 'Failed to update GIFs' };
    }
};
