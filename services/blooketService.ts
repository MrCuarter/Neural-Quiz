
import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport, DiscoveryAttempt } from "../types";

// --- GLOBAL DEBUG INTERFACE ---
declare global {
  interface Window {
    NQ_DEBUG: any;
  }
}

// Ensure debug object exists immediately upon module load
if (typeof window !== 'undefined') {
    window.NQ_DEBUG = window.NQ_DEBUG || {};
    window.NQ_DEBUG.blooket = window.NQ_DEBUG.blooket || { runs: [] };
}

// --- CONSTANTS & CONFIG ---
const PROXIES = [
    { name: 'CorsProxy', url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}` },
    { name: 'AllOrigins', url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` }
];

const ENDPOINTS = [
    { name: 'Dashboard API', template: (id: string) => `https://dashboard.blooket.com/api/games?gameId=${id}` },
    { name: 'Play API', template: (id: string) => `https://play.blooket.com/api/gamequestionsets?gameId=${id}` },
    { name: 'Legacy API', template: (id: string) => `https://api.blooket.com/api/games?gameId=${id}` }
];

const uuid = () => Math.random().toString(36).substring(2, 9);

// --- HELPERS ---

/**
 * Recursive Image Finder: Scans the entire JSON tree for potential image candidates.
 */
const scanForImages = (obj: any, candidates: Set<string> = new Set(), depth = 0) => {
    if (depth > 10 || !obj) return candidates;
    
    if (typeof obj === 'string') {
        if (obj.startsWith('http') && (obj.match(/\.(jpeg|jpg|gif|png|webp)/i) || obj.includes('cloudinary'))) {
            candidates.add(obj);
        }
        // Cloudinary ID heuristics (alphanumeric, 15-25 chars, no spaces)
        else if (obj.length > 10 && obj.length < 30 && /^[a-zA-Z0-9]+$/.test(obj)) {
             candidates.add(`https://media.blooket.com/image/upload/${obj}`);
        }
    } else if (Array.isArray(obj)) {
        obj.forEach(item => scanForImages(item, candidates, depth + 1));
    } else if (typeof obj === 'object') {
        // Targeted check for image keys
        if (obj.url && typeof obj.url === 'string') scanForImages(obj.url, candidates, depth);
        if (obj.image && typeof obj.image === 'object') scanForImages(obj.image, candidates, depth + 1);
        
        Object.keys(obj).forEach(key => {
            const val = obj[key];
            if (key.match(/image|img|media|cover|src/i)) {
                 if (typeof val === 'string') scanForImages(val, candidates, depth);
            }
            if (typeof val === 'object') scanForImages(val, candidates, depth + 1);
        });
    }
    return candidates;
};

/**
 * Deep Finder for Questions Array
 */
const findQuestionsArray = (obj: any, depth = 0): any[] | null => {
    if (depth > 8 || !obj) return null;
    
    // Check if THIS object is the questions array
    if (Array.isArray(obj)) {
        // Heuristic: Array of objects containing 'question' or 'text' AND 'answers' or 'choices'
        const validItems = obj.filter(item => 
            item && typeof item === 'object' && 
            (item.question || item.text) && 
            (item.answers || item.choices || item.typingAnswers || item.correctAnswers)
        );
        if (validItems.length > 0 && validItems.length >= obj.length * 0.5) {
            return obj;
        }
        // Recurse into array items if they are arrays (unlikely but possible)
        for (const item of obj) {
            const res = findQuestionsArray(item, depth + 1);
            if (res) return res;
        }
    } else if (typeof obj === 'object') {
        // Explicit keys
        if (Array.isArray(obj.questions)) return findQuestionsArray(obj.questions, depth + 1);
        if (Array.isArray(obj.questionSets)) return findQuestionsArray(obj.questionSets, depth + 1); // Play API

        // Deep search keys
        for (const key of Object.keys(obj)) {
            const res = findQuestionsArray(obj[key], depth + 1);
            if (res) return res;
        }
    }
    return null;
};

