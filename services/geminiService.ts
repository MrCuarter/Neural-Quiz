import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question } from "../types";

// Helper to safely retrieve API Key from various environment configurations
const getAPIKey = (): string => {
  // 1. Check process.env (Standard)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  
  // 2. Check Vite / Modern Browsers (import.meta.env)
  // We check both VITE_API_KEY (standard convention) and API_KEY
  try {
    // @ts-ignore
    if (import.meta && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
      // @ts-ignore
      if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
    }
  } catch (e) {
    // Ignore errors if import.meta is not defined
  }

  return "";
};

// Helper to safely get the AI instance only when needed
const getAI = () => {
  const apiKey = getAPIKey();
  if (!apiKey) {
    console.error("⚠️ API KEY MISSING: Please set 'API_KEY' or 'VITE_API_KEY' in your environment variables.");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "The question text. MUST be in the target language." },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of exactly 4 possible answers. For True/False, provide 'True' and 'False' and 2 empty strings."
    },
    correctAnswerIndex: { type: Type.INTEGER, description: "The index (0-3) of the correct answer" },
    feedback: { type: Type.STRING, description: "Brief explanation of why the answer is correct." },
    type: { type: Type.STRING, description: "The specific type of this question (e.g. 'Multiple Choice', 'Fill in the Blank')." }
  },
  required: ["text", "options", "correctAnswerIndex"]
};

const quizSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
  description: "A list of quiz questions generated based on the inputs."
};

interface GenParams {
  topic: string;
  count: number;
  types: string[]; 
  age: string;
  context?: string;
  urls?: string[]; // Added URLs
  language?: string; 
}

