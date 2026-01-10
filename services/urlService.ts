
// SMART URL SERVICE
// Instead of blindly scraping HTML, we try to target known public APIs for specific platforms.
// This bypasses client-side rendering issues (blank pages).

const PROXY_URL = 'https://corsproxy.io/?';

// Helper to use the proxy
const fetchViaProxy = async (targetUrl: string): Promise<string> => {
    // We encode the target URL to ensure params don't break the proxy
    const proxyTarget = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyTarget);
    if (!response.ok) throw new Error(`Proxy Error: ${response.status}`);
    return await response.text();
};

export const fetchUrlContent = async (url: string): Promise<string> => {
    try {
        let targetUrl = url;
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

        // --- STRATEGY 1: GIMKIT API ---
        if (targetUrl.includes('gimkit.com/view/')) {
            // Extract ID: https://www.gimkit.com/view/5d7434185c03120020be7c22 -> 5d7434185c03120020be7c22
            const match = targetUrl.match(/view\/([a-zA-Z0-9]+)/);
            if (match && match[1]) {
                const gimkitId = match[1];
                const apiUrl = `https://www.gimkit.com/api/kits/${gimkitId}`;
                console.log("Detectado Gimkit. Intentando API directa:", apiUrl);
                try {
                    const json = await fetchViaProxy(apiUrl);
                    if (json && json.includes('"questions"')) {
                         return "--- GIMKIT API DATA START ---\n" + json + "\n--- GIMKIT API DATA END ---";
                    }
                } catch (e) {
                    console.warn("Fallo estrategia API Gimkit, probando scraping normal...", e);
                }
            }
        }

        // --- STRATEGY 2: KAHOOT API ---
        if (targetUrl.includes('create.kahoot.it/details/')) {
            // Extract ID: https://create.kahoot.it/details/1234-5678... -> 1234-5678...
            // Sometimes ID is at the end or between slashes
            const parts = targetUrl.split('details/');
            if (parts.length > 1) {
                const kahootId = parts[1].split('/')[0].split('?')[0];
                const apiUrl = `https://create.kahoot.it/rest/kahoots/${kahootId}`;
                console.log("Detectado Kahoot. Intentando API directa:", apiUrl);
                try {
                    const json = await fetchViaProxy(apiUrl);
                    if (json && json.includes('questions')) {
                        return "--- KAHOOT API DATA START ---\n" + json + "\n--- KAHOOT API DATA END ---";
                    }
                } catch (e) {
                    console.warn("Fallo estrategia API Kahoot, probando scraping normal...", e);
                }
            }
        }

        // --- STRATEGY 3: GENERIC SCRAPING (FALLBACK) ---
        // For Quizizz, Blooket, or other generic sites
        console.log("Intentando scraping genérico para:", targetUrl);
        const html = await fetchViaProxy(targetUrl);
        
        if (!html || html.length < 200) {
             throw new Error("Contenido vacío o bloqueado.");
        }

        return html.substring(0, 400000); // Return large chunk

    } catch (error) {
        console.error("URL Fetch Error:", error);
        throw new Error("No se ha podido leer la URL. La web puede estar protegida. Por favor, usa la opción de PEGAR texto.");
    }
};
