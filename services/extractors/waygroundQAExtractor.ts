
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

const getJinaKey = () => getEnvVar('VITE_JINA_API_KEY');
const getCorsProxyKey = () => getEnvVar('VITE_CORSPROXY_API_KEY');

// --- FETCH AGENTS LADDER (REORDERED FOR STABILITY) ---
const AGENTS = [
    // 1. AllOrigins: Currently the most stable free HTML tunnel
    {
        name: 'AllOrigins Raw',
        fetch: async (target: string) => {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.text();
        }
    },
    {
        name: 'AllOrigins Get',
        fetch: async (target: string) => {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            return data.contents;
        }
    },
    // 2. Jina: Premium rendering (Good for JS-heavy sites, but returns MD, so might miss raw JSON scripts)
    {
        name: 'Jina Reader',
        fetch: async (target: string) => {
            const headers: Record<string, string> = {};
            const key = getJinaKey();
            if (key) headers['Authorization'] = `Bearer ${key}`;
            
            const res = await fetch(`https://r.jina.ai/${target}`, { headers });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.text();
        }
    },
    // 3. CorsProxy: Moved to bottom due to frequent 403s on free tier
    {
        name: 'CorsProxy',
        fetch: async (target: string) => {
            let proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(target)}`;
            
            // If user has a paid key, try to inject it (common format)
            const key = getCorsProxyKey();
            if (key) {
                // Support generic key param injection if the user has a premium service compatible
                proxyUrl = `https://corsproxy.io/?key=${key}&url=${encodeURIComponent(target)}`;
            }

            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`Status ${res.status} (Likely Rate Limited)`);
            return await res.text();
        }
    }
];

// --- HELPERS ---

const extractQuizId = (url: string): string | null => {
    const match = url.match(/([a-f0-9]{24})/);
    return match ? match[1] : null;
};

const cleanText = (text: string | undefined): string => {
    if (!text) return "";
    return text.replace(/<[^>]*>?/gm, '').trim();
};

const isBlockedByBot = (html: string): boolean => {
    const lower = html.toLowerCase();
    return (
        lower.includes("challenge-platform") ||
        lower.includes("cloudflare") ||
        lower.includes("verify you are human") ||
        lower.includes("access denied") ||
        lower.includes("403 forbidden")
    );
};

// --- STRATEGY 1: JSON-LD PARSING ---

const parseJsonLdContent = (json: any): Question[] => {
    const questions: Question[] = [];
    let rawItems = json.hasPart || json.question || [];
    
    if (!Array.isArray(rawItems) && typeof rawItems === 'object') {
        rawItems = [rawItems];
    }

    rawItems.forEach((item: any) => {
        if (item['@type'] !== 'Question') return;

        const text = cleanText(item.text || "Untitled Question");
        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        // Process Correct Answer(s) (acceptedAnswer)
        let accepted = item.acceptedAnswer;
        if (accepted) {
            if (!Array.isArray(accepted)) accepted = [accepted];
            accepted.forEach((ans: any) => {
                const optId = uuid();
                const ansText = cleanText(ans.text);
                if (ansText) {
                    options.push({ id: optId, text: ansText });
                    correctOptionIds.push(optId);
                }
            });
        }

        // Process Distractors (suggestedAnswer)
        let suggested = item.suggestedAnswer;
        if (suggested) {
            if (!Array.isArray(suggested)) suggested = [suggested];
            suggested.forEach((ans: any) => {
                const optId = uuid();
                const ansText = cleanText(ans.text);
                if (ansText) {
                    options.push({ id: optId, text: ansText });
                }
            });
        }

        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        if (correctOptionIds.length > 1) qType = QUESTION_TYPES.MULTI_SELECT;
        if (item.eduQuestionType === 'Checkbox') qType = QUESTION_TYPES.MULTI_SELECT;

        questions.push({
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: "", // Explicitly ignored per requirements
            timeLimit: 30,
            questionType: qType,
            reconstructed: false,
            sourceEvidence: "JSON-LD"
        });
    });

    return questions;
};

// --- STRATEGY 2: HYDRATION DATA PARSING (__NEXT_DATA__) ---

