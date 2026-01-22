
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
    imageSearchQuery: { type: Type.STRING, description: "2-3 words ENGLISH keyword for image search. E.g., 'van gogh portrait'" },
    fallback_category: { type: Type.STRING, description: "Broad category ID: 'animals', 'history', 'science', 'art', 'geography', 'tech'." },
    reconstructed: { type: Type.BOOLEAN },
    sourceEvidence: { type: Type.STRING },
    imageReconstruction: { type: Type.STRING, enum: ["direct", "partial", "inferred", "none"] }
  },
  required: ["text", "options", "type", "imageSearchQuery", "fallback_category"]
};

// UPDATED: Root Object Schema with Tags
const quizRootSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
        type: Type.ARRAY,
        items: questionSchema
    },
    tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3-5 lowercase keywords: Topic (e.g. 'science'), Subtopic (e.g. 'space'), Difficulty (e.g. 'primary'), Language (e.g. 'spanish')."
    }
  },
  required: ["questions", "tags"]
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
        imageSearchQuery: { type: Type.STRING, nullable: true },
        fallback_category: { type: Type.STRING, nullable: true },
        confidenceGlobal: { type: Type.NUMBER }
    },
    required: ["options", "reconstructed"]
};

// --- SYSTEM PROMPT ---
const SYSTEM_INSTRUCTION = `Eres un experto diseñador de juegos educativos. Tu misión es generar cuestionarios JSON precisos.

### 🏷️ SMART TAGGING (OBLIGATORIO)
Debes generar un campo "tags" que contenga un array de 3 a 5 strings en minúsculas.
Estas etiquetas deben definir: 
1. Tema Principal (ej: 'historia', 'ciencias')
2. Subtema Específico (ej: 'romanos', 'plantas')
3. Nivel de Dificultad (ej: 'primaria', 'secundaria', 'universidad')
4. Idioma del contenido (ej: 'español', 'inglés')

### 🖼️ PROTOCOLO DE IMÁGENES
Para cada pregunta, el campo "imageSearchQuery" es OBLIGATORIO.
Este campo debe contener 2 o 3 palabras clave EN INGLÉS que describan visualmente la respuesta correcta o el sujeto de la pregunta.
NO uses verbos ni artículos.
Ejemplo: Si la pregunta es sobre Van Gogh y su oreja, el imageSearchQuery debe ser: 'van gogh portrait painting'.

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

// MODEL CONSTANT
const MODEL_NAME = "gemini-1.5-flash"; // STABLE MODEL

export const generateQuizQuestions = async (params: GenParams): Promise<{questions: any[], tags: string[]}> => {
  return withRetry(async () => {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish', includeFeedback } = params;
    const safeCount = Math.min(Math.max(count, 1), 30);

    // --- DISTRIBUTION LOGIC ---
    let distributionInstruction = "";
    if (types.length > 0) {
        const baseCount = Math.floor(safeCount / types.length);
        const remainder = safeCount % types.length;
        const distribution: string[] = [];
        
        types.forEach((t, index) => {
            const num = baseCount + (index < remainder ? 1 : 0);
            if (num > 0) distribution.push(`${num} questions of type '${t}'`);
        });
        distributionInstruction = `STRICTLY generate this distribution: ${distribution.join(', ')}.`;
    }

    let prompt = `Generate a Quiz about "${topic}".`;
    prompt += `\n${distributionInstruction}`;
    prompt += `\nTarget Audience: ${age}. Output Language: ${language}.`;
    
    if (context) prompt += `\n\nContext:\n${context.substring(0, 30000)}`;
    if (urls && urls.length > 0) prompt += `\n\nRef URLs:\n${urls.join('\n')}`;

    prompt += `\n\n### CRITICAL RULES PER TYPE:
    1. 'Fill in the Blank': Text MUST contain '__' for missing words.
    2. 'Multiple Choice' & 'Multi-Select': **ALWAYS generate exactly 4 options.**
    3. 'Open Ended' (Respuesta Abierta): The correct answer MUST be **1 or 2 words maximum**. Prioritize single words.
    4. 'Order': Generate between **4 and 6 options**. Keep text short (max 6 words per option).
    ${includeFeedback ? "5. Generate brief educational feedback." : ""}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizRootSchema, // Updated schema
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
    
    // VALIDATE QUESTIONS
    const validQuestions = validateQuizQuestions(data.questions || []);
    // RETURN OBJECT WITH TAGS
    return {
        questions: validQuestions,
        tags: Array.isArray(data.tags) ? data.tags.map((t: any) => String(t).toLowerCase()) : []
    };
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
        Generate 'imageSearchQuery' in English (keywords only) based on context.`;

        contents.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: contents,
          config: {
            responseMimeType: "application/json",
            // For parsing, we currently keep simple array schema or update to match
            // To be safe, we use the root schema but will extract questions only for now
            responseSchema: quizRootSchema, 
            systemInstruction: SYSTEM_INSTRUCTION
          },
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        
        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error("AI returned malformed JSON."); }
        
        // Return just questions for parsing flow (tags handled implicitly or ignored for now)
        return validateQuizQuestions(data.questions || []);
    });
};

export const enhanceQuestion = async (q: Question, context: string, language: string): Promise<Question> => {
    return withRetry(async () => {
        const ai = getAI();
        const prompt = `Enhance this quiz question. Language: ${language}. Question: "${q.text}". Options: ${JSON.stringify(q.options.map(o => o.text))}. Context: ${context.substring(0,500)}.`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
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
            // Merge other fields...
            feedback: data.explanation || q.feedback,
            reconstructed: true,
            needsEnhanceAI: false,
            enhanceReason: undefined
        };
    });
};

// Compatibility export
export const enhanceQuestionsWithOptions = async (questions: any[], language: string) => {
    // Basic batch mock for now, or implement bulk enhancement
    const enhanced = [];
    for(const q of questions) {
        try {
            const e = await enhanceQuestion(q, "", language);
            enhanced.push(e);
        } catch(e) {
            enhanced.push(q);
        }
    }
    return enhanced;
};

// --- NEW EXPORTS ---

export const generateQuizCategories = async (questionTexts: string[], count: number): Promise<string[]> => {
  return withRetry(async () => {
    const ai = getAI();
    // Truncate list if too long to save tokens
    const sample = questionTexts.slice(0, 30).join("\n");
    const prompt = `Analyze these quiz questions and generate exactly ${count} short category titles (max 3 words each) that could group them or represent themes. Return ONLY a JSON array of strings.
    Questions:
    ${sample}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return Array(count).fill("Category");
    try {
        const cats = JSON.parse(text);
        if (Array.isArray(cats)) {
            // Ensure we have exactly count items
            while (cats.length < count) cats.push("Category");
            return cats.slice(0, count);
        }
        return Array(count).fill("Category");
    } catch (e) {
        return Array(count).fill("Category");
    }
  });
};

