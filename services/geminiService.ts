
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { Question, QUESTION_TYPES } from "../types";

// --- API KEY MANAGEMENT (ROTATION SUPPORT) ---
let currentKeyIndex = 0;

const getAPIKeys = (): string[] => {
  const keys: string[] = [];
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) keys.push(import.meta.env.VITE_API_KEY);
      // @ts-ignore
      if (import.meta.env.API_KEY) keys.push(import.meta.env.API_KEY); // Legacy fallback
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY_SECONDARY) keys.push(import.meta.env.VITE_API_KEY_SECONDARY);
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY_TERTIARY) keys.push(import.meta.env.VITE_API_KEY_TERTIARY);
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_API_KEY) keys.push(process.env.VITE_API_KEY);
      if (process.env.API_KEY) keys.push(process.env.API_KEY);
      if (process.env.VITE_API_KEY_SECONDARY) keys.push(process.env.VITE_API_KEY_SECONDARY);
      if (process.env.VITE_API_KEY_TERTIARY) keys.push(process.env.VITE_API_KEY_TERTIARY);
    }
  } catch(e) {}
  
  // Deduplicate and filter empty
  return Array.from(new Set(keys)).filter(k => !!k);
};

const getAI = () => {
  const keys = getAPIKeys();
  if (keys.length === 0) throw new Error("Configuration Error: API Key missing.");
  
  // Use the current active key. Ensure index is safe.
  const activeKey = keys[currentKeyIndex] || keys[0];
  
  return new GoogleGenAI({ apiKey: activeKey });
};

// --- RETRY LOGIC HELPER WITH KEY ROTATION ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  baseDelay = 5000
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Extract status code
    const status = error.status || error.code || (error.error && error.error.code);
    const message = error.message || (error.error && error.error.message) || "";
    const isQuotaError = status === 429 || status === 503 || message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED');

    if (retries > 0 && isQuotaError) {
        const keys = getAPIKeys();
        
        // CHECK ROTATION: If we have more keys and haven't used them all yet
        // We check if currentKeyIndex is strictly less than the last index
        if (keys.length > 1 && currentKeyIndex < keys.length - 1) {
            currentKeyIndex++; // Switch to next key
            console.warn(`⚠️ Primary API Key Quota Exceeded (${status}). Switching to Backup Key [Index ${currentKeyIndex}]...`);
            
            // Retry immediately with the new key (no wait needed for a fresh key)
            return withRetry(operation, retries, baseDelay); 
        }

        // STANDARD BACKOFF: If we are out of keys or using the last key
        const delay = baseDelay + Math.random() * 1000; // Add jitter
        console.warn(`⚠️ Gemini API Rate Limit (${status}). All keys busy/exhausted. Retrying in ${(delay/1000).toFixed(1)}s...`);
        await wait(delay);
        return withRetry(operation, retries - 1, delay * 2); // Exponential Backoff
    }
    throw error;
  }
};

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "The question text." },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of options. For 'Order', list items in CORRECT sequence."
    },
    correctAnswerIndex: { type: Type.INTEGER, description: "Index of correct option. 0 for Order/FillGap." },
    correctAnswerIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    feedback: { type: Type.STRING, description: "ONLY include if explicitly present in source. Otherwise empty." },
    type: { type: Type.STRING },
    imageUrl: { type: Type.STRING, description: "URL of the image if present." },
    
    // Forensic Analysis Fields
    reconstructed: { type: Type.BOOLEAN, description: "True if the question, answers or image were inferred rather than read directly." },
    sourceEvidence: { type: Type.STRING, description: "Brief explanation of how the data was found (e.g. 'Found in JSON', 'Inferred from context')." },
    imageReconstruction: { type: Type.STRING, enum: ["direct", "partial", "inferred", "none"], description: "How the image URL was obtained." }
  },
  required: ["text", "options", "type"]
};

const quizSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
  description: "A list of quiz questions."
};

