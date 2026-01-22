
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
  try {
      if (typeof process !== 'undefined' && process.env) {
          return process.env[key] || '';
      }
  } catch(e) {}
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

// --- 4. MAIN SEARCH FUNCTION (WATERFALL ROBUST) ---

export const searchImage = async (rawQuery: string | undefined, fallbackCategory: string = 'default'): Promise<ImageResult | null> => {
    // Direct usage of the query provided by AI (presumed to be optimized English keywords)
    const query = rawQuery ? rawQuery.trim() : "";
    
    // 0. Fallback Check: If no query is provided (e.g. AI failed to generate keywords), go straight to fallback.
    if (!query) return getFallback(fallbackCategory);

    console.log(`[ImageService] 🔍 Searching: "${query}" (Fallback Cat: ${fallbackCategory})`);

    // --- STRATEGY 1: UNSPLASH (Priority) ---
    if (KEYS.UNSPLASH) {
        try {
            console.log("[ImageService] 1️⃣ Intentando Unsplash...");
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${KEYS.UNSPLASH}`;
            const res = await fetch(url);
            
            if (res.ok) {
                const data = await res.json();
                const photo = data.results?.[0];
                
                if (photo) {
                    trackUnsplashDownload(photo.links.download_location);
                    return {
                        url: getSafeImageUrl(photo.urls.regular) || photo.urls.regular,
                        credit: {
                            name: photo.user.name,
                            link: `${photo.user.links.html}?utm_source=NeuralQuiz&utm_medium=referral`,
                            source: 'Unsplash'
                        }
                    };
                } else {
                    console.warn("[ImageService] Unsplash no devolvió resultados. Pasando al siguiente...");
                }
            } else {
                console.warn(`[ImageService] ⚠️ Unsplash Error ${res.status} (${res.statusText}). Pasando al siguiente...`);
            }
        } catch (e) {
            console.warn("[ImageService] ❌ Unsplash Exception. Pasando al siguiente...", e);
        }
    } else {
        console.log("[ImageService] ⏭️ Unsplash saltado (Falta API Key).");
    }

    // --- STRATEGY 2: PEXELS ---
    if (KEYS.PEXELS) {
        try {
            console.log("[ImageService] 2️⃣ Intentando Pexels...");
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
                } else {
                    console.warn("[ImageService] Pexels no devolvió resultados. Pasando al siguiente...");
                }
            } else {
                console.warn(`[ImageService] ⚠️ Pexels Error ${res.status}. Pasando al siguiente...`);
            }
        } catch (e) {
            console.warn("[ImageService] ❌ Pexels Exception. Pasando al siguiente...", e);
        }
    } else {
        console.log("[ImageService] ⏭️ Pexels saltado (Falta API Key).");
    }

    // --- STRATEGY 3: PIXABAY ---
    if (KEYS.PIXABAY) {
        try {
            console.log("[ImageService] 3️⃣ Intentando Pixabay...");
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
                } else {
                    console.warn("[ImageService] Pixabay no devolvió resultados.");
                }
            } else {
                console.warn(`[ImageService] ⚠️ Pixabay Error ${res.status}.`);
            }
        } catch (e) {
            console.warn("[ImageService] ❌ Pixabay Exception.", e);
        }
    } else {
        console.log("[ImageService] ⏭️ Pixabay saltado (Falta API Key).");
    }

    // --- STRATEGY 4: LOCAL FALLBACK ---
    console.log(`[ImageService] 🏳️ Todas las APIs fallaron. Usando Fallback Local para: ${fallbackCategory}`);
    return getFallback(fallbackCategory);
};

const getFallback = (category: string): ImageResult => {
    const rawUrl = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.default;
    return {
        url: getSafeImageUrl(rawUrl) || rawUrl,
        credit: undefined // No credit needed for owned/CC0 local assets
    };
};
