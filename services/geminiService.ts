import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { Question, QUESTION_TYPES } from "../types";

// --- API KEY MANAGEMENT ---
const getAI = () => {
  // Always use process.env.API_KEY as per guidelines.
  // Assuming process.env.API_KEY is available.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- GLOBAL REQUEST QUEUE (SEMAPHORE) ---
// This prevents firing multiple requests simultaneously, which triggers IP-based rate limiting.
class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private minDelay = 2000; // Minimum 2 seconds between requests to be safe

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        // Wait before processing next item to cool down rate limiter
        await new Promise(r => setTimeout(r, this.minDelay));
      }
    }

    this.isProcessing = false;
  }
}

const globalQueue = new RequestQueue();

// --- RETRY LOGIC ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  baseDelay = 5000
): Promise<T> => {
  // Wrap the entire retry logic in the global queue to ensure sequential execution
  return globalQueue.add(async () => {
      return executeWithRetry(operation, retries, baseDelay);
  });
};

// Internal recursive retry function
const executeWithRetry = async <T>(
    operation: () => Promise<T>, 
    retries: number, 
    baseDelay: number
): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        const status = error.status || error.code || (error.error && error.error.code);
        const message = error.message || (error.error && error.error.message) || "";
        const isQuotaError = status === 429 || status === 503 || message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED');

        if (retries > 0 && isQuotaError) {
            // Standard backoff for single key
            console.warn(`⚠️ Rate Limit (429). Retrying in ${baseDelay/1000}s...`);
            await wait(baseDelay);
            return executeWithRetry(operation, retries - 1, baseDelay * 2);
        }
        throw error;
    }
}

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
    reconstructed: { type: Type.BOOLEAN, description: "True if the question, answers or image were inferred rather than read directly." },
    sourceEvidence: { type: Type.STRING, description: "Brief explanation of how the data was found." },
    imageReconstruction: { type: Type.STRING, enum: ["direct", "partial", "inferred", "none"], description: "How the image URL was obtained." }
  },
  required: ["text", "options", "type"]
};

const quizSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
  description: "A list of quiz questions."
};

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
        sourceEvidence: { type: Type.STRING },
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

    // 4. DETECT MULTI-SELECT
    const multiKeywords = ["selecciona los", "selecciona las", "cuales son", "select all", "choose the", "marcar todas"];
    const impliesPlural = multiKeywords.some(k => text.toLowerCase().includes(k));
    
    if ((impliesPlural || type === 'Multi-Select' || type === QUESTION_TYPES.MULTI_SELECT) && allowedTypes.includes(QUESTION_TYPES.MULTI_SELECT)) {
        type = QUESTION_TYPES.MULTI_SELECT;
        if (!q.correctAnswerIndices || q.correctAnswerIndices.length === 0) {
            q.correctAnswerIndices = [typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0];
        }
    } else if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
        q.correctAnswerIndices = [correctIndex];
    }

    // 5. FAILSAFE
    if ((type === QUESTION_TYPES.MULTIPLE_CHOICE || type === QUESTION_TYPES.MULTI_SELECT) && options.length === 0) {
        options = ["Opción A", "Opción B", "Opción C", "Opción D"];
    }

    // 6. ORDER
    if (type === QUESTION_TYPES.ORDER) {
        while (options.length < 2) options.push("Item " + (options.length + 1));
        if (options.length > 6) options = options.slice(0, 6);
        correctIndex = 0; 
    }

    return { ...q, text, type, options, correctAnswerIndex: correctIndex, correctAnswerIndices: q.correctAnswerIndices, reconstructed: q.reconstructed, sourceEvidence: q.sourceEvidence, imageReconstruction: q.imageReconstruction };
};

export const generateQuizQuestions = async (params: GenParams): Promise<(Omit<Question, 'id' | 'options' | 'correctOptionId'> & { rawOptions: string[], correctIndex: number, correctIndices?: number[] })[]> => {
  return withRetry(async () => {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish' } = params;
    const safeCount = Math.min(Math.max(count, 1), 30); // Reduced batch size to help quota

    let prompt = `Generate ${safeCount} quiz questions about "${topic}".`;
    prompt += `\nTarget Audience: ${age}. Language: ${language}.`;
    prompt += `\nSTRICTLY ALLOWED TYPES: ${types.join(', ')}.`;
    
    if (context) prompt += `\n\nContext:\n${context.substring(0, 30000)}`;
    if (urls && urls.length > 0) prompt += `\n\nRef URLs:\n${urls.join('\n')}`;

    prompt += `\n\nSTRICT ENGINEERING RULES:
    1. 'Fill in the Blank': Text MUST contain '__' for missing words.
    2. 'Multiple Choice': ONLY ONE correct answer.
    3. 'Multi-Select': SEVERAL correct answers.
    4. 'Order': Options MUST be in the CORRECT FINAL ORDER.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: `You are a precise quiz engine.`,
      },
    });

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
  });
};

export const parseRawTextToQuiz = async (rawText: string, language: string = 'Spanish', image?: any): Promise<any[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const truncatedText = rawText.substring(0, 800000); 
        const contents: any[] = [];
        if (image) {
          contents.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
          contents.push({ text: "Extract questions from this image." });
        }
        
        const prompt = `You are a Quiz Data Extraction Engine. Output Language: ${language}.
        Source Content: ${truncatedText}
        Task: Identify questions, answers, and correct answers. Reconstruct structure.`;

        contents.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: quizSchema,
          },
        });
        
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
    });
};

export const enhanceQuestion = async (q: Question, context: string, language: string): Promise<Question> => {
    return withRetry(async () => {
        const ai = getAI();
        const prompt = `Enhance this quiz question. Language: ${language}. Question: "${q.text}". Options: ${JSON.stringify(q.options.map(o => o.text))}. Context: ${context.substring(0,500)}.`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: enhanceSchema,
                systemInstruction: `Complete missing data. Generate distractors if missing.`
            }
        });

        const data = JSON.parse(response.text || "{}");
        if (!data.options) throw new Error("Enhance AI failed");

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
            feedback: data.explanation,
            reconstructed: data.reconstructed,
            sourceEvidence: data.sourceEvidence,
            qualityFlags: data.qualityFlags,
            confidenceScore: data.confidenceGlobal,
            imageUrl: data.imageUrl || q.imageUrl || ""
        };
    });
};

export const enhanceQuestionsWithOptions = async (questions: Question[], language: string = 'Spanish'): Promise<any[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const qs = questions.map(q => ({ text: q.text, type: q.questionType }));
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Fix these quiz questions. Generate 4 options for each. Language: ${language}. JSON: ${JSON.stringify(qs)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
            }
        });

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
    });
};

export const generateQuizCategories = async (questions: string[]): Promise<string[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Generate 6 jeopardy categories. Questions: ${questions.slice(0,5).join('|')}`,
          config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } },
        });
        try { return JSON.parse(response.text || "[]"); } catch { return []; }
    });
};

export const adaptQuestionsToPlatform = async (questions: Question[], platformName: string, allowedTypes: string[]): Promise<Question[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const questionsJson = questions.map(q => ({
            id: q.id, text: q.text, options: q.options.map(o => o.text), type: q.questionType
        }));
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Adapt for ${platformName}. Allowed types: ${allowedTypes.join(', ')}. JSON:\n${JSON.stringify(questionsJson)}`,
            config: { responseMimeType: "application/json", responseSchema: quizSchema }
        });
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
    });
};