// ENHANCE AI SCHEMA
const enhanceSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        text: { type: Type.STRING, description: "Refined question text if needed." },
        options: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    isCorrect: { type: Type.BOOLEAN },
                    rationale: { type: Type.STRING }
                },
                required: ["text", "isCorrect"]
            }
        },
        explanation: { type: Type.STRING, description: "1-2 sentences explaining the answer." },
        reconstructed: { type: Type.BOOLEAN },
        sourceEvidence: { type: Type.STRING, description: "Max 240 chars. Quote context or 'semantic inference'." },
        qualityFlags: {
            type: Type.OBJECT,
            properties: {
                ambiguous: { type: Type.BOOLEAN },
                needsHumanReview: { type: Type.BOOLEAN },
                duplicateOptions: { type: Type.BOOLEAN }
            }
        },
        imageUrl: { type: Type.STRING, nullable: true },
        confidenceGlobal: { type: Type.NUMBER, description: "0 to 1" }
    },
    required: ["options", "reconstructed"]
};

interface GenParams {
  topic: string;
  count: number;
  types: string[]; 
  age: string;
  context?: string;
  urls?: string[]; 
  language?: string; 
}

// HEURISTIC FIXER: The AI sometimes gets confused. We fix it with logic.
const sanitizeQuestion = (q: any, allowedTypes: string[], language: string): any => {
    let text = q.text || "";
    let type = q.type || QUESTION_TYPES.MULTIPLE_CHOICE;
    let options = Array.isArray(q.options) ? q.options : [];
    let correctIndex = q.correctAnswerIndex || 0;
    
    // 1. DETECT HIDDEN 'ORDER' QUESTIONS
    const orderKeywords = ["ordena", "ordenar", "clasifica", "secuencia", "arrange", "sort", "order", "rank"];
    const isOrderText = orderKeywords.some(k => text.toLowerCase().includes(k));
    
    if (isOrderText && allowedTypes.includes(QUESTION_TYPES.ORDER)) {
        type = QUESTION_TYPES.ORDER;
        correctIndex = 0;
    }

    // 2. DETECT HIDDEN 'TRUE/FALSE'
    const tfKeywords = ["verdadero", "falso", "true", "false", "cierto", "correct?"];
    const hasTFOptions = options.length === 2 && options.some((o:string) => o.toLowerCase().includes('true') || o.toLowerCase().includes('verdadero'));
    
    if ((hasTFOptions || (options.length === 2 && tfKeywords.some(k => text.toLowerCase().includes(k)))) && allowedTypes.includes(QUESTION_TYPES.TRUE_FALSE)) {
        type = QUESTION_TYPES.TRUE_FALSE;
        const isSpanish = language.toLowerCase() === 'spanish' || language === 'es';
        options = isSpanish ? ["Verdadero", "Falso"] : ["True", "False"];
        if (correctIndex < 0 || correctIndex > 1) correctIndex = 0;
    }

    // 3. FILL GAP SANITIZATION
    if (type === QUESTION_TYPES.FILL_GAP || type.toLowerCase().includes('gap') || type.toLowerCase().includes('blank')) {
        type = QUESTION_TYPES.FILL_GAP;
        const gapCount = (text.match(/__/g) || []).length;
        if (gapCount === 0) {
             if (allowedTypes.includes(QUESTION_TYPES.MULTIPLE_CHOICE)) {
                 type = QUESTION_TYPES.MULTIPLE_CHOICE;
             } else {
                 text += " __";
             }
        } else {
            if (options.length > gapCount) options = options.slice(0, gapCount);
            while (options.length < gapCount) options.push("???");
        }
        correctIndex = 0;
    }

    // 4. DETECT MULTI-SELECT (Plural phrasing)
    const multiKeywords = [
        "selecciona los", "selecciona las", "cuales son", "select all", "choose the", "marcar todas",
        "ingredientes", "elements", "features", "characteristics", "son correctas"
    ];
    const impliesPlural = multiKeywords.some(k => text.toLowerCase().includes(k));
    
    if ((impliesPlural || type === 'Multi-Select' || type === QUESTION_TYPES.MULTI_SELECT) && allowedTypes.includes(QUESTION_TYPES.MULTI_SELECT)) {
        type = QUESTION_TYPES.MULTI_SELECT;
        if (!q.correctAnswerIndices || q.correctAnswerIndices.length === 0) {
            q.correctAnswerIndices = [typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0];
        }
    } else if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
        q.correctAnswerIndices = [correctIndex];
    }

    // 5. FAILSAFE: EMPTY OPTIONS
    if ((type === QUESTION_TYPES.MULTIPLE_CHOICE || type === QUESTION_TYPES.MULTI_SELECT) && options.length === 0) {
        options = ["Opción A", "Opción B", "Opción C", "Opción D"];
    }

    // 6. ORDER SANITIZATION
    if (type === QUESTION_TYPES.ORDER) {
        while (options.length < 2) options.push("Item " + (options.length + 1));
        if (options.length > 6) options = options.slice(0, 6);
        correctIndex = 0; 
    }

    return { ...q, text, type, options, correctAnswerIndex: correctIndex, correctAnswerIndices: q.correctAnswerIndices, reconstructed: q.reconstructed, sourceEvidence: q.sourceEvidence, imageReconstruction: q.imageReconstruction };
};

