
import { getSafeImageUrl } from "./imageProxyService";
import { FALLBACK_IMAGES } from "../constants/fallbackImages";
import { ImageCredit } from "../types";

// --- 1. CONFIGURACIÓN Y DEBUG ---

// Lectura directa de variables de entorno (Estándar Vite)
const API_KEYS = {
    // @ts-ignore
    PIXABAY: import.meta.env.VITE_PIXABAY_API_KEY || "",
    // @ts-ignore
    PEXELS: import.meta.env.VITE_PEXELS_API_KEY || "",
    // @ts-ignore
    UNSPLASH: import.meta.env.VITE_UNSPLASH_ACCESS_KEY || ""
};

// Log de diagnóstico inmediato (No muestra las claves reales por seguridad)
console.log("📸 [ImageService] Inicializando servicios de imagen:", {
    PIXABAY: API_KEYS.PIXABAY ? "✅ LOADED" : "❌ MISSING",
    PEXELS: API_KEYS.PEXELS ? "✅ LOADED" : "❌ MISSING",
    UNSPLASH: API_KEYS.UNSPLASH ? "✅ LOADED" : "❌ MISSING"
});

export interface ImageResult {
    url: string;
    credit?: ImageCredit;
}

// --- 2. FUNCIONES AUXILIARES ---

/**
 * UNSPLASH: Requiere "Trigger download" según sus términos de uso API.
 */
const trackUnsplashDownload = async (downloadLocation: string) => {
    if (!API_KEYS.UNSPLASH || !downloadLocation) return;
    try {
        await fetch(`${downloadLocation}&client_id=${API_KEYS.UNSPLASH}`);
    } catch (e) {
        console.warn("[ImageService] Unsplash tracking failed", e);
    }
};

const getFallback = (category: string): ImageResult => {
    const rawUrl = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.default;
    return {
        url: getSafeImageUrl(rawUrl) || rawUrl,
        credit: undefined
    };
};

// --- 3. BÚSQUEDA PRINCIPAL (SINGLE RESULT - Para IA/Automático) ---
// Estrategia: Pixabay -> Pexels -> Unsplash -> Fallback Local

export const searchImage = async (rawQuery: string | undefined, fallbackCategory: string = 'default'): Promise<ImageResult | null> => {
    const query = rawQuery ? rawQuery.trim() : "";
    if (!query) return getFallback(fallbackCategory);

    console.log(`[ImageService] 🔍 Buscando imagen única para: "${query}"`);

    // --- PASO 1: PIXABAY ---
    if (API_KEYS.PIXABAY) {
        try {
            const url = `https://pixabay.com/api/?key=${API_KEYS.PIXABAY}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&orientation=horizontal&per_page=3`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.hits && data.hits.length > 0) {
                    const hit = data.hits[0]; // Tomamos el primero
                    console.log("[ImageService] ✅ Encontrado en Pixabay");
                    return {
                        url: getSafeImageUrl(hit.webformatURL) || hit.webformatURL,
                        credit: { name: hit.user, link: hit.pageURL, source: 'Pixabay' }
                    };
                }
            } else {
                console.warn(`[ImageService] Pixabay Error: ${res.status}`);
            }
        } catch (e) {
            console.warn("[ImageService] Error consultando Pixabay:", e);
        }
    }

    // --- PASO 2: PEXELS (Fallback) ---
    if (API_KEYS.PEXELS) {
        try {
            console.log("[ImageService] 🔄 Intentando Pexels...");
            const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&size=medium`;
            const res = await fetch(url, { headers: { Authorization: API_KEYS.PEXELS } });
            
            if (res.ok) {
                const data = await res.json();
                if (data.photos && data.photos.length > 0) {
                    const photo = data.photos[0];
                    console.log("[ImageService] ✅ Encontrado en Pexels");
                    return {
                        url: getSafeImageUrl(photo.src.medium) || photo.src.medium,
                        credit: { name: photo.photographer, link: photo.photographer_url, source: 'Pexels' }
                    };
                }
            }
        } catch (e) {
            console.warn("[ImageService] Error consultando Pexels:", e);
        }
    }

    // --- PASO 3: UNSPLASH (Fallback Final) ---
    if (API_KEYS.UNSPLASH) {
        try {
            console.log("[ImageService] 🔄 Intentando Unsplash...");
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${API_KEYS.UNSPLASH}`;
            const res = await fetch(url);
            
            if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const photo = data.results[0];
                    trackUnsplashDownload(photo.links.download_location);
                    console.log("[ImageService] ✅ Encontrado en Unsplash");
                    return {
                        url: getSafeImageUrl(photo.urls.regular) || photo.urls.regular,
                        credit: {
                            name: photo.user.name,
                            link: `${photo.user.links.html}?utm_source=NeuralQuiz`,
                            source: 'Unsplash'
                        }
                    };
                }
            }
        } catch (e) {
            console.warn("[ImageService] Error consultando Unsplash:", e);
        }
    }

    // --- PASO 4: FALLBACK LOCAL ---
    console.log("[ImageService] ⚠️ No se encontraron imágenes en APIs. Usando fallback local.");
    return getFallback(fallbackCategory);
};

