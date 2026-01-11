
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