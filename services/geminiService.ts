
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, QUESTION_TYPES } from "../types";
import { validateQuizQuestions } from "../utils/validation";

// --- API KEY MANAGEMENT ---
let currentKeyIndex = 0;

const getAPIKeys = (): string[] => {
  const keys: string[] = [];

  // 1. VITE STATIC REPLACEMENT
  try {
    // @ts-ignore
    if (import.meta.env.VITE_API_KEY) keys.push(import.meta.env.VITE_API_KEY);
    // @ts-ignore
    if (import.meta.env.API_KEY) keys.push(import.meta.env.API_KEY);
    // @ts-ignore
    if (import.meta.env.VITE_GOOGLE_API_KEY) keys.push(import.meta.env.VITE_GOOGLE_API_KEY);
    // @ts-ignore
    if (import.meta.env.VITE_API_KEY_SECONDARY) keys.push(import.meta.env.VITE_API_KEY_SECONDARY);
  } catch (e) {}

  // 2. PROCESS.ENV Fallback
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_API_KEY) keys.push(process.env.VITE_API_KEY);
      if (process.env.API_KEY) keys.push(process.env.API_KEY);
    }
  } catch(e) {}
  
  // Deduplicate and filter
  return Array.from(new Set(keys)).filter(k => 
      !!k && k.length > 10 && !k.includes("undefined") && !k.includes("YOUR_API_KEY")
  );
};

const getAI = () => {
  const keys = getAPIKeys();
  if (keys.length === 0) {
      if (process.env.API_KEY) return new GoogleGenAI({ apiKey: process.env.API_KEY });
      throw new Error("Configuration Error: No valid API Keys found.");
  }
  if (currentKeyIndex >= keys.length) currentKeyIndex = 0;
  const activeKey = keys[currentKeyIndex];
  return new GoogleGenAI({ apiKey: activeKey });
};

// --- GLOBAL REQUEST QUEUE ---
class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private minDelay = 2000;

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
        await new Promise(r => setTimeout(r, this.minDelay));
      }
    }
    this.isProcessing = false;
  }
}

const globalQueue = new RequestQueue();

// --- RETRY & ERROR MAPPING ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mapAPIError = (error: any): Error => {
    const msg = error.message || "";
    const status = error.status || error.code;

    if (msg.includes("429") || status === 429 || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        return new Error("Quota Exceeded (429). The AI is busy. Please try again in a minute.");
    }
    if (msg.includes("503") || status === 503) {
        return new Error("AI Service Unavailable (503). Google's servers are overloaded.");
    }
    if (msg.includes("SAFETY")) {
        return new Error("Safety Block: The content was flagged by AI safety filters.");
    }
    if (msg.includes("API key not valid")) {
        return new Error("Invalid API Key. Please check your configuration.");
    }
    return error;
};

const withRetry = async <T>(
  operation: () => Promise<T>, 
  retries = 3, 
  baseDelay = 5000
): Promise<T> => {
  return globalQueue.add(async () => {
      return executeWithRetry(operation, retries, baseDelay);
  });
};

const executeWithRetry = async <T>(
    operation: () => Promise<T>, 
    retries: number, 
    baseDelay: number
): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        const mappedError = mapAPIError(error);
        const isQuota = mappedError.message.includes("Quota") || mappedError.message.includes("429");

        if (retries > 0 && isQuota) {
            const keys = getAPIKeys();
            if (keys.length > 1) {
                // Rotate Key
                currentKeyIndex = (currentKeyIndex + 1) % keys.length;
                console.warn(`⚠️ Rotating API Key to index ${currentKeyIndex}...`);
                return executeWithRetry(operation, retries - 1, baseDelay);
            } else {
                console.warn(`⚠️ Rate Limit. Retrying in ${baseDelay/1000}s...`);
                await wait(baseDelay);
                return executeWithRetry(operation, retries - 1, baseDelay * 2);
            }
        }
        throw mappedError;
    }
}

// --- SCHEMAS ---
const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctAnswerIndex: { type: Type.INTEGER },
    correctAnswerIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    feedback: { type: Type.STRING },
    type: { type: Type.STRING }, 
    imageUrl: { type: Type.STRING },
    image_search_query: { type: Type.STRING, description: "ENGLISH query for image search. 2-4 keywords. MUST NOT reveal the answer (Anti-Spoiler)." },
    fallback_category: { type: Type.STRING, description: "Broad category ID: 'animals', 'history', 'science', 'art', 'geography', 'tech'." },
    reconstructed: { type: Type.BOOLEAN },
    sourceEvidence: { type: Type.STRING },
    imageReconstruction: { type: Type.STRING, enum: ["direct", "partial", "inferred", "none"] }
  },
  required: ["text", "options", "type", "image_search_query", "fallback_category"]
};

const quizSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
};

const enhanceSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        text: { type: Type.STRING },
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
        explanation: { type: Type.STRING },
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
        image_search_query: { type: Type.STRING, nullable: true },
        fallback_category: { type: Type.STRING, nullable: true },
        confidenceGlobal: { type: Type.NUMBER }
    },
    required: ["options", "reconstructed"]
};

