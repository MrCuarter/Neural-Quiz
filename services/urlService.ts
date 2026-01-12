
import { extractTextFromPDF } from "./pdfService";
import { analyzeKahootUrl } from "./kahootService";
import { analyzeBlooketUrl } from "./blooketService";
import { UniversalDiscoveryReport, Quiz } from "../types";

// ROBUST URL SERVICE & ORCHESTRATOR
// Solves CORS and SPA Rendering by delegating fetching to specialized external agents.

const AGENTS = [
    // Agent Alpha: Jina (Renders the page, returns clean Markdown)
    {
        name: "Agent Jina (Reader)",
        getUrl: (target: string) => `https://r.jina.ai/${target}`,
        headers: { 'X-No-Cache': 'true' }
    },
    // Agent Beta: CorsProxy (Raw HTML Tunnel)
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

export const extractKahootUUID = (url: string): string | null => {
    const regex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = url.match(regex);
    return match ? match[0] : null;
};

export const isBlooketUrl = (url: string): boolean => {
    return url.includes("blooket.com/set/");
};

// ORCHESTRATOR: Routes URL to specific adapter or generic fetcher
export const analyzeUrl = async (url: string): Promise<{ quiz: Quiz, report: UniversalDiscoveryReport } | null> => {
    const targetUrl = url.trim();

    // 1. KAHOOT ROUTE (Preserved Legacy)
    if (extractKahootUUID(targetUrl)) {
        return analyzeKahootUrl(targetUrl);
    }

    // 2. BLOOKET ROUTE (New Adapter)
    if (isBlooketUrl(targetUrl)) {
        return analyzeBlooketUrl(targetUrl);
    }

    return null; // Fallback to generic AI analysis in App.tsx
};

// Main Fetcher for General URLs (Generic Fallback)
export const fetchUrlContent = async (url: string): Promise<string> => {
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

    console.log(`⚡ NEURAL SCAN INITIATED: ${targetUrl}`);

    for (const agent of AGENTS) {
        console.log(`🔄 Deploying ${agent.name}...`);
        
        try {
            const fetchUrl = agent.getUrl(targetUrl);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); 

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

            if (text.length < 500) {
                 console.warn(`⚠️ ${agent.name} returned insufficient data.`);
                 continue;
            }
            if (text.includes("Access Denied") || text.includes("Cloudflare") || text.includes("Just a moment...")) {
                console.warn(`🛡️ ${agent.name} was blocked by WAF.`);
                continue;
            }

            console.log(`✅ ${agent.name} retrieved ${text.length} bytes.`);
            
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
