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
const optionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        text: { type: Type.STRING },
        imageSearchQuery: { type: Type.STRING, description: "Optional. Only set this if you want an image for this specific option." }
    },
    required: ["text"]
};

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    options: { type: Type.ARRAY, items: optionSchema },
    correctAnswerIndex: { type: Type.INTEGER },
    correctAnswerIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    feedback: { type: Type.STRING },
    type: { type: Type.STRING }, 
    imageUrl: { type: Type.STRING },
    imageSearchQuery: { type: Type.STRING, description: "2-3 words ENGLISH keyword for image search." },
    fallback_category: { type: Type.STRING },
    reconstructed: { type: Type.BOOLEAN },
    sourceEvidence: { type: Type.STRING },
    difficulty: { type: Type.INTEGER, description: "Calculated difficulty level (1-5)." }
  },
  required: ["text", "options", "type", "imageSearchQuery", "fallback_category", "difficulty"]
};

const quizRootSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: { type: Type.ARRAY, items: questionSchema },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["questions", "tags"]
};

// --- SYSTEM PROMPT ---
const SYSTEM_INSTRUCTION = `Eres un experto diseñador de juegos educativos. 
Tu misión es generar cuestionarios JSON precisos.
Genera "imageSearchQuery" (2-3 palabras en INGLÉS) y "fallback_category" para cada pregunta.
Genera "tags" útiles.

ALGORITMO DE DIFICULTAD (OBLIGATORIO: Asigna 'difficulty' integer de 1 a 5 para CADA pregunta):
Debes calcular el nivel de dificultad siguiendo estrictamente estos pasos:

1. NIVEL BASE POR TIPO DE PREGUNTA:
   - True/False: Base ⭐1
   - Multiple Choice (1 respuesta): Base ⭐2
   - Short Answer / Checkbox (Multi-Select): Base ⭐3
   - Sort/Order: Base ⭐4

2. AJUSTE POR EDAD (Target Audience):
   - 6-7 años: +1 (Sube dificultad percibida)
   - 8-9 años: +0
   - 10-11 años: -1 (Baja 1 si es simple)
   - 12+ años: -1
   (Mantén la base resultante entre 1 y 4 antes del siguiente paso).

3. AJUSTE POR COMPLEJIDAD DEL CONTENIDO (La Dificultad Real):
   Evalúa la pregunta y suma puntos:
   A. Carga Lingüística: Simple(0), Media(+1), Alta/Técnica(+2)
   B. Complejidad Cognitiva: Recordar(0), Comprender(+1), Aplicar(+2), Inferir(+3)
   C. Distractores: Obvios(0), Plausibles(+1), Trampa(+2)
   
   Suma A+B+C y aplica al nivel:
   - 0-1 ptos: +0 ⭐
   - 2-3 ptos: +1 ⭐
   - 4-5 ptos: +2 ⭐
   - 6+ ptos: +3 ⭐

4. REGLA DE VARIANZA (CRUCIAL):
   - Si el usuario pide un solo tipo de pregunta (ej. solo Checkbox para 8 años), NO pongas todas al mismo nivel.
   - Debes variar la complejidad del contenido (Paso 3) para generar un mix equilibrado (1/3 Fáciles, 1/3 Medias, 1/3 Difíciles).
   - El resultado final 'difficulty' debe ser un número entre 1 y 5.

REGLAS DE TIPOS DE PREGUNTA:
1. "Multiple Choice" (Respuesta Única): DEBE tener 4 opciones (salvo nivel 1). Solo una correcta.
2. "Fill in the Blank" (Respuesta Corta):
   - La opción con índice 0 es la respuesta principal perfecta.
   - Las opciones con índices 1, 2, 3 deben ser VARIACIONES ACEPTADAS o SINÓNIMOS.
   - NO generes distractores falsos para este tipo.

REGLAS DE IMÁGENES:
1. Genera SIEMPRE "imageSearchQuery" para la pregunta principal.
2. ENTORNO AL 5% DE LAS PREGUNTAS: Genera preguntas visuales (imágenes en las opciones).`;

