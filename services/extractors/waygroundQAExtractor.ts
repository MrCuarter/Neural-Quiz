
import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport } from "../../types";

// --- GLOBAL DEBUG SETUP ---
declare global {
  interface Window {
    NQ_DEBUG: any;
  }
}

if (typeof window !== 'undefined') {
    window.NQ_DEBUG = window.NQ_DEBUG || {};
    window.NQ_DEBUG.wayground = window.NQ_DEBUG.wayground || { runs: [] };
}

const uuid = () => Math.random().toString(36).substring(2, 9);

// --- 1. FETCH AGENTS (Removed corsproxy) ---
const AGENTS = [
    { 
        id: 'allorigins_raw', 
        name: 'AllOrigins (Raw)', 
        url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        type: 'text'
    },
    { 
        id: 'allorigins_get', 
        name: 'AllOrigins (Wrapper)', 
        url: (target: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
        type: 'json_wrapper'
    },
    { 
        id: 'jina', 
        name: 'Jina Reader', 
        url: (target: string) => `https://r.jina.ai/${target}`,
        type: 'text'
    }
];

// --- 2. DEEP FINDER ---

interface Candidate {
    array: any[];
    score: number;
    path: string;
}

// Heurística simple y efectiva
const isWaygroundQuestion = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    
    // Check keys presence
    const hasText = obj.structure?.query?.text || obj.text || obj.question || obj.title;
    const hasOptions = obj.structure?.options || obj.options || obj.choices || obj.answers;

    return !!(hasText && hasOptions);
};

const deepFindQuestions = (root: any, path = "", candidates: Candidate[] = [], depth = 0): Candidate[] => {
    if (depth > 12 || !root) return candidates;

    if (Array.isArray(root)) {
        let validCount = 0;
        // Check density of valid questions in array
        root.forEach(item => { if (isWaygroundQuestion(item)) validCount++; });

        // Score: High density or absolute number
        if (validCount > 0 && (validCount >= root.length * 0.5 || validCount >= 2)) {
            candidates.push({
                array: root,
                score: validCount * 10,
                path
            });
        }
        
        // Recurse into array items (sometimes questions are wrapped or nested)
        root.forEach((item, i) => deepFindQuestions(item, `${path}[${i}]`, candidates, depth + 1));
    } else if (typeof root === 'object') {
        // Optimization: Prioritize 'questions' key
        if (Array.isArray(root.questions)) {
             deepFindQuestions(root.questions, `${path}.questions`, candidates, depth + 1);
        }

        Object.keys(root).forEach(key => {
            // Optimization: Skip clearly irrelevant large objects
            if (!['config', 'theme', 'assets', 'locales', 'i18n'].includes(key)) {
                deepFindQuestions(root[key], `${path}.${key}`, candidates, depth + 1);
            }
        });
    }
    return candidates;
};

// --- 3. NORMALIZATION ---

