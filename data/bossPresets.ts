// data/bossPresets.ts

// CONFIGURACIÓN CDN GITHUB RAW
export const ASSETS_BASE = "https://raw.githubusercontent.com/MrCuarter/neuralquiz-assets/main";

export interface DifficultyStats {
    hpMult: number;
    dmgMult: number;
    dodgeChance: number; // 0.0 - 1.0
    potionChance: number; // 0.0 - 1.0
}

export const DIFFICULTY_SETTINGS: Record<string, DifficultyStats> = {
    'easy': { hpMult: 0.8, dmgMult: 0.8, dodgeChance: 0, potionChance: 0 },
    'medium': { hpMult: 1.0, dmgMult: 1.0, dodgeChance: 0.05, potionChance: 0.1 },
    'hard': { hpMult: 1.2, dmgMult: 1.2, dodgeChance: 0.15, potionChance: 0.25 },
    'legend': { hpMult: 1.5, dmgMult: 1.5, dodgeChance: 0.25, potionChance: 0.40 }
};

export interface BossImageConfig {
    idle: string;
    damage?: string;
    defeat: string;
    win: string;
    badge?: string;
}

export interface BossSettings {
    bossName: string;
    imageId: string; 
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

export const PRESET_BOSSES: Record<string, BossSettings> = {
  'kryon_v': {
    bossName: "Kryon-V",
    imageId: "kryon",
    images: {
      idle: `${ASSETS_BASE}/finalboss/kryon.png`,
      badge: `${ASSETS_BASE}/finalboss/kryonbadge.png`,
      defeat: `${ASSETS_BASE}/finalboss/kryonlose.png`,
      win: `${ASSETS_BASE}/finalboss/kryonwin.png`,
      damage: `${ASSETS_BASE}/finalboss/kryon.png`
    },
    badgeUrl: `${ASSETS_BASE}/finalboss/kryonbadge.png`,
    health: { bossHP: 1200, playerHP: 100 },
    difficulty: 'medium',
    messages: {
      bossWins: "Sistemas optimizados. Humanidad obsoleta.",
      playerWins: "Error crítico... Apagando...",
      perfectWin: "Cálculos imposibles. Eres perfecto."
    },
    mechanics: { enablePowerUps: true, finishHimMove: true },
    attackVoice: `${ASSETS_BASE}/sounds/kryonvoice.mp3`
  },
  'lythara': {
    bossName: "Lythara",
    imageId: "lythara",
    images: {
      idle: `${ASSETS_BASE}/finalboss/lythara.png`,
      badge: `${ASSETS_BASE}/finalboss/lytharabadge.png`,
      defeat: `${ASSETS_BASE}/finalboss/lytharalose.png`,
      win: `${ASSETS_BASE}/finalboss/lytharawin.png`,
      damage: `${ASSETS_BASE}/finalboss/lythara.png`
    },
    badgeUrl: `${ASSETS_BASE}/finalboss/lytharabadge.png`,
    health: { bossHP: 1000, playerHP: 80 },
    difficulty: 'hard',
    messages: {
      bossWins: "Tu magia es débil.",
      playerWins: "El hechizo... se ha roto.",
      perfectWin: "Tu mana es infinito."
    },
    mechanics: { enablePowerUps: true, finishHimMove: true },
    attackVoice: `${ASSETS_BASE}/sounds/lytharavoice.mp3`
  },
  'valdros': {
    bossName: "Valdros",
    imageId: "valdros",
    images: {
      idle: `${ASSETS_BASE}/finalboss/valdros.png`,
      badge: `${ASSETS_BASE}/finalboss/valdrosbadge.png`,
      defeat: `${ASSETS_BASE}/finalboss/valdroslose.png`,
      win: `${ASSETS_BASE}/finalboss/valdroswin.png`,
      damage: `${ASSETS_BASE}/finalboss/valdros.png`
    },
    badgeUrl: `${ASSETS_BASE}/finalboss/valdrosbadge.png`,
    health: { bossHP: 2000, playerHP: 150 },
    difficulty: 'legend',
    messages: {
      bossWins: "Cenizas a las cenizas.",
      playerWins: "¡Un guerrero digno al fin!",
      perfectWin: "Imposible... ni un rasguño."
    },
    mechanics: { enablePowerUps: true, finishHimMove: false },
    attackVoice: `${ASSETS_BASE}/sounds/valdrosvoice.mp3`
  }
};