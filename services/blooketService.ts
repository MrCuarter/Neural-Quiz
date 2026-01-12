
import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport, DiscoveryAttempt } from "../types";
import { deepFindQuizCandidate } from "./deepFindService";

const uuid = () => Math.random().toString(36).substring(2, 9);

// --- 1. PROXY ROTATION ---
const PROXIES = [
    { name: 'CorsProxy', url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}` },
    { name: 'AllOrigins', url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` }
];

// --- 2. IMAGE RESOLVER ---
const resolveBlooketImage = (img: any): string | undefined => {
    if (!img) return undefined;
    if (typeof img === 'string') {
        if (img.startsWith('http')) return img;
        // Blooket usa IDs de Cloudinary. Si es un ID alfanumérico sin espacios, construimos la URL.
        if (img.length > 5 && !img.includes(' ')) {
            return `https://media.blooket.com/image/upload/${img}`;
        }
    }
    // A veces viene como objeto { url: ... }
    if (typeof img === 'object' && img.url) return img.url;
    return undefined;
};

// --- 3. NORMALIZER ---

const normalizeBlooketToQuiz = (rawQuestions: any[], sourceTitle: string, methodUsed: string, originalUrl: string, attempts: DiscoveryAttempt[]): { quiz: Quiz, report: UniversalDiscoveryReport } => {
    let hasChoices = false;
    let hasCorrect = false;
    let hasImages = false;
    const missingReasons: string[] = [];

    const questions: Question[] = rawQuestions.map((q: any) => {
        // Text detection
        const text = q.question || q.text || "Untitled Question";
        
        // --- OPTIONS STRATEGY ---
        // Blooket tiene "answers" (opciones MC) o "typingAnswers" (respuestas de escribir).
        // Si no hay "answers", usamos "typingAnswers" o "correctAnswers" como opciones para que aparezcan en el editor.
        let rawAnswers = q.answers || q.options || q.choices || [];
        
        // Si es una pregunta de escribir (sin distractores), fabricamos opciones con las respuestas correctas
        // para que el usuario pueda verlas y editarlas en nuestro editor universal.
        if ((!rawAnswers || rawAnswers.length === 0) && (q.typingAnswers || q.correctAnswers)) {
            rawAnswers = q.typingAnswers || q.correctAnswers;
        }

        if (rawAnswers.length > 0) hasChoices = true;

        // --- CORRECT ANSWER STRATEGY ---
        // Blooket guarda las correctas como array de strings que coinciden con el texto de la opción.
        let correctAnswersRaw = q.correctAnswers || q.typingAnswers || [];
        // Normalizamos a string y trim para evitar fallos por espacios
        const correctAnswersNormalized = Array.isArray(correctAnswersRaw) 
            ? correctAnswersRaw.map((s: any) => String(s).trim()) 
            : [String(correctAnswersRaw).trim()];

        if (correctAnswersNormalized.length > 0) hasCorrect = true;

        const options: Option[] = [];
        const correctOptionIds: string[] = [];

        rawAnswers.forEach((ans: any) => {
            const strText = typeof ans === 'string' ? ans : (ans.text || String(ans));
            const optId = uuid();
            
            // Intentamos sacar imagen de la opción si existe
            let optImg: string | undefined = undefined;
            if (typeof ans === 'object' && ans.image) optImg = resolveBlooketImage(ans.image);

            options.push({ id: optId, text: strText, imageUrl: optImg });
            
            // Verificamos si es correcta comparando texto
            if (correctAnswersNormalized.includes(strText.trim())) {
                correctOptionIds.push(optId);
            }
        });

        // Image Mapping
        let imageUrl: string | undefined = resolveBlooketImage(q.image);
        if (imageUrl) hasImages = true;

        // Type Inference
        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        
        // Detectar True/False
        if (options.length === 2) {
            const lowerOpts = options.map(o => o.text.toLowerCase());
            if (lowerOpts.includes('true') && lowerOpts.includes('false')) qType = QUESTION_TYPES.TRUE_FALSE;
        }
        
        // Detectar si era Typing en origen (lo mapeamos a Short Answer o dejamos en MC para editar)
        if (q.type === 'typing' || (!q.answers && q.typingAnswers)) {
            // Si solo tiene 1 opción correcta visible, podría tratarse como Short Answer o MC
            qType = QUESTION_TYPES.MULTIPLE_CHOICE; // Lo dejamos en MC para que el usuario vea la respuesta.
        } else if (q.type === 'select' || correctOptionIds.length > 1) {
            qType = QUESTION_TYPES.MULTI_SELECT;
        }

        // Integrity Flags
        // Si es "typing", es normal tener solo 1 opción (la correcta). Relajamos la condición de needsEnhanceAI.
        const needsEnhanceAI = options.length === 0 || correctOptionIds.length === 0;
        let enhanceReason = undefined;
        if (options.length === 0) enhanceReason = "no_options_exposed_public";
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

// --- 4. MAIN ANALYZER ---

export const analyzeBlooketUrl = async (url: string): Promise<{ quiz: Quiz, report: UniversalDiscoveryReport } | null> => {
    const attempts: DiscoveryAttempt[] = [];
    
    // 1. Extract ID
    const idMatch = url.match(/\/set\/([a-zA-Z0-9]+)/);
    if (!idMatch) {
        throw new Error("Invalid Blooket URL. ID not found.");
    }
    const blooketId = idMatch[1];
    
    // --- STRATEGY: PUBLIC API ---
    // Esta API devuelve el JSON completo del set público.
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

            if (res.ok && text.trim().startsWith('{')) {
                const json = JSON.parse(text);

                // --- DEBUG INSTRUMENTATION START ---
                (window as any).__NQ_DEBUG__ = (window as any).__NQ_DEBUG__ || {};
                (window as any).__NQ_DEBUG__.blooket = {
                    when: new Date().toISOString(),
                    gameId: blooketId,
                    source: "api.blooket.com/api/games",
                    topKeys: json ? Object.keys(json).slice(0, 40) : [],
                    questionCount: json?.questions?.length ?? null,
                    imageHits: findAllImageRefs(json).slice(0, 50)
                };
                console.log("[BLOOKET DEBUG]", (window as any).__NQ_DEBUG__.blooket);
                // --- DEBUG INSTRUMENTATION END ---
                
                // EXPLICIT CHECK: Blooket API usually returns { questions: [...] }
                if (json.questions && Array.isArray(json.questions)) {
                     attempt.parseOk = true;
                     attempts.push(attempt);
                     const title = json.title || json.setInfo?.title || "Blooket Quiz";
                     return normalizeBlooketToQuiz(json.questions, title, 'api_proxy_direct', url, attempts);
                }

                // Fallback: Use DeepFinder 
                const candidates = deepFindQuizCandidate(json);
                candidates.sort((a, b) => b.score - a.score);

                if (candidates.length > 0 && candidates[0].score > 0) {
                    attempt.parseOk = true;
                    attempts.push(attempt);
                    
                    const title = json.title || json.setInfo?.title || "Blooket Quiz";
                    return normalizeBlooketToQuiz(candidates[0].array, title, 'api_proxy_deep', url, attempts);
                }
            }
        } catch (e: any) {
            attempt.error = e.message;
            console.warn(`Blooket Proxy ${proxy.name} failed:`, e);
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

// --- 5. DEBUG UTILITY ---
function findAllImageRefs(input: any, max = 50) {
     const hits: any[] = [];
     const seen = new Set();

     const isImg = (v: any) =>
       typeof v === "string" &&
       (
         v.startsWith("data:image/") ||
         /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(v) ||
         v.includes("media.blooket.com") ||
         v.includes("cloudinary") ||
         v.includes("cdn")
       );

     const walk = (node: any, path = "") => {
       if (hits.length >= max || node == null) return;
       if (typeof node === "string") {
         if (isImg(node)) hits.push({ path, value: node.slice(0, 180) });
         return;
       }
       if (typeof node !== "object") return;
       if (seen.has(node)) return;
       seen.add(node);

       if (Array.isArray(node)) {
         node.forEach((v, i) => walk(v, `${path}[${i}]`));
         return;
       }

       for (const [k, v] of Object.entries(node)) {
         const p = path ? `${path}.${k}` : k;
         if (typeof v === "string" && /image|img|media|src|url|thumbnail|asset/i.test(k) && isImg(v)) {
           hits.push({ path: p, value: v.slice(0, 180) });
         }
         walk(v, p);
         if (hits.length >= max) break;
       }
     };

     walk(input);
     return hits;
}
