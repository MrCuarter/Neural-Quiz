
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question } from "../types";

// ... (Existing getAPIKey and getAI helpers remain the same) ...
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
    text: { type: Type.STRING, description: "The question text. Clean text only, NO URLs." },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of answers. For 'Fill in the Blank', list ONLY the correct words for each gap."
    },
    correctAnswerIndex: { type: Type.INTEGER, description: "The index (0-3) of the correct answer. For 'Order' or 'Fill Gap', use 0." },
    feedback: { type: Type.STRING, description: "Brief explanation." },
    type: { type: Type.STRING, description: "The specific type of this question." },
    imageUrl: { type: Type.STRING, description: "Image URL." }
  },
  required: ["text", "options", "correctAnswerIndex", "type"]
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

export const generateQuizQuestions = async (params: GenParams): Promise<(Omit<Question, 'id' | 'options' | 'correctOptionId'> & { rawOptions: string[], correctIndex: number })[]> => {
  try {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish' } = params;
    const safeCount = Math.min(Math.max(count, 1), 100);

    let prompt = `Generate ${safeCount} quiz questions about "${topic}".`;
    prompt += `\nTarget Audience Age: ${age}.`;
    prompt += `\nREQUIRED QUESTION TYPES: You MUST generate a mix of these specific types: ${types.join(', ')}.`;
    prompt += `\nOUTPUT LANGUAGE: ${language}.`;
    
    if (context) prompt += `\n\nBase questions on this context:\n${context.substring(0, 30000)}`;
    if (urls && urls.length > 0) prompt += `\n\nRef URLs:\n${urls.join('\n')}`;

    prompt += `\n\nRULES FOR SPECIFIC TYPES:
    1. 'Order' / 'Sort': 
       - Set 'type' to 'Order'.
       - In 'options', list the items in the **CORRECT CHRONOLOGICAL OR LOGICAL ORDER** (1st to last).
    2. 'Fill in the Blank' / 'Fill Gap':
       - Set 'type' to 'Fill in the Blank'.
       - The 'text' MUST contain '__' (double underscore) where words are missing (e.g. "Water is made of __ and __").
       - The 'options' MUST contain ONLY the missing words in sequence (e.g. ["Hydrogen", "Oxygen"]).
       - **CRITICAL**: The number of items in 'options' MUST MATCH EXACTLY the number of '__' in 'text'. Do NOT include distractors.
    3. 'Multiple Choice': 4 options, one correct.
    4. 'True/False': Options 'True', 'False'.
    5. 'Open Ended': 'type'='Open Ended', put suggested answer in 'feedback'.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: `You are an expert educational content creator. Output language: ${language}. Ensure Fill-in-the-Blank questions have exactly matching gaps and options.`,
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
          // Count gaps
          const gapCount = (q.text.match(/__/g) || []).length;
          // Force options to match gap count
          if (cleanedOptions.length > gapCount) {
              cleanedOptions = cleanedOptions.slice(0, gapCount);
          } else {
              while (cleanedOptions.length < gapCount) {
                  cleanedOptions.push("???"); // Placeholder if AI failed to provide enough answers
              }
          }
      }

      return {
        text: q.text || "Question Text Missing",
        rawOptions: cleanedOptions,
        correctIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
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

// ... (Rest of the file exports remain unchanged: parseRawTextToQuiz, generateQuizCategories, adaptQuestionsToPlatform) ...
// Included purely to ensure file structure persists correctly in response
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
       Detect hidden JSON. Detect PDF copy-paste. 
       Output Lang: ${language}.
       Identify 'Order' questions if list implies sequence.
       Identify 'Fill Gap' if text has blanks.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: `Forensic Data Extraction AI. Output Language: ${language}.`,
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
                 questionType: aq.questionType
             };
        });
    } catch { return questions; }
};
