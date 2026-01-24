
/**
 * Centralized API Key Management for Stickify
 */

export interface ApiKeyResult {
    key: string;
    isDemo: boolean;
    error?: string;
}

export const getStickifyApiKey = async (): Promise<ApiKeyResult> => {
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

    // 2. Try Local Storage (Manual entry fallback)
    const savedKey = localStorage.getItem('stickify_api_key');
    if (savedKey && savedKey.length > 20) {
        return { key: savedKey, isDemo: false };
    }

    // 3. Try Environment Variables (Local dev with .env)
    // Vite injects these into process.env or import.meta.env
    const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey.length > 10) {
        return { key: envKey, isDemo: false };
    }

    // 4. Default to Demo Mode
    return {
        key: '',
        isDemo: true,
        error: "No API Key found. Using Demo Mode. (Click 'CONNECT KEY' to use real AI)"
    };
};

export const saveStickifyApiKey = (key: string) => {
    if (key && key.length > 20) {
        localStorage.setItem('stickify_api_key', key.trim());
        return true;
    }
    return false;
};

export const clearStickifyApiKey = () => {
    localStorage.removeItem('stickify_api_key');
};
