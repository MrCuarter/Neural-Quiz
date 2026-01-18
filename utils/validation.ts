
import { z } from "zod";
import { QUESTION_TYPES } from "../types";

// Helper for generating UUIDs if missing in raw data
const uuid = () => Math.random().toString(36).substring(2, 9);

/**
 * Zod Schemas for Runtime Validation
 * Ensures that AI or JSON data matches our internal TypeScript interfaces.
 */

// Option Schema
export const OptionSchema = z.object({
  id: z.string().default(() => uuid()),
  text: z.string().transform(val => String(val || "").trim()), // Force string and trim
  imageUrl: z.string().optional()
});

// Question Schema
export const QuestionSchema = z.object({
  id: z.string().default(() => uuid()),
  text: z.string().transform(val => String(val || "Untitled Question").trim()),
  options: z.array(OptionSchema).default([]),
  
  // Handling Correct Answers (Flexible Input -> Strict Output)
  correctOptionId: z.string().optional().default(""), 
  correctOptionIds: z.array(z.string()).optional().default([]),
  correctAnswerIndex: z.number().optional(), // Temporary field from some AI outputs
  correctAnswerIndices: z.array(z.number()).optional(), // Temporary

  timeLimit: z.number().or(z.string().transform(val => parseInt(val) || 20)).default(20),
  
  // Question Type with Fallback
  questionType: z.string().default(QUESTION_TYPES.MULTIPLE_CHOICE),
  type: z.string().optional(), // Handle alias 'type' -> 'questionType'

  imageUrl: z.string().optional(),
  feedback: z.string().optional(),
  
  // Metadata
  reconstructed: z.boolean().optional(),
  sourceEvidence: z.string().optional(),
  needsEnhanceAI: z.boolean().optional(),
  enhanceReason: z.string().optional()
}).transform((data) => {
    // Post-processing to normalize aliases
    let qType = data.questionType;
    if (data.type) qType = data.type; // Alias

    // Normalize correctOptionIds
    let cIds = data.correctOptionIds || [];
    let cId = data.correctOptionId;

    // If indices provided (from AI), map to IDs
    if (data.correctAnswerIndices && data.options.length > 0) {
        cIds = data.correctAnswerIndices
            .filter(idx => idx >= 0 && idx < data.options.length)
            .map(idx => data.options[idx].id);
    } 
    else if (typeof data.correctAnswerIndex === 'number' && data.options.length > 0) {
        if (data.correctAnswerIndex >= 0 && data.correctAnswerIndex < data.options.length) {
            cIds = [data.options[data.correctAnswerIndex].id];
        }
    }

    // Sync singular/plural
    if (cIds.length > 0 && !cId) cId = cIds[0];
    if (cId && cIds.length === 0) cIds = [cId];

    return {
        ...data,
        questionType: qType,
        correctOptionId: cId,
        correctOptionIds: cIds,
        // Remove temp fields
        correctAnswerIndex: undefined,
        correctAnswerIndices: undefined,
        type: undefined
    };
});

// Quiz Array Schema (List of Questions)
export const QuizArraySchema = z.array(QuestionSchema);

// Full Quiz Schema
export const QuizSchema = z.object({
    title: z.string().default("Untitled Quiz"),
    description: z.string().default(""),
    questions: QuizArraySchema
});

/**
 * Validation Helpers
 */
export const validateQuizQuestions = (data: any) => {
    try {
        // If data is wrapped (e.g. { questions: [...] })
        const arrayData = Array.isArray(data) ? data : (data.questions || data.items || []);
        if (!Array.isArray(arrayData)) throw new Error("Input is not an array of questions");
        
        return QuizArraySchema.parse(arrayData);
    } catch (error) {
        console.error("Zod Validation Failed:", error);
        throw new Error("Data structure invalid. Please check the source format.");
    }
};
