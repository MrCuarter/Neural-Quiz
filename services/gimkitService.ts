
import { Quiz, Question, Option, QUESTION_TYPES, UniversalDiscoveryReport } from "../types";

// --- GLOBAL DEBUG INTERFACE ---
declare global {
  interface Window {
    NQ_DEBUG: any;
  }
}

// Ensure debug object exists immediately
if (typeof window !== 'undefined') {
    window.NQ_DEBUG = window.NQ_DEBUG || {};
    window.NQ_DEBUG.gimkit = window.NQ_DEBUG.gimkit || { runs: [] };
}

// --- CONSTANTS ---
const PROXIES = [
    { name: 'CorsProxy', url: (target: string) => `https://corsproxy.io/?${encodeURIComponent(target)}` },
    { name: 'AllOrigins', url: (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` }
];

const uuid = () => Math.random().toString(36).substring(2, 9);

// --- HELPERS ---

const decodeHtmlEntities = (str: any): string => {
    if (!str) return "";
    const text = String(str);
    if (!text.includes('&')) return text;
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
};

// --- FORENSIC HELPERS ---

/**
 * Scan A: Regex over the entire JSON string to find hidden URLs
 */
const forensicStringScan = (jsonString: string): string[] => {
    const hits = new Set<string>();
    
    // 1. Standard URLs ending in image extensions
    const urlRegex = /(https?:\/\/[^\s"']+\.(png|jpg|jpeg|gif|webp|svg)(\?[^\s"']*)?)/gi;
    const urls = jsonString.match(urlRegex) || [];
    urls.slice(0, 50).forEach(u => hits.add(u));

    // 2. Common CDNs specific to EdTech/Gimkit
    const cdnRegex = /(https?:\/\/(images\.unsplash\.com|res\.cloudinary\.com|cdn\.gimkit\.com)[^\s"']+)/gi;
    const cdns = jsonString.match(cdnRegex) || [];
    cdns.slice(0, 50).forEach(u => hits.add(u));

    return Array.from(hits);
};

/**
 * Scan B: Recursive Object Walk to find keys like "image", "media", etc.
 */
const forensicPathScan = (obj: any, path = "", hits: { path: string, value: any }[] = []) => {
    if (hits.length >= 50) return hits;
    if (!obj || typeof obj !== 'object') return hits;

    const suspiciousKeys = /image|img|photo|media|asset|attachment|thumbnail|cover/i;

    // Check current keys
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        const currentPath = path ? `${path}.${key}` : key;

        // If key is suspicious
        if (suspiciousKeys.test(key)) {
            // If value is a string (potential URL/ID) or simple object
            if (typeof val === 'string' || (typeof val === 'object' && val !== null && !Array.isArray(val))) {
                hits.push({ 
                    path: currentPath, 
                    value: typeof val === 'object' ? JSON.stringify(val).slice(0, 50) + "..." : val 
                });
            }
        }

        // Recurse
        if (typeof val === 'object' && val !== null) {
            // Avoid deep recursion into massive arrays if not needed, but for forensics we go deep-ish
            if (Array.isArray(val)) {
                // Check first 3 items to save time
                val.slice(0, 3).forEach((item, idx) => forensicPathScan(item, `${currentPath}[${idx}]`, hits));
            } else {
                forensicPathScan(val, currentPath, hits);
            }
        }
    });

    return hits;
};

/**
 * Resolver: Try to turn a raw value into a valid Image URL
 */
const resolveGimkitImage = (raw: any): string | undefined => {
    if (!raw) return undefined;
    
    // 1. Direct URL
    if (typeof raw === 'string' && raw.startsWith('http')) return raw;
    
    // 2. Object wrapper (Gimkit often uses { url: "..." } or { image: "..." })
    if (typeof raw === 'object') {
        if (raw.url && typeof raw.url === 'string') return raw.url;
        if (raw.image && typeof raw.image === 'string') return raw.image;
        if (raw.id && typeof raw.id === 'string' && raw.id.length > 10) {
            // Heuristic: If it looks like a Cloudinary ID
            return `https://res.cloudinary.com/gimkit/image/upload/${raw.id}`;
        }
    }

    return undefined;
};

// --- MAIN EXTRACTOR ---

