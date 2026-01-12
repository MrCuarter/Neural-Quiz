
export interface ScoredCandidate {
    array: any[];
    score: number;
    path: string;
}

// Heuristics to detect if an object looks like a question in various platforms
const isQuestionLike = (obj: any): boolean => {
    if (typeof obj !== 'object' || obj === null) return false;
    
    // 1. Text Heuristics
    const hasText = 
        typeof obj.question === 'string' || 
        typeof obj.title === 'string' || 
        typeof obj.query === 'string' || // Kahoot sometimes
        (obj.structure?.query?.text) || // Wayground / Quizizz
        (obj.questionText);

    // 2. Option Heuristics
    const hasChoices = 
        Array.isArray(obj.choices) || 
        Array.isArray(obj.answers) || 
        Array.isArray(obj.options) || 
        (obj.structure?.options && Array.isArray(obj.structure.options));

    return !!(hasText || hasChoices);
};

// Heuristics to detect "Correctness"
export const hasCorrectFlag = (obj: any): boolean => {
    // Wayground/Quizizz structure: structure.options[].correct OR structure.answer (index)
    if (obj.structure) {
        if (typeof obj.structure.answer !== 'undefined') return true; // Index based
        if (Array.isArray(obj.structure.options)) {
            return obj.structure.options.some((o: any) => o.correct || o.isCorrect);
        }
    }
    // Kahoot / Generic
    if (Array.isArray(obj.choices)) return obj.choices.some((c: any) => c.correct || c.isCorrect || c.right);
    if (Array.isArray(obj.options)) return obj.options.some((c: any) => c.correct || c.isCorrect);
    
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
        
        root.forEach(item => {
            if (isQuestionLike(item)) {
                validItems++;
                // Score boosting based on completeness
                if (hasCorrectFlag(item)) score += 15; // Gold standard: knows answers
                
                // Wayground specific boost
                if (item.structure?.query?.text) score += 5;
                if (item.structure?.kind) score += 2;

                // Kahoot specific boost
                if (item.choices && Array.isArray(item.choices)) score += 5;
                if (typeof item.time === 'number') score += 1;
            }
        });

        // Threshold: At least 1 valid item and 30% of array looks like questions
        if (validItems > 0 && validItems >= root.length * 0.3) {
            candidates.push({ array: root, score, path });
        }

        // Recurse into items (sometimes questions are wrapped)
        root.forEach((item, idx) => deepFindQuizCandidate(item, `${path}[${idx}]`, candidates, depth + 1));
    } else {
        // Object traversal
        Object.keys(root).forEach(key => {
            // Optimization: Skip junk keys
            if (!['config', 'settings', 'theme', 'experiments', 'features'].includes(key)) {
                deepFindQuizCandidate(root[key], `${path}.${key}`, candidates, depth + 1);
            }
        });
    }
    return candidates;
};
