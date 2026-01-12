
import { Quiz, Question, Option, QUESTION_TYPES, KahootCardResponse } from "../types";

// Helper: Generate UUID
const uuid = () => Math.random().toString(36).substring(2, 9);

export const normalizeKahootCardToQuiz = (card: KahootCardResponse): Quiz => {
    const rawQuestions = card.kahoot?.questions || card.questions || [];
    const title = card.kahoot?.title || card.title || "Imported Kahoot";
    const description = "Imported via Neural Quiz";

    const questions: Question[] = rawQuestions.map((q: any) => {
        const questionText = q.question || q.title || q.query || "Untitled Question";
        
        // --- 1. OPTIONS & CORRECT ANSWER ---
        let options: Option[] = [];
        let correctOptionIds: string[] = [];
        
        if (q.choices && Array.isArray(q.choices)) {
            options = q.choices.map((c: any, idx: number) => {
                const optId = `${idx}_${uuid()}`; // Stable-ish ID
                const isCorrect = !!c.correct;
                if (isCorrect) correctOptionIds.push(optId);
                return {
                    id: optId,
                    text: c.answer || c.text || `Option ${idx + 1}`
                };
            });
        }

        // Flags for "Enhance AI"
        const needsEnhanceAI = options.length === 0 || correctOptionIds.length === 0;
        const enhanceReason = options.length === 0 
            ? "no_options_found" 
            : (correctOptionIds.length === 0 ? "no_correct_marked" : undefined);

        // --- 2. IMAGE EXTRACTION ---
        // Kahoot uses IDs for images usually. URL: https://images-cdn.kahoot.it/{ID}
        let imageUrl: string | undefined = undefined;
        
        // Helper to check if string looks like image ID or URL
        const resolveImage = (val: any): string | undefined => {
            if (typeof val !== 'string') return undefined;
            if (val.startsWith('http')) return val;
            // UUID-like string
            if (val.match(/[0-9a-f-]{36}/)) return `https://images-cdn.kahoot.it/${val}`;
            return undefined;
        };

        if (q.image) imageUrl = resolveImage(q.image);
        else if (q.imageUrl) imageUrl = resolveImage(q.imageUrl);
        else if (q.layout?.image) imageUrl = resolveImage(q.layout.image);
        else if (q.media && Array.isArray(q.media)) {
            // Check media array
            const imgMedia = q.media.find((m: any) => m.type === 'image');
            if (imgMedia && imgMedia.id) imageUrl = resolveImage(imgMedia.id);
        }

        // --- 3. TYPE INFERENCE ---
        let qType = QUESTION_TYPES.MULTIPLE_CHOICE;
        const rawType = (q.type || q.questionType || "").toLowerCase();

        if (rawType.includes("true_false")) qType = QUESTION_TYPES.TRUE_FALSE;
        else if (rawType.includes("multiple_select_quiz") || rawType.includes("multiple_select")) qType = QUESTION_TYPES.MULTI_SELECT;
        else if (rawType.includes("open_ended")) qType = QUESTION_TYPES.OPEN_ENDED;
        else if (rawType.includes("poll")) qType = QUESTION_TYPES.POLL;
        else if (rawType.includes("slider")) qType = QUESTION_TYPES.OPEN_ENDED; // Map slider to open for now
        else {
            // Heuristic fallback
            if (options.length === 2 && 
               (options[0].text.match(/true|verdadero/i) || options[1].text.match(/true|verdadero/i))) {
                qType = QUESTION_TYPES.TRUE_FALSE;
            }
        }

        return {
            id: uuid(),
            text: questionText,
            options: options,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds: correctOptionIds,
            questionType: qType,
            timeLimit: q.time ? Math.round(q.time / 1000) : 20, // Kahoot uses ms
            imageUrl: imageUrl || "",
            reconstructed: false, // It's direct from source
            sourceEvidence: "Kahoot API Direct Import",
            imageReconstruction: imageUrl ? "direct" : "none",
            needsEnhanceAI,
            enhanceReason
        };
    });

    return {
        title,
        description,
        questions
    };
};
