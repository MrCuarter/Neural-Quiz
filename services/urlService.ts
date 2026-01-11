
// ROBUST URL SERVICE (The "Plan Omega" Architecture)
// Solves CORS and SPA Rendering by delegating fetching to specialized external agents.

// LIST OF AGENTS
// 1. Jina Reader: Acts as a "Serverless Browser". Renders JS and returns Markdown. Best for AI.
// 2. CorsProxy: Tunnels raw HTML request. Good for static sites or API endpoints.
// 3. AllOrigins: Backup tunnel.

const AGENTS = [
    // Agent Alpha: Jina (Renders the page, returns clean Markdown)
    {
        name: "Agent Jina (Reader)",
        getUrl: (target: string) => `https://r.jina.ai/${target}`,
        headers: { 'X-No-Cache': 'true' }
    },
    // Agent Beta: CORS Proxy IO (Raw HTML Tunnel)
    {
        name: "Agent Proxy (Tunnel)",
        getUrl: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
        headers: {}
    },
    // Agent Gamma: AllOrigins (JSONP style)
    {
        name: "Agent Origins (Backup)",
        getUrl: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        headers: {}
    }
];

export const fetchUrlContent = async (url: string): Promise<string> => {
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

    console.log(`⚡ NEURAL SCAN INITIATED: ${targetUrl}`);

    // --- STRATEGY 1: API SNIPING (If we detect a known ID) ---
    // If we can construct a direct API call, we bypass the visual web entirely.
    
    // Kahoot API Sniper
    if (targetUrl.includes('kahoot')) {
        const idMatch = targetUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
        if (idMatch) {
            const id = idMatch[0];
            console.log("🎯 Kahoot UUID Detected. Attempting API injection...");
            const apiTarget = `https://create.kahoot.it/rest/kahoots/${id}`;
            // Send the API URL to our Proxy Agent
            try {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(apiTarget)}`;
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const json = await response.text();
                    if (json.includes("questions")) return `--- KAHOOT API JSON ---\n${json}`;
                }
            } catch(e) { console.warn("API Sniper missed, falling back to brute force."); }
        }
    }

    // --- STRATEGY 2: AGENT ROTATION (Brute Force) ---
    // We try each agent until one returns valid content.

    for (const agent of AGENTS) {
        console.log(`🔄 Deploying ${agent.name}...`);
        
        try {
            const fetchUrl = agent.getUrl(targetUrl);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for heavy rendering

            const response = await fetch(fetchUrl, { 
                headers: agent.headers,
                signal: controller.signal 
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`❌ ${agent.name} failed with status: ${response.status}`);
                continue;
            }

            const text = await response.text();

            // Validation: Did we actually get content or just a "Access Denied" page?
            if (text.length < 500) {
                 console.warn(`⚠️ ${agent.name} returned insufficient data.`);
                 continue;
            }
            if (text.includes("Access Denied") || text.includes("Cloudflare") || text.includes("Just a moment...")) {
                console.warn(`🛡️ ${agent.name} was blocked by WAF.`);
                continue;
            }

            console.log(`✅ ${agent.name} retrieved ${text.length} bytes.`);
            
            // Success! Return the data tagged with the source type for Gemini
            if (agent.name.includes("Jina")) {
                return `--- JINA READER OUTPUT (MARKDOWN) ---\n${text}`;
            } else {
                return `--- RAW HTML DUMP ---\n${text}`;
            }

        } catch (error: any) {
            console.warn(`💀 ${agent.name} died: ${error.message}`);
        }
    }

    throw new Error(
        "MISSION FAILED: All agents were intercepted. The target URL is heavily guarded (Auth/WAF). Please manually copy the text/HTML from the page and use the 'Paste' tab."
    );
};
