
import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport, DiscoveryAttempt } from "../types";
import { deepFindQuizCandidate } from "./deepFindService";

const uuid = () => Math.random().toString(36).substring(2, 9);

// --- 1. PROXY ROTATION ---
const PROXIES = [
    { name: 'CorsProxy', url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}` },
    { name: 'AllOrigins', url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` }
];

// --- 2. NORMALIZER ---

const normalizeBlooketToQuiz = (rawQuestions: any[], sourceTitle: string, methodUsed: string, originalUrl: string, attempts: DiscoveryAttempt[]): { quiz: Quiz, report: UniversalDiscoveryReport } => {
    let hasChoices = false;
    let hasCorrect = false;
    let hasImages = false;
    const missingReasons: string[] = [];

    const questions: Question[] = rawQuestions.map((q: any) => {
        // Text
        const text = q.question || q.text || "Untitled Question";
        
        // Options
        const rawAnswers = q.answers || q.options || q.choices || [];
        if (rawAnswers.length > 0) hasChoices = true;

        // Correctness
        const correctAnswers = q.correctAnswers || [];
        if (correctAnswers.length > 0) hasCorrect = true;

        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        rawAnswers.forEach((ans: any) => {
            const strText = typeof ans === 'string' ? ans : (ans.text || String(ans));
            const optId = uuid();
            options.push({ id: optId, text: strText });
            
            if (correctAnswers.includes(strText)) {
                correctOptionIds.push(optId);
            }
        });

        // Basic Image Mapping (Direct property only)
        let imageUrl: string | undefined = undefined;
        if (q.image && typeof q.image === 'string') {
            if (q.image.startsWith('http')) imageUrl = q.image;
            else if (q.image.length > 5 && !q.image.includes(' ')) imageUrl = `https://media.blooket.com/image/upload/${q.image}`;
        }
        
        if (imageUrl) hasImages = true;

        // Type Inference
        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        if (options.length === 2) {
            const lowerOpts = options.map(o => o.text.toLowerCase());
            if (lowerOpts.includes('true') && lowerOpts.includes('false')) qType = QUESTION_TYPES.TRUE_FALSE;
        }
        if (q.type === 'select' || correctOptionIds.length > 1) {
            qType = QUESTION_TYPES.MULTI_SELECT;
        }

        // Integrity Flags
        const needsEnhanceAI = options.length < 2 || correctOptionIds.length === 0;
        let enhanceReason = undefined;
        if (options.length < 2) enhanceReason = "no_options_exposed_public";
        else if (correctOptionIds.length === 0) enhanceReason = "no_correct_exposed_public";

        if (enhanceReason && !missingReasons.includes(enhanceReason)) missingReasons.push(enhanceReason);

        return {
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: imageUrl || "",
            timeLimit: q.timeLimit || q.time || 20,
            questionType: qType,
            reconstructed: false,
            sourceEvidence: `Blooket (${methodUsed})`,
            needsEnhanceAI,
            enhanceReason
        };
    });

    return {
        quiz: {
            title: sourceTitle,
            description: "Imported via Neural Quiz Blooket Adapter",
            questions
        },
        report: {
            platform: 'blooket',
            originalUrl,
            adapterUsed: 'blooketAdapter',
            methodUsed,
            blockedByBot: false,
            parseOk: true,
            attempts,
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

// --- 3. MAIN ANALYZER ---

export const analyzeBlooketUrl = async (url: string): Promise<{ quiz: Quiz, report: UniversalDiscoveryReport } | null> => {
    const attempts: DiscoveryAttempt[] = [];
    
    // 1. Extract ID
    const idMatch = url.match(/\/set\/([a-zA-Z0-9]+)/);
    if (!idMatch) {
        throw new Error("Invalid Blooket URL. ID not found.");
    }
    const blooketId = idMatch[1];
    
    // --- STRATEGY A: PUBLIC API (Hidden) ---
    const apiEndpoint = `https://api.blooket.com/api/games?gameId=${blooketId}`;
    
    for (const proxy of PROXIES) {
        const target = proxy.url(apiEndpoint);
        const attempt: DiscoveryAttempt = {
            method: 'api_proxy',
            finalUrl: target,
            status: 0,
            length: 0,
            parseOk: false
        };

        try {
            const res = await fetch(target);
            attempt.status = res.status;
            attempt.contentType = res.headers.get('content-type') || '';
            
            const text = await res.text();
            attempt.length = text.length;

            if (res.ok && text.startsWith('{')) {
                const json = JSON.parse(text);
                
                // Use DeepFinder to locate questions array
                const candidates = deepFindQuizCandidate(json);
                candidates.sort((a, b) => b.score - a.score);

                if (candidates.length > 0 && candidates[0].score > 0) {
                    attempt.parseOk = true;
                    attempts.push(attempt);
                    
                    const title = json.title || "Blooket Quiz";
                    return normalizeBlooketToQuiz(candidates[0].array, title, 'api_proxy', url, attempts);
                }
            }
        } catch (e: any) {
            attempt.error = e.message;
        }
        attempts.push(attempt);
    }

    // Return failure report
    return {
        quiz: { title: "Error", description: "", questions: [] },
        report: {
            platform: 'blooket',
            originalUrl: url,
            adapterUsed: 'blooketAdapter',
            methodUsed: 'failed',
            blockedByBot: attempts.some(a => a.status === 403 || a.status === 503),
            blockedEvidence: "API Access Failed",
            parseOk: false,
            attempts,
            questionsFound: 0,
            hasChoices: false, hasCorrectFlags: false, hasImages: false
        }
    } as any;
};