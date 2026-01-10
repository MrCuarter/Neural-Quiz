import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "The question text. If Spanish, MUST start with '¿' and end with '?'." },
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
    2. If True/False, use 'True', 'False', '', ''.
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

    const data = JSON.parse(text);
    
    return data.map((q: any) => ({
      text: q.text,
      rawOptions: q.options,
      correctIndex: q.correctAnswerIndex,
      feedback: q.feedback,
      questionType: q.type
    }));

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate quiz content.");
  }
};

export const parseRawTextToQuiz = async (rawText: string): Promise<(Omit<Question, 'id' | 'options' | 'correctOptionId'> & { rawOptions: string[], correctIndex: number })[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following text and extract quiz questions from it. The text might be unstructured, a copy-paste from a PDF, or raw CSV/Excel data. \n\nTEXT:\n${rawText.substring(0, 30000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        systemInstruction: "You are a data extraction specialist. Identify questions, options, and correct answers from unstructured text or structured tables. If the text seems to be a list of rows/columns, infer which column is the question and which are answers. Ensure Spanish questions use '¿' and not other symbols. If correct answer is not explicitly marked, infer the most logical one.",
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Failed to analyze content.");
  }
};

export const generateQuizCategories = async (questions: string[]): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the following quiz questions, generate 6 short, catchy, and distinct category names (max 2-3 words each) suitable for a Jeopardy-style game board. Return ONLY a JSON array of 6 strings.\n\nQuestions sample: ${questions.slice(0, 10).join(' | ')}`,
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
    
    const categories = JSON.parse(text);
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
        - Maintain the original language (Spanish/English/etc).
        
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

        const adaptedData = JSON.parse(text);

        // Map back to Question objects while preserving original IDs if possible
        return adaptedData.map((aq: any, index: number) => {
             const originalQ = questions[index]; // Correlation by index usually works with robust models, or we could ask AI to return ID.
             
             // Create options
             const newOptions = aq.rawOptions.map((optText: string) => ({ 
                 id: Math.random().toString(36).substring(2, 9), 
                 text: optText 
             }));

             const correctIndex = (aq.correctAnswerIndex >= 0 && aq.correctAnswerIndex < newOptions.length) ? aq.correctAnswerIndex : 0;

             return {
                 ...originalQ, // Keep time limits, media, etc
                 text: aq.text,
                 options: newOptions,
                 correctOptionId: newOptions[correctIndex].id,
                 questionType: aq.questionType,
                 feedback: aq.feedback
             };
        });

    } catch (error) {
        console.error("Adaptation Error", error);
        throw error;
    }
}