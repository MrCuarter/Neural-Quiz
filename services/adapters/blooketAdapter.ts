
import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport } from "../../types";
import { deepFindQuizCandidate, findAllImageRefs } from "../deepFindService";

// --- DEBUG TYPE DEFINITION ---
interface DebugReport {
    originalUrl: string;
    adapter: string;
    steps: string[];
    candidatesTop20: any[];
    bestPaths: string | null;
    blockedByBot: boolean;
    missing: Record<string, any>;
    notes: string[];
    rawJsonKeys?: string[];
}

// --- CONSTANTS ---
const PROXIES = [
    { name: 'CorsProxy', url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}` },
    { name: 'AllOrigins', url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` }
];

const uuid = () => Math.random().toString(36).substring(2, 9);

// --- HELPER: Blooket Image Resolver ---
const resolveBlooketImage = (img: any): string | undefined => {
    if (!img) return undefined;
    if (typeof img === 'string') {
        if (img.startsWith('http')) return img;
        // Blooket uses Cloudinary IDs. Alphanumeric, no spaces.
        if (img.length > 5 && !img.includes(' ')) {
            return `https://media.blooket.com/image/upload/${img}`;
        }
    }
    if (typeof img === 'object' && img.url) return img.url;
    return undefined;
};

/**
 * MAIN EXTRACTOR FUNCTION
 */
