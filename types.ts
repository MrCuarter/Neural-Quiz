
export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string;
  timeLimit?: number; // seconds
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  feedback?: string;
  questionType?: string; // e.g., "Multiple Choice"
}

export interface Quiz {
  title: string;
  description: string;
  questions: Question[];
}

export enum ExportFormat {
  UNIVERSAL_CSV = 'UNIVERSAL_CSV', // The Master Format
  GOOGLE_FORMS = 'GOOGLE_FORMS', // Google Forms API
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
    MULTIPLE_CHOICE: 'Multiple Choice',
    TRUE_FALSE: 'True/False',
    FILL_GAP: 'Fill in the Blank',
    OPEN_ENDED: 'Open Ended',
    MULTI_SELECT: 'Multi-Select (Checkbox)',
    POLL: 'Poll',
    DRAW: 'Draw'
};

export const PLATFORM_SPECS: Record<string, { name: string, types: string[] }> = {
    'UNIVERSAL': { 
        name: 'Universal / Generic', 
        types: Object.values(QUESTION_TYPES) 
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
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE] 
    },
    [ExportFormat.WAYGROUND]: { 
        name: 'Wayground', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.FILL_GAP, QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.POLL, QUESTION_TYPES.DRAW] 
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
