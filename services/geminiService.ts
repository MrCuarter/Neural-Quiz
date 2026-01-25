
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, QUESTION_TYPES } from "../types";
import { validateQuizQuestions } from "../utils/validation";

// --- API KEY MANAGEMENT ---
let currentKeyIndex = 0;

const getAPIKeys = (): string[] => {
  const keys: string[] = [];
  try {
    // @ts-ignore
    if (import.meta.env.VITE_API_KEY) keys.push(import.meta.env.VITE_API_KEY);
    // @ts-ignore
    if (import.meta.env.API_KEY) keys.push(import.meta.env.API_KEY);
    // @ts-ignore
    if (import.meta.env.VITE_GOOGLE_API_KEY) keys.push(import.meta.env.VITE_GOOGLE_API_KEY);
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_API_KEY) keys.push(process.env.VITE_API_KEY);
      if (process.env.API_KEY) keys.push(process.env.API_KEY);
    }
  } catch(e) {}
  return Array.from(new Set(keys)).filter(k => !!k && k.length > 10 && !k.includes("undefined"));
};

const getAI = () => {
  const keys = getAPIKeys();
  if (keys.length === 0) {
      if (process.env.API_KEY) return new GoogleGenAI({ apiKey: process.env.API_KEY });
      return new GoogleGenAI({ apiKey: "dummy" }); 
  }
  if (currentKeyIndex >= keys.length) currentKeyIndex = 0;
  const activeKey = keys[currentKeyIndex];
  return new GoogleGenAI({ apiKey: activeKey });
};

// Request Queue and Retry Logic
class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await operation()); } catch (e) { reject(e); }
      });
      this.process();
    });
  }
  private async process() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) { await task(); await new Promise(r => setTimeout(r, 2000)); }
    }
    this.isProcessing = false;
  }
}
const globalQueue = new RequestQueue();
const withRetry = async <T>(op: () => Promise<T>): Promise<T> => globalQueue.add(op);

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
    imageSearchQuery: { type: Type.STRING, description: "2-3 words ENGLISH keyword for image search." },
    fallback_category: { type: Type.STRING },
    reconstructed: { type: Type.BOOLEAN },
    sourceEvidence: { type: Type.STRING }
  },
  required: ["text", "options", "type", "imageSearchQuery", "fallback_category"]
};

const quizRootSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: { type: Type.ARRAY, items: questionSchema },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
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
            properties: { ambiguous: { type: Type.BOOLEAN }, needsHumanReview: { type: Type.BOOLEAN } }
        },
        imageUrl: { type: Type.STRING, nullable: true },
        imageSearchQuery: { type: Type.STRING, nullable: true },
        fallback_category: { type: Type.STRING, nullable: true }
    },
    required: ["options", "reconstructed"]
};

// --- SYSTEM PROMPT ---
const SYSTEM_INSTRUCTION = `Eres un experto diseñador de juegos educativos. 
Tu misión es generar cuestionarios JSON precisos.
Genera "imageSearchQuery" (2-3 palabras en INGLÉS) y "fallback_category" para cada pregunta.
Genera "tags" útiles.`;

interface GenParams {
  topic: string;
  count: number;
  types: string[]; 
  age: string;
  context?: string;
  urls?: string[]; 
  language?: string;
  includeFeedback?: boolean;
  tone?: string;
}

// *** CRITICAL: HARDCODED PRODUCTION MODEL FOR CHEAP/HIGH QUOTA ***
// gemini-2.0-flash is the current standard for speed and low cost ($0.10/1M input tokens)
const MODEL_NAME = "gemini-2.0-flash"; 

export const generateQuizQuestions = async (params: GenParams): Promise<{questions: any[], tags: string[]}> => {
  return withRetry(async () => {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish', includeFeedback, tone = 'Neutral' } = params;
    const safeCount = Math.min(Math.max(count, 1), 30);

    let prompt = `Generate a Quiz about "${topic}".`;
    prompt += `\nTarget Audience: ${age}. Output Language: ${language}.`;
    prompt += `\nTONE: ${tone.toUpperCase()}. Adapt the wording of questions and feedback to be ${tone}.`;
    
    if (types.length > 0) prompt += `\nInclude these types if possible: ${types.join(', ')}.`;
    if (context) prompt += `\n\nContext:\n${context.substring(0, 30000)}`;
    if (urls && urls.length > 0) prompt += `\n\nRef URLs:\n${urls.join('\n')}`;

    prompt += `\n\nGenerate exactly ${safeCount} questions.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizRootSchema,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error("AI returned malformed JSON."); }
    
    return {
        questions: validateQuizQuestions(data.questions || []),
        tags: Array.isArray(data.tags) ? data.tags.map((t: any) => String(t).toLowerCase()) : []
    };
  });
};

export const parseRawTextToQuiz = async (rawText: string, language: string = 'Spanish', image?: any): Promise<any[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const prompt = `Extract questions from: ${rawText.substring(0, 5000)}. Language: ${language}.`;
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: quizRootSchema }
        });
        return JSON.parse(response.text || "{}").questions || [];
    });
};

export const enhanceQuestion = async (q: Question, context: string, language: string): Promise<Question> => {
    // Basic mock/placeholder logic
    return q; 
};

export const enhanceQuestionsWithOptions = async (questions: any[], language: string) => {
    return questions;
};

export const generateQuizCategories = async (questionTexts: string[], count: number): Promise<string[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const prompt = `Generate ${count} short category names for these questions: ${questionTexts.slice(0,10).join(' ')}`;
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: {type: Type.ARRAY, items: {type: Type.STRING}} }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const adaptQuestionsToPlatform = async (questions: Question[], platformName: string, allowedTypes: string[]): Promise<Question[]> => {
    return questions;
};
