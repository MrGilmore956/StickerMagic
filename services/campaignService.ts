/**
 * Campaign Service - Manage social marketing campaigns
 */

import { db } from './firebaseConfig';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

const CAMPAIGN_COLLECTION = 'campaigns';

export interface Campaign {
    id: string;
    name: string;
    platform: 'twitter' | 'instagram' | 'tiktok' | 'linkedin';
    status: 'draft' | 'scheduled' | 'active' | 'completed';
    startDate: Date;
    endDate?: Date;
    gifId: string;
    gifUrl: string;
    postText: string;
    reach?: number;
    engagement?: number;
    postedAt?: Date;
    updatedAt?: Date;
    createdAt: Date;
}

/**
 * Get all campaigns
 */
export async function getAllCampaigns(): Promise<Campaign[]> {
    try {
        const q = query(collection(db, CAMPAIGN_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                startDate: data.startDate?.toDate() || new Date(),
                endDate: data.endDate?.toDate(),
                createdAt: data.createdAt?.toDate() || new Date()
            } as Campaign;
        });
    } catch (error) {
        console.error('Error getting campaigns:', error);
        return [];
    }
}

/**
 * Create or update a campaign
 */
export async function saveCampaign(campaign: Partial<Campaign>): Promise<string> {
    const id = campaign.id || doc(collection(db, CAMPAIGN_COLLECTION)).id;
    const ref = doc(db, CAMPAIGN_COLLECTION, id);

    const data = {
        ...campaign,
        id,
        updatedAt: serverTimestamp()
    };

    if (!campaign.id) {
        // @ts-ignore
        data.createdAt = serverTimestamp();
    }

    await setDoc(ref, data, { merge: true });
    return id;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
    await deleteDoc(doc(db, CAMPAIGN_COLLECTION, id));
}

/**
 * Seed initial campaigns if none exist
 */
export async function seedInitialCampaigns(): Promise<void> {
    const campaigns = await getAllCampaigns();
    if (campaigns.length > 0) return;

    const demoCampaigns: Partial<Campaign>[] = [
        {
            name: 'Launch Blitz',
            platform: 'twitter',
            status: 'active',
            startDate: new Date(),
            gifId: 'launch-gif',
            gifUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
            postText: 'Saucy is officially LIVE! 🔥 Search and created GIFs like never before. #SaucyLaunch #AI #GIFs',
            reach: 12500,
            engagement: 840
        },
        {
            name: 'Meme Monday',
            platform: 'instagram',
            status: 'scheduled',
            startDate: new Date(Date.now() + 86400000),
            gifId: 'monday-gif',
            gifUrl: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
            postText: 'That Monday morning feeling... ☕️ #MemeMonday #Saucy',
            reach: 0,
            engagement: 0
        }
    ];

    for (const c of demoCampaigns) {
        await saveCampaign(c);
    }
}