export const generateQuizQuestions = async (params: GenParams): Promise<(Omit<Question, 'id' | 'options' | 'correctOptionId'> & { rawOptions: string[], correctIndex: number, correctIndices?: number[] })[]> => {
  try {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish' } = params;
    const safeCount = Math.min(Math.max(count, 1), 50); 

    let prompt = `Generate ${safeCount} quiz questions about "${topic}".`;
    prompt += `\nTarget Audience: ${age}. Language: ${language}.`;
    prompt += `\nSTRICTLY ALLOWED TYPES: ${types.join(', ')}.`;
    
    if (context) prompt += `\n\nContext:\n${context.substring(0, 30000)}`;
    if (urls && urls.length > 0) prompt += `\n\nRef URLs:\n${urls.join('\n')}`;

    prompt += `\n\nSTRICT ENGINEERING RULES:
    1. 'Fill in the Blank':
       - **GRAMMAR CHECK**: Ensure the article (El/La/Los/Las) preceding the gap matches the gender/number of the hidden word.
       - Incorrect: "El __ es una fruta (Manzana)". Correct: "La __ es una fruta (Manzana)".
       - Text MUST contain '__' for missing words.
    
    2. TYPE DISTINCTION (CRITICAL):
       - 'Multiple Choice' (Respuesta Única): ONLY ONE correct answer.
       - 'Multi-Select' (Elección Múltiple): SEVERAL correct answers. 
       - If the question asks to "Select ingredients", "Select all", or implies plurality, YOU MUST USE type='Multi-Select'.
       - **MUST PROVIDE OPTIONS**. Never return empty options for Choice types.
    
    3. 'Order' / 'Sort':
       - 'options' MUST be in the **CORRECT FINAL ORDER**.
       - Set 'correctAnswerIndex' to 0.
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: `You are a precise quiz engine. Pay close attention to Spanish grammatical gender agreement in Fill-in-the-Blank questions. ALWAYS provide 4 options for Multiple Choice/Multi-Select.`,
      },
    }));

    const text = response.text;
    if (!text) return [];

    let data;
    try { data = JSON.parse(text); } catch (e) { return []; }
    
    const items = Array.isArray(data) ? data : (data.questions || data.items || []);
    if (!Array.isArray(items)) return [];

    return items.map((rawQ: any) => {
      const q = sanitizeQuestion(rawQ, types, language);
      return {
        text: q.text,
        rawOptions: q.options,
        correctIndex: q.correctAnswerIndex,
        correctIndices: q.correctAnswerIndices || [q.correctAnswerIndex],
        feedback: q.feedback || "",
        questionType: q.questionType,
        imageUrl: q.imageUrl || "",
        reconstructed: q.reconstructed,
        sourceEvidence: q.sourceEvidence,
        imageReconstruction: q.imageReconstruction
      };
    });

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate quiz content.");
  }
};

export const parseRawTextToQuiz = async (rawText: string, language: string = 'Spanish', image?: any): Promise<any[]> => {
    const ai = getAI();
    const truncatedText = rawText.substring(0, 800000); 
    const contents: any[] = [];
    if (image) {
      contents.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
      contents.push({ text: "Extract questions from this image." });
    }
    
    const prompt = `You are a Quiz Data Extraction Engine.
    Output Language: ${language}
    Your task is NOT to read the page like a human.
    Your task is to reconstruct the internal quiz data model used by the platform.
    Source Content:
    ${truncatedText}
    You must:
    1. Identify each question block.
    2. Locate ALL possible answer options.
    3. Infer which option is correct using: structural signals, repeated patterns, hidden JSON, data attributes, or semantic analysis.
    4. Extract the image associated with each question.
       - CRITICAL FOR KAHOOT: If you see a UUID (e.g. "06d7e6e5-...") in an 'image' field, CONSTRUCT the URL: https://images-cdn.kahoot.it/{UUID}
       - Search for 'image', 'bgImage', 'media', 'url'.
    5. If answers are not directly visible, search the content for answer keys, validation logic, or "correct" flags.
    6. If still missing, infer the correct answer by semantic analysis and mark 'reconstructed': true.
    
    Work as a forensic analyst. Do not stop at visible text. Assume important data is hidden in structure (JSON blocks, Script tags).
    Detect 'Multi-Select' if multiple answers are correct.
    Detect 'Order' questions.
    Populate the 'sourceEvidence' field explaining where you found the data.
    Populate 'imageReconstruction' with 'direct', 'partial' (if you built the URL), or 'none'.
    
    CRITICAL FEEDBACK RULE:
    - Field 'feedback': LEAVE EMPTY ("") unless the source text specifically contains an explicit explanation block (e.g. "Explanation:", "Rational:", "Why is this correct?").
    - DO NOT invent educational context.
    - DO NOT explain why an answer is correct using your own knowledge.
    - DO NOT mention grade levels or curriculum alignment.
    - If no explanation text is found in source, 'feedback' MUST be empty string.`;

    contents.push({ text: prompt });

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
      },
    }));
    
    const text = response.text;
    if (!text) return [];
    let data;
    try { data = JSON.parse(text); } catch (e) { return []; }
    const items = Array.isArray(data) ? data : (data.questions || data.items || []);
    
    const allowedTypes = Object.values(QUESTION_TYPES);

    return items.map((rawQ: any) => {
        const q = sanitizeQuestion(rawQ, allowedTypes, language);
        return {
            text: q.text,
            rawOptions: q.options,
            correctIndex: q.correctAnswerIndex,
            correctIndices: q.correctAnswerIndices || [q.correctAnswerIndex],
            feedback: q.feedback || "",
            questionType: q.type,
            imageUrl: q.imageUrl || "",
            reconstructed: q.reconstructed,
            sourceEvidence: q.sourceEvidence,
            imageReconstruction: q.imageReconstruction
        };
    });
};

// ENHANCE AI MODULE
export const enhanceQuestion = async (
    q: Question, 
    context: string, 
    language: string
): Promise<Question> => {
    try {
        const ai = getAI();
        const prompt = `Input:
language: "${language}"
questionText: "${q.text}"
sourceContext: "${context ? context.substring(0, 2000) : ''}"
existingOptions: ${JSON.stringify(q.options.map(o => o.text))}
imageCandidates: "${q.imageUrl || ''}"
constraints:
  • typeHint: "${q.questionType}"
  • optionsTarget: ${q.options.length < 2 ? 4 : q.options.length}
  • singleAnswer: ${q.questionType !== QUESTION_TYPES.MULTI_SELECT}
  • difficulty: "medium"

Task:
Complete the question data.
Rules:
  • Keep the original intent of the question.
  • If existingOptions are present, reuse them and only fix/complete.
  • Generate plausible distractors that are close to the correct answer (near-miss), not random.
  • Mark reconstructed=true if you had to infer anything not supported by sourceContext.
  • Provide sourceEvidence as either a short quote from sourceContext or "semantic inference".
  • For images: if imageCandidates exist, select the best match. If none, set url=null.
`;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: enhanceSchema,
                systemInstruction: `You are Enhance AI for quizzes. Your job is to complete missing quiz data with high precision and minimal invention.
Priorities:
  1. Use provided sourceContext as evidence. If evidence exists, follow it.
  2. If evidence is missing, infer using general knowledge and clearly mark reconstructed=true.
  3. Avoid duplicates, avoid multiple correct answers unless multiAnswer=true.
  4. Return strict JSON.
  5. Provide confidence scores 0-1.`
            }
        }));

        const data = JSON.parse(response.text || "{}");
        if (!data.options) throw new Error("Enhance AI failed to generate options");

        // Merge logic
        const newOptions = data.options.map((o: any) => ({
            id: Math.random().toString(36).substring(2, 9),
            text: o.text
        }));

        const correctIndices: number[] = [];
        data.options.forEach((o: any, idx: number) => {
            if (o.isCorrect) correctIndices.push(idx);
        });

        const correctOptionIds = correctIndices.map(i => newOptions[i]?.id).filter(id => !!id);

        return {
            ...q,
            text: data.text || q.text,
            options: newOptions,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds: correctOptionIds,
            explanation: data.explanation,
            feedback: data.explanation, // Map explanation to feedback
            reconstructed: data.reconstructed,
            sourceEvidence: data.sourceEvidence,
            qualityFlags: data.qualityFlags,
            confidenceScore: data.confidenceGlobal,
            imageUrl: data.imageUrl || q.imageUrl || ""
        };

    } catch (e: any) {
        console.error("Enhance Question Error", e);
        // If retries failed, we throw so UI can handle it or show toast
        throw e;
    }
};

export const enhanceQuestionsWithOptions = async (questions: Question[], language: string = 'Spanish'): Promise<any[]> => {
    const ai = getAI();
    const qs = questions.map(q => ({ text: q.text, type: q.questionType }));
    
    // Applying retry logic here as well
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I have a list of questions but the answers are missing. 
        For each question, generate 4 plausible options (1 correct, 3 distractors) and mark the correct one.
        Language: ${language}.
        Questions: ${JSON.stringify(qs)}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: quizSchema,
            systemInstruction: "You are a teacher fixing a broken quiz. Preserve the exact original question text. Generate high-quality distractors."
        }
    }));

    try {
        const data = JSON.parse(response.text || "[]");
        const items = Array.isArray(data) ? data : (data.questions || []);
        return items.map((generated: any, index: number) => {
            const original = questions[index];
            const sanitized = sanitizeQuestion(generated, [original.questionType || QUESTION_TYPES.MULTIPLE_CHOICE], language);
            return {
                ...sanitized,
                rawOptions: sanitized.options,
                correctIndex: sanitized.correctAnswerIndex,
                correctIndices: sanitized.correctAnswerIndices
            };
        });
    } catch (e) { return []; }
};

export const generateQuizCategories = async (questions: string[]): Promise<string[]> => {
    const ai = getAI();
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 6 categories for Jeopardy. JSON array of strings. Questions: ${questions.slice(0,10).join('|')}`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } },
    }));
    try { return JSON.parse(response.text || "[]"); } catch { return []; }
};

