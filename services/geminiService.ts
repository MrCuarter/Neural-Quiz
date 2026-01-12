
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, QUESTION_TYPES } from "../types";

// ... (getAPIKey and getAI unchanged) ...
const getAPIKey = (): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
      // @ts-ignore
      if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
      if (process.env.API_KEY) return process.env.API_KEY;
    }
  } catch(e) {}
  return "";
};

const getAI = () => {
  const apiKey = getAPIKey();
  if (!apiKey) throw new Error("Configuration Error: API Key missing.");
  return new GoogleGenAI({ apiKey: apiKey });
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
    feedback: { type: Type.STRING },
    type: { type: Type.STRING },
    imageUrl: { type: Type.STRING }
  },
  required: ["text", "options", "type"]
};

const quizSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
  description: "A list of quiz questions."
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
    // IMPORTANT: If text asks to select "ingredients", "elements", "types" (plural), FORCE Multi-Select.
    const multiKeywords = [
        "selecciona los", "selecciona las", "cuales son", "select all", "choose the", "marcar todas",
        "ingredientes", "elements", "features", "characteristics", "son correctas"
    ];
    const impliesPlural = multiKeywords.some(k => text.toLowerCase().includes(k));
    
    // Switch to Multi-Select if plural implied OR explicitly requested
    if ((impliesPlural || type === 'Multi-Select' || type === QUESTION_TYPES.MULTI_SELECT) && allowedTypes.includes(QUESTION_TYPES.MULTI_SELECT)) {
        type = QUESTION_TYPES.MULTI_SELECT;
        // Ensure indices exist
        if (!q.correctAnswerIndices || q.correctAnswerIndices.length === 0) {
            // Fallback: If AI provided single index, use it. Else 0.
            q.correctAnswerIndices = [typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0];
        }
    } else if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
        // Enforce Single Choice
        q.correctAnswerIndices = [correctIndex];
    }

    // 5. FAILSAFE: EMPTY OPTIONS
    // If it's a choice type but has NO options, inject placeholders so UI doesn't look broken
    if ((type === QUESTION_TYPES.MULTIPLE_CHOICE || type === QUESTION_TYPES.MULTI_SELECT) && options.length === 0) {
        options = ["Opción A", "Opción B", "Opción C", "Opción D"];
    }

    // 6. ORDER SANITIZATION
    if (type === QUESTION_TYPES.ORDER) {
        while (options.length < 2) options.push("Item " + (options.length + 1));
        if (options.length > 6) options = options.slice(0, 6);
        correctIndex = 0; 
    }

    return { ...q, text, type, options, correctAnswerIndex: correctIndex, correctAnswerIndices: q.correctAnswerIndices };
};

export const generateQuizQuestions = async (params: GenParams): Promise<(Omit<Question, 'id' | 'options' | 'correctOptionId'> & { rawOptions: string[], correctIndex: number, correctIndices?: number[] })[]> => {
  try {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish' } = params;
    const safeCount = Math.min(Math.max(count, 1), 50); 

    const priorityTypes = types.filter(t => t !== QUESTION_TYPES.MULTIPLE_CHOICE);
    const useComplex = priorityTypes.length > 0;

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: `You are a precise quiz engine. Pay close attention to Spanish grammatical gender agreement in Fill-in-the-Blank questions. ALWAYS provide 4 options for Multiple Choice/Multi-Select.`,
      },
    });

    const text = response.text;
    if (!text) return [];

    let data;
    try { data = JSON.parse(text); } catch (e) { return []; }
    
    const items = Array.isArray(data) ? data : (data.questions || data.items || []);
    if (!Array.isArray(items)) return [];

    return items.map((rawQ: any) => {
      // Apply the Heuristic Fixer
      const q = sanitizeQuestion(rawQ, types, language);

      return {
        text: q.text,
        rawOptions: q.options,
        correctIndex: q.correctAnswerIndex,
        correctIndices: q.correctAnswerIndices || [q.correctAnswerIndex],
        feedback: q.feedback || "",
        questionType: q.type,
        imageUrl: q.imageUrl || ""
      };
    });

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate quiz content.");
  }
};

// ... (Rest of file exports unchanged, but ensuring parseRawTextToQuiz uses the same sanitizer) ...
export const parseRawTextToQuiz = async (rawText: string, language: string = 'Spanish', image?: any): Promise<any[]> => {
    const ai = getAI();
    const truncatedText = rawText.substring(0, 800000); 
    const contents: any[] = [];
    if (image) {
      contents.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
      contents.push({ text: "Extract questions from this image." });
    }
    contents.push({
       text: `FORENSIC ANALYSIS. Source: ${truncatedText}. 
       Output Lang: ${language}.
       Detect Multi-Select (multiple correct answers) based on question phrasing (e.g. "Select ingredients").
       Detect 'Order' questions.
       Ensure grammatical concordance in Fill Gap.`
    });

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
            imageUrl: q.imageUrl || ""
        };
    });
};

export const generateQuizCategories = async (questions: string[]): Promise<string[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 6 categories for Jeopardy. JSON array of strings. Questions: ${questions.slice(0,10).join('|')}`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } },
    });
    try { return JSON.parse(response.text || "[]"); } catch { return []; }
};

export const adaptQuestionsToPlatform = async (questions: Question[], platformName: string, allowedTypes: string[]): Promise<Question[]> => {
    const ai = getAI();
    const questionsJson = questions.map(q => ({
        id: q.id, text: q.text, options: q.options.map(o => o.text), type: q.questionType
    }));
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Adapt these questions for ${platformName}. Allowed types: ${allowedTypes.join(', ')}. JSON:\n${JSON.stringify(questionsJson)}`,
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
};
