
export interface Option {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface ImageCredit {
  name: string;
  link: string;
  source: 'Unsplash' | 'Pexels' | 'Pixabay';
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string; // Deprecated but kept for backward compat (primary answer)
  correctOptionIds?: string[]; // THE UPGRADE: Supports multiple correct answers
  timeLimit?: number; // seconds
  imageUrl?: string;
  imageCredit?: ImageCredit; // NEW: Legal attribution
  videoUrl?: string;
  audioUrl?: string;
  feedback?: string;
  questionType?: string; // e.g. "Multiple Choice"
  
  // ANTI-SPOILER IMAGE SEARCH
  imageSearchQuery?: string; // RENAMED: AI Generated English Keywords
  fallback_category?: string; // AI suggested category for local images

  // FORENSIC ANALYSIS FIELDS
  reconstructed?: boolean;
  sourceEvidence?: string;
  imageReconstruction?: "direct" | "partial" | "inferred" | "none";

  // ENHANCE AI FIELDS
  explanation?: string;
  confidenceScore?: number; // 0-1
  qualityFlags?: {
      ambiguous?: boolean;
      needsHumanReview?: boolean;
      duplicateOptions?: boolean;
  };
  
  // DATA INTEGRITY FLAGS (New)
  needsEnhanceAI?: boolean;
  enhanceReason?: string;

  // SHORT ANSWER CONFIG (New)
  matchConfig?: {
      caseSensitive?: boolean; // Default false
      ignoreAccents?: boolean; // Default true
      exactMatch?: boolean; // Default false (allows trimming)
  };
}

export interface Quiz {
  id?: string; // Firestore Document ID
  userId?: string; // Owner UID
  title: string;
  description: string;
  questions: Question[];
  tags?: string[]; // Organization tags
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
  
  // COLLABORATIVE FIELDS
  isPublic?: boolean;
  allowCloning?: boolean;
  authorName?: string; // For display in public library
  originalAuthorId?: string; // To track lineage
  visits?: number;
  clones?: number;
}

// --- EVALUATION (ARCADE MODE) ---
export interface EvaluationConfig {
    gameMode: 'classic' | 'time_attack'; // NEW: Game Mode
    questionCount: number; // NEW: Limit number of questions
    timeLimit?: number; // NEW: Global time limit for Time Attack (seconds)
    allowSpeedPoints: boolean; // More points for faster answers
    allowPowerUps: boolean; // Enable items/jokers
    showRanking: boolean; // Show leaderboard to student
    feedbackMessages: {
        high: string; // > 90%
        medium: string; // 60-90%
        low: string; // < 60%
    };
    startDate: string; // ISO String
    endDate?: string; // ISO String (Optional)
}

export interface Evaluation {
    id?: string;
    quizId: string;
    quizTitle: string; // Denormalized for display
    hostUserId: string;
    title: string; // Evaluation specific title (e.g. "Examen Matemáticas 3ºB")
    config: EvaluationConfig;
    createdAt: any;
    isActive: boolean;
    questions: Question[]; // Snapshot of questions at launch time
    participants?: number; // Counter
}

export interface EvaluationAttempt {
    id?: string;
    evaluationId: string;
    nickname: string;
    score: number;
    totalTime: number; // Seconds
    accuracy: number; // Percentage 0-100
    timestamp: any; // ServerTimestamp
    answersSummary?: { correct: number; incorrect: number; total: number };
}

// --- GAME TYPES ---
export type GameMode = 'JEOPARDY' | 'HEX_CONQUEST';

export type DistributionMode = 'STANDARD' | 'RIGGED' | 'SPLIT';

export interface JeopardyConfig {
    timer: number;
    allowNegativePoints: boolean;
    rows: number;
    cols: number;
    usePowerUps: boolean;
    randomEvents: boolean;
    catchUpLogic: boolean;
    distributionMode: DistributionMode; // New: Logic for question mapping
    selectedQuestionIds: string[]; // New: Manual selection
    categories: string[]; // New: Custom category headers
}

export type PowerUpType = 'DOUBLE' | 'STEAL' | 'BOMB' | 'SWAP' | 'SHIELD';

export interface PowerUp {
    id: string;
    type: PowerUpType;
    name: string;
    icon: string;
    desc: string;
}

export interface GameTeam {
    id: string;
    name: string;
    score: number; // Points in Jeopardy, Gold in Hex
    inventory: PowerUp[];
    usedInventory: PowerUp[]; // History of consumed items
    shielded: boolean;
    multiplier: number; // For x2 potion
    avatarColor: string;
}

// HEX CONQUEST SPECIFIC
export interface HexCell {
    id: number;
    ownerId: string | null; // Team ID or null (Neutral)
    isLocked: boolean; // Rock
    isShielded: boolean; // Shield
    row: number;
    col: number;
}

// ... rest of the file remains unchanged ...
export interface DiscoveryAttempt {
    method: 'api_proxy' | 'jina_reader' | 'html_embedded' | 'direct_fetch';
    finalUrl: string;
    status: number; // 0 if network error
    contentType?: string;
    length: number;
    parseOk: boolean;
    error?: string;
}

export interface UniversalDiscoveryReport {
    platform: 'kahoot' | 'blooket' | 'wayground' | 'unknown';
    originalUrl?: string;
    adapterUsed?: string;
    methodUsed?: string;
    
