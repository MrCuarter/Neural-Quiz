
// ROBUST URL SERVICE V5 (The "Proxy Rotation" Architecture)
// Strategy: If one door is locked, try the window. If the window is locked, try the chimney.
// We rotate through multiple public CORS proxies to fetch the data.

// List of high-availability CORS proxies
const PROXY_GENERATORS = [
    // 1. AllOrigins (Raw) - Very reliable, standard for text
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&disableCache=${Date.now()}`,
    
    // 2. CorsProxy.io - Fast, direct
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    
    // 3. CodeTabs - Good fallback
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    
    // 4. AllOrigins (JSON Wrapper) - In case raw headers are blocked
    // We handle the JSON unwrapping inside the fetcher if needed, but for now we stick to text-returning proxies mostly.
];

const JINA_PREFIX = 'https://r.jina.ai/';

// Helper: Try to fetch a URL using the proxy rotation
const fetchWithRotation = async (targetUrl: string, description: string): Promise<string | null> => {
    for (let i = 0; i < PROXY_GENERATORS.length; i++) {
        const proxyUrl = PROXY_GENERATORS[i](targetUrl);
        console.log(`🔄 Attempt ${i + 1}/${PROXY_GENERATORS.length} [${description}]:`, proxyUrl);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per proxy

            const response = await fetch(proxyUrl, { 
                signal: controller.signal,
                headers: {
                    // Sometimes pretending to be a browser helps, sometimes empty is better.
                    // We try minimal headers to avoid CORS preflight issues on some proxies.
                }
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const text = await response.text();
                // Basic validation: ensure we didn't just get a proxy error page
                if (text.length > 50 && !text.includes("Access Denied") && !text.includes("Proxy Error")) {
                    console.log(`✅ Success with Proxy ${i + 1}`);
                    return text;
                }
            }
        } catch (e) {
            console.warn(`❌ Proxy ${i + 1} failed:`, e);
        }
    }
    return null;
};

export const fetchUrlContent = async (url: string): Promise<string> => {
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

    console.log(`⚡ Neural Scan Level 5 (Rotation): ${targetUrl}`);

    // --- STRATEGY 1: SPECIFIC API (Gimkit & Kahoot) ---
    
    // GIMKIT
    if (targetUrl.includes('gimkit.com')) {
        const idMatch = targetUrl.match(/[a-f0-9]{24}/); // MongoDB ID regex
        if (idMatch) {
            const gimkitId = idMatch[0];
            const apiUrl = `https://www.gimkit.com/api/kits/${gimkitId}`;
            
            const apiData = await fetchWithRotation(apiUrl, "Gimkit API");
            if (apiData && (apiData.includes('"kit"') || apiData.includes('"questions"'))) {
                return `--- GIMKIT API JSON ---\n${apiData}`;
            }
        }
    }

    // KAHOOT
    if (targetUrl.includes('kahoot')) {
        const idMatch = targetUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/); // UUID regex
        if (idMatch) {
            const kahootId = idMatch[0];
            const apiUrl = `https://create.kahoot.it/rest/kahoots/${kahootId}`;
            
            const apiData = await fetchWithRotation(apiUrl, "Kahoot API");
            if (apiData && apiData.includes('questions')) {
                return `--- KAHOOT API JSON ---\n${apiData}`;
            }
        }
    }

    // --- STRATEGY 2: JINA READER (Smart Markdown) ---
    // If specific APIs fail, we ask Jina to read the page for us.
    // Jina is very good at bypassing standard blocks because it renders the page.
    const jinaUrl = `${JINA_PREFIX}${targetUrl}`;
    const jinaData = await fetchWithRotation(jinaUrl, "Jina Reader");
    
    if (jinaData && jinaData.length > 200) {
        return `--- JINA READER MARKDOWN ---\n${jinaData}`;
    }

    // --- STRATEGY 3: RAW HTML (Last Resort) ---
    const rawData = await fetchWithRotation(targetUrl, "Raw HTML");
    if (rawData && rawData.length > 500) {
        return `--- RAW HTML DUMP ---\n${rawData.substring(0, 400000)}`;
    }

    // FAILURE
    throw new Error(
        "PROTOCOL CRITICAL FAILURE: Todos los proxies han sido bloqueados.\n" +
        "Esta URL está blindada contra accesos externos.\n" +
        "POR FAVOR: Copia el texto manualmente (CTRL+A, CTRL+C) y usa la pestaña 'PEGAR'."
    );
};