export const adaptQuestionsToPlatform = async (questions: Question[], platformName: string, allowedTypes: string[]): Promise<Question[]> => {
    // Process in parallel but globalQueue will serialize execution to respect rate limits
    const adapted = await Promise.all(questions.map(q => withRetry(async () => {
        const ai = getAI();
        const validTypes = allowedTypes.join(", ");
        const prompt = `Adapt this question for the "${platformName}" platform. 
        Allowed Types: ${validTypes}.
        Original Question: "${q.text}"
        Original Type: "${q.questionType}"
        Original Options: ${JSON.stringify(q.options.map(o => o.text))}
        Correct Answer(s): ${JSON.stringify(q.options.filter(o => q.correctOptionIds?.includes(o.id) || o.id === q.correctOptionId).map(o => o.text))}
        
        Task: Rewrite or restructure this question to fit one of the allowed types. If it's Open Ended and needs Multiple Choice, generate 3 plausible distractors.
        Return the new question object matching the schema.`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: enhanceSchema,
                systemInstruction: "You are a quiz adaptation expert. Ensure the output strictly follows the schema and fits the allowed types."
            }
        });
        
        const data = JSON.parse(response.text || "{}");
        
        const newOptions = (data.options || []).map((o: any) => ({
            id: Math.random().toString(36).substring(2, 9),
            text: String(o.text || "").trim()
        }));

        const correctIndices: number[] = [];
        (data.options || []).forEach((o: any, idx: number) => {
            if (o.isCorrect) correctIndices.push(idx);
        });

        const correctOptionIds = correctIndices.map(i => newOptions[i]?.id).filter(id => !!id);
        
        // Determine type based on result
        let newType = "Multiple Choice"; // Default fallback
        if (allowedTypes.includes("True/False") && newOptions.length === 2 && 
            newOptions.some((o:any) => o.text.toLowerCase().includes('true') || o.text.toLowerCase().includes('verdadero'))) {
            newType = "True/False";
        } else if (allowedTypes.includes("Multi-Select") && correctOptionIds.length > 1) {
            newType = "Multi-Select";
        } else if (allowedTypes.includes("Multiple Choice")) {
            newType = "Multiple Choice";
        } else if (allowedTypes.length > 0) {
            newType = allowedTypes[0];
        }

        return {
            ...q,
            text: data.text || q.text,
            options: newOptions,
            correctOptionId: correctOptionIds[0] || "",
            correctOptionIds: correctOptionIds,
            questionType: newType,
            feedback: data.explanation || q.feedback,
            reconstructed: true
        };
    })));
    
    return adapted;
};