    // Status
    blockedByBot: boolean;
    blockedEvidence?: string; // e.g. "Cloudflare Challenge found"
    parseOk: boolean;
    
    // Forensic Trace
    attempts: DiscoveryAttempt[];
    topLevelKeys?: string[];
    candidatePathsTop5?: { path: string, score: number, sampleKeys: string[] }[];
    selectedPath?: string;

    // Metrics
    questionsFound: number;
    hasChoices: boolean;
    hasCorrectFlags: boolean;
    hasImages: boolean;
    
    // Quality / Missing Data
    missing?: {
        options: boolean;
        correct: boolean;
        image: boolean;
        reasons: string[];
    };
}

// Alias for backward compatibility if needed
export type KahootDiscoveryReport = UniversalDiscoveryReport;

export interface KahootCardResponse {
    kahoot?: {
        title?: string;
        questions?: any[];
    };
    card?: {
        title?: string;
    };
    questions?: any[];
    title?: string;
}

export enum ExportFormat {
  UNIVERSAL_CSV = 'UNIVERSAL_CSV', // The Master Format
  GOOGLE_FORMS = 'GOOGLE_FORMS', // Google Forms API
  GOOGLE_SLIDES_API = 'GOOGLE_SLIDES_API', // Google Slides API (Direct)
  PDF_PRINT = 'PDF_PRINT', // New: Printable PDF
  BLOOKET = 'BLOOKET', // Blooket CSV
  WAYGROUND = 'WAYGROUND', // Wayground XLSX
  KAHOOT = 'KAHOOT', // Kahoot XLSX
  SOCRATIVE = 'SOCRATIVE', // Socrative XLSX
  QUIZALIZE = 'QUIZALIZE', // Quizalize CSV
  IDOCEO = 'IDOCEO', // iDoceo XLSX
  PLICKERS = 'PLICKERS', // Plickers Text
  BAAMBOOZLE = 'BAAMBOOZLE', // Via Kahoot
  GIMKIT_CLASSIC = 'GIMKIT_CLASSIC', // Gimkit Classic CSV
  GIMKIT_TEXT = 'GIMKIT_TEXT', // Gimkit Text Input CSV
  GENIALLY = 'GENIALLY', // Genially XLSX
  WORDWALL = 'WORDWALL', // Wordwall Text
  FLIPPITY = 'FLIPPITY', // Flippity (6 or 30 Qs)
  SANDBOX = 'SANDBOX', // Sandbox Education (Text)
  WOOCLAP = 'WOOCLAP', // Wooclap JSON
  QUIZLET_QA = 'QUIZLET_QA', // Question [TAB] Answer
  QUIZLET_AQ = 'QUIZLET_AQ', // Answer [TAB] Question
  DECKTOYS_QA = 'DECKTOYS_QA', // DeckToys Question -> Answer
  DECKTOYS_AQ = 'DECKTOYS_AQ', // DeckToys Answer -> Question
  CSV_GENERIC = 'CSV_GENERIC',
  AIKEN = 'AIKEN', // Moodle/Blackboard standard text
  JSON = 'JSON',
  GIFT = 'GIFT', // Moodle advanced
}

export interface GeneratedFile {
  filename: string;
  content: string;
  mimeType: string;
  isBase64?: boolean;
}

// SHARED CONSTANTS

export const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'Multiple Choice', // Single correct
    TRUE_FALSE: 'True/False',
    FILL_GAP: 'Fill in the Blank', // NOW USED AS SHORT ANSWER
    OPEN_ENDED: 'Pregunta Abierta', // RENAMED
    MULTI_SELECT: 'Multi-Select (Checkbox)', // Multiple correct
    POLL: 'Encuesta', // RENAMED
    ORDER: 'Order / Sort'
};