// --- SYSTEM PROMPT ---
const SYSTEM_INSTRUCTION = `Eres un experto diseñador de juegos educativos. Tu misión es generar cuestionarios JSON precisos.

### 🖼️ PROTOCOLO DE IMÁGENES (CRÍTICO)
Para cada pregunta, debes generar el campo "image_search_query" siguiendo estas reglas ESTRICTAS:

1. **IDIOMA:** La búsqueda debe estar SIEMPRE en **INGLÉS**, aunque la pregunta sea en español.
   - *Razón:* Los bancos de imágenes (Unsplash) funcionan mejor en inglés.

2. **ANTI-SPOILER:** La imagen NUNCA debe revelar la respuesta correcta.
   - *Mal:* Pregunta: "¿Quién pintó la Mona Lisa?", Query: "Leonardo Da Vinci". (¡Spoiler!)
   - *Bien:* Query: "Renaissance art painting museum". (Contextual)
   
   - *Mal:* Pregunta: "¿Capital de Francia?", Query: "Eiffel Tower Paris". (¡Demasiado obvio!)
   - *Bien:* Query: "France city aerial river seine". (Contextual)

3. **CONCISIÓN:** Usa 2-4 palabras clave descriptivas.

### 📂 CATEGORÍA DE RESPALDO
Elige una "fallback_category" de esta lista:
- science, history, geography, art, literature, sports, music, movies, nature, animals, technology, math.

Genera contenido educativo de alta calidad.`;

interface GenParams {
  topic: string;
  count: number;
  types: string[]; 
  age: string;
  context?: string;
  urls?: string[]; 
  language?: string;
  includeFeedback?: boolean;
}

export const generateQuizQuestions = async (params: GenParams): Promise<any[]> => {
  return withRetry(async () => {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish', includeFeedback } = params;
    const safeCount = Math.min(Math.max(count, 1), 30);

    let prompt = `Generate ${safeCount} quiz questions about "${topic}".`;
    prompt += `\nTarget Audience: ${age}. Output Language: ${language}.`;
    prompt += `\nSTRICTLY ALLOWED TYPES: ${types.join(', ')}.`;
    
    if (context) prompt += `\n\nContext:\n${context.substring(0, 30000)}`;
    if (urls && urls.length > 0) prompt += `\n\nRef URLs:\n${urls.join('\n')}`;

    prompt += `\n\nRULES:
    1. 'Fill in the Blank': Text MUST contain '__' for missing words.
    2. 'Multiple Choice': ONLY ONE correct answer.
    3. 'Multi-Select': SEVERAL correct answers.
    4. 'Order': Options MUST be in the CORRECT FINAL ORDER.
    ${includeFeedback ? "5. Generate brief educational feedback." : ""}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    let data;
    try { 
        data = JSON.parse(text); 
    } catch (e) { 
        throw new Error("AI returned malformed JSON."); 
    }
    
    // ZOD VALIDATION & SANITIZATION
    return validateQuizQuestions(data);
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
        Task: Identify questions, answers, and correct answers. Reconstruct structure.
        Generate 'image_search_query' in English (Anti-Spoiler) based on context.`;

        contents.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: quizSchema,
            systemInstruction: SYSTEM_INSTRUCTION
          },
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        
        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error("AI returned malformed JSON."); }
        
        // ZOD VALIDATION
        return validateQuizQuestions(data);
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
                systemInstruction: `${SYSTEM_INSTRUCTION} Complete missing data. Generate distractors if missing.`
            }
        });

        const data = JSON.parse(response.text || "{}");
        if (!data.options) throw new Error("Enhance AI failed to generate options");

        const newOptions = data.options.map((o: any) => ({
            id: Math.random().toString(36).substring(2, 9),
            text: String(o.text || "").trim()
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
            imageUrl: data.imageUrl || q.imageUrl || "",
            image_search_query: data.image_search_query,
            fallback_category: data.fallback_category
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
                systemInstruction: SYSTEM_INSTRUCTION
            }
        });

        try {
            const data = JSON.parse(response.text || "[]");
            // VALIDATE AND RETURN
            return validateQuizQuestions(data);
        } catch (e) { 
            throw new Error("Enhance Batch Failed: " + (e as Error).message); 
        }
    });
};

// ... other exports (generateQuizCategories, adaptQuestionsToPlatform) remain mostly the same but could use simple prompts
export const generateQuizCategories = async (questions: string[], count: number = 6): Promise<string[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Generate ${count} short jeopardy-style category titles (max 2-3 words) based on these questions. Output a simple JSON array of strings. Questions: ${questions.slice(0,10).join('|')}`,
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
                 return {
                     ...originalQ,
                     text: aq.text || "Adapted",
                     options: (aq.options || []).map((t: string) => ({ id: Math.random().toString(), text: t })),
                     questionType: aq.type,
                     correctOptionId: "",
                     correctOptionIds: []
                 };
            });
        } catch { return questions; }
    });
};