// --- 4. BÚSQUEDA DE STOCK (MULTIPLE RESULTS - Para el Modal) ---
// Misma lógica de cascada: Si Pixabay falla o da 0, salta al siguiente.

export const searchStockImages = async (query: string): Promise<ImageResult[]> => {
    if (!query) return [];
    console.log(`[ImageService] 🔍 Stock Search para: "${query}"`);

    // --- PASO 1: PIXABAY ---
    if (API_KEYS.PIXABAY) {
        try {
            const url = `https://pixabay.com/api/?key=${API_KEYS.PIXABAY}&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true&per_page=20`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.hits && data.hits.length > 0) {
                    console.log(`[ImageService] Pixabay retornó ${data.hits.length} resultados.`);
                    return data.hits.map((hit: any) => ({
                        url: getSafeImageUrl(hit.webformatURL) || hit.webformatURL,
                        credit: { name: hit.user, link: hit.pageURL, source: 'Pixabay' }
                    }));
                }
            }
        } catch (e) {
            console.error("[ImageService] Pixabay Exception:", e);
        }
    }

    // --- PASO 2: PEXELS ---
    if (API_KEYS.PEXELS) {
        try {
            console.log("[ImageService] Saltando a Pexels...");
            const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&size=medium`;
            const res = await fetch(url, { headers: { Authorization: API_KEYS.PEXELS } });
            
            if (res.ok) {
                const data = await res.json();
                if (data.photos && data.photos.length > 0) {
                    console.log(`[ImageService] Pexels retornó ${data.photos.length} resultados.`);
                    return data.photos.map((photo: any) => ({
                        url: getSafeImageUrl(photo.src.medium) || photo.src.medium,
                        credit: { name: photo.photographer, link: photo.photographer_url, source: 'Pexels' }
                    }));
                }
            }
        } catch (e) {
            console.error("[ImageService] Pexels Exception:", e);
        }
    }

    // --- PASO 3: UNSPLASH ---
    if (API_KEYS.UNSPLASH) {
        try {
            console.log("[ImageService] Saltando a Unsplash...");
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&client_id=${API_KEYS.UNSPLASH}`;
            const res = await fetch(url);
            
            if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    console.log(`[ImageService] Unsplash retornó ${data.results.length} resultados.`);
                    return data.results.map((photo: any) => ({
                        url: getSafeImageUrl(photo.urls.regular) || photo.urls.regular,
                        credit: {
                            name: photo.user.name,
                            link: `${photo.user.links.html}?utm_source=NeuralQuiz`,
                            source: 'Unsplash'
                        }
                    }));
                }
            }
        } catch (e) {
            console.error("[ImageService] Unsplash Exception:", e);
        }
    }

    return [];
};