interface GenParams {
  topic: string;
  count: number;
  types: string[]; 
  age: string;
  difficulty?: string; // New: '1', '2', '3', '4', '5' or 'Multinivel'
  context?: string;
  urls?: string[]; 
  language?: string;
  includeFeedback?: boolean;
  tone?: string;
  customToneContext?: string; 
}

// *** CRITICAL: UPDATED MODEL TO 3-FLASH-PREVIEW FOR COMPLIANCE ***
const MODEL_NAME = "gemini-3-flash-preview"; 

/**
 * CLEANER FUNCTION FOR AI RESPONSE
 * Removes Markdown code blocks and extracts the JSON object/array.
 */
function cleanAIResponse(text: string): string {
  if (!text) return "{}";
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstBracket = clean.indexOf('[');
  const firstBrace = clean.indexOf('{');
  let start = -1;
  if (firstBracket !== -1 && firstBrace !== -1) {
      start = Math.min(firstBracket, firstBrace);
  } else if (firstBracket !== -1) {
      start = firstBracket;
  } else if (firstBrace !== -1) {
      start = firstBrace;
  }
  const lastBracket = clean.lastIndexOf(']');
  const lastBrace = clean.lastIndexOf('}');
  const end = Math.max(lastBracket, lastBrace);
  if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
  }
  return clean.trim();
}

export const generateQuizQuestions = async (params: GenParams): Promise<{questions: any[], tags: string[]}> => {
  return withRetry(async () => {
    const ai = getAI();
    const { topic, count, types, age, difficulty = '3', context, urls, language = 'Spanish', includeFeedback, tone = 'Neutral', customToneContext } = params;
    const safeCount = Math.min(Math.max(count, 1), 50);

    let prompt = "";

    if (tone === 'Custom' && customToneContext) {
        prompt += `CONTEXTO OBLIGATORIO: Adapta TODAS las preguntas al escenario: '${customToneContext}'.\n\n`;
    }

    prompt += `Generate a Quiz about "${topic}".`;
    prompt += `\nTarget Audience (Age/Level): ${age}. Output Language: ${language}.`;
    
    // DIFFICULTY LOGIC INJECTION
    if (difficulty === 'Multinivel') {
        prompt += `\nDIFFICULTY MODE: MULTILEVEL MIX. 
        Apply the Difficulty Algorithm strictly. 
        Ensure a bell curve distribution of difficulty stars (1-5) based on content complexity vs age.`;
    } else {
        const diffNum = parseInt(difficulty);
        prompt += `\nTARGET DIFFICULTY: Level ${diffNum}. 
        However, use the Difficulty Algorithm to ensure specific questions vary slightly around this mean based on their type and content complexity.`;
    }
    
    if (tone !== 'Custom') {
        prompt += `\nTONE: ${tone.toUpperCase()}.`;
    }
    
    if (types.length > 0) {
        prompt += `\nALLOWED TYPES: ${types.join(', ')}. Distribute evenly if possible, but respect content fit.`;
    }

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

    const cleanedText = cleanAIResponse(text);

    let data;
    try { 
        data = JSON.parse(cleanedText); 
    } catch (e) { 
        console.error("Failed to parse AI response:", text);
        throw new Error("AI returned malformed JSON."); 
    }
    
    return {
        questions: validateQuizQuestions(data.questions || []),
        tags: Array.isArray(data.tags) ? data.tags.map((t: any) => String(t).toLowerCase()) : []
    };
  });
};

export const parseRawTextToQuiz = async (rawText: string, language: string = 'Spanish', image?: any): Promise<any[]> => {
    return withRetry(async () => {
        const ai = getAI();
        const prompt = `Extract questions from: ${rawText.substring(0, 5000)}. Language: ${language}. Calculate difficulty (1-5) for each.`;
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: quizRootSchema,
                systemInstruction: SYSTEM_INSTRUCTION 
            }
        });
        
        const cleanedText = cleanAIResponse(response.text || "{}");
        return JSON.parse(cleanedText).questions || [];
    });
};

export const enhanceQuestion = async (q: Question, context: string, language: string): Promise<Question> => {
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
        
        const cleanedText = cleanAIResponse(response.text || "[]");
        return JSON.parse(cleanedText);
    });
};

export const adaptQuestionsToPlatform = async (questions: Question[], platformName: string, allowedTypes: string[]): Promise<Question[]> => {
    return questions;
};