const normalizeWaygroundQuestions = (rawQs: any[]): Question[] => {
    return rawQs.map(q => {
        // 1. TEXT
        let text = "Untitled Question";
        if (q.structure?.query?.text) text = q.structure.query.text;
        else if (q.text) text = q.text;
        else if (q.question) text = q.question;
        
        // Remove HTML
        text = text.replace(/<[^>]*>?/gm, '').trim();

        // 2. OPTIONS & CORRECT INDICES
        const options: Option[] = [];
        let correctIndices: number[] = [];

        // Wayground Correctness Logic
        if (typeof q.structure?.answer === 'number') correctIndices = [q.structure.answer];
        else if (Array.isArray(q.structure?.answer)) correctIndices = q.structure.answer;

        const rawOpts = q.structure?.options || q.options || q.choices || [];
        
        if (Array.isArray(rawOpts)) {
            rawOpts.forEach((opt: any, idx: number) => {
                const optId = uuid();
                let optText = opt.text;
                // Fallback for media-only options
                if (!optText && Array.isArray(opt.media)) {
                    const txtMedia = opt.media.find((m:any) => m.type === 'text');
                    if (txtMedia) optText = txtMedia.text;
                }
                if (!optText) optText = `Option ${idx + 1}`;

                options.push({ id: optId, text: String(optText).trim() });

                // Check boolean flags in option object
                if (opt.correct || opt.isCorrect) {
                    if (!correctIndices.includes(idx)) correctIndices.push(idx);
                }
            });
        }

        // Map indices to IDs
        const correctOptionIds = correctIndices
            .map(idx => options[idx]?.id)
            .filter(id => !!id);

        // 3. TYPE
        let type = QUESTION_TYPES.MULTIPLE_CHOICE;
        const kind = (q.structure?.kind || q.type || "").toUpperCase();
        if (kind.includes('BLANK') || kind.includes('FILL')) type = QUESTION_TYPES.FILL_GAP;
        else if (kind.includes('OPEN')) type = QUESTION_TYPES.OPEN_ENDED;
        else if (kind.includes('POLL')) type = QUESTION_TYPES.POLL;
        else if (correctOptionIds.length > 1) type = QUESTION_TYPES.MULTI_SELECT;

        // 4. FLAGS
        // Needs Enhance if < 2 options (unless Open/Poll) OR no correct answer found (unless Open/Poll)
        const needsEnhanceAI = (options.length < 2 && type !== QUESTION_TYPES.OPEN_ENDED && type !== QUESTION_TYPES.POLL) || 
                               (correctOptionIds.length === 0 && type !== QUESTION_TYPES.POLL && type !== QUESTION_TYPES.OPEN_ENDED);

        return {
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            questionType: type,
            timeLimit: q.time ? Math.round(q.time/1000) : 30,
            feedback: q.structure?.explanation?.text || "",
            imageUrl: "", // Explicitly ignored
            reconstructed: false,
            needsEnhanceAI,
            enhanceReason: needsEnhanceAI ? "wayground_missing_data" : undefined
        };
    });
};

// --- MAIN EXTRACTOR ---