export const analyzeGimkitUrl = async (url: string): Promise<{ quiz: Quiz, report: UniversalDiscoveryReport } | null> => {
    const ts = new Date().toISOString();
    
    // 1. EXTRACT ID
    // Supports: gimkit.com/view/ID or gimkit.com/play/ID (rare public view)
    const idMatch = url.match(/\/(view|play)\/([a-zA-Z0-9]+)/);
    const kitId = idMatch ? idMatch[2] : null;

    // INIT DEBUG RUN
    const runLog: any = {
        ts,
        inputUrl: url,
        kitId,
        attempts: [],
        rawJsonPreview: "",
        imageStringHitsTop50: [],
        imageCandidatePathsTop50: [],
        normalizedQuestionsPreview: [],
        flags: { imagesExposed: false, needsEnhanceAI: false, enhanceReason: "" },
        error: null
    };

    if (!kitId) {
        runLog.error = "No Kit ID found in URL";
        window.NQ_DEBUG.gimkit.runs.push(runLog);
        window.NQ_DEBUG.gimkit.lastRun = runLog;
        throw new Error("Invalid Gimkit URL");
    }

    // 2. FETCH (Endpoint Strategy)
    const targetApiUrl = `https://www.gimkit.com/api/games/fetch/${kitId}`;
    let rawData: any = null;

    console.groupCollapsed(`[GIMKIT] Run: ${kitId}`);

    for (const proxy of PROXIES) {
        const finalUrl = proxy.url(targetApiUrl);
        const attemptLog: any = {
            proxyName: proxy.name,
            targetUrl: finalUrl,
            status: 0,
            ok: false
        };

        try {
            const res = await fetch(finalUrl);
            attemptLog.status = res.status;
            const text = await res.text();
            attemptLog.bytes = text.length;
            attemptLog.contentType = res.headers.get('content-type');

            if (res.ok && text.trim().startsWith('{')) {
                try {
                    rawData = JSON.parse(text);
                    attemptLog.ok = true;
                    attemptLog.snippet200 = text.slice(0, 100);
                    runLog.attempts.push(attemptLog);
                    break; // Success
                } catch (e) {
                    attemptLog.error = "JSON Parse Failed";
                }
            } else {
                attemptLog.error = "Not 200 or not JSON";
            }
        } catch (e: any) {
            attemptLog.error = e.message;
        }
        runLog.attempts.push(attemptLog);
    }

    if (!rawData || (!rawData.questions && !rawData.kit)) {
        runLog.error = "Failed to retrieve valid kit data";
        window.NQ_DEBUG.gimkit.runs.push(runLog);
        window.NQ_DEBUG.gimkit.lastRun = runLog;
        console.table(runLog.attempts);
        console.groupEnd();
        return null;
    }

    // 3. FORENSIC SCAN
    const jsonStr = JSON.stringify(rawData);
    runLog.rawJsonPreview = jsonStr.slice(0, 10000); // 10KB cap
    runLog.imageStringHitsTop50 = forensicStringScan(jsonStr);
    runLog.imageCandidatePathsTop50 = forensicPathScan(rawData);

    // 4. NORMALIZATION
    // Gimkit structure usually: root -> kit -> questions OR root -> questions
    const rawQuestions = rawData.questions || (rawData.kit && rawData.kit.questions) || [];
    const questions: Question[] = [];
    
    // Check if images were found in the string scan
    const globalImageEvidence = runLog.imageStringHitsTop50.length > 0;

    rawQuestions.forEach((q: any) => {
        // Text
        let text = q.text || q.questionText || "Untitled Question";
        text = decodeHtmlEntities(text); // Fix encoding
        
        // Options & Correct
        const options: Option[] = [];
        const correctOptionIds: string[] = [];
        const rawAnswers = q.answers || q.choices || [];
        
        if (Array.isArray(rawAnswers)) {
            rawAnswers.forEach((ans: any) => {
                const optId = uuid();
                let ansText = typeof ans === 'string' ? ans : (ans.text || ans.answer || "");
                ansText = decodeHtmlEntities(ansText); // Fix encoding
                options.push({ id: optId, text: ansText });
                
                // Gimkit often marks correct answers by ID matching or 'correct' flag
                // Structure varies: sometimes answers have { id: '...', correct: true }
                // Sometimes question has "correctAnswerId"
                if (ans.correct) correctOptionIds.push(optId);
                if (q.correctAnswerId && ans._id === q.correctAnswerId) correctOptionIds.push(optId);
            });
        }

        // If correct answers not found in loop, try to find text match or use first (if generic)
        // NOTE: Gimkit often uses 'text' based matching in older formats
        if (correctOptionIds.length === 0 && rawAnswers.length > 0 && q.answers) {
             // Sometimes the first answer is correct in raw array before shuffle? No, dangerous.
             // We'll mark as needing AI if no correct found.
        }

        // --- IMAGE EXTRACTION STRATEGY ---
        let finalImageUrl: string | undefined = undefined;
        let rawImageRef: any = undefined;

        // Strategy A: Direct Property
        if (q.image) {
            rawImageRef = q.image;
            finalImageUrl = resolveGimkitImage(q.image);
        } 
        // Strategy B: Media Object
        else if (q.media) {
            rawImageRef = q.media;
            finalImageUrl = resolveGimkitImage(q.media);
        }
        // Strategy C: 'photo' property
        else if (q.photo) {
            rawImageRef = q.photo;
            finalImageUrl = resolveGimkitImage(q.photo);
        }

        const qObj: Question = {
            id: uuid(),
            text,
            options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds,
            imageUrl: finalImageUrl || "",
            timeLimit: 30, // Default
            questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
            reconstructed: false,
            sourceEvidence: "Gimkit API Forensic",
            needsEnhanceAI: false
        };

        // Quality Flags
        if (options.length < 2) {
            qObj.needsEnhanceAI = true;
            qObj.enhanceReason = "no_options_found";
        } else if (correctOptionIds.length === 0) {
            qObj.needsEnhanceAI = true;
            qObj.enhanceReason = "no_correct_exposed_public";
        }

        // Image Flag Logic
        if (!finalImageUrl && globalImageEvidence) {
            // We saw images in the file, but couldn't attach to this question.
            // Gimkit might use a separate dictionary we missed?
            qObj.enhanceReason = qObj.enhanceReason ? qObj.enhanceReason + ", image_unresolved_scope" : "image_unresolved_scope";
            // We set 'rawImageRef' if we found something but couldn't parse it fully
            if (rawImageRef) {
                 qObj.sourceEvidence += ` (Raw Img: ${JSON.stringify(rawImageRef)})`;
            }
        }

        questions.push(qObj);
    });

    // 5. UPDATE DEBUG REPORT
    runLog.normalizedQuestionsPreview = questions.slice(0, 3).map(q => ({
        text: q.text,
        imageUrl: q.imageUrl,
        sourceEvidence: q.sourceEvidence,
        optionsCount: q.options.length
    }));
    
    const anyImagesFound = questions.some(q => !!q.imageUrl);
    runLog.flags.imagesExposed = anyImagesFound || globalImageEvidence;
    
    if (!anyImagesFound && globalImageEvidence) {
        runLog.flags.needsEnhanceAI = true;
        runLog.flags.enhanceReason = "images_not_mapped_to_questions";
    }

    // LOG TO CONSOLE
    console.table(runLog.attempts);
    console.log("imageStringHitsTop50", runLog.imageStringHitsTop50);
    console.log("imageCandidatePathsTop50", runLog.imageCandidatePathsTop50);
    console.log("window.NQ_DEBUG.gimkit.lastRun", runLog);
    console.groupEnd();

    // Persist
    window.NQ_DEBUG.gimkit.runs.push(runLog);
    window.NQ_DEBUG.gimkit.lastRun = runLog;

    // 6. RETURN RESULT
    const title = decodeHtmlEntities(rawData.kit?.title || rawData.title || "Gimkit Quiz");
    const report: UniversalDiscoveryReport = {
        platform: 'unknown', // Gimkit not in union type explicitly yet, mapped via generic
        originalUrl: url,
        methodUsed: 'api_fetch_forensic',
        blockedByBot: false,
        parseOk: questions.length > 0,
        attempts: runLog.attempts,
        questionsFound: questions.length,
        hasChoices: questions.some(q => q.options.length > 0),
        hasCorrectFlags: questions.some(q => q.correctOptionIds && q.correctOptionIds.length > 0),
        hasImages: anyImagesFound,
        missing: {
            options: false,
            correct: false,
            image: !anyImagesFound,
            reasons: [runLog.flags.enhanceReason].filter(Boolean)
        }
    };

    return {
        quiz: {
            title,
            description: "Imported via Neural Quiz Gimkit Forensic",
            questions
        },
        report
    };
};
