
// DEFINICIÓN LOCAL DE TIPOS PARA EVITAR ERRORES DE RUTA (SOLUCIÓN BYPASS)
export interface BossImageConfig {
    idle: string;   
    damage?: string; 
    defeat: string; 
    win: string;    
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
}

export const PRESET_BOSSES: Record<string, BossSettings> = {
    CYBORG_PRIME: {
        bossName: "Cyborg Prime",
        images: {
            idle: "https://i.postimg.cc/Y9mTF1jL/Cyborg.png",
            damage: "https://i.postimg.cc/Y9mTF1jL/Cyborg.png",
            defeat: "https://i.postimg.cc/C1f98jdB/Cyborg-Lose.png",
            win: "https://i.postimg.cc/sXZbWp1Z/Cyborg-Win.png"
        },
        // @ts-ignore - Propiedad extra para UI
        badgeUrl: "https://i.postimg.cc/RFn2tcq3/Cyborg-Badge.png",
        health: { bossHP: 1000, playerHP: 100 },
        difficulty: 'medium',
        messages: {
            bossWins: "Tu lógica es inferior. He vencido.",
            playerWins: "Error crítico... Sistema apagándose...",
            perfectWin: "Imposible. Cero errores detectados."
        },
        mechanics: { enablePowerUps: true, finishHimMove: true }
    },
    VAMPIRE_LORD: {
        bossName: "Conde Byte",
        images: {
            idle: "https://i.postimg.cc/k4Xzkz1y/Vampire-Idle.png", 
            damage: "https://i.postimg.cc/k4Xzkz1y/Vampire-Idle.png", 
            defeat: "https://i.postimg.cc/HLq9Xy3z/Vampire-Lose.png",
            win: "https://i.postimg.cc/MKd4h3z1/Vampire-Win.png"
        },
        // @ts-ignore - Propiedad extra para UI
        badgeUrl: "https://i.postimg.cc/k4Xzkz1y/Vampire-Idle.png",
        health: { bossHP: 1500, playerHP: 80 }, 
        difficulty: 'hard',
        messages: {
            bossWins: "Tu conocimiento se ha desangrado...",
            playerWins: "¡Maldición! La luz del saber quema...",
            perfectWin: "Una mente inmaculada... delicioso."
        },
        mechanics: { enablePowerUps: true, finishHimMove: true }
    },
    GLITCH_MONSTER: {
        bossName: "M1ssingN0",
        images: {
            idle: "https://i.postimg.cc/FRpP0gqS/Glitch-Idle.png",
            damage: "https://i.postimg.cc/FRpP0gqS/Glitch-Idle.png",
            defeat: "https://i.postimg.cc/PrN0x4qS/Glitch-Lose.png",
            win: "https://i.postimg.cc/FRpP0gqS/Glitch-Idle.png"
        },
        // @ts-ignore - Propiedad extra para UI
        badgeUrl: "https://i.postimg.cc/FRpP0gqS/Glitch-Idle.png",
        health: { bossHP: 800, playerHP: 120 }, 
        difficulty: 'medium',
        messages: {
            bossWins: "404: SKILL NOT FOUND.",
            playerWins: "Seg.Fault... Core Dumped...",
            perfectWin: "System.Optimized(100%)."
        },
        mechanics: { enablePowerUps: true, finishHimMove: false }
    }
};
