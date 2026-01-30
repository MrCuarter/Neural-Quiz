
import { Quiz, Question, QUESTION_TYPES, ExportFormat } from "../types";

export interface ValidationIssue {
    questionId: string;
    questionIndex: number;
    severity: 'error' | 'warning';
    message: string;
}

const RULES = {
    [ExportFormat.KAHOOT]: {
        maxQuestionLength: 120,
        maxAnswerLength: 75,
        allowedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.POLL, QUESTION_TYPES.MULTI_SELECT]
    },
    [ExportFormat.BLOOKET]: {
        maxQuestionLength: 1000, // Flexible
        maxAnswerLength: 1000, // Flexible
        allowedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE] // Blooket imports mostly strictly MC via CSV
    },
    [ExportFormat.GIMKIT_CLASSIC]: {
        allowedTypes: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.OPEN_ENDED]
    }
};

export const validateQuizForPlatform = (quiz: Quiz, platform: ExportFormat): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const rules = RULES[platform];

    quiz.questions.forEach((q, idx) => {
        // 1. Check Allowed Types
        if (rules?.allowedTypes && !rules.allowedTypes.includes(q.questionType || QUESTION_TYPES.MULTIPLE_CHOICE)) {
            issues.push({
                questionId: q.id,
                questionIndex: idx,
                severity: 'error',
                message: `Tipo '${q.questionType}' no soportado en esta plataforma.`
            });
        }

        // 2. Check Character Limits (Question)
        if (rules?.maxQuestionLength && q.text.length > rules.maxQuestionLength) {
            issues.push({
                questionId: q.id,
                questionIndex: idx,
                severity: 'error',
                message: `Pregunta demasiado larga (${q.text.length}/${rules.maxQuestionLength} caracteres).`
            });
        }

        // 3. Check Options
        if (q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT) {
            if (q.options.length < 2) {
                issues.push({
                    questionId: q.id,
                    questionIndex: idx,
                    severity: 'error',
                    message: "Se requieren al menos 2 opciones."
                });
            }

            // Check Character Limits (Answers)
            if (rules?.maxAnswerLength) {
                q.options.forEach((opt, optIdx) => {
                    if (opt.text.length > rules.maxAnswerLength) {
                        issues.push({
                            questionId: q.id,
                            questionIndex: idx,
                            severity: 'error',
                            message: `Opción ${optIdx + 1} demasiado larga (${opt.text.length}/${rules.maxAnswerLength} chars).`
                        });
                    }
                });
            }

            // Check Correct Answer
            const hasCorrect = q.correctOptionIds && q.correctOptionIds.length > 0;
            if (!hasCorrect) {
                issues.push({
                    questionId: q.id,
                    questionIndex: idx,
                    severity: 'error',
                    message: "No se ha marcado ninguna respuesta correcta."
                });
            }
        }
    });

    return issues;
};
