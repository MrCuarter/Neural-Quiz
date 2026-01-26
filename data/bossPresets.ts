
// data/bossPresets.ts
// NOTE: Types defined locally to avoid build path issues on Linux

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
    // Mechanics added to ensure compatibility with game logic
    mechanics: {
        enablePowerUps: boolean;
        finishHimMove: boolean;
    };
    // Optional legacy prop
    badgeUrl?: string;
}

export const PRESET_BOSSES: Record<string, BossSettings> = {
  'kryon_v': {
    bossName: "Kryon-V",
    images: {
      idle: "/finalboss/kryon.png",
      badge: "/finalboss/kryonbadge.png",
      defeat: "/finalboss/kryonlose.png",
      win: "/finalboss/kryonwin.png",
      damage: "/finalboss/kryon.png"
    },
    badgeUrl: "/finalboss/kryonbadge.png",
    health: { bossHP: 1200, playerHP: 100 },
    difficulty: 'medium',
    messages: {
      bossWins: "Sistemas optimizados. Humanidad obsoleta.",
      playerWins: "Error crítico... Apagando...",
      perfectWin: "Cálculos imposibles. Eres perfecto."
    },
    mechanics: { enablePowerUps: true, finishHimMove: true }
  },
  'lythara': {
    bossName: "Lythara",
    images: {
      idle: "/finalboss/lythara.png",
      badge: "/finalboss/lytharabadge.png",
      defeat: "/finalboss/lytharalose.png",
      win: "/finalboss/lytharawin.png",
      damage: "/finalboss/lythara.png"
    },
    badgeUrl: "/finalboss/lytharabadge.png",
    health: { bossHP: 1000, playerHP: 80 },
    difficulty: 'hard',
    messages: {
      bossWins: "Tu magia es débil.",
      playerWins: "El hechizo... se ha roto.",
      perfectWin: "Tu mana es infinito."
    },
    mechanics: { enablePowerUps: true, finishHimMove: true }
  },
  'valdros': {
    bossName: "Valdros",
    images: {
      idle: "/finalboss/valdros.png",
      badge: "/finalboss/valdrosbadge.png",
      defeat: "/finalboss/valdroslose.png",
      win: "/finalboss/valdroswin.png",
      damage: "/finalboss/valdros.png"
    },
    badgeUrl: "/finalboss/valdrosbadge.png",
    health: { bossHP: 2000, playerHP: 150 },
    difficulty: 'legend',
    messages: {
      bossWins: "Cenizas a las cenizas.",
      playerWins: "¡Un guerrero digno al fin!",
      perfectWin: "Imposible... ni un rasguño."
    },
    mechanics: { enablePowerUps: true, finishHimMove: false }
  }
};
