
import { BossSettings } from "../types";

export const PRESET_BOSSES: Record<string, BossSettings> = {
    CYBORG_PRIME: {
        bossName: "Cyborg Prime",
        images: {
            idle: "https://i.postimg.cc/Y9mTF1jL/Cyborg.png",
            damage: "https://i.postimg.cc/Y9mTF1jL/Cyborg.png", // Usamos la misma con efecto CSS shake
            defeat: "https://i.postimg.cc/C1f98jdB/Cyborg-Lose.png",
            win: "https://i.postimg.cc/sXZbWp1Z/Cyborg-Win.png"
        },
        // Badge específico para la UI (no está en el tipo base pero lo usaremos en la UI)
        // @ts-ignore 
        badgeUrl: "https://i.postimg.cc/RFn2tcq3/Cyborg-Badge.png",
        health: {
            bossHP: 1000,
            playerHP: 100
        },
        difficulty: 'medium',
        messages: {
            bossWins: "Tu lógica es inferior. He vencido.",
            playerWins: "Error crítico... Sistema apagándose...",
            perfectWin: "Imposible. Cero errores detectados."
        },
        mechanics: {
            enablePowerUps: true,
            finishHimMove: true
        }
    }
};
