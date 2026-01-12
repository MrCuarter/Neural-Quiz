

import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport } from "../types";
import { deepFindQuizCandidate } from "./deepFindService";

// --- HELPERS ---
const uuid = () => Math.random().toString(36).substring(2, 9);

const debugLog = (tag: string, message: any, data?: any) => {
    console.log(`%c[${tag}]`, 'color: #00ffff; font-weight: bold;', message);
    if (data) {
        if (typeof data === 'string') console.log(`%c${data.substring(0, 800)}...`, 'color: #888;');
        else console.log(data);
    }
};

const KAHOOT_CDN = "https://images-cdn.kahoot.it/";

const resolveImage = (val: any): string | undefined => {
    if (typeof val !== 'string') return undefined;
    if (val.startsWith('http')) return val;
    // Kahoot UUID pattern for images
    if (val.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return `${KAHOOT_CDN}${val}`;
    }
    return undefined;
};

// --- PROXY AGENTS ---
const PROXIES = [
    { name: 'CorsProxy', url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}` },
    { name: 'AllOrigins', url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` }
];

// --- DATA NORMALIZATION ---

const normalizeToQuiz = (rawQuestions: any[], sourceTitle: string, methodUsed: any): { quiz: Quiz, report: UniversalDiscoveryReport } => {
    let hasChoices = false;
    let hasCorrect = false;
    let hasImages = false;
    const missingReasons: string[] = [];

    const questions: Question[] = rawQuestions.map((q: any) => {
        const text = q.question || q.title || q.query || q.text || "Untitled Question";
        
        // Find Choices
        const rawChoices = q.choices || q.answers || q.options || [];
        if (Array.isArray(rawChoices) && rawChoices.length > 0) hasChoices = true;

        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        if (Array.isArray(rawChoices)) {
            rawChoices.forEach((c: any, idx: number) => {
                const optId = `${idx}_${uuid()}`;
                // Kahoot uses 'correct' boolean usually
                const isCorrect = !!(c.correct || c.isCorrect || c.right);
                if (isCorrect) {
                    correctOptionIds.push(optId);
                    hasCorrect = true;
                }
                options.push({
                    id: optId,
                    text: c.answer || c.text || c.title || `Option ${idx+1}`
                });
            });
        }

        // Find Image
        let imageUrl: string | undefined = undefined;
        // Priority 1: Direct key
        if (q.image) imageUrl = resolveImage(q.image);
        else if (q.imageUrl) imageUrl = resolveImage(q.imageUrl);
        else if (q.layout?.image) imageUrl = resolveImage(q.layout.image);
        // Priority 2: Media array
        else if (Array.isArray(q.media)) {
            const imgMedia = q.media.find((m: any) => m.type === 'image' || m.type === 'IMAGE');
            if (imgMedia && (imgMedia.id || imgMedia.url)) imageUrl = resolveImage(imgMedia.id || imgMedia.url);
        }
        // Priority 3: Metadata
        else if (q.metadata?.image) imageUrl = resolveImage(q.metadata.image);

        if (imageUrl) hasImages = true;

        // Type Inference
        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        const rawType = (q.type || q.questionType || "").toLowerCase();
        if (rawType.includes('true_false')) qType = QUESTION_TYPES.TRUE_FALSE;
        else if (rawType.includes('multiple_select')) qType = QUESTION_TYPES.MULTI_SELECT;
        else if (rawType.includes('open_ended')) qType = QUESTION_TYPES.OPEN_ENDED;
        else if (rawType.includes('poll')) qType = QUESTION_TYPES.POLL;
        else if (rawType.includes('slider')) qType = QUESTION_TYPES.OPEN_ENDED;
        
        // Validation Flags
        const needsEnhanceAI = options.length < 2 || correctOptionIds.length === 0;
        let enhanceReason = undefined;
        if (options.length < 2) enhanceReason = "endpoint_no_choices";
        else if (correctOptionIds.length === 0) enhanceReason = "no_correct_flags";

        if (enhanceReason && !missingReasons.includes(enhanceReason)) missingReasons.push(enhanceReason);

        return {
            id: uuid(),
            text: text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: imageUrl || "",
            timeLimit: q.time ? Math.round(q.time / 1000) : 20,
            questionType: qType,
            reconstructed: false,
            sourceEvidence: "Kahoot Deep Discovery",
            needsEnhanceAI,
            enhanceReason
        };
    });

    return {
        quiz: {
            title: sourceTitle,
            description: "Imported via Neural Quiz Deep Discovery",
            questions
        },
        report: {
            platform: 'kahoot',
            methodUsed: methodUsed,
            blockedByBot: false,
            parseOk: true,
            attempts: [], // Added empty attempts to satisfy interface if required, though types.ts says required, blooket populates it.
            questionsFound: questions.length,
            hasChoices,
            hasCorrectFlags: hasCorrect,
            hasImages,
            missing: {
                options: !hasChoices,
                correct: !hasCorrect,
                image: !hasImages,
                reasons: missingReasons
            }
        }
    };
};