export const generateQuizQuestions = async (params: GenParams): Promise<(Omit<Question, 'id' | 'options' | 'correctOptionId'> & { rawOptions: string[], correctIndex: number })[]> => {
  try {
    const ai = getAI();
    const { topic, count, types, age, context, urls, language = 'Spanish' } = params;

    let prompt = `Generate ${count} quiz questions about "${topic}".`;
    prompt += `\nTarget Audience Age: ${age}.`;
    prompt += `\nQuestion Types: Please generate a mix of the following types: ${types.join(', ')}.`;
    prompt += `\nOUTPUT LANGUAGE: ${language}. Ensure all questions, options, and feedback are in ${language}.`;
    
    // Add Context
    if (context) {
      prompt += `\n\nBase the questions STRICTLY on the following context/text:\n${context.substring(0, 30000)}`; 
    } else {
      prompt += `\n\nUse your general knowledge to generate diverse and accurate questions.`;
    }

    // Add URLs
    if (urls && urls.length > 0) {
      prompt += `\n\nREFERENCE WEB PAGES/URLS (Use these as source material if accessible, or as context for the topic):\n${urls.join('\n')}`;
    }

    prompt += `\n\nIMPORTANT RULES:
    1. Ensure each question has exactly 4 options. 
    2. If True/False, use 'Verdadero', 'Falso', '', '' (translated to target lang).
    3. If 'Fill in the Blank' or 'Fill in the gaps':
       - The 'text' must contain the gap represented by 5 underscores: '_____'.
       - The 'options' should contain the correct word/phrase and 3 distractors.
    4. If 'Multi-Select' or 'Checkbox':
       - Since the output format requires one correct index, pick the *most* correct or primary answer, but ensure options allows for multiple plausible ones if the user manually changes the mode later.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: `You are an expert educational content creator. Create engaging, accurate questions suitable for the specified age group. IMPORTANT: When writing in Spanish, YOU MUST use standard opening and closing question marks (¿?) correctly. Ensure strict UTF-8 character encoding. Output must be in ${language}.`,
        tools: urls && urls.length > 0 ? [{googleSearch: {}}] : undefined // Enable search if URLs provided (optional hint)
      },
    });

    const text = response.text;
    if (!text) return [];

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse failed", text);
        return [];
    }
    
    const items = Array.isArray(data) ? data : (data.questions || data.items || []);
    if (!Array.isArray(items)) return [];

    return items.map((q: any) => ({
      text: q.text || "Question Text Missing",
      rawOptions: Array.isArray(q.options) ? q.options : [],
      correctIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      feedback: q.feedback || "",
      questionType: q.type || "Multiple Choice"
    }));

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate quiz content. Check API Key configuration.");
  }
};

export const parseRawTextToQuiz = async (rawText: string, language: string = 'Spanish'): Promise<(Omit<Question, 'id' | 'options' | 'correctOptionId'> & { rawOptions: string[], correctIndex: number })[]> => {
  try {
    const ai = getAI();
    // Allow massive limit for raw HTML dumps or big JSON
    const truncatedText = rawText.substring(0, 500000); 

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following content and extract quiz questions.
      
      DATA SOURCE TYPES:
      
      1. **KAHOOT API JSON**: Look for "questions" array. 
         - question: "question" field.
         - choices: "choices" array (answer, correct: boolean).
         
      2. **GIMKIT API JSON**: Look for "kit" -> "questions" array.
         - question: "text" field.
         - answers: "answers" array (text, correct: boolean).
         
      3. **QUIZLET DATA JSON**: Look for "term" and "definition" pairs inside the props.
         - Convert Term -> Question, Definition -> Answer (Multiple Choice).
         - Generate 3 plausible distractors for each question using definitions from other terms in the set.
         
      4. **RAW HTML/MARKDOWN**: Parse visually.

      INSTRUCTIONS:
      - Extract all valid questions.
      - TRANSLATE to ${language} if the source is in another language.
      - Output exactly 4 options per question.
      - If only "Term" and "Definition" exist (Quizlet), create Multiple Choice questions by using other definitions as distractors.

      CONTENT TO ANALYZE:\n${truncatedText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: `You are a specialized Data Extraction AI. Your capability includes parsing complex JSON structures from Kahoot, Gimkit, and Quizlet Next.js hydration data. Prioritize exact data extraction over generation. Output language: ${language}.`,
      },
    });

    const text = response.text;
    if (!text) return [];

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse failed", text);
        return [];
    }

    const items = Array.isArray(data) ? data : (data.questions || data.items || []);
    if (!Array.isArray(items)) return [];

    return items.map((q: any) => ({
      text: q.text || "Question Text Missing",
      rawOptions: Array.isArray(q.options) ? q.options : [],
      correctIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
      feedback: q.feedback || "",
      questionType: q.type || "Multiple Choice"
    }));
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Failed to analyze content.");
  }
};

export const generateQuizCategories = async (questions: string[]): Promise<string[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following quiz questions, generate 6 short, catchy, and distinct category names (max 2-3 words each) suitable for a Jeopardy-style game board. Return ONLY a JSON array of 6 strings. Language: Spanish.\n\nQuestions sample: ${questions.slice(0, 10).join(' | ')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        }
      },
    });

    const text = response.text;
    if (!text) return ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"];
    
    let categories = [];
    try {
        categories = JSON.parse(text);
    } catch (e) {
        return ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"];
    }

    if (!Array.isArray(categories)) return ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"];

    while (categories.length < 6) categories.push(`Category ${categories.length + 1}`);
    return categories.slice(0, 6);
  } catch (error) {
    console.error("Gemini Category Gen Error", error);
    return ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"];
  }
};

// Adaptation Function
export const adaptQuestionsToPlatform = async (questions: Question[], platformName: string, allowedTypes: string[]): Promise<Question[]> => {
    try {
        const ai = getAI();
        const questionsJson = questions.map(q => ({
            id: q.id,
            text: q.text,
            options: q.options.map(o => o.text),
            correctOptionText: q.options.find(o => o.id === q.correctOptionId)?.text,
            currentType: q.questionType
        }));

        const prompt = `
        I have a list of quiz questions that need to be adapted for the platform "${platformName}".
        The target platform ONLY supports the following question types: ${allowedTypes.join(', ')}.
        
        Please rewrite or reformat the following questions to strictly fit into one of the allowed types.
        - If a question is already compatible, keep it essentially the same but ensure the type label is correct.
        - If a question is "Open Ended" or "Draw" and the platform only supports "Multiple Choice", convert it into a Multiple Choice question with plausible distractors.
        - Maintain the original language.
        
        QUESTIONS TO ADAPT:
        ${JSON.stringify(questionsJson, null, 2)}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema, // Reusing existing schema
                systemInstruction: "You are a quiz adaptation specialist. You preserve the original ID sequence if possible, but you must output valid JSON matching the schema.",
            }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from AI");

        let adaptedData: any = [];
        try {
            adaptedData = JSON.parse(text);
        } catch (e) {
             throw new Error("Invalid JSON from AI during adaptation");
        }

        const items = Array.isArray(adaptedData) ? adaptedData : (adaptedData.questions || []);

        // Map back to Question objects while preserving original IDs if possible
        return items.map((aq: any, index: number) => {
             const originalQ = questions[index] || { id: Math.random().toString(36).substring(2,9) }; 
             
             const rawOptions = Array.isArray(aq.options) ? aq.options : [];
             // Create options
             const newOptions = rawOptions.map((optText: string) => ({ 
                 id: Math.random().toString(36).substring(2, 9), 
                 text: optText 
             }));

             const correctIndex = (aq.correctAnswerIndex >= 0 && aq.correctAnswerIndex < newOptions.length) ? aq.correctAnswerIndex : 0;

             return {
                 ...originalQ, // Keep time limits, media, etc
                 text: aq.text || "Adapted Question",
                 options: newOptions,
                 correctOptionId: newOptions[correctIndex]?.id || "",
                 questionType: aq.questionType,
                 feedback: aq.feedback
             };
        });

    } catch (error) {
        console.error("Adaptation Error", error);
        throw error;
    }
}