export const adaptQuestionsToPlatform = async (questions: Question[], platformName: string, allowedTypes: string[]): Promise<Question[]> => {
    const ai = getAI();
    const questionsJson = questions.map(q => ({
        id: q.id, text: q.text, options: q.options.map(o => o.text), type: q.questionType
    }));
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Adapt these questions for ${platformName}. Allowed types: ${allowedTypes.join(', ')}. JSON:\n${JSON.stringify(questionsJson)}`,
        config: { responseMimeType: "application/json", responseSchema: quizSchema }
    }));
    try {
        const data = JSON.parse(response.text || "[]");
        const items = Array.isArray(data) ? data : (data.questions || []);
        return items.map((aq: any, index: number) => {
             const originalQ: any = questions[index] || { id: Math.random().toString() }; 
             const newOptions = (aq.options || []).map((t:string) => ({ id: Math.random().toString(), text: t }));
             const sanitized = sanitizeQuestion({ ...aq, options: newOptions.map(o => o.text) }, allowedTypes, 'Spanish');
             return {
                 ...originalQ,
                 text: sanitized.text || "Adapted",
                 options: newOptions, 
                 correctOptionId: newOptions[sanitized.correctAnswerIndex || 0]?.id || "",
                 correctOptionIds: (sanitized.correctAnswerIndices || [sanitized.correctAnswerIndex || 0]).map((i: number) => newOptions[i]?.id),
                 questionType: sanitized.type
             };
        });
    } catch { return questions; }
};
