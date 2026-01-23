
import { getSafeImageUrl } from "./imageProxyService";
import { FALLBACK_IMAGES } from "../constants/fallbackImages";

// Helper to safely get environment variables
const getEnv = (key: string): string => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {}
    
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key] || "";
        }
    } catch (e) {}
    
    return "";
};

// --- CONFIGURATION ---
const KEYS = {
    UNSPLASH: getEnv("VITE_UNSPLASH_ACCESS_KEY"),
    PEXELS: getEnv("VITE_PEXELS_API_KEY"),
    PIXABAY: getEnv("VITE_PIXABAY_API_KEY")
};

// --- UNIFIED DATA STRUCTURE ---
export interface ImageResult {
    url: string;       // Hotlink URL (Original or Large)
    alt: string;       // Alt text or description
    attribution: {
        sourceName: 'Unsplash' | 'Pexels' | 'Pixabay' | 'NeuralQuiz';
        authorName: string;
        authorUrl: string;
        downloadLocation: string | null; // Vital for Unsplash API compliance
    } | null;
}

/**
 * TRIGGER DOWNLOAD (FIRE-AND-FORGET)
 * Critical for Unsplash Production Compliance.
 * Execute this when the user *selects* the image to use it.
 */
export const triggerDownload = async (downloadLocation?: string | null) => {
    if (!downloadLocation) return;
    
    // Check if we have a key before attempting to hit the API
    if (downloadLocation.includes('api.unsplash.com') && !KEYS.UNSPLASH) {
        return; // Cannot trigger without key
    }

    let url = downloadLocation;
    if (url.includes('api.unsplash.com') && KEYS.UNSPLASH) {
        url += `${url.includes('?') ? '&' : '?'}client_id=${KEYS.UNSPLASH}`;
    }

    try {
        console.log(`[ImageService] 📡 Triggering download event: ${url}`);
        await fetch(url, { mode: 'no-cors' }); // Fire and forget
    } catch (e) {
        console.warn("[ImageService] Download trigger failed silently", e);
    }
};

// --- PROVIDER SEARCH FUNCTIONS ---

const searchUnsplash = async (query: string): Promise<ImageResult[]> => {
    // 🛡️ SHIELD: Return empty if no key, preventing invalid fetch
    if (!KEYS.UNSPLASH) {
        console.warn("⚠️ [ImageService] Missing Unsplash Key. Skipping.");
        return [];
    }

    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&client_id=${KEYS.UNSPLASH}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        
        const data = await res.json();
        return (data.results || []).map((photo: any) => ({
            url: photo.urls.regular, // Hotlinking allowed by Unsplash
            alt: photo.alt_description || "Unsplash Image",
            attribution: {
                sourceName: 'Unsplash',
                authorName: photo.user.name || "Unknown",
                // UTM params required by Unsplash API Guidelines
                authorUrl: `${photo.user.links.html}?utm_source=NeuralQuiz&utm_medium=referral`, 
                downloadLocation: photo.links.download_location
            }
        }));
    } catch (e) {
        console.warn("[ImageService] Unsplash Error:", e);
        return [];
    }
};

const searchPexels = async (query: string): Promise<ImageResult[]> => {
    // 🛡️ SHIELD
    if (!KEYS.PEXELS) {
        console.warn("⚠️ [ImageService] Missing Pexels Key. Skipping.");
        return [];
    }

    try {
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&size=medium`;
        const res = await fetch(url, { headers: { Authorization: KEYS.PEXELS } });
        if (!res.ok) throw new Error(`Status ${res.status}`);

        const data = await res.json();
        return (data.photos || []).map((photo: any) => ({
            url: photo.src.large2x || photo.src.large, // Pexels hotlinking
            alt: photo.alt || "Pexels Image",
            attribution: {
                sourceName: 'Pexels',
                authorName: photo.photographer || "Unknown",
                authorUrl: photo.photographer_url || "https://www.pexels.com",
                downloadLocation: null
            }
        }));
    } catch (e) {
        console.warn("[ImageService] Pexels Error:", e);
        return [];
    }
};

const searchPixabay = async (query: string): Promise<ImageResult[]> => {
    // 🛡️ SHIELD
    if (!KEYS.PIXABAY) {
        console.warn("⚠️ [ImageService] Missing Pixabay Key. Skipping.");
        return [];
    }

    try {
        const url = `https://pixabay.com/api/?key=${KEYS.PIXABAY}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&orientation=horizontal&per_page=20`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status ${res.status}`);

        const data = await res.json();
        return (data.hits || []).map((hit: any) => ({
            url: hit.webformatURL, // Pixabay hotlinking
            alt: hit.tags || "Pixabay Image",
            attribution: {
                sourceName: 'Pixabay',
                authorName: hit.user || "Unknown",
                authorUrl: hit.pageURL || "https://pixabay.com",
                downloadLocation: null
            }
        }));
    } catch (e) {
        console.warn("[ImageService] Pixabay Error:", e);
        return [];
    }
};

// --- AGGREGATED SEARCH (For UI) ---

/**
 * Searches multiple providers in parallel and aggregates results.
 * Robustness: One provider failing will NOT stop the others.
 */
export const searchStockImages = async (query: string): Promise<ImageResult[]> => {
    if (!query.trim()) return [];
    
    // Run all enabled providers in parallel
    const promises = [
        searchPixabay(query),
        searchPexels(query),
        searchUnsplash(query)
    ];

    const results = await Promise.allSettled(promises);
    
    // Flatten successful results
    const combined: ImageResult[] = results
        .filter(r => r.status === 'fulfilled')
        // @ts-ignore
        .flatMap(r => r.value);

    return combined;
};

// --- SINGLE SEARCH (Waterfall Logic for AI) ---

/**
 * Tries providers in order: Pixabay -> Pexels -> Unsplash -> Local Fallback.
 * Returns the first valid single result found.
 */
export const searchImage = async (rawQuery: string | undefined, fallbackCategory: string = 'default'): Promise<ImageResult | null> => {
    const query = rawQuery ? rawQuery.trim() : "";
    if (!query) return getFallback(fallbackCategory);

    console.log(`[ImageService] 🌊 Waterfall Search: "${query}"`);

    // 1. Try Pixabay
    if (KEYS.PIXABAY) {
        const pixabayResults = await searchPixabay(query);
        if (pixabayResults.length > 0) return pixabayResults[0];
    }

    // 2. Try Pexels
    if (KEYS.PEXELS) {
        const pexelsResults = await searchPexels(query);
        if (pexelsResults.length > 0) return pexelsResults[0];
    }

    // 3. Try Unsplash (Best quality, strictly rate limited)
    if (KEYS.UNSPLASH) {
        const unsplashResults = await searchUnsplash(query);
        if (unsplashResults.length > 0) {
            // Important: Trigger download immediately for AI auto-selection
            if (unsplashResults[0].attribution?.downloadLocation) {
                triggerDownload(unsplashResults[0].attribution.downloadLocation);
            }
            return unsplashResults[0];
        }
    }

    // 4. Fallback
    console.log("[ImageService] 🏳️ All providers failed (or keys missing). Using Fallback.");
    return getFallback(fallbackCategory);
};

const getFallback = (category: string): ImageResult => {
    const rawUrl = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.default;
    // Proxied URL for safety/formatting
    const safeUrl = getSafeImageUrl(rawUrl) || rawUrl;
    
    return {
        url: safeUrl,
        alt: "Neural Fallback Image",
        attribution: null // No attribution needed for owned assets
    };
};
