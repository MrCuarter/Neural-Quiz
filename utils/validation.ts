
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
  imageUrl: z.string().optional(),
  // Allow optional boolean for ingestion convenience (stripped later)
  isCorrect: z.boolean().optional()
});

// Question Schema
export const QuestionSchema = z.object({
  id: z.string().default(() => uuid()),
  text: z.string().transform(val => String(val || "Untitled Question").trim()),
  
  // FLEXIBLE OPTIONS HANDLER (Preprocessor)
  // Converts ["A", "B"] -> [{text: "A", isCorrect: true}, {text: "B"}]
  options: z.preprocess((val) => {
      if (Array.isArray(val)) {
          return val.map((item, index) => {
              if (typeof item === 'string' || typeof item === 'number') {
                  // Fallback: If simply strings provided, assume first is correct 
                  // This is overridden if 'correctAnswerIndex' is provided separately.
                  return { text: String(item), isCorrect: index === 0 };
              }
              return item;
          });
      }
      return val;
  }, z.array(OptionSchema)).default([]),
  
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
  enhanceReason: z.string().optional(),
  
  // New field
  imageSearchQuery: z.string().optional()
}).transform((data) => {
    // Post-processing to normalize aliases
    let qType = data.questionType;
    if (data.type) qType = data.type; // Alias

    // Normalize correctOptionIds
    let cIds = data.correctOptionIds || [];
    let cId = data.correctOptionId;

    // 1. Priority: Explicit Indices (from AI)
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

    // 2. Fallback: Embedded isCorrect flag (from preprocessor or source)
    if (cIds.length === 0 && data.options.length > 0) {
        const embeddedCorrect = data.options.filter(o => o.isCorrect).map(o => o.id);
        if (embeddedCorrect.length > 0) {
            cIds = embeddedCorrect;
        }
    }

    // Sync singular/plural
    if (cIds.length > 0 && !cId) cId = cIds[0];
    if (cId && cIds.length === 0) cIds = [cId];

    // Clean options: Remove 'isCorrect' property to match strict internal Interface
    const cleanOptions = data.options.map(o => {
        const { isCorrect, ...rest } = o;
        return rest;
    });

    return {
        ...data,
        options: cleanOptions,
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
        // Return clearer error for debugging
        if (error instanceof z.ZodError) {
             const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
             throw new Error(`Data validation failed: ${issues}`);
        }
        throw new Error("Data structure invalid. Please check the source format.");
    }
};
