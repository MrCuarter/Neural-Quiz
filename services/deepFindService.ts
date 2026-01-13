
export interface ScoredCandidate {
    array: any[];
    score: number;
    path: string;
    sampleKeys: string[];
}

// Heuristics to detect if an object looks like a question
const isQuestionLike = (obj: any): boolean => {
    if (typeof obj !== 'object' || obj === null) return false;
    
    // 1. Text Heuristics
    const hasText = 
        typeof obj.question === 'string' || 
        typeof obj.title === 'string' || 
        typeof obj.query === 'string' || // Kahoot
        typeof obj.text === 'string' || // Generic
        (obj.structure?.query?.text) || // Wayground
        (obj.questionText);

    // 2. Option Heuristics
    const hasChoices = 
        Array.isArray(obj.choices) || 
        Array.isArray(obj.answers) || 
        Array.isArray(obj.options) || 
        // Blooket Typing Support:
        Array.isArray(obj.typingAnswers) || 
        Array.isArray(obj.correctAnswers) ||
        (obj.structure?.options && Array.isArray(obj.structure.options));

    return !!(hasText || hasChoices);
};

// Heuristics to detect "Correctness"
export const hasCorrectFlag = (obj: any): boolean => {
    // Blooket (Array of strings matching answers)
    if (Array.isArray(obj.correctAnswers) && obj.correctAnswers.length > 0) return true;
    if (Array.isArray(obj.typingAnswers) && obj.typingAnswers.length > 0) return true;

    // Wayground/Quizizz
    if (obj.structure) {
        if (typeof obj.structure.answer !== 'undefined') return true; 
        if (Array.isArray(obj.structure.options)) {
            return obj.structure.options.some((o: any) => o.correct || o.isCorrect);
        }
    }
    
    // Kahoot / Generic
    if (Array.isArray(obj.choices)) return obj.choices.some((c: any) => c.correct || c.isCorrect || c.right);
    if (Array.isArray(obj.options)) return obj.options.some((c: any) => c.correct || c.isCorrect);
    
    return false;
};

// Heuristics to detect "Images"
export const hasImage = (obj: any): boolean => {
    if (obj.image && (typeof obj.image === 'string' || obj.image.url || obj.image.id)) return true; // Added .id for Blooket/Kahoot
    if (obj.imageUrl || obj.media) return true;
    if (obj.structure?.query?.media) return true;
    return false;
};

/**
 * RECURSIVE DEEP FINDER
 * Scans a raw JSON object to find the most likely array of questions.
 */
export const deepFindQuizCandidate = (root: any, path: string = '', candidates: ScoredCandidate[] = [], depth = 0): ScoredCandidate[] => {
    if (depth > 12) return candidates; // Safety break
    if (typeof root !== 'object' || root === null) return candidates;

    if (Array.isArray(root)) {
        // Evaluate array
        let score = 0;
        let validItems = 0;
        let sampleKeys: string[] = [];
        
        root.forEach((item, idx) => {
            if (isQuestionLike(item)) {
                validItems++;
                if (idx === 0) sampleKeys = Object.keys(item);

                // --- SCORING HEURISTICS ---
                // Base points for looking like a question
                score += 10;

                // Gold Standard: Has options AND text in same object
                if ((item.question || item.text || item.title) && 
                    (item.answers || item.options || item.choices || item.typingAnswers)) {
                    score += 10;
                }

                // Correctness Boost
                if (hasCorrectFlag(item)) score += 20;

                // Image Boost
                if (hasImage(item)) score += 5;
                
                // Specific Blooket Signals
                if (item.typingAnswers) score += 15;
                if (item.timeLimit || item.time) score += 2;
            }
        });

        // Threshold: At least 1 valid item and 30% of array looks like questions
        // Or if array is small (<=20 items) and has high density
        if (validItems > 0 && (validItems >= root.length * 0.3 || validItems >= 2)) {
            candidates.push({ array: root, score, path, sampleKeys });
        }

        // Recurse into items (sometimes questions are wrapped)
        root.forEach((item, idx) => deepFindQuizCandidate(item, `${path}[${idx}]`, candidates, depth + 1));
    } else {
        // Object traversal
        Object.keys(root).forEach(key => {
            // Optimization: Skip junk keys
            if (!['config', 'settings', 'theme', 'experiments', 'features', 'meta'].includes(key)) {
                deepFindQuizCandidate(root[key], `${path}.${key}`, candidates, depth + 1);
            }
        });
    }
    return candidates;
};

/**
 * UNIVERSAL IMAGE FINDER (New Requirement)
 * Returns all strings that look like images within a raw object, with their paths.
 */
export const findAllImageRefs = (input: any, max = 50): { path: string, value: string }[] => {
    const hits: { path: string, value: string }[] = [];
    const seen = new Set();

    const isImg = (v: any) =>
      typeof v === "string" &&
      (
        v.startsWith("data:image/") ||
        /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(v) ||
        v.includes("media.blooket.com") ||
        v.includes("cloudinary") ||
        v.includes("images-cdn.kahoot.it") ||
        v.includes("cdn")
      );

    const walk = (node: any, path = "") => {
      if (hits.length >= max || node == null) return;
      
      // Direct string check
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
        
        // Key heuristic check
        if (typeof v === "string" && /image|img|media|src|url|thumbnail|asset/i.test(k)) {
            // Loose check for strings in image-like keys, even if they don't look like URLs (e.g. IDs)
            if (isImg(v) || (v.length > 5 && v.length < 100 && !v.includes(' '))) {
                 hits.push({ path: p, value: v.slice(0, 180) });
            }
        }
        walk(v, p);
        if (hits.length >= max) break;
      }
    };

    walk(input);
    return hits;
}
