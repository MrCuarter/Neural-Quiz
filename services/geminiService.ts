
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
    difficulty: { type: Type.INTEGER, description: "1 to 5 based on complexity." }
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

// --- SYSTEM PROMPT ---
const SYSTEM_INSTRUCTION = `Eres un experto diseñador de juegos educativos. 
Tu misión es generar cuestionarios JSON precisos.
Genera "imageSearchQuery" (2-3 palabras en INGLÉS) y "fallback_category" para cada pregunta.
Genera "tags" útiles.

NIVELES DE DIFICULTAD (Asigna el campo "difficulty" del 1 al 5):
1. BÁSICO: Preguntas muy simples, directas. V/F, 2-3 opciones. Reconocimiento inmediato.
2. INICIAL: Fáciles con pequeño reto. 3-4 opciones. Checkbox simples. Requieren atención básica.
3. INTERMEDIO: Dificultad media. 4-5 opciones. Distractores plausibles. Obligan a pensar.
4. AVANZADO: Exigentes. 5-6 opciones. Checkbox complejas. Precisión y análisis.
5. EXPERTO: Máxima dificultad. Distractores muy elaborados. Reflexión crítica y transferencia.

REGLAS DE TIPOS DE PREGUNTA:
1. "Multiple Choice" (Respuesta Única): DEBE tener 4 opciones (salvo nivel 1). Solo una correcta.
2. "Fill in the Blank" (Respuesta Corta):
   - La opción con índice 0 es la respuesta principal perfecta.
   - Las opciones con índices 1, 2, 3 deben ser VARIACIONES ACEPTADAS o SINÓNIMOS (ej: "II Guerra Mundial", "2ª GM", "Segunda Guerra Mundial").
   - NO generes distractores falsos para este tipo, solo variaciones válidas.

REGLAS DE FEEDBACK:
- El feedback debe ser puramente educativo, curioso o explicativo.
- PROHIBIDO empezar con palabras de validación como "Correcto", "¡Muy bien!", "Acertaste", "Incorrecto", "Efectivamente".
- Ve directo al grano. Ejemplo BIEN: "El guepardo alcanza 110km/h en 3 segundos." Ejemplo MAL: "¡Correcto! El guepardo es rápido."

REGLAS DE IMÁGENES:
1. Genera SIEMPRE "imageSearchQuery" para la pregunta principal.
2. ENTORNO AL 5% DE LAS PREGUNTAS (1 de cada 20 aprox): Genera preguntas visuales donde las opciones tengan imágenes. Para ello, rellena el campo "imageSearchQuery" dentro de los objetos "options".`;

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

// *** CRITICAL: HARDCODED PRODUCTION MODEL FOR CHEAP/HIGH QUOTA ***
// gemini-2.0-flash is the current standard for speed and low cost ($0.10/1M input tokens)
const MODEL_NAME = "gemini-2.0-flash"; 

/**
 * CLEANER FUNCTION FOR AI RESPONSE
 * Removes Markdown code blocks and extracts the JSON object/array.
 */
function cleanAIResponse(text: string): string {
  if (!text) return "{}";
  // 1. Eliminar bloques de código markdown ```json y ```
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  
  // 2. Buscar dónde empieza el primer corchete [ o llave {
  const firstBracket = clean.indexOf('[');
  const firstBrace = clean.indexOf('{');
  
  let start = -1;
  // Determinamos cuál aparece primero (o si solo aparece uno)
  if (firstBracket !== -1 && firstBrace !== -1) {
      start = Math.min(firstBracket, firstBrace);
  } else if (firstBracket !== -1) {
      start = firstBracket;
  } else if (firstBrace !== -1) {
      start = firstBrace;
  }

  // 3. Buscar dónde termina el último corchete ] o llave }
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
    // UPDATED LIMIT TO 50
    const safeCount = Math.min(Math.max(count, 1), 50);

    let prompt = "";

    // INJECT CUSTOM CONTEXT
    if (tone === 'Custom' && customToneContext) {
        prompt += `CONTEXTO OBLIGATORIO: Adapta TODAS las preguntas y enunciados al siguiente escenario narrativo o temática: '${customToneContext}'. Intenta integrar los problemas dentro de esta historia (ej: si es matemáticas y el tema es piratas, cuenta monedas de oro).\n\n`;
    }

    prompt += `Generate a Quiz about "${topic}".`;
    prompt += `\nTarget Audience (Age/Level): ${age}. Output Language: ${language}.`;
    
    // DIFFICULTY LOGIC (MAP TO 1-5 SCALES)
    if (difficulty === 'Multinivel') {
        prompt += `\nDIFFICULTY: Mixed/Multilevel. Generate a balanced mix of Level 1 (Basic) to Level 5 (Expert) questions.`;
    } else {
        const diffNum = parseInt(difficulty);
        const descMap = ["Basic", "Initial", "Intermediate", "Advanced", "Expert"];
        const diffDesc = descMap[Math.min(Math.max(diffNum - 1, 0), 4)];
        prompt += `\nDIFFICULTY: Level ${diffNum} - ${diffDesc}. Strictly follow the Level ${diffNum} guidelines provided in system instructions.`;
    }
    
    if (tone !== 'Custom') {
        prompt += `\nTONE: ${tone.toUpperCase()}. Adapt the wording of questions and feedback to be ${tone}.`;
    }
    
    if (types.length > 0) prompt += `\nInclude these question types if suitable: ${types.join(', ')}.`;
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
        const prompt = `Extract questions from: ${rawText.substring(0, 5000)}. Language: ${language}.`;
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: quizRootSchema }
        });
        
        const cleanedText = cleanAIResponse(response.text || "{}");
        return JSON.parse(cleanedText).questions || [];
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
        
        const cleanedText = cleanAIResponse(response.text || "[]");
        return JSON.parse(cleanedText);
    });
};

export const adaptQuestionsToPlatform = async (questions: Question[], platformName: string, allowedTypes: string[]): Promise<Question[]> => {
    return questions;
};
