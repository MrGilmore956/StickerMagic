
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface AppSettings {
    landingCategoryOverride?: string;
    showdownActive?: boolean;
    featuredGifId?: string;
}

const SETTINGS_COLLECTION = 'settings';
const GLOBAL_CONFIG_ID = 'globalConfig';

/**
 * Get global app settings
 */
export const getAppSettings = async (): Promise<AppSettings | null> => {
    try {
        const settingsDoc = await getDoc(doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_ID));
        if (settingsDoc.exists()) {
            return settingsDoc.data() as AppSettings;
        }
        return null;
    } catch (error) {
        console.error('Error fetching app settings:', error);
        return null;
    }
};

/**
 * Update global app settings
 */
export const updateAppSettings = async (settings: Partial<AppSettings>): Promise<void> => {
    try {
        const settingsRef = doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_ID);
        await setDoc(settingsRef, settings, { merge: true });
    } catch (error) {
        console.error('Error updating app settings:', error);
        throw error;
    }
};

/**
 * Listen to settings changes
 */
export const subscribeToSettings = (callback: (settings: AppSettings) => void) => {
    return onSnapshot(doc(db, SETTINGS_COLLECTION, GLOBAL_CONFIG_ID), (doc) => {
        if (doc.exists()) {
            callback(doc.data() as AppSettings);
        }
    });
};
