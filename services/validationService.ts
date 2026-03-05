import { Quiz, Question, ExportFormat, QUESTION_TYPES } from '../types';

export interface ValidationIssue {
    questionId: string;
    questionText: string;
    type: 'ERROR' | 'WARNING';
    message: string;
    code: 'UNSUPPORTED_TYPE' | 'TEXT_TOO_LONG' | 'TOO_MANY_OPTIONS' | 'TOO_FEW_OPTIONS' | 'IMAGE_URL_UNSUPPORTED' | 'OTHER';
}

export interface ValidationReport {
    isValid: boolean;
    issues: ValidationIssue[];
    compatibleQuestions: Question[];
    incompatibleQuestions: Question[];
}

interface PlatformConstraint {
    maxQuestionLength?: number;
    maxAnswerLength?: number;
    minOptions?: number;
    maxOptions?: number;
    supportedTypes: string[];
    supportsImageUrls: boolean;
}

const KNOWLEDGE_BASE: Record<string, PlatformConstraint> = {
    [ExportFormat.KAHOOT]: {
        maxQuestionLength: 120,
        maxAnswerLength: 75,
        minOptions: 2,
        maxOptions: 4,
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.POLL],
        supportsImageUrls: false // Excel import typically doesn't support URLs
    },
    [ExportFormat.WOOCLAP]: {
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.POLL, QUESTION_TYPES.FILL_GAP, QUESTION_TYPES.ORDER],
        supportsImageUrls: false // CSV import usually text-based
    },
    [ExportFormat.GENIALLY]: {
        maxOptions: 10,
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.ORDER, QUESTION_TYPES.FILL_GAP, QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.POLL],
        supportsImageUrls: false
    },
    [ExportFormat.SOCRATIVE]: {
        maxOptions: 5,
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.OPEN_ENDED],
        supportsImageUrls: false
    },
    [ExportFormat.QUIZALIZE]: {
        maxOptions: 4, // 1 Correct + 3 Incorrect
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.OPEN_ENDED],
        supportsImageUrls: false
    },
    [ExportFormat.IDOCEO]: {
        maxOptions: 10,
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.MULTI_SELECT],
        supportsImageUrls: false
    },
    [ExportFormat.WAYGROUND]: {
        maxOptions: 5,
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.FILL_GAP, QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.POLL, QUESTION_TYPES.DRAW],
        supportsImageUrls: true
    },
    [ExportFormat.BLOOKET]: {
        maxOptions: 4,
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTI_SELECT],
        supportsImageUrls: true
    },
    [ExportFormat.GIMKIT_CLASSIC]: {
        maxOptions: 4,
        supportedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.OPEN_ENDED],
        supportsImageUrls: false
    }
};

export const validateQuizForPlatform = (quiz: Quiz, format: ExportFormat): ValidationReport => {
    const constraints = KNOWLEDGE_BASE[format];
    
    // If no specific constraints defined, assume valid (or handle as generic)
    if (!constraints) {
        return {
            isValid: true,
            issues: [],
            compatibleQuestions: [...quiz.questions],
            incompatibleQuestions: []
        };
    }

    const issues: ValidationIssue[] = [];
    const compatibleQuestions: Question[] = [];
    const incompatibleQuestions: Question[] = [];

    quiz.questions.forEach(q => {
        let isCompatible = true;
        const qIssues: ValidationIssue[] = [];

        // 1. Check Question Type
        if (!constraints.supportedTypes.includes(q.questionType || QUESTION_TYPES.MULTIPLE_CHOICE)) {
            isCompatible = false;
            qIssues.push({
                questionId: q.id,
                questionText: q.text,
                type: 'ERROR',
                message: `Type '${q.questionType}' not supported by ${format}.`,
                code: 'UNSUPPORTED_TYPE'
            });
        }

        // 2. Check Lengths
        if (constraints.maxQuestionLength && q.text.length > constraints.maxQuestionLength) {
            // Warning/Error depending on strictness. Let's say Error for now as it breaks import.
            isCompatible = false; 
            qIssues.push({
                questionId: q.id,
                questionText: q.text,
                type: 'ERROR',
                message: `Question text too long (${q.text.length}/${constraints.maxQuestionLength}).`,
                code: 'TEXT_TOO_LONG'
            });
        }

        if (constraints.maxAnswerLength) {
            const longOptions = q.options.filter(o => o.text.length > constraints.maxAnswerLength!);
            if (longOptions.length > 0) {
                isCompatible = false;
                qIssues.push({
                    questionId: q.id,
                    questionText: q.text,
                    type: 'ERROR',
                    message: `${longOptions.length} options exceed limit of ${constraints.maxAnswerLength} chars.`,
                    code: 'TEXT_TOO_LONG'
                });
            }
        }

        // 3. Check Option Counts
        if (constraints.minOptions && q.options.length < constraints.minOptions) {
             isCompatible = false;
             qIssues.push({
                questionId: q.id,
                questionText: q.text,
                type: 'ERROR',
                message: `Too few options (${q.options.length}). Min required: ${constraints.minOptions}.`,
                code: 'TOO_FEW_OPTIONS'
            });
        }

        if (constraints.maxOptions && q.options.length > constraints.maxOptions) {
            isCompatible = false;
            qIssues.push({
               questionId: q.id,
               questionText: q.text,
               type: 'ERROR',
               message: `Too many options (${q.options.length}). Max allowed: ${constraints.maxOptions}.`,
               code: 'TOO_MANY_OPTIONS'
           });
       }

       // 4. Check Images
       if (q.imageUrl && !constraints.supportsImageUrls) {
           // This is usually a WARNING, as the question is still valid but image won't export
           qIssues.push({
               questionId: q.id,
               questionText: q.text,
               type: 'WARNING',
               message: `Images are not supported in ${format} export. Image will be ignored.`,
               code: 'IMAGE_URL_UNSUPPORTED'
           });
       }

       if (isCompatible) {
           compatibleQuestions.push(q);
       } else {
           incompatibleQuestions.push(q);
       }

       issues.push(...qIssues);
    });

    return {
        isValid: incompatibleQuestions.length === 0,
        issues,
        compatibleQuestions,
        incompatibleQuestions
    };
};