const parseHydrationData = (json: any): Question[] => {
    // Traverse to find 'questions' array
    const questions: Question[] = [];
    
    // Attempt to locate the main quiz object in props
    let rawQuestions: any[] = [];
    if (json.props?.pageProps?.quiz?.questions) rawQuestions = json.props.pageProps.quiz.questions;
    else if (json.quiz?.questions) rawQuestions = json.quiz.questions;
    
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return [];

    rawQuestions.forEach((q: any) => {
        // Text is often in structure.query.text
        const text = cleanText(q.structure?.query?.text || q.text);
        
        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        // Options logic
        const rawOpts = q.structure?.options || q.options || [];
        
        // Correctness logic (indices or boolean)
        let correctIndices: number[] = [];
        const answer = q.structure?.answer;
        if (typeof answer === 'number') correctIndices = [answer];
        else if (Array.isArray(answer)) correctIndices = answer;

        if (Array.isArray(rawOpts)) {
            rawOpts.forEach((opt: any, idx: number) => {
                const optId = uuid();
                const optText = cleanText(opt.text || (opt.media && opt.media[0]?.text)); // Sometimes text is inside media array
                
                if (optText) {
                    options.push({ id: optId, text: optText });
                    if (opt.correct || correctIndices.includes(idx)) {
                        correctOptionIds.push(optId);
                    }
                }
            });
        }

        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        if (q.type === 'BLANK' || q.structure?.kind === 'BLANK') qType = QUESTION_TYPES.FILL_GAP;
        else if (q.type === 'POLL') qType = QUESTION_TYPES.POLL;
        else if (q.type === 'OPEN') qType = QUESTION_TYPES.OPEN_ENDED;
        else if (correctOptionIds.length > 1) qType = QUESTION_TYPES.MULTI_SELECT;

        questions.push({
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: "", // Ignored
            timeLimit: q.time ? Math.round(q.time / 1000) : 30,
            questionType: qType,
            feedback: cleanText(q.structure?.explain?.text), // Explanation extraction
            reconstructed: false,
            sourceEvidence: "Hydration Data"
        });
    });

    return questions;
};

// --- STRATEGY 3: DOM PARSING (HTML FALLBACK) ---

const parseHtmlDom = (html: string): Question[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const questions: Question[] = [];

    // Selectors for typical quizizz/wayground public/print pages
    // Note: These classes are heuristic based on common CSS frameworks used in these sites
    const cardSelectors = ['.question-card', '.quiz-question', '[data-testid="question-card"]'];
    let cards = doc.querySelectorAll(cardSelectors.join(','));
    
    // If no cards found, try generic list items if it looks like a print view
    if (cards.length === 0) {
        cards = doc.querySelectorAll('.print-question');
    }

    cards.forEach((card) => {
        // Text Extraction
        const textEl = card.querySelector('.question-text, .query-text, p');
        const text = cleanText(textEl?.textContent || "");
        if (!text) return;

        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        // Option Extraction
        const optEls = card.querySelectorAll('.answer-option, .option-row, li');
        optEls.forEach((optEl) => {
            const optText = cleanText(optEl.textContent || "");
            if (!optText) return;

            const id = uuid();
            options.push({ id, text: optText });

            // Semantic Analysis for Correctness in HTML
            // Check for specific classes or icons
            const htmlContent = optEl.outerHTML;
            const isCorrect = 
                optEl.classList.contains('correct') || 
                optEl.classList.contains('correct-answer') || 
                htmlContent.includes('fa-check') || 
                htmlContent.includes('text-green') ||
                htmlContent.includes('color: green'); // Inline style check

            if (isCorrect) correctOptionIds.push(id);
        });

        // Time Limit Extraction (often "30s" or similar text)
        let timeLimit = 30;
        const metaText = card.textContent || "";
        const timeMatch = metaText.match(/(\d+)\s*(s|sec|seconds)/);
        if (timeMatch) timeLimit = parseInt(timeMatch[1]);

        questions.push({
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: "", // Ignored
            timeLimit,
            questionType: correctOptionIds.length > 1 ? QUESTION_TYPES.MULTI_SELECT : QUESTION_TYPES.MULTIPLE_CHOICE,
            reconstructed: true, // Marked as reconstructed since it's from DOM
            sourceEvidence: "DOM Parser"
        });
    });

    return questions;
};

// --- MAIN EXTRACTOR ---