export const extractWaygroundQA = async (url: string): Promise<{ quiz: Quiz | null, report: UniversalDiscoveryReport }> => {
    const runId = uuid();
    
    // DEBUG STATE
    const debug: any = {
        runId,
        inputUrl: url,
        attempts: [],
        winnerAttemptIndex: -1,
        winnerPreview2kb: "",
        parse: {
            foundNextData: false,
            nextDataBytes: 0,
            jsonScriptCount: 0,
            candidateJsonBytes: 0,
            methodsTried: []
        },
        extracted: {
            qCount: 0,
            sampleQ1: null
        },
        errors: []
    };

    let winnerText = "";
    let fetchSuccess = false;

    // 1. FETCH LADDER
    for (let i = 0; i < AGENTS.length; i++) {
        const agent = AGENTS[i];
        const attemptLog: any = {
            source: agent.name,
            targetUrl: agent.url(url),
            status: 0,
            ok: false,
            bytes: 0,
            snippet200: ""
        };

        try {
            const res = await fetch(attemptLog.targetUrl);
            attemptLog.status = res.status;
            attemptLog.contentType = res.headers.get('content-type');
            
            if (res.ok) {
                let text = await res.text();
                
                // Handle JSON Wrapper
                if (agent.type === 'json_wrapper') {
                    try {
                        const json = JSON.parse(text);
                        if (json.contents) text = json.contents;
                    } catch(e) { /* wrapper parse error */ }
                }

                attemptLog.bytes = text.length;
                attemptLog.snippet200 = text.substring(0, 200);

                // Validation: Must be substantive content
                if (text.length > 3000 && !text.includes("Challenge") && !text.includes("Just a moment")) {
                    attemptLog.ok = true;
                    winnerText = text;
                    debug.winnerAttemptIndex = i;
                    debug.winnerPreview2kb = text.substring(0, 2000);
                    fetchSuccess = true;
                    debug.attempts.push(attemptLog);
                    break; // Winner found, stop ladder
                }
            }
        } catch (e: any) {
            attemptLog.error = e.message;
        }
        debug.attempts.push(attemptLog);
    }

    if (!fetchSuccess) {
        debug.errors.push("fetch_blocked_or_empty");
        finalizeDebug(debug);
        return { 
            quiz: null, 
            report: makeReport(debug, url, false) 
        };
    }

    // 2. PARSING
    let candidates: Candidate[] = [];
    const winnerTrimmed = winnerText.trim();

    // Strategy A: Direct JSON
    if (winnerTrimmed.startsWith('{') || winnerTrimmed.startsWith('[')) {
        debug.parse.methodsTried.push("direct_json");
        try {
            const json = JSON.parse(winnerTrimmed);
            candidates = deepFindQuestions(json, "root_json");
        } catch(e) { debug.errors.push("direct_json_parse_fail"); }
    } 
    // Strategy B: HTML Embedding
    else {
        debug.parse.methodsTried.push("html_embedding");
        
        // B1. __NEXT_DATA__
        const nextRegex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/;
        const nextMatch = winnerText.match(nextRegex);
        if (nextMatch && nextMatch[1]) {
            debug.parse.foundNextData = true;
            debug.parse.nextDataBytes = nextMatch[1].length;
            try {
                const json = JSON.parse(nextMatch[1]);
                candidates = [...candidates, ...deepFindQuestions(json, "next_data")];
            } catch(e) { debug.errors.push("next_data_parse_fail"); }
        }

        // B2. Generic Scripts (Fallback)
        // Regex to capture script content, conservatively
        const scriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
        let m;
        while ((m = scriptRegex.exec(winnerText)) !== null) {
            const content = m[1];
            // Only try parsing huge scripts that look promising
            if (content.length > 5000 && (
                content.includes("questions") || 
                content.includes("structure") || 
                content.includes("dehydratedState") ||
                content.includes("initialState")
            )) {
                debug.parse.jsonScriptCount++;
                // Try extracting outermost JSON object
                const firstBrace = content.indexOf('{');
                const lastBrace = content.lastIndexOf('}');
                if (firstBrace > -1 && lastBrace > firstBrace) {
                    const jsonStr = content.substring(firstBrace, lastBrace + 1);
                    try {
                        const json = JSON.parse(jsonStr);
                        debug.parse.candidateJsonBytes += jsonStr.length;
                        candidates = [...candidates, ...deepFindQuestions(json, "generic_script")];
                    } catch(e) {}
                }
            }
        }
    }

    // 3. SELECTION
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length > 0) {
        const best = candidates[0];
        const questions = normalizeWaygroundQuestions(best.array);
        
        debug.extracted.qCount = questions.length;
        if (questions.length > 0) debug.extracted.sampleQ1 = questions[0];

        finalizeDebug(debug);

        return {
            quiz: {
                title: "Wayground Quiz",
                description: "Imported via Wayground QA",
                questions
            },
            report: makeReport(debug, url, true)
        };
    }

    // If we are here, we parsed content but found no questions
    debug.errors.push("NO_QUESTIONS_FOUND");
    finalizeDebug(debug);
    return { quiz: null, report: makeReport(debug, url, false) };
};

// HELPERS
const finalizeDebug = (debug: any) => {
    window.NQ_DEBUG.wayground.lastRun = debug;
    window.NQ_DEBUG.wayground.runs.push(debug);
    console.log("WAYGROUND_QA_LASTRUN", debug);
};

const makeReport = (debug: any, url: string, success: boolean): UniversalDiscoveryReport => {
    return {
        platform: 'wayground',
        originalUrl: url,
        methodUsed: debug.extracted.qCount > 0 ? 'deep_find_success' : 'failed',
        blockedByBot: debug.errors.includes("fetch_blocked_or_empty"),
        parseOk: success,
        attempts: debug.attempts,
        questionsFound: debug.extracted.qCount,
        hasChoices: debug.extracted.qCount > 0,
        hasCorrectFlags: debug.extracted.qCount > 0,
        hasImages: false,
        missing: {
            options: false,
            correct: false,
            image: true,
            reasons: debug.errors
        }
    };
};
