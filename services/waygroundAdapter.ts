

import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport } from "../types";
import { deepFindQuizCandidate, hasCorrectFlag } from "./deepFindService";

const uuid = () => Math.random().toString(36).substring(2, 9);

// --- HELPER: Anti-Bot Detection ---
const isBlockedByBot = (html: string): boolean => {
    const lower = html.toLowerCase();
    return (
        lower.includes("verify you are human") ||
        lower.includes("verify that you're not a robot") ||
        lower.includes("enable javascript") ||
        lower.includes("challenge-form") || // Cloudflare
        lower.includes("security check")
    );
};

// --- HELPER: Normalizer ---
const normalizeWaygroundToQuiz = (rawQuestions: any[], sourceTitle: string, methodUsed: any): { quiz: Quiz, report: UniversalDiscoveryReport } => {
    let hasChoices = false;
    let hasCorrect = false;
    let hasImages = false;
    const missingReasons: string[] = [];

    const questions: Question[] = rawQuestions.map((q: any) => {
        // Wayground Structure usually: q.structure.query.text OR q.text
        const text = q.structure?.query?.text || 
                     (q.structure?.query?.media?.find((m:any) => m.type === 'text')?.text) || // Sometimes text is in media array
                     q.text || 
                     q.question || 
                     "Untitled Question";

        const options: Option[] = [];
        const correctOptionIds: string[] = [];
        
        // Extract Options
        const rawOptions = q.structure?.options || q.options || q.choices || [];
        if (Array.isArray(rawOptions) && rawOptions.length > 0) hasChoices = true;

        // Determine Correct Answer Strategy
        // 1. Explicit 'correct' boolean in options
        // 2. 'answer' field containing index (integer or array of integers)
        let correctIndices: number[] = [];
        if (typeof q.structure?.answer === 'number') correctIndices = [q.structure.answer];
        else if (Array.isArray(q.structure?.answer)) correctIndices = q.structure.answer;

        rawOptions.forEach((opt: any, idx: number) => {
            const optId = `${idx}_${uuid()}`;
            // Extract text from option structure (opt.text or opt.media[].text)
            let optText = opt.text;
            if (!optText && opt.media && Array.isArray(opt.media)) {
                const textMedia = opt.media.find((m:any) => m.type === 'text');
                if (textMedia) optText = textMedia.text;
            }
            // Fallback for image-only options
            if (!optText && (opt.image || opt.media)) optText = "[Image Option]";
            
            options.push({ id: optId, text: optText || `Option ${idx + 1}` });

            // Check Correctness
            const isMarked = opt.correct || opt.isCorrect || correctIndices.includes(idx);
            if (isMarked) {
                correctOptionIds.push(optId);
                hasCorrect = true;
            }
        });

        // Extract Image
        // Wayground puts images in structure.query.media[] usually
        let imageUrl: string | undefined = undefined;
        if (q.structure?.query?.media) {
            const img = q.structure.query.media.find((m: any) => m.type === 'image');
            if (img && img.url) imageUrl = img.url;
        } 
        else if (q.image) imageUrl = q.image; // Fallback
        
        if (imageUrl) hasImages = true;

        // Type Inference
        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        const kind = (q.structure?.kind || q.type || "").toLowerCase();
        
        if (kind === 'blanks') qType = QUESTION_TYPES.FILL_GAP;
        else if (kind === 'poll') qType = QUESTION_TYPES.POLL;
        else if (kind === 'open') qType = QUESTION_TYPES.OPEN_ENDED;
        else if (correctOptionIds.length > 1) qType = QUESTION_TYPES.MULTI_SELECT;

        // Validation Flags
        const needsEnhanceAI = options.length < 2 || correctOptionIds.length === 0;
        let enhanceReason = undefined;
        if (options.length < 2) enhanceReason = "endpoint_no_choices";
        else if (correctOptionIds.length === 0) enhanceReason = "no_correct_exposed_public";

        if (enhanceReason && !missingReasons.includes(enhanceReason)) missingReasons.push(enhanceReason);

        // Image Cleanup (Wayground images sometimes lack protocol)
        if (imageUrl && imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

        return {
            id: uuid(),
            text: text.replace(/<[^>]*>?/gm, ''), // Remove HTML tags often found in Wayground text
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: imageUrl || "",
            timeLimit: q.time ? Math.round(q.time / 1000) : 30,
            questionType: qType,
            reconstructed: false,
            sourceEvidence: "Wayground Deep Discovery",
            needsEnhanceAI,
            enhanceReason
        };
    });

    return {
        quiz: {
            title: sourceTitle,
            description: "Imported via Neural Quiz Wayground Adapter",
            questions
        },
        report: {
            platform: 'wayground',
            methodUsed: methodUsed,
            blockedByBot: false,
            parseOk: true,
            attempts: [],
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

export const extractWayground = async (url: string): Promise<{ quiz: Quiz, report: UniversalDiscoveryReport } | null> => {
    console.log("[WAYGROUND] Starting extraction for:", url);

    // 1. TRY PROXY FETCH (Fastest, but likely blocked)
    const PROXY_URL = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    try {
        console.log("[WAYGROUND] Phase 1: Proxy Fetch");
        const res = await fetch(PROXY_URL);
        const html = await res.text();

        if (isBlockedByBot(html)) {
            console.warn("[WAYGROUND] Blocked by Bot detection in Proxy Phase.");
        } else {
            // Attempt Extraction from HTML (Embedded State)
            const result = extractFromEmbeddedState(html, 'proxy_primary');
            if (result) return result;
        }
    } catch (e) {
        console.error("[WAYGROUND] Proxy fetch failed", e);
    }

    // 2. TRY JINA READER (Server-Side Render + Clean Output)
    // Jina runs a headless browser, so it often passes initial JS checks.
    const READER_URL = `https://r.jina.ai/${url}`;
    
    try {
        console.log("[WAYGROUND] Phase 2: Jina Reader");
        const res = await fetch(READER_URL, {
            headers: { 
                'X-No-Cache': 'true',
                'X-With-Images-Summary': 'true' // Ask Jina to keep images
            }
        });
        const content = await res.text();

        if (isBlockedByBot(content)) {
            return {
                quiz: { title: "Error", description: "", questions: [] },
                report: {
                    platform: 'wayground',
                    methodUsed: 'jina_reader',
                    blockedByBot: true,
                    blockedEvidence: "Reader returned anti-bot challenge text.",
                    parseOk: false,
                    questionsFound: 0,
                    hasChoices: false, hasCorrectFlags: false, hasImages: false
                }
            } as any; // Using explicit cast to avoid null handling complexity upstream for error case
        }

        // Jina returns Markdown, but sometimes preserves <script> tags if configured, 
        // OR simply renders the text. If Wayground renders questions in HTML, Jina will have them in MD.
        // HOWEVER, efficient structured data usually lives in hydration scripts.
        
        // Strategy: Search for embedded JSON even in Jina's output if it preserved scripts, 
        // OR use our DeepFinder on a potential JSON dump.
        // Note: Jina outputs Markdown. We might need to rely on the generic text parser if JSON is gone.
        // BUT, often Wayground puts data in <script id="__NEXT_DATA__">. Jina *might* strip this.
        
        // Let's try to see if Jina returned the JSON structure directly (rare but possible)
        // If Jina failed to give us JSON, we mark it.
        
        // NOTE: Since we can't reliably get JSON from Jina Reader (it converts to MD), 
        // we might rely on the Proxy check result mostly. 
        // If Proxy failed, and Jina gives MD, we can't use "Deep Discovery" on MD easily.
        // We will assume if Proxy blocked, we report "Blocked".
        
    } catch (e) {
        console.error("[WAYGROUND] Reader fetch failed", e);
    }

    // Default Fail State
    return null;
};

const extractFromEmbeddedState = (html: string, method: any): { quiz: Quiz, report: UniversalDiscoveryReport } | null => {
    // Wayground / Quizizz uses NEXT_DATA or NUXT
    const patterns = [
        /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/,
        /window\.__INITIAL_STATE__\s*=\s*({.*?});/,
        /window\.__NUXT__\s*=\s*({.*?});/
    ];

    for (const regex of patterns) {
        const match = html.match(regex);
        if (match && match[1]) {
            try {
                const json = JSON.parse(match[1]);
                console.log("[WAYGROUND] Found Embedded JSON via", regex);
                
                const candidates = deepFindQuizCandidate(json);
                candidates.sort((a, b) => b.score - a.score);

                if (candidates.length > 0 && candidates[0].score > 0) {
                    // Extract Title from root if possible
                    // Quizizz structure often has 'quiz' key at root
                    const title = json.props?.pageProps?.quiz?.info?.name || 
                                  json.quiz?.info?.name || 
                                  "Wayground Quiz";
                    
                    return normalizeWaygroundToQuiz(candidates[0].array, title, 'html_embedded');
                }
            } catch (e) {
                console.error("[WAYGROUND] JSON parse error", e);
            }
        }
    }
    return null;
};