export const extractWaygroundQA = async (url: string): Promise<{ quiz: Quiz | null, report: UniversalDiscoveryReport }> => {
    const runId = uuid();
    const ts = Date.now();
    
    const debug: any = {
        ts,
        runId,
        inputUrl: url,
        steps: [],
        error: null
    };

    let html = "";

    try {
        debug.steps.push("STEP 1: ID Extraction");
        const quizId = extractQuizId(url);
        // If ID found, construct canonical URL to ensure best chance of JSON-LD
        const targetUrl = quizId ? `https://quizizz.com/admin/quiz/${quizId}` : url;
        
        let usedAgent = "";

        debug.steps.push("STEP 2: Fetching via Agent Ladder");

        // FETCH LOOP
        for (const agent of AGENTS) {
            try {
                const content = await agent.fetch(targetUrl);
                if (content && content.length > 500) {
                    if (isBlockedByBot(content)) {
                        debug.steps.push(`Agent ${agent.name} BLOCKED`);
                        continue;
                    }
                    html = content;
                    usedAgent = agent.name;
                    debug.steps.push(`Agent ${agent.name} SUCCESS`);
                    break;
                }
            } catch (e: any) {
                debug.steps.push(`Agent ${agent.name} FAILED: ${e.message}`);
            }
        }

        if (!html) {
            throw new Error("All fetch agents failed or were blocked. Try opening the quiz in Incognito or use the 'Paste' tab.");
        }

        // PARSING PIPELINE
        let bestQuestions: Question[] = [];
        let methodUsed = `fetch_${usedAgent}`;

        // 1. JSON-LD Strategy (Most Reliable for SEO data)
        debug.steps.push("STEP 3: Attempting JSON-LD");
        const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = jsonLdRegex.exec(html)) !== null) {
            try {
                const json = JSON.parse(match[1]);
                const qs = parseJsonLdContent(json);
                if (qs.length > bestQuestions.length) {
                    bestQuestions = qs;
                    methodUsed += "_json_ld";
                }
            } catch (e) {}
        }

        // 2. Hydration Strategy (__NEXT_DATA__)
        if (bestQuestions.length === 0) {
            debug.steps.push("STEP 4: Attempting Hydration Data");
            const hydrationRegex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/;
            const hydMatch = html.match(hydrationRegex);
            if (hydMatch && hydMatch[1]) {
                try {
                    const json = JSON.parse(hydMatch[1]);
                    const qs = parseHydrationData(json);
                    if (qs.length > 0) {
                        bestQuestions = qs;
                        methodUsed += "_hydration";
                    }
                } catch (e) {}
            }
        }

        // 3. DOM Parser Strategy (Fallback for Print/Static views)
        if (bestQuestions.length === 0) {
            debug.steps.push("STEP 5: Attempting DOM Parsing");
            const qs = parseHtmlDom(html);
            if (qs.length > 0) {
                bestQuestions = qs;
                methodUsed += "_dom";
            }
        }

        if (bestQuestions.length === 0) {
            throw new Error("No questions found via any strategy.");
        }

        // Finalize
        const resultQuiz: Quiz = {
            title: "Wayground/Quizizz Quiz", // Title extraction could be improved but focusing on Qs
            description: "Extracted via Neural Quiz",
            questions: bestQuestions
        };

        finalizeDebug(debug, true);

        return {
            quiz: resultQuiz,
            report: {
                platform: 'wayground',
                originalUrl: url,
                methodUsed,
                blockedByBot: false,
                parseOk: true,
                questionsFound: bestQuestions.length,
                hasChoices: true,
                hasCorrectFlags: bestQuestions.some(q => q.correctOptionIds && q.correctOptionIds.length > 0),
                hasImages: false, // Disabled by design
                attempts: [],
                missing: { options: false, correct: false, image: false, reasons: [] }
            }
        };

    } catch (e: any) {
        debug.error = e.message;
        finalizeDebug(debug, false);

        return {
            quiz: null,
            report: {
                platform: 'wayground',
                originalUrl: url,
                methodUsed: 'failed',
                blockedByBot: html?.includes("challenge") || false,
                parseOk: false,
                questionsFound: 0,
                hasChoices: false, hasCorrectFlags: false, hasImages: false,
                attempts: [],
                missing: { options: true, correct: true, image: true, reasons: [e.message] }
            }
        };
    }
};

const finalizeDebug = (debug: any, success: boolean) => {
    if (window.NQ_DEBUG && window.NQ_DEBUG.wayground) {
        window.NQ_DEBUG.wayground.lastRun = { ...debug, success };
        window.NQ_DEBUG.wayground.runs.push({ ...debug, success });
        console.log("WAYGROUND_EXTRACTOR_RUN", debug);
    }
};