// --- 3. ENDPOINT DISCOVERY & FETCHING ---

export const analyzeKahootUrl = async (url: string): Promise<{ quiz: Quiz, report: UniversalDiscoveryReport } | null> => {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = url.match(uuidRegex);
    if (!match) throw new Error("No Valid Kahoot UUID found in URL");
    const uuid = match[0];

    debugLog("KAHOOT-START", `Starting analysis for UUID: ${uuid}`);

    // STRATEGY 1: Public APIs via Proxy (Prioritized)
    const endpoints = [
        { url: `https://create.kahoot.it/rest/kahoots/${uuid}/card/?includeKahoot=true`, method: 'api_card' },
        { url: `https://create.kahoot.it/rest/kahoots/${uuid}`, method: 'api_rest' }
    ];

    for (const endpoint of endpoints) {
        for (const proxy of PROXIES) {
            const target = proxy.url(endpoint.url);
            debugLog("KAHOOT-FETCH", `Trying ${endpoint.method} via ${proxy.name}`, target);
            
            try {
                const response = await fetch(target, { headers: { 'Accept': 'application/json' } });
                const contentType = response.headers.get('content-type') || "";
                
                if (!response.ok) {
                    debugLog("KAHOOT-FAIL", `Status ${response.status}`);
                    continue;
                }

                const text = await response.text();
                
                // Proxy Truncation Check
                if (contentType.includes('json') && !text.trim().endsWith('}')) {
                    console.warn(`[KAHOOT] Possible Proxy Truncation detected via ${proxy.name}`);
                    continue; 
                }

                let json;
                try { json = JSON.parse(text); } catch (e) { continue; }

                // Run Deep Finder on this JSON
                const candidates = deepFindQuizCandidate(json);
                candidates.sort((a, b) => b.score - a.score);

                if (candidates.length > 0 && candidates[0].score > 0) {
                    const best = candidates[0];
                    debugLog("KAHOOT-FOUND", `Deep Finder found candidates at path: ${best.path} with score ${best.score}`);
                    
                    const title = json.title || json.kahoot?.title || json.card?.title || "Kahoot Quiz";
                    return normalizeToQuiz(best.array, title, endpoint.method);
                }

            } catch (e) {
                console.error(`[KAHOOT] Error during fetch loop:`, e);
            }
        }
    }

    // STRATEGY 2: HTML Scraping (Embedded Data)
    const htmlUrl = `https://create.kahoot.it/details/${uuid}`;
    const proxy = PROXIES[0];
    try {
        const response = await fetch(proxy.url(htmlUrl));
        const html = await response.text();
        
        const nextDataRegex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/;
        const nextMatch = html.match(nextDataRegex);
        
        let jsonToScan = null;
        let method: any = 'html_fallback';

        if (nextMatch && nextMatch[1]) {
            debugLog("KAHOOT-HTML", "Found __NEXT_DATA__");
            jsonToScan = JSON.parse(nextMatch[1]);
            method = 'html_next_data';
        } else {
            const apolloRegex = /window\.__APOLLO_STATE__\s*=\s*({.*?});/s;
            const apolloMatch = html.match(apolloRegex);
            if (apolloMatch && apolloMatch[1]) {
                debugLog("KAHOOT-HTML", "Found __APOLLO_STATE__");
                jsonToScan = JSON.parse(apolloMatch[1]);
                method = 'html_apollo';
            }
        }

        if (jsonToScan) {
            const candidates = deepFindQuizCandidate(jsonToScan);
            candidates.sort((a, b) => b.score - a.score);
            
            if (candidates.length > 0) {
                const best = candidates[0];
                debugLog("KAHOOT-FOUND-HTML", `Found questions in HTML embedded data. Path: ${best.path}`);
                return normalizeToQuiz(best.array, "Kahoot (HTML)", method);
            }
        }

    } catch (e) {
        console.error("[KAHOOT] HTML scraping failed", e);
    }

    return null;
};