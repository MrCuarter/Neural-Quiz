
import { getSafeImageUrl } from "./imageProxyService";
import { FALLBACK_IMAGES } from "../constants/fallbackImages";
import { ImageCredit } from "../types";

// --- 1. SAFE ENV ACCESS ---
const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || '';
    }
  } catch (e) { 
      console.warn('Env var error', e); 
  }
  return '';
};

// --- 2. CONFIGURATION ---
const KEYS = {
    UNSPLASH: getEnvVar('VITE_UNSPLASH_ACCESS_KEY'),
    PEXELS: getEnvVar('VITE_PEXELS_API_KEY'),
    PIXABAY: getEnvVar('VITE_PIXABAY_API_KEY')
};

export interface ImageResult {
    url: string;
    credit?: ImageCredit;
}

// --- 3. HELPER FUNCTIONS ---

const cleanQuery = (text: string): string => {
    if (!text) return "";
    // REMOVED AGGRESSIVE REGEX: Was deleting accents (á -> '').
    // Now we rely on the AI giving us English, but if it fails,
    // we want to preserve the Spanish text integrity for the API search.
    const clean = text.trim().replace(/\s+/g, ' '); 
    return clean; 
};

/**
 * UNSPLASH SPECIFIC: Trigger download event (Required by API terms)
 */
const trackUnsplashDownload = async (downloadLocation: string) => {
    if (!KEYS.UNSPLASH || !downloadLocation) return;
    try {
        await fetch(`${downloadLocation}&client_id=${KEYS.UNSPLASH}`);
    } catch (e) {
        console.warn("Unsplash tracking failed", e);
    }
};

// --- 4. MAIN SEARCH FUNCTION (WATERFALL) ---

export const searchImage = async (rawQuery: string | undefined, fallbackCategory: string = 'default'): Promise<ImageResult | null> => {
    const query = cleanQuery(rawQuery || "");
    
    // 0. Fallback Check
    if (!query) return getFallback(fallbackCategory);

    console.log(`[ImageService] Searching: "${query}" (Fallback: ${fallbackCategory})`);

    // --- STRATEGY 1: UNSPLASH (Priority) ---
    if (KEYS.UNSPLASH) {
        try {
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${KEYS.UNSPLASH}`;
            const res = await fetch(url);
            
            if (res.ok) {
                const data = await res.json();
                const photo = data.results?.[0];
                
                if (photo) {
                    // Trigger tracking (Fire & Forget)
                    trackUnsplashDownload(photo.links.download_location);

                    return {
                        url: getSafeImageUrl(photo.urls.regular) || photo.urls.regular,
                        credit: {
                            name: photo.user.name,
                            link: `${photo.user.links.html}?utm_source=NeuralQuiz&utm_medium=referral`,
                            source: 'Unsplash'
                        }
                    };
                }
            }
        } catch (e) {
            console.warn("[ImageService] Unsplash failed, trying next...", e);
        }
    }

    // --- STRATEGY 2: PEXELS ---
    if (KEYS.PEXELS) {
        try {
            const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&size=medium`;
            const res = await fetch(url, { headers: { Authorization: KEYS.PEXELS } });
            
            if (res.ok) {
                const data = await res.json();
                const photo = data.photos?.[0];
                
                if (photo) {
                    return {
                        url: getSafeImageUrl(photo.src.medium) || photo.src.medium,
                        credit: {
                            name: photo.photographer,
                            link: photo.photographer_url,
                            source: 'Pexels'
                        }
                    };
                }
            }
        } catch (e) {
            console.warn("[ImageService] Pexels failed, trying next...", e);
        }
    }

    // --- STRATEGY 3: PIXABAY ---
    if (KEYS.PIXABAY) {
        try {
            const url = `https://pixabay.com/api/?key=${KEYS.PIXABAY}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&orientation=horizontal`;
            const res = await fetch(url);
            
            if (res.ok) {
                const data = await res.json();
                const photo = data.hits?.[0];
                
                if (photo) {
                    return {
                        url: getSafeImageUrl(photo.webformatURL) || photo.webformatURL,
                        credit: {
                            name: photo.user,
                            link: photo.pageURL,
                            source: 'Pixabay'
                        }
                    };
                }
            }
        } catch (e) {
            console.warn("[ImageService] Pixabay failed, trying next...", e);
        }
    }

    // --- STRATEGY 4: LOCAL FALLBACK ---
    console.log(`[ImageService] All APIs failed. Using Fallback for: ${fallbackCategory}`);
    return getFallback(fallbackCategory);
};

const getFallback = (category: string): ImageResult => {
    const rawUrl = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.default;
    return {
        url: getSafeImageUrl(rawUrl) || rawUrl,
        credit: undefined // No credit needed for owned/CC0 local assets
    };
};
