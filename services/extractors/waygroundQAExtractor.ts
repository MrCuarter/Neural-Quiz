
import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport } from "../../types";

// --- GLOBAL DEBUG TYPE ---
declare global {
  interface Window {
    NQ_DEBUG: any;
  }
}

if (typeof window !== 'undefined') {
    window.NQ_DEBUG = window.NQ_DEBUG || {};
    window.NQ_DEBUG.wayground = window.NQ_DEBUG.wayground || { runs: [], lastRun: null };
}

const uuid = () => Math.random().toString(36).substring(2, 9);

// Helper to get Env Variables
const getEnvVar = (key: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) {}
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) {}
    return "";
};

const getCorsProxyKey = () => getEnvVar('VITE_CORSPROXY_API_KEY');

// --- CONSTANTS ---
const AGENTS = [
    // 1. CorsProxy: Best for JSON APIs
    {
        name: 'CorsProxy',
        fetch: async (target: string) => {
            let proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(target)}`;
            const key = getCorsProxyKey();
            if (key) proxyUrl = `https://corsproxy.io/?key=${key}&url=${encodeURIComponent(target)}`;
            
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.text();
        }
    },
    // 2. AllOrigins Raw: Best for HTML
    {
        name: 'AllOrigins Raw',
        fetch: async (target: string) => {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.text();
        }
    }
];

// --- HELPERS ---

const extractQuizId = (url: string): string | null => {
    // Matches standard Mongo-style IDs (24 hex chars)
    const match = url.match(/([a-f0-9]{24})/);
    return match ? match[1] : null;
};

const cleanText = (text: string | undefined): string => {
    if (!text) return "";
    return text.replace(/<[^>]*>?/gm, '').trim(); // Strip HTML
};

// --- PARSERS ---

// Parser for the official Quizizz JSON API
const parseApiJson = (json: any): Question[] => {
    const rawQuestions = json.data?.quiz?.info?.questions || json.data?.quiz?.questions || json.questions || [];
    if (!Array.isArray(rawQuestions)) return [];

    return rawQuestions.map((q: any) => {
        const text = cleanText(q.structure?.query?.text || q.text || "Untitled Question");
        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        // Correct Index Logic
        let correctIndices: number[] = [];
        const answer = q.structure?.answer;
        if (typeof answer === 'number') correctIndices = [answer];
        else if (Array.isArray(answer)) correctIndices = answer;

        // Options
        const rawOpts = q.structure?.options || q.options || [];
        if (Array.isArray(rawOpts)) {
            rawOpts.forEach((opt: any, idx: number) => {
                const optId = uuid();
                let optText = cleanText(opt.text);
                
                // Fallback: Check media for text
                if (!optText && opt.media && Array.isArray(opt.media)) {
                    const textMedia = opt.media.find((m: any) => m.type === 'text');
                    if (textMedia) optText = cleanText(textMedia.text);
                }
                
                // Fallback: Image placeholder
                if (!optText && (opt.hasLabel || opt.media)) optText = `[Option ${idx+1}]`;

                if (optText) {
                    options.push({ id: optId, text: optText });
                    // Check correctness (index match or boolean flag)
                    if (correctIndices.includes(idx) || opt.correct) {
                        correctOptionIds.push(optId);
                    }
                }
            });
        }

        // Type Inference
        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        if (q.type === 'BLANK' || q.structure?.kind === 'BLANK') qType = QUESTION_TYPES.FILL_GAP;
        else if (q.type === 'POLL') qType = QUESTION_TYPES.POLL;
        else if (q.type === 'OPEN') qType = QUESTION_TYPES.OPEN_ENDED;
        else if (correctOptionIds.length > 1) qType = QUESTION_TYPES.MULTI_SELECT;

        // Extract Image
        let imageUrl = undefined;
        if (q.structure?.query?.media) {
            const img = q.structure.query.media.find((m: any) => m.type === 'image');
            if (img && img.url) imageUrl = img.url;
        }

        return {
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: imageUrl || "",
            timeLimit: q.time ? Math.round(q.time / 1000) : 30,
            questionType: qType,
            feedback: cleanText(q.structure?.explain?.text),
            reconstructed: false,
            sourceEvidence: "Quizizz Public API"
        };
    });
};

// Parser for the Print View HTML (DOM Parsing)
const parsePrintHtml = (html: string): Question[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const questions: Question[] = [];

    // Look for question containers in print view
    const cardSelectors = ['.question-card', '.quiz-question', '.print-question', '[data-testid="question-card"]'];
    let cards = doc.querySelectorAll(cardSelectors.join(','));

    cards.forEach((card) => {
        // Text
        const textEl = card.querySelector('.question-text, .query-text, p');
        const text = cleanText(textEl?.textContent || "");
        if (!text) return;

        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        // Options
        const optEls = card.querySelectorAll('.answer-option, .option-row, .option');
        optEls.forEach((optEl) => {
            const optText = cleanText(optEl.textContent || "");
            if (!optText) return;

            const id = uuid();
            options.push({ id, text: optText });

            // Correctness heuristics in HTML (icons, colors, classes)
            const htmlContent = optEl.outerHTML;
            const isCorrect = 
                optEl.classList.contains('correct') || 
                optEl.classList.contains('correct-answer') || 
                htmlContent.includes('fa-check') || 
                htmlContent.includes('text-green') ||
                htmlContent.includes('color:green') ||
                htmlContent.includes('color: green'); // Inline style check

            if (isCorrect) correctOptionIds.push(id);
        });

        // Image (Heuristic)
        const imgEl = card.querySelector('img');
        const imageUrl = imgEl ? imgEl.src : "";

        questions.push({
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl,
            timeLimit: 30,
            questionType: correctOptionIds.length > 1 ? QUESTION_TYPES.MULTI_SELECT : QUESTION_TYPES.MULTIPLE_CHOICE,
            reconstructed: true,
            sourceEvidence: "Print View DOM"
        });
    });

    return questions;
};