/**
 * Resolve Blooket Image to URL
 */
const resolveImage = (raw: any): string | undefined => {
    if (!raw) return undefined;
    if (typeof raw === 'object' && raw.url) raw = raw.url;
    if (typeof raw !== 'string') return undefined;

    if (raw.startsWith('http')) return raw;
    // Assume Cloudinary ID
    return `https://media.blooket.com/image/upload/${raw}`;
};

// --- MAIN EXTRACTOR ---

export const analyzeBlooketUrl = async (url: string): Promise<{ quiz: Quiz, report: UniversalDiscoveryReport } | null> => {
    const ts = new Date().toISOString();
    
    // 1. EXTRACT ID
    const idMatch = url.match(/\/set\/([a-zA-Z0-9]+)/);
    const setId = idMatch ? idMatch[1] : null;

    // INIT DEBUG RUN
    const runLog: any = {
        ts,
        inputUrl: url,
        setId,
        attempts: [],
        chosenEndpoint: null,
        success: false,
        error: null
    };

    if (!setId) {
        runLog.error = "No Set ID found in URL";
        window.NQ_DEBUG.blooket.runs.push(runLog);
        window.NQ_DEBUG.blooket.lastRun = runLog;
        throw new Error("Invalid Blooket URL");
    }

    let foundData: any = null;
    let questionsArray: any[] | null = null;
    let finalEndpoint = "";

    console.groupCollapsed(`[BLOOKET] Analysis Run: ${setId}`);

    // 2. ENDPOINT FALLBACK LADDER
    outerLoop:
    for (const endpoint of ENDPOINTS) {
        const targetApiUrl = endpoint.template(setId);
        
        for (const proxy of PROXIES) {
            const finalUrl = proxy.url(targetApiUrl);
            const attemptLog: any = {
                endpoint: endpoint.name,
                proxy: proxy.name,
                targetUrl: finalUrl,
                status: 0,
                ok: false
            };

            try {
                const res = await fetch(finalUrl, {
                    headers: {
                        'Accept': 'application/json,text/plain,*/*',
                        'Content-Type': 'application/json;charset=UTF-8'
                    }
                });

                attemptLog.status = res.status;
                const text = await res.text();
                attemptLog.bytes = text.length;

                if (res.ok && text.trim().startsWith('{')) {
                    try {
                        const json = JSON.parse(text);
                        attemptLog.ok = true;
                        
                        // Check if it actually contains meaningful data
                        const qArray = findQuestionsArray(json);
                        
                        if (qArray && qArray.length > 0) {
                            foundData = json;
                            questionsArray = qArray;
                            finalEndpoint = endpoint.name;
                            runLog.chosenEndpoint = endpoint.name;
                            runLog.rawJsonPreview = JSON.stringify(json).slice(0, 500);
                            attemptLog.result = "FOUND_QUESTIONS";
                            runLog.attempts.push(attemptLog);
                            break outerLoop; // EXIT BOTH LOOPS
                        } else {
                            attemptLog.result = "VALID_JSON_BUT_NO_QUESTIONS";
                        }
                    } catch (e) {
                        attemptLog.result = "JSON_PARSE_ERROR";
                    }
                } else {
                    attemptLog.result = "HTTP_ERROR_OR_NOT_JSON";
                }
            } catch (e: any) {
                attemptLog.error = e.message;
            }
            runLog.attempts.push(attemptLog);
        }
    }

    // 3. PROCESS DATA OR FAIL
    if (!questionsArray || questionsArray.length === 0) {
        runLog.error = "No questions found in any endpoint.";
        window.NQ_DEBUG.blooket.runs.push(runLog);
        window.NQ_DEBUG.blooket.lastRun = runLog;
        console.table(runLog.attempts);
        console.groupEnd();
        return null;
    }

    // 4. NORMALIZE
    const imageCandidates = new Set<string>();
    scanForImages(foundData, imageCandidates);
    runLog.imageCandidatePaths = Array.from(imageCandidates);

    const normalizedQuestions: Question[] = questionsArray.map((rawQ: any) => {
        const qText = rawQ.question || rawQ.text || "Untitled Question";
        
        // Options
        const rawAnswers = rawQ.answers || rawQ.choices || rawQ.options || rawQ.typingAnswers || [];
        // Determine correct answers (Array of strings usually)
        const correctRaw = rawQ.correctAnswers || rawQ.typingAnswers || [];
        const correctSet = new Set(Array.isArray(correctRaw) ? correctRaw.map(String) : [String(correctRaw)]);

        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        // Normalize text for comparison (Blooket relies on exact string match)
        const normalize = (s: string) => s.trim();

        if (Array.isArray(rawAnswers)) {
            rawAnswers.forEach((ans: any) => {
                const txt = typeof ans === 'string' ? ans : (ans.text || String(ans));
                const id = uuid();
                const opt: Option = { id, text: txt };
                
                // Try to resolve option image
                if (typeof ans === 'object' && ans.image) {
                     opt.imageUrl = resolveImage(ans.image);
                }

                options.push(opt);

                if (correctSet.has(txt) || correctSet.has(normalize(txt))) {
                    correctOptionIds.push(id);
                }
            });
        }

        // Image Logic
        let mainImage = resolveImage(rawQ.image);
        if (!mainImage && rawQ.media && rawQ.media.url) mainImage = resolveImage(rawQ.media.url);

        // Flags
        const needsEnhanceAI = options.length < 2 || correctOptionIds.length === 0;
        const enhanceReason = needsEnhanceAI ? "no_correct_exposed_public" : undefined;

        // Type Heuristics
        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        if (options.length === 2 && 
            options.some(o => o.text.toLowerCase().includes('true')) && 
            options.some(o => o.text.toLowerCase().includes('false'))) {
            qType = QUESTION_TYPES.TRUE_FALSE;
        } else if (correctOptionIds.length > 1) {
            qType = QUESTION_TYPES.MULTI_SELECT;
        }

        return {
            id: uuid(),
            text: qText,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: mainImage || "",
            timeLimit: rawQ.timeLimit || 20,
            questionType: qType,
            reconstructed: false,
            sourceEvidence: `Blooket (${finalEndpoint})`,
            needsEnhanceAI,
            enhanceReason
        };
    });

    // 5. FINALIZE REPORT
    runLog.normalizedQuizPreview = normalizedQuestions.slice(0, 2);
    runLog.success = true;
    window.NQ_DEBUG.blooket.runs.push(runLog);
    window.NQ_DEBUG.blooket.lastRun = runLog;

    console.log("Success! Extracted", normalizedQuestions.length, "questions");
    console.log("Debug Data:", runLog);
    console.groupEnd();

    // Construct Result
    const title = foundData.title || foundData.setInfo?.title || foundData.name || "Blooket Quiz";
    const report: UniversalDiscoveryReport = {
        platform: 'blooket',
        originalUrl: url,
        methodUsed: `api_ladder_${finalEndpoint}`,
        blockedByBot: false,
        parseOk: true,
        attempts: runLog.attempts,
        questionsFound: normalizedQuestions.length,
        hasChoices: normalizedQuestions.some(q => q.options.length > 0),
        hasCorrectFlags: normalizedQuestions.some(q => q.correctOptionIds && q.correctOptionIds.length > 0),
        hasImages: normalizedQuestions.some(q => !!q.imageUrl),
        missing: {
            options: false,
            correct: false,
            image: false,
            reasons: []
        }
    };

    return {
        quiz: {
            title,
            description: "Imported via Neural Quiz Blooket Bridge",
            questions: normalizedQuestions
        },
        report
    };
};
