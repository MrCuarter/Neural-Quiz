
// data/bossPresets.ts

const ASSETS_BASE = "https://assets.mistercuarter.es";

export interface BossImageConfig {
    idle: string;
    damage?: string;
    defeat: string;
    win: string;
    badge?: string;
}

export interface BossSettings {
    bossName: string;
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
    badgeUrl?: string; // Legacy support
    attackVoice?: string; // New Voice path
}

export const PRESET_BOSSES: Record<string, BossSettings> = {
  'kryon_v': {
    bossName: "Kryon-V",
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