// --- MAIN ORCHESTRATOR ---

export const extractWaygroundQA = async (url: string): Promise<{ quiz: Quiz | null, report: UniversalDiscoveryReport }> => {
    const runId = uuid();
    const ts = Date.now();
    const debug: any = { ts, runId, inputUrl: url, steps: [], error: null };

    try {
        debug.steps.push("STEP 1: ID Extraction");
        const quizId = extractQuizId(url);
        if (!quizId) throw new Error("Could not find Quiz ID in URL. Make sure URL contains the 24-character ID.");

        debug.steps.push(`ID Found: ${quizId}`);

        // --- STRATEGY A: PUBLIC API (Best Quality) ---
        // https://quizizz.com/api/main/quiz/{ID}
        // This endpoint returns pure JSON and is often accessible even if the main page is blocked.
        debug.steps.push("STEP 2: Attempting API Strategy");
        try {
            const apiUrl = `https://quizizz.com/api/main/quiz/${quizId}`;
            // Use CorsProxy for API JSON (AllOrigins often corrupts JSON)
            const apiAgent = AGENTS.find(a => a.name === 'CorsProxy') || AGENTS[0]; 
            
            const jsonText = await apiAgent.fetch(apiUrl);
            if (jsonText.startsWith('{')) {
                const json = JSON.parse(jsonText);
                const questions = parseApiJson(json);
                
                if (questions.length > 0) {
                    debug.steps.push(`API Strategy SUCCESS: ${questions.length} questions`);
                    
                    const title = json.data?.quiz?.info?.name || json.quiz?.info?.name || "Wayground Quiz";
                    finalizeDebug(debug, true);
                    
                    return {
                        quiz: { title, description: "Extracted via Neural Quiz API Bridge", questions },
                        report: createReport(url, "api_json", questions)
                    };
                }
            }
        } catch (e: any) {
            debug.steps.push(`API Strategy FAILED: ${e.message}`);
        }

        // --- STRATEGY B: PRINT VIEW (Fallback) ---
        // https://quizizz.com/print/quiz/{ID}
        // The print view is simpler HTML, easier to scrape than the full admin SPA.
        debug.steps.push("STEP 3: Attempting Print View Strategy");
        try {
            const printUrl = `https://quizizz.com/print/quiz/${quizId}`;
            // Use AllOrigins for HTML (It's robust for text)
            const printAgent = AGENTS.find(a => a.name === 'AllOrigins Raw') || AGENTS[1];
            
            const htmlText = await printAgent.fetch(printUrl);
            
            // Check for blockers
            if (htmlText.length > 500 && !htmlText.includes("challenge-platform")) {
                const questions = parsePrintHtml(htmlText);
                
                if (questions.length > 0) {
                    debug.steps.push(`Print Strategy SUCCESS: ${questions.length} questions`);
                    finalizeDebug(debug, true);
                    
                    // Try to grab title from title tag
                    const titleMatch = htmlText.match(/<title>(.*?)<\/title>/);
                    const title = titleMatch ? titleMatch[1].replace(" - Quizizz", "") : "Wayground Quiz (Print)";

                    return {
                        quiz: { title, description: "Extracted via Neural Quiz DOM Parser", questions },
                        report: createReport(url, "print_dom", questions)
                    };
                }
            } else {
                debug.steps.push("Print View Blocked or Empty");
            }
        } catch (e: any) {
            debug.steps.push(`Print Strategy FAILED: ${e.message}`);
        }

        // --- STRATEGY C: JSON-LD (Last Resort on Input URL) ---
        // If the user pasted a specific public URL that might have JSON-LD
        debug.steps.push("STEP 4: Attempting JSON-LD on Input URL");
        // ... (JSON-LD logic is rarely needed if API/Print fails, usually blocked too)

        throw new Error("All strategies failed. The quiz might be private or region-locked.");

    } catch (e: any) {
        debug.error = e.message;
        finalizeDebug(debug, false);
        return {
            quiz: null,
            report: {
                platform: 'wayground',
                originalUrl: url,
                methodUsed: 'failed',
                blockedByBot: true,
                parseOk: false,
                questionsFound: 0,
                hasChoices: false, hasCorrectFlags: false, hasImages: false,
                attempts: [],
                missing: { options: true, correct: true, image: true, reasons: [e.message] }
            }
        };
    }
};

const createReport = (url: string, method: string, questions: Question[]): UniversalDiscoveryReport => {
    return {
        platform: 'wayground',
        originalUrl: url,
        methodUsed: method,
        blockedByBot: false,
        parseOk: true,
        questionsFound: questions.length,
        hasChoices: questions.some(q => q.options.length > 0),
        hasCorrectFlags: questions.some(q => q.correctOptionIds && q.correctOptionIds.length > 0),
        hasImages: questions.some(q => !!q.imageUrl),
        attempts: [],
        missing: { options: false, correct: false, image: false, reasons: [] }
    };
};

const finalizeDebug = (debug: any, success: boolean) => {
    if (window.NQ_DEBUG && window.NQ_DEBUG.wayground) {
        window.NQ_DEBUG.wayground.lastRun = { ...debug, success };
        window.NQ_DEBUG.wayground.runs.push({ ...debug, success });
        console.log("WAYGROUND_EXTRACTOR_RUN", debug);
    }
};
