
// ROBUST URL SERVICE V6 (The "Plan Omega" Architecture)
// Strategy: Specialized adapters for each platform that mimic their internal API calls.
// This bypasses the need to "render" the visual page.

// High-availability CORS proxies
const PROXY_GENERATORS = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&disableCache=${Date.now()}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
    // Fallback to Jina if specific APIs fail
    (url: string) => `https://r.jina.ai/${url}` 
];

// Helper: Try to fetch a URL using rotation
const fetchWithRotation = async (targetUrl: string, description: string): Promise<string | null> => {
    for (let i = 0; i < PROXY_GENERATORS.length; i++) {
        const proxyUrl = PROXY_GENERATORS[i](targetUrl);
        // Special case for Jina (it's not a proxy wrapper, it's a direct service)
        const finalUrl = proxyUrl.includes('r.jina.ai') ? proxyUrl : proxyUrl;
        
        console.log(`🔄 Attempt ${i + 1} [${description}]:`, finalUrl);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(finalUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const text = await response.text();
                // Basic validation
                if (text.length > 50 && !text.includes("Access Denied") && !text.includes("Proxy Error")) {
                    console.log(`✅ Success: ${description}`);
                    return text;
                }
            }
        } catch (e) {
            console.warn(`❌ Failed: ${finalUrl}`);
        }
    }
    return null;
};

export const fetchUrlContent = async (url: string): Promise<string> => {
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

    console.log(`⚡ Neural Scan Omega: ${targetUrl}`);

    // --- ADAPTER 1: KAHOOT (API) ---
    if (targetUrl.includes('kahoot')) {
        const idMatch = targetUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
        if (idMatch) {
            const id = idMatch[0];
            // Primary and Secondary API endpoints for Kahoot
            const endpoints = [
                `https://create.kahoot.it/rest/kahoots/${id}`,
                `https://play.kahoot.it/rest/kahoots/${id}`
            ];

            for (const endpoint of endpoints) {
                const data = await fetchWithRotation(endpoint, "Kahoot API");
                if (data && (data.includes('questions') || data.includes('quiz'))) {
                    return `--- KAHOOT API JSON ---\n${data}`;
                }
            }
        }
    }

    // --- ADAPTER 2: GIMKIT (API) ---
    if (targetUrl.includes('gimkit.com')) {
        const idMatch = targetUrl.match(/[a-f0-9]{24}/);
        if (idMatch) {
            const id = idMatch[0];
            const endpoint = `https://www.gimkit.com/api/kits/${id}`;
            const data = await fetchWithRotation(endpoint, "Gimkit API");
            if (data && (data.includes('kit') || data.includes('questions'))) {
                return `--- GIMKIT API JSON ---\n${data}`;
            }
        }
    }

    // --- ADAPTER 3: QUIZLET (Next.js Hydration Data) ---
    // Quizlet doesn't have a public API anymore, but they inject the data into the HTML
    // inside a <script id="__NEXT_DATA__"> tag. We extract that.
    if (targetUrl.includes('quizlet.com')) {
        // We fetch the raw HTML of the page
        const html = await fetchWithRotation(targetUrl, "Quizlet HTML");
        if (html) {
            // Try to find the Next.js data blob
            const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
            if (nextDataMatch && nextDataMatch[1]) {
                return `--- QUIZLET DATA JSON ---\n${nextDataMatch[1]}`;
            }
            
            // Fallback: Legacy Quizlet window data
            const windowDataMatch = html.match(/window\.Quizlet\.setPageData\s*=\s*(.*?);/);
            if (windowDataMatch && windowDataMatch[1]) {
                return `--- QUIZLET DATA JSON ---\n${windowDataMatch[1]}`;
            }

            // Fallback 2: Jina Reader output if raw HTML parsing failed
            if (html.includes("Terms in this set")) {
                return `--- RAW HTML DUMP ---\n${html}`;
            }
        }
    }

    // --- ADAPTER 4: BLOOKET (API) ---
    // Public Blookets can sometimes be accessed via API if we have the ID
    if (targetUrl.includes('blooket.com')) {
        const idMatch = targetUrl.match(/[a-f0-9]{24}/);
        if (idMatch) {
            const id = idMatch[0];
            const endpoint = `https://api.blooket.com/api/games?gameId=${id}`;
            const data = await fetchWithRotation(endpoint, "Blooket API");
            if (data && data.includes('questions')) {
                 return `--- BLOOKET API JSON ---\n${data}`;
            }
        }
    }

    // --- FALLBACK: JINA READER (Universal) ---
    // If no specific adapter worked (or for generic sites like Wikipedia)
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const jinaData = await fetchWithRotation(jinaUrl, "Jina Universal Reader");
    
    if (jinaData && jinaData.length > 200) {
        return `--- JINA READER MARKDOWN ---\n${jinaData}`;
    }

    // --- FINAL FALLBACK: RAW HTML ---
    const rawHtml = await fetchWithRotation(targetUrl, "Raw HTML Fallback");
    if (rawHtml && rawHtml.length > 500) {
        return `--- RAW HTML DUMP ---\n${rawHtml.substring(0, 400000)}`;
    }

    throw new Error(
        "PROTOCOL FAILURE: No se pudo extraer información de esta URL. " +
        "La web puede requerir inicio de sesión o estar bloqueada geográficamente."
    );
};