export const extractBlooket = async (url: string): Promise<{ quiz: Quiz | null, report: UniversalDiscoveryReport }> => {
    // 1. INIT DEBUG REPORT
    const debugReport: DebugReport = { 
        originalUrl: url, 
        adapter: "blooket_pro_v1", 
        steps: [], 
        candidatesTop20: [], 
        bestPaths: null, 
        blockedByBot: false, 
        missing: {}, 
        notes: [] 
    };
    
    // Global exposure for debugging
    (window as any).__NQ_DEBUG__ = (window as any).__NQ_DEBUG__ || {};
    (window as any).__NQ_DEBUG__.blooket = debugReport;
    
    console.log("BLOOKET_DISCOVERY_REPORT_START", debugReport);
    debugReport.steps.push("INIT: Starting extraction sequence");

    let rawState: any = null;
    let htmlContent: string = "";

    // 2. PIPELINE STEP 1: PROXY FETCH
    debugReport.steps.push("STEP 1: Proxy Fetch");
    
    for (const proxy of PROXIES) {
        const target = proxy.url(url);
        try {
            const res = await fetch(target);
            const contentType = res.headers.get('content-type') || '';
            const text = await res.text();
            
            debugReport.notes.push(`Proxy ${proxy.name}: status=${res.status}, len=${text.length}`);

            if (res.ok) {
                // Anti-Bot Detection
                const lowerHead = text.substring(0, 500).toLowerCase();
                const isBlocked = lowerHead.includes("challenge") || lowerHead.includes("cloudflare") || lowerHead.includes("verify") || lowerHead.includes("access denied");
                
                if (isBlocked) {
                    debugReport.blockedByBot = true;
                    debugReport.notes.push(`Proxy ${proxy.name} BLOCKED`);
                } else {
                    // Success or at least content
                    htmlContent = text;
                    debugReport.steps.push(`STEP 1 SUCCESS: Content retrieved via ${proxy.name}`);
                    break;
                }
            }
        } catch (e: any) {
            debugReport.notes.push(`Proxy ${proxy.name} ERROR: ${e.message}`);
        }
    }

    // 3. PIPELINE STEP 2: JINA READER (Fallback if blocked or empty)
    if (!htmlContent || debugReport.blockedByBot) {
        debugReport.steps.push("STEP 2: Jina Reader Fallback");
        const jinaUrl = `https://r.jina.ai/${url}`;
        try {
            const res = await fetch(jinaUrl);
            const text = await res.text();
            if (res.ok && text.length > 500) {
                htmlContent = text; // Jina returns Markdown/HTML mix
                debugReport.steps.push("STEP 2 SUCCESS: Content retrieved via Jina");
                debugReport.blockedByBot = false; // Reset if Jina bypassed it
            } else {
                debugReport.notes.push("Jina Reader returned insufficient data");
            }
        } catch (e: any) {
            debugReport.notes.push(`Jina Reader ERROR: ${e.message}`);
        }
    }

    // Check for total failure
    if (!htmlContent) {
        debugReport.steps.push("FATAL: No content retrieved");
        debugReport.missing = { all: "blocked_or_insufficient_public_content" };
        finalizeDebug(debugReport);
        return { 
            quiz: null, 
            report: convertDebugToUniversal(debugReport)
        };
    }

    // 4. PIPELINE STEP 3: EXTRACT EMBEDDED STATE
    debugReport.steps.push("STEP 3: Extract Embedded State");
    
    // Look for Next.js hydration data
    const nextRegex = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/;
    const match = htmlContent.match(nextRegex);
    
    if (match && match[1]) {
        try {
            rawState = JSON.parse(match[1]);
            debugReport.steps.push("STEP 3 SUCCESS: __NEXT_DATA__ found and parsed");
            debugReport.rawJsonKeys = Object.keys(rawState);
        } catch (e) {
            debugReport.notes.push("STEP 3 ERROR: JSON Parse failed");
        }
    } else {
        debugReport.notes.push("STEP 3 WARN: No __NEXT_DATA__ script found");
        // Try to parse full content as JSON if it looks like JSON
        if (htmlContent.trim().startsWith('{')) {
             try {
                rawState = JSON.parse(htmlContent);
                debugReport.steps.push("STEP 3 ALTERNATIVE: Content was pure JSON");
             } catch(e) {}
        }
    }

    // 5. PIPELINE STEP 4: ENDPOINT DISCOVERY (Optional)
    // If we have state but it doesn't look like it has questions, check for gameId hints
    // NOTE: Strictly following instruction to NOT hardcode unless evidence found.
    // Logic: If rawState contains "gameId" or similar, we might try to construct a call
    // But for now, let's rely on Step 5 DeepFind to find what we have.

    if (!rawState) {
        // Create a dummy wrapper for HTML if no JSON was found, to allow text scanning?
        // Actually deepFind works on objects. If we only have HTML string, we can't deepFind.
        debugReport.steps.push("FATAL: No JSON state extracted");
        finalizeDebug(debugReport);
        return { quiz: null, report: convertDebugToUniversal(debugReport) };
    }

    // 6. PIPELINE STEP 5: DEEP FIND + IMAGE EXTRACTION
    debugReport.steps.push("STEP 5: Deep Find");
    
    const candidates = deepFindQuizCandidate(rawState);
    candidates.sort((a, b) => b.score - a.score);
    
    debugReport.candidatesTop20 = candidates.slice(0, 5).map(c => ({ score: c.score, path: c.path, length: c.array.length }));

    if (candidates.length === 0) {
        debugReport.missing.questions = "No candidate arrays found";
        finalizeDebug(debugReport);
        return { quiz: null, report: convertDebugToUniversal(debugReport) };
    }

    const bestCandidate = candidates[0];
    debugReport.bestPaths = bestCandidate.path;
    debugReport.steps.push(`STEP 5 SUCCESS: Found candidate at ${bestCandidate.path}`);

    // 7. PIPELINE STEP 6: NORMALIZATION (Blooket Import Rules)
    debugReport.steps.push("STEP 6: Normalization");
    
    // Title Extraction
    let title = "Blooket Quiz";
    // Try to find title in common Blooket paths relative to questions or root
    if (rawState.props?.pageProps?.game?.title) title = rawState.props.pageProps.game.title;
    else if (rawState.title) title = rawState.title;
    else if (rawState.set?.title) title = rawState.set.title;

    const rawQuestions = bestCandidate.array;
    const questions: Question[] = [];
    
    let processedCount = 0;

    for (const q of rawQuestions) {
        // --- 1. Question Text ---
        const text = q.question || q.text || "Untitled Question";

        // --- 2. Options (Max 4) ---
        // Blooket structure: "answers" (array of strings) or "choices"
        let rawOpts = q.answers || q.options || q.choices || [];
        
        // Handle Typing Questions (no distractors public)
        if ((!rawOpts || rawOpts.length === 0) && (q.typingAnswers || q.correctAnswers)) {
             rawOpts = q.typingAnswers || q.correctAnswers;
             debugReport.notes.push("Typing question converted to choices");
        }

        if (!Array.isArray(rawOpts)) rawOpts = [];

        // LIMIT TO 4 OPTIONS (Blooket Rule)
        if (rawOpts.length > 4) {
            debugReport.notes.push(`Question clipped: had ${rawOpts.length} options`);
            rawOpts = rawOpts.slice(0, 4);
        }

        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        // --- 3. Correct Answer Mapping ---
        // Blooket uses text matching. "correctAnswers" is array of strings.
        const correctTexts = (q.correctAnswers || q.typingAnswers || []).map((s: any) => String(s).trim());

        rawOpts.forEach((optText: any) => {
             const strText = String(optText).trim();
             const optId = uuid();
             options.push({ id: optId, text: strText });

             if (correctTexts.includes(strText)) {
                 correctOptionIds.push(optId);
             }
        });

        // --- 4. Time Limit (Clamp 5..300) ---
        let time = parseInt(q.timeLimit || q.time || 20);
        if (time < 5) time = 5;
        if (time > 300) {
            time = 300;
            debugReport.notes.push("Time limit clamped to 300s");
        }

        // --- 5. Image Extraction ---
        // ONLY extract if explicitly associated with the question
        let imageUrl: string | undefined = undefined;
        // Blooket usually puts image in 'image' key, can be ID or Object
        if (q.image) imageUrl = resolveBlooketImage(q.image);
        else if (q.media && q.media.url) imageUrl = resolveBlooketImage(q.media.url);

        // --- 6. Final Object ---
        let needsEnhanceAI = false;
        let enhanceReason: string | undefined = undefined;

        if (options.length < 2) {
             needsEnhanceAI = true;
             enhanceReason = "less_than_2_options";
        }
        if (correctOptionIds.length === 0) {
            needsEnhanceAI = true;
            enhanceReason = "no_correct_exposed_public";
        }
        
        questions.push({
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds, // New standard
            timeLimit: time,
            imageUrl: imageUrl || "",
            questionType: QUESTION_TYPES.MULTIPLE_CHOICE, // Blooket is primarily MC
            reconstructed: false,
            sourceEvidence: "Blooket Pro Extractor",
            needsEnhanceAI,
            enhanceReason
        });
        processedCount++;
    }

    debugReport.steps.push(`STEP 6 SUCCESS: Processed ${processedCount} questions`);
    finalizeDebug(debugReport);

    const finalQuiz: Quiz = {
        title,
        description: "Imported via Neural Quiz Blooket Pro",
        questions
    };

    return {
        quiz: finalQuiz,
        report: convertDebugToUniversal(debugReport, processedCount)
    };
};

// --- UTILS ---

const finalizeDebug = (report: DebugReport) => {
    (window as any).__NQ_DEBUG__.blooket = report;
    console.log("BLOOKET_DISCOVERY_REPORT_END", report);
};

const convertDebugToUniversal = (debug: DebugReport, qCount = 0): UniversalDiscoveryReport => {
    return {
        platform: 'blooket',
        originalUrl: debug.originalUrl,
        adapterUsed: debug.adapter,
        methodUsed: debug.steps.join(' -> '),
        blockedByBot: debug.blockedByBot,
        parseOk: qCount > 0,
        questionsFound: qCount,
        attempts: [], // Not used in new flow
        hasChoices: qCount > 0, // Simplified
        hasCorrectFlags: true,
        hasImages: true,
        missing: {
            options: false,
            correct: false,
            image: false,
            reasons: debug.notes
        }
    };
};