export const PLATFORM_SPECS: Record<string, { name: string, types: string[] }> = {
    'UNIVERSAL': { 
        name: 'Universal / Generic', 
        types: Object.values(QUESTION_TYPES) 
    },
    [ExportFormat.PDF_PRINT]: {
        name: 'Printable PDF',
        types: Object.values(QUESTION_TYPES) // Supports almost everything visually
    },
    [ExportFormat.GOOGLE_SLIDES_API]: {
        name: 'Google Slides (Cloud API)',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.MULTI_SELECT] 
    },
    [ExportFormat.GOOGLE_FORMS]: {
        name: 'Google Forms',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.MULTI_SELECT]
    },
    [ExportFormat.KAHOOT]: { 
        name: 'Kahoot!', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.POLL] 
    },
    [ExportFormat.SOCRATIVE]: { 
        name: 'Socrative', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.OPEN_ENDED] 
    },
    [ExportFormat.BLOOKET]: { 
        name: 'Blooket', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE] 
    },
    [ExportFormat.GIMKIT_CLASSIC]: {
        name: 'Gimkit',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.OPEN_ENDED]
    },
    [ExportFormat.QUIZALIZE]: {
        name: 'Quizalize',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.OPEN_ENDED]
    },
    [ExportFormat.WOOCLAP]: {
        name: 'Wooclap',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.POLL, QUESTION_TYPES.MULTI_SELECT]
    },
    [ExportFormat.GENIALLY]: { 
        name: 'Genially', 
        types: [
            QUESTION_TYPES.MULTIPLE_CHOICE, // Elección única
            QUESTION_TYPES.MULTI_SELECT,    // Elección múltiple
            QUESTION_TYPES.TRUE_FALSE,      // Verdadero o falso
            QUESTION_TYPES.ORDER,           // Ordenar
            QUESTION_TYPES.FILL_GAP,        // Rellenar huecos / Respuesta corta
            QUESTION_TYPES.OPEN_ENDED,      // Respuesta abierta
            QUESTION_TYPES.POLL             // Encuesta
        ] 
    },
    [ExportFormat.WAYGROUND]: { 
        name: 'Wayground', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.FILL_GAP, QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.POLL] 
    },
    [ExportFormat.PLICKERS]: {
        name: 'Plickers',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE]
    },
    [ExportFormat.WORDWALL]: {
        name: 'Wordwall',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE]
    },
    [ExportFormat.IDOCEO]: {
        name: 'iDoceo',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE]
    },
    [ExportFormat.FLIPPITY]: {
        name: 'Flippity',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.OPEN_ENDED]
    },
    [ExportFormat.QUIZLET_QA]: {
        name: 'Quizlet / Deck.Toys',
        types: [QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.MULTIPLE_CHOICE]
    },
    [ExportFormat.BAAMBOOZLE]: {
        name: 'Baamboozle',
        types: [QUESTION_TYPES.OPEN_ENDED]
    },
    [ExportFormat.SANDBOX]: {
        name: 'Sandbox Education',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE]
    },
    [ExportFormat.AIKEN]: {
        name: 'Moodle / LMS (Aiken)',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE]
    }
};
