
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question } from "../types";

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
      description: "List of options. For Fill-Blank, ONLY correct words."
    },
    // Supporting both single and multiple correct indices
    correctAnswerIndex: { type: Type.INTEGER, description: "Index of primary correct answer." },
    correctAnswerIndices: { 
        type: Type.ARRAY, 
        items: { type: Type.INTEGER },
        description: "Array of indices for ALL correct answers (for Multi-Select)." 
    },
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

export const generateQuizQuestions = async (params: GenParams): Promise<(Omit<Question, 'id' | 'options' | 'correctOptionId'> & { rawOptions: string[], correctIndex: number, correctIndices?: number[] })[]> => {
  try {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish' } = params;
    const safeCount = Math.min(Math.max(count, 1), 100);

    let prompt = `Generate ${safeCount} quiz questions about "${topic}".`;
    prompt += `\nTarget Audience: ${age}.`;
    prompt += `\nREQUIRED TYPES: ${types.join(', ')}.`;
    prompt += `\nLanguage: ${language}.`;
    
    if (context) prompt += `\n\nContext:\n${context.substring(0, 30000)}`;
    if (urls && urls.length > 0) prompt += `\n\nRef URLs:\n${urls.join('\n')}`;

    prompt += `\n\nRULES:
    1. 'Multi-Select': Set 'type'='Multi-Select'. Provide 4 options. **Populate 'correctAnswerIndices' with ALL correct option indices.**
    2. 'Fill in the Blank': 'text' has '__'. 'options' has ONLY correct words matching gaps.
    3. 'Order': 'options' in CORRECT sequence.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: `Educational Content Generator. Output Lang: ${language}. Handle Multi-Select correctly.`,
      },
    });

    const text = response.text;
    if (!text) return [];

    let data;
    try { data = JSON.parse(text); } catch (e) { return []; }
    
    const items = Array.isArray(data) ? data : (data.questions || data.items || []);
    if (!Array.isArray(items)) return [];

    return items.map((q: any) => {
      let cleanedOptions = Array.isArray(q.options) ? q.options : [];
      
      // SANITIZATION FOR FILL GAP
      if (q.type === 'Fill in the Blank' || q.type === 'Fill Gap') {
          const gapCount = (q.text.match(/__/g) || []).length;
          if (cleanedOptions.length > gapCount) cleanedOptions = cleanedOptions.slice(0, gapCount);
          while (cleanedOptions.length < gapCount) cleanedOptions.push("???");
      }

      return {
        text: q.text || "Question Text Missing",
        rawOptions: cleanedOptions,
        correctIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
        // Map the new array field
        correctIndices: Array.isArray(q.correctAnswerIndices) ? q.correctAnswerIndices : [q.correctAnswerIndex || 0],
        feedback: q.feedback || "",
        questionType: q.type || "Multiple Choice",
        imageUrl: q.imageUrl || ""
      };
    });

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate quiz content.");
  }
};

// ... (Rest of file exports: parseRawTextToQuiz, generateQuizCategories, adaptQuestionsToPlatform) ...
// Ensuring file integrity
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
       Detect Multi-Select (multiple correct).`
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
    return items.map((q: any) => ({
      text: q.text || "Question Text Missing",
      rawOptions: Array.isArray(q.options) ? q.options : [],
      correctIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      correctIndices: Array.isArray(q.correctAnswerIndices) ? q.correctAnswerIndices : [q.correctAnswerIndex || 0],
      feedback: q.feedback || "",
      questionType: q.type || "Multiple Choice",
      imageUrl: q.imageUrl || ""
    }));
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
             return {
                 ...originalQ,
                 text: aq.text || "Adapted",
                 options: newOptions,
                 correctOptionId: newOptions[aq.correctAnswerIndex || 0]?.id || "",
                 correctOptionIds: (aq.correctAnswerIndices || [aq.correctAnswerIndex || 0]).map((i: number) => newOptions[i]?.id),
                 questionType: aq.questionType
             };
        });
    } catch { return questions; }
};
