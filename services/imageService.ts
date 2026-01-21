
import { getSafeImageUrl } from "./imageProxyService";

// @ts-ignore
const PEXELS_KEY = import.meta.env.VITE_PEXELS_API_KEY;
// @ts-ignore
const PIXABAY_KEY = import.meta.env.VITE_PIXABAY_API_KEY;

// Debug log to verify keys (masked)
console.log('[ImageService] Config:', { 
    pexels: PEXELS_KEY ? 'Present' : 'Missing', 
    pixabay: PIXABAY_KEY ? 'Present' : 'Missing' 
});

/**
 * Pre-processes the search query.
 * Strategy: Take the first 3 words to avoid overly specific long sentences 
 * which confuse stock photo engines.
 */
const cleanQuery = (text: string): string => {
    if (!text) return "education";
    // Remove special chars and split
    const clean = text.replace(/[^\w\s]/gi, '').trim();
    const words = clean.split(/\s+/);
    return words.slice(0, 3).join(" ");
};

/**
 * Main Image Search Service
 * Strategy: Waterfall (Pexels -> Pixabay -> Null)
 * Input: query (English, Anti-Spoiler preferred)
 */
export const searchImage = async (rawQuery: string): Promise<string | null> => {
    const query = cleanQuery(rawQuery);
    let imageUrl: string | null = null;

    console.log(`[ImageService] Searching for: "${query}"`);

    // --- ATTEMPT 1: PEXELS (High Quality) ---
    if (PEXELS_KEY) {
        try {
            const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&size=medium`;
            
            const res = await fetch(pexelsUrl, {
                headers: {
                    Authorization: PEXELS_KEY
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.photos && data.photos.length > 0) {
                    imageUrl = data.photos[0].src.medium;
                    console.log("[ImageService] Found on Pexels");
                }
            } else {
                console.warn(`[ImageService] Pexels Error: ${res.status}`);
            }
        } catch (e) {
            console.error("[ImageService] Pexels Network Error", e);
        }
    }

    // Return if Pexels found something
    if (imageUrl) {
        return getSafeImageUrl(imageUrl);
    }

    // --- ATTEMPT 2: PIXABAY (Robust Fallback) ---
    // Only runs if Pexels failed or returned no results
    if (PIXABAY_KEY) {
        try {
            const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&orientation=horizontal`;
            
            const res = await fetch(pixabayUrl);

            if (res.ok) {
                const data = await res.json();
                if (data.hits && data.hits.length > 0) {
                    imageUrl = data.hits[0].webformatURL;
                    console.log("[ImageService] Found on Pixabay");
                }
            } else {
                console.warn(`[ImageService] Pixabay Error: ${res.status}`);
            }
        } catch (e) {
            console.error("[ImageService] Pixabay Network Error", e);
        }
    }

    // Final check and proxy wrap
    if (imageUrl) {
        return getSafeImageUrl(imageUrl);
    }

    console.log("[ImageService] No image found.");
    // Both failed
    return null;
};
