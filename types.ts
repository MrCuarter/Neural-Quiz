
// ... existing imports

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
  correctOptionId: string; 
  correctOptionIds?: string[];
  timeLimit?: number; 
  imageUrl?: string;
  imageCredit?: ImageCredit;
  videoUrl?: string;
  audioUrl?: string;
  feedback?: string;
  questionType?: string; 
  
  imageSearchQuery?: string; 
  fallback_category?: string; 

  reconstructed?: boolean;
  sourceEvidence?: string;
  imageReconstruction?: "direct" | "partial" | "inferred" | "none";

  explanation?: string;
  confidenceScore?: number; 
  qualityFlags?: {
      ambiguous?: boolean;
      needsHumanReview?: boolean;
      duplicateOptions?: boolean;
  };
  
  needsEnhanceAI?: boolean;
  enhanceReason?: string;

  matchConfig?: {
      caseSensitive?: boolean; 
      ignoreAccents?: boolean; 
      exactMatch?: boolean; 
  };
}

export interface Quiz {
  id?: string; 
  userId?: string; 
  title: string;
  description: string;
  questions: Question[];
  tags?: string[]; 
  createdAt?: any; 
  updatedAt?: any; 
  
  isPublic?: boolean;
  allowCloning?: boolean;
  authorName?: string; 
  originalAuthorId?: string; 
  visits?: number;
  clones?: number;
}

export interface ClassGroup {
    id?: string;
    teacherId: string;
    name: string;
    students: string[]; 
    createdAt?: any;
}

export interface TeacherProfile {
    bio?: string;
    school?: string;
    role?: string;
    socials?: {
        twitter?: string;
        linkedin?: string;
        website?: string;
        instagram?: string; // NEW
        youtube?: string;   // NEW
    };
}

// ... rest of the file remains unchanged (Campaign, BossSettings, etc.)
// Keeping existing exports to ensure no breaking changes
export type CampaignTheme = 'fantasy' | 'space' | 'historical' | 'arcade' | 'kids' | 'custom';

export interface CampaignMission {
    id: string;
    quizId: string;
    title: string; 
    unlockDate?: string; 
    status: 'locked' | 'active' | 'finished';
    multiplier: number; 
}

export interface CampaignResource {
    id: string;
    name: string; 
    emoji: string; 
    type: 'accumulate' | 'drain'; 
    startValue: number;
    targetValue: number; 
}

export interface CampaignVisuals {
    primaryColor: string; 
    font: 'sans' | 'serif' | 'mono';
    backgroundUrl?: string;
}

export interface Campaign {
    id?: string;
    teacherId: string;
    title: string;
    description: string;
    theme: CampaignTheme;
    visualSettings: CampaignVisuals;
    resources: CampaignResource[];
    resourceName?: string; 
    resourceEmoji?: string;
    goalAmount?: number;
    currentAmount?: number;
    publicId: string; 
    missions: CampaignMission[];
    createdAt?: any;
}

export interface CampaignLog {
    id?: string;
    campaignId: string;
    timestamp: any;
    studentAlias: string;
    realName?: string; 
    action: 'quiz_completed' | 'loot_found' | 'manual_event';
    amount: number; 
    message: string;
}

export interface BossImageConfig {
    idle: string;   
    damage?: string; 
    defeat: string; 
    win: string;    
    badge?: string; 
}

export interface BossSettings {
    bossName: string;
    imageId?: string; 
    images: BossImageConfig;
    health: {
        bossHP: number;
        playerHP: number;
    };
    difficulty: 'easy' | 'medium' | 'hard' | 'legend';
    messages: {
        bossWins: string;
        playerWins: string;
        perfectWin: string;
    };
    mechanics: {
        enablePowerUps: boolean;
        finishHimMove: boolean; 
    };
    badgeUrl?: string; 
    attackVoice?: string; 
}

export interface EvaluationConfig {
    gameMode: 'classic' | 'time_attack' | 'final_boss' | 'raid'; 
    questionCount: number; 
    timeLimit?: number; 
    bossSettings?: BossSettings;
    allowSpeedPoints: boolean; 
    allowPowerUps: boolean; 
    showRanking: boolean; 
    showCorrectAnswer?: boolean; 
    feedbackMessages: {
        high: string; 
        medium: string; 
        low: string; 
    };
    startDate: string; 
    endDate?: string; 
    raidConfig?: {
        totalBossHP: number; 
        timeLimitMinutes: number;
    };
    campaignId?: string; 
    missionId?: string; 
}

