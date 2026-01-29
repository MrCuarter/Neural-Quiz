
import { getSafeImageUrl } from "./imageProxyService";

// Helper to safely get environment variables
const getEnv = (key: string): string => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            return import.meta.env[key] || "";
        }
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env) {
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

// --- SECURE ASSETS CONFIG (GITHUB RAW) ---
const FALLBACK_BASE_URL = 'https://raw.githubusercontent.com/MrCuarter/neuralquiz-assets/main/images/';
const FALLBACK_FILES = [
  'hombrepensando4.png',
  'mujerpensando.png',
  'ninapensando.png',
  'ninopensando.jpg',
  'teengirlpensando.png',
  'teenpensando.png',
  'unipensando.png'
];

// --- TYPES ---
export interface ImageResult {
    url: string;       
    alt: string;       
    attribution: {
        sourceName: string; // 'Unsplash' | 'Pexels' | 'Pixabay' | 'Local'
        authorName: string;
        authorUrl: string;
        downloadLocation?: string | null; // Vital for Unsplash API compliance
    } | null;
}

/**
 * TRIGGER DOWNLOAD (FIRE-AND-FORGET)
 * Critical for Unsplash Production Compliance.
 */
export const triggerDownload = async (downloadLocation?: string | null) => {
    if (!downloadLocation) return;
    
    // Don't trigger if we don't have a key (dev mode safety)
    if (downloadLocation.includes('api.unsplash.com') && !KEYS.UNSPLASH) return;

    let url = downloadLocation;
    if (url.includes('api.unsplash.com') && KEYS.UNSPLASH) {
        url += `${url.includes('?') ? '&' : '?'}client_id=${KEYS.UNSPLASH}`;
    }

    try {
        await fetch(url, { mode: 'no-cors' }); 
    } catch (e) {
        console.warn("[ImageService] Download trigger failed silently", e);
    }
};

// --- FALLBACK GENERATOR (DIRECT GITHUB LINK) ---
const getRandomFallback = (): ImageResult => {
    const filename = FALLBACK_FILES[Math.floor(Math.random() * FALLBACK_FILES.length)];
    const finalUrl = `${FALLBACK_BASE_URL}${filename}`;
    
    return {
        url: finalUrl, // Direct secure link, NO PROXY
        alt: "Neural Thinking",
        attribution: {
            sourceName: 'Local',
            authorName: 'NeuralQuiz',
            authorUrl: 'https://mistercuarter.es',
            downloadLocation: null
        }
    };
};

// --- PROVIDER SEARCH FUNCTIONS ---

const fetchUnsplash = async (query: string): Promise<ImageResult> => {
    if (!KEYS.UNSPLASH) throw new Error("No API Key");
    
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${KEYS.UNSPLASH}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Unsplash Error: ${res.status}`);
    
    const data = await res.json();
    if (!data.results || data.results.length === 0) throw new Error("No results");

    const photo = data.results[0];
    return {
        url: photo.urls.regular, 
        alt: photo.alt_description || query,
        attribution: {
            sourceName: 'Unsplash',
            authorName: photo.user.name,
            authorUrl: `${photo.user.links.html}?utm_source=NeuralQuiz&utm_medium=referral`,
            downloadLocation: photo.links.download_location
        }
    };
};

const fetchPexels = async (query: string): Promise<ImageResult> => {
    if (!KEYS.PEXELS) throw new Error("No API Key");

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&size=medium`;
    const res = await fetch(url, { headers: { Authorization: KEYS.PEXELS } });
    if (!res.ok) throw new Error(`Pexels Error: ${res.status}`);

    const data = await res.json();
    if (!data.photos || data.photos.length === 0) throw new Error("No results");

    const photo = data.photos[0];
    return {
        url: photo.src.large2x || photo.src.large,
        alt: photo.alt || query,
        attribution: {
            sourceName: 'Pexels',
            authorName: photo.photographer,
            authorUrl: photo.photographer_url,
            downloadLocation: null
        }
    };
};

const fetchPixabay = async (query: string): Promise<ImageResult> => {
    if (!KEYS.PIXABAY) throw new Error("No API Key");

    const url = `https://pixabay.com/api/?key=${KEYS.PIXABAY}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&orientation=horizontal&per_page=3`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pixabay Error: ${res.status}`);

    const data = await res.json();
    if (!data.hits || data.hits.length === 0) throw new Error("No results");

    const hit = data.hits[0];
    return {
        url: hit.webformatURL,
        alt: hit.tags || query,
        attribution: {
            sourceName: 'Pixabay',
            authorName: hit.user,
            authorUrl: `https://pixabay.com/users/${hit.user}-${hit.user_id}/`,
            downloadLocation: null
        }
    };
};

// --- AGGREGATED SEARCH (For UI Modal) ---
export const searchStockImages = async (query: string): Promise<ImageResult[]> => {
    if (!query.trim()) return [];
    
    // This allows parallel fetching for the UI picker to show variety
    const [unsplash, pexels, pixabay] = await Promise.allSettled([
        fetchUnsplash(query).then(r => [r]).catch(() => []), 
        fetchPexels(query).then(r => [r]).catch(() => []),
        fetchPixabay(query).then(r => [r]).catch(() => [])
    ]);

    const results: ImageResult[] = [];
    if (unsplash.status === 'fulfilled') results.push(...unsplash.value);
    if (pexels.status === 'fulfilled') results.push(...pexels.value);
    if (pixabay.status === 'fulfilled') results.push(...pixabay.value);

    return results;
};

// --- ROBUST WATERFALL SEARCH (For AI) ---

/**
 * STRICT PRIORITY: Unsplash -> Pexels -> Pixabay -> Secure GitHub Fallback
 * Ensures errors in one provider do NOT stop the chain.
 */
export const searchImage = async (rawQuery: string | undefined, fallbackCategory: string = 'default'): Promise<ImageResult> => {
    const query = rawQuery ? rawQuery.trim() : "";
    
    // 0. Validation
    if (!query || query.length < 2) return getRandomFallback();

    console.log(`[ImageService] 🌊 Waterfall Search Start: "${query}"`);

    // 1. Try Unsplash
    try {
        const result = await fetchUnsplash(query);
        if (result) {
            if (result.attribution?.downloadLocation) {
                triggerDownload(result.attribution.downloadLocation);
            }
            return result;
        }
    } catch (e) {
        // Silent fail
    }

    // 2. Try Pexels
    try {
        const result = await fetchPexels(query);
        if (result) return result;
    } catch (e) {
        // Silent fail
    }

    // 3. Try Pixabay
    try {
        const result = await fetchPixabay(query);
        if (result) return result;
    } catch (e) {
        // Silent fail
    }

    // 4. Fallback (Secure GitHub CDN)
    return getRandomFallback();
};
