
import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport } from "../../types";

// --- GLOBAL DEBUG ---
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

// --- SIMPLE FETCH LADDER ---
// 1. NeuralProxy (Vercel): Best for WAF
// 2. AllOrigins RAW: Backup
// 3. CorsProxy: Standard backup.
// 4. Jina: Last resort for rendering.
const AGENTS = [
    { 
        name: 'NeuralProxy (Vercel)', 
        url: (target: string) => `https://neural-quiz.vercel.app/api/proxy?url=${encodeURIComponent(target)}`
    },
    { 
        name: 'AllOrigins Raw', 
        url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`
    },
    { 
        name: 'CorsProxy', 
        url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}`
    },
    { 
        name: 'Jina Reader', 
        url: (target: string) => `https://r.jina.ai/${target}`
    }
];

// --- PARSING HELPERS ---

const resolveUrl = (val: string): string | null => {
    if (!val || typeof val !== 'string') return null;
    let url = val.trim();
    if (url.startsWith('//')) url = `https:${url}`;
    if (url.startsWith('/')) return `https://media.quizizz.com${url}`;
    if (url.startsWith('http')) return url;
    return null;
};

// Deep search for the "Quiz" object inside generic JSON
const findQuizObject = (obj: any, depth = 0): any => {
    if (!obj || depth > 8) return null;
    if (typeof obj !== 'object') return null;

    // Signature of Wayground/Quizizz quiz object
    if (obj.info && Array.isArray(obj.questions)) return obj;
    if (obj.data && obj.data.quiz) return obj.data.quiz;
    if (obj.quiz && obj.quiz.info && obj.quiz.questions) return obj.quiz;

    // Traversal
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findQuizObject(item, depth + 1);
            if (found) return found;
        }
    } else {
        // Optimization: check likely keys first
        const keys = ['props', 'pageProps', 'initialState', 'quiz', 'serverData', 'query'];
        for (const key of keys) {
            if (obj[key]) {
                const found = findQuizObject(obj[key], depth + 1);
                if (found) return found;
            }
        }
        // Then remaining keys
        for (const key of Object.keys(obj)) {
            if (!keys.includes(key)) {
                const found = findQuizObject(obj[key], depth + 1);
                if (found) return found;
            }
        }
    }
    return null;
};

export const analyzeWaygroundUrl = async (url: string): Promise<{ quiz: Quiz, report: UniversalDiscoveryReport } | null> => {
    const runId = uuid();
    console.log(`[WAYGROUND] Starting Run ${runId} for ${url}`);

    let rawHtml = "";
    let methodUsed = "unknown";
    let fetchSuccess = false;

    // 1. FETCH SEQUENCE
    for (const agent of AGENTS) {
        try {
            const target = agent.url(url);
            console.log(`[WAYGROUND] Trying ${agent.name}...`);
            
            const res = await fetch(target);
            if (!res.ok) continue;
            
            const text = await res.text();
            
            // Basic validation
            if (text.length < 500) continue;
            if (text.toLowerCase().includes("access denied") || text.toLowerCase().includes("challenge-form")) continue;

            rawHtml = text;
            methodUsed = agent.name;
            fetchSuccess = true;
            break;
        } catch (e) {
            console.error(e);
        }
    }

    if (!fetchSuccess) {
        console.warn("[WAYGROUND] All agents failed.");
        return null;
    }

    // 2. EXTRACTION
    let quizData: any = null;
    const jsonCandidates: any[] = [];

    // Strategy A: Regex for Scripts (Standard Next.js/Nuxt apps)
    const scriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
    let match;
    while ((match = scriptRegex.exec(rawHtml)) !== null) {
        const content = match[1];
        if (content && (content.includes('__NEXT_DATA__') || content.includes('__INITIAL_STATE__') || content.includes('"questions"'))) {
            try {
                // Try to parse the whole content or find JSON substring
                if (content.trim().startsWith('{')) {
                    jsonCandidates.push(JSON.parse(content));
                } else {
                    // Extract variable assignment
                    const jsonStart = content.indexOf('{');
                    const jsonEnd = content.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd !== -1) {
                        jsonCandidates.push(JSON.parse(content.substring(jsonStart, jsonEnd + 1)));
                    }
                }
            } catch (e) {}
        }
    }

    // Strategy B: Full Body Parse (If API returned JSON directly)
    if (rawHtml.trim().startsWith('{')) {
        try { jsonCandidates.push(JSON.parse(rawHtml)); } catch(e) {}
    }

    // Find the Quiz Object
    for (const candidate of jsonCandidates) {
        const found = findQuizObject(candidate);
        if (found) {
            quizData = found;
            break;
        }
    }

    if (!quizData) {
        console.warn("[WAYGROUND] No structure found in JSONs.");
        return null;
    }

    // 3. NORMALIZATION
    const questions: Question[] = [];
    const rawQs = quizData.questions || [];

    rawQs.forEach((q: any) => {
        // Text Logic
        let text = q.text || q.question || "Untitled";
        if (q.structure?.query?.text) text = q.structure.query.text;
        
        // Remove HTML tags
        text = text.replace(/<[^>]+>/g, '');

        // Options Logic
        const options: Option[] = [];
        const correctOptionIds: string[] = [];
        
        const rawOpts = q.structure?.options || q.options || [];
        
        // Determine Correct Indices
        let correctIndices: number[] = [];
        if (typeof q.structure?.answer === 'number') correctIndices = [q.structure.answer];
        else if (Array.isArray(q.structure?.answer)) correctIndices = q.structure.answer;

        if (Array.isArray(rawOpts)) {
            rawOpts.forEach((opt: any, idx: number) => {
                const optId = uuid();
                let optText = opt.text;
                
                // Fallback for rich media options
                if (!optText && opt.media) {
                    const t = opt.media.find((m:any) => m.type === 'text');
                    if (t) optText = t.text;
                }
                if (!optText) optText = `Option ${idx + 1}`;

                options.push({ id: optId, text: optText });

                if (opt.correct || correctIndices.includes(idx)) {
                    correctOptionIds.push(optId);
                }
            });
        }

        // Image Logic
        let imageUrl = undefined;
        if (q.structure?.query?.media) {
            const m = q.structure.query.media.find((x:any) => x.type === 'image');
            if (m && m.url) imageUrl = resolveUrl(m.url);
        }
        if (!imageUrl && q.image) imageUrl = resolveUrl(q.image);

        // Type Inference
        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        if (correctOptionIds.length > 1) qType = QUESTION_TYPES.MULTI_SELECT;
        if (q.type === 'POLL') qType = QUESTION_TYPES.POLL;
        if (q.type === 'BLANK' || text.includes('__')) qType = QUESTION_TYPES.FILL_GAP;

        questions.push({
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: imageUrl || "",
            timeLimit: q.time ? Math.round(q.time / 1000) : 30,
            questionType: qType,
            reconstructed: false
        });
    });

    // 4. REPORT
    const report: UniversalDiscoveryReport = {
        platform: 'wayground',
        originalUrl: url,
        methodUsed,
        blockedByBot: false,
        parseOk: questions.length > 0,
        attempts: [],
        questionsFound: questions.length,
        hasChoices: questions.some(q => q.options.length > 0),
        hasCorrectFlags: questions.some(q => q.correctOptionIds && q.correctOptionIds.length > 0),
        hasImages: questions.some(q => !!q.imageUrl),
        missing: {
            options: false, correct: false, image: false, reasons: []
        }
    };

    return {
        quiz: {
            title: quizData.info?.name || "Wayground Quiz",
            description: "Extracted via Neural Quiz",
            questions
        },
        report
    };
};