export interface Evaluation {
    id?: string;
    quizId: string;
    quizTitle: string; 
    hostUserId: string;
    classId?: string; 
    title: string; 
    config: EvaluationConfig;
    createdAt: any;
    isActive: boolean;
    status?: 'waiting' | 'active' | 'finished' | 'paused'; 
    questions: Question[]; 
    participants?: number; 
}

export interface EvaluationAttempt {
    id?: string;
    evaluationId: string;
    nickname: string; 
    realName?: string; 
    score: number; 
    totalTime: number; 
    accuracy: number; 
    timestamp: any; 
    answersSummary?: { correct: number; incorrect: number; total: number };
    isFinished?: boolean; 
    lootFound?: number; 
    resourcesEarned?: number; 
}

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
    distributionMode: DistributionMode; 
    selectedQuestionIds: string[]; 
    categories: string[]; 
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
    score: number; 
    inventory: PowerUp[];
    usedInventory: PowerUp[]; 
    shielded: boolean;
    multiplier: number; 
    avatarColor: string;
}

export interface HexCell {
    id: number;
    ownerId: string | null; 
    isLocked: boolean; 
    isShielded: boolean; 
    row: number;
    col: number;
}

export interface DiscoveryAttempt {
    method: 'api_proxy' | 'jina_reader' | 'html_embedded' | 'direct_fetch';
    finalUrl: string;
    status: number; 
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
    blockedByBot: boolean;
    blockedEvidence?: string; 
    parseOk: boolean;
    attempts: DiscoveryAttempt[];
    topLevelKeys?: string[];
    candidatePathsTop5?: { path: string, score: number, sampleKeys: string[] }[];
    selectedPath?: string;
    questionsFound: number;
    hasChoices: boolean;
    hasCorrectFlags: boolean;
    hasImages: boolean;
    missing?: {
        options: boolean;
        correct: boolean;
        image: boolean;
        reasons: string[];
    };
}

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
  UNIVERSAL_CSV = 'UNIVERSAL_CSV', 
  GOOGLE_FORMS = 'GOOGLE_FORMS', 
  GOOGLE_SLIDES_API = 'GOOGLE_SLIDES_API', 
  PDF_PRINT = 'PDF_PRINT', 
  BLOOKET = 'BLOOKET', 
  WAYGROUND = 'WAYGROUND', 
  KAHOOT = 'KAHOOT', 
  SOCRATIVE = 'SOCRATIVE', 
  QUIZALIZE = 'QUIZALIZE', 
  IDOCEO = 'IDOCEO', 
  PLICKERS = 'PLICKERS', 
  BAAMBOOZLE = 'BAAMBOOZLE', 
  GIMKIT_CLASSIC = 'GIMKIT_CLASSIC', 
  GIMKIT_TEXT = 'GIMKIT_TEXT', 
  GENIALLY = 'GENIALLY', 
  WORDWALL = 'WORDWALL', 
  FLIPPITY = 'FLIPPITY', 
  SANDBOX = 'SANDBOX', 
  WOOCLAP = 'WOOCLAP', 
  QUIZLET_QA = 'QUIZLET_QA', 
  QUIZLET_AQ = 'QUIZLET_AQ', 
  DECKTOYS_QA = 'DECKTOYS_QA', 
  DECKTOYS_AQ = 'DECKTOYS_AQ', 
  CSV_GENERIC = 'CSV_GENERIC',
  AIKEN = 'AIKEN', 
  JSON = 'JSON',
  GIFT = 'GIFT', 
}

export interface GeneratedFile {
  filename: string;
  content: string;
  mimeType: string;
  isBase64?: boolean;
}

export const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'Multiple Choice', 
    TRUE_FALSE: 'True/False',
    FILL_GAP: 'Fill in the Blank', 
    OPEN_ENDED: 'Pregunta Abierta', 
    MULTI_SELECT: 'Multi-Select (Checkbox)', 
    POLL: 'Encuesta', 
    ORDER: 'Order / Sort'
};

export const PLATFORM_SPECS: Record<string, { name: string, types: string[] }> = {
    'UNIVERSAL': { 
        name: 'Neural Quiz (Nativo)', 
        types: Object.values(QUESTION_TYPES) 
    },
    [ExportFormat.PDF_PRINT]: {
        name: 'Printable PDF',
        types: Object.values(QUESTION_TYPES) 
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
            QUESTION_TYPES.MULTIPLE_CHOICE, 
            QUESTION_TYPES.MULTI_SELECT,    
            QUESTION_TYPES.TRUE_FALSE,      
            QUESTION_TYPES.ORDER,           
            QUESTION_TYPES.FILL_GAP,        
            QUESTION_TYPES.OPEN_ENDED,      
            QUESTION_TYPES.POLL             
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
