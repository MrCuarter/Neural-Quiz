// Fallback Image Bank
// Uses secure GitHub Raw Assets to avoid 400 errors from postimg.cc

const ASSETS_BASE = "https://raw.githubusercontent.com/MrCuarter/neuralquiz-assets/main/images";

export const FALLBACK_IMAGES: Record<string, string> = {
  // --- CIENCIAS Y MATERIAS ---
  animals: `${ASSETS_BASE}/animals.png`,
  chemistry: `${ASSETS_BASE}/chemistry.png`,
  flora: `${ASSETS_BASE}/flora.png`,
  physics: `${ASSETS_BASE}/physics.png`,
  math: `${ASSETS_BASE}/math.png`,
  math_kids: `${ASSETS_BASE}/mathkids.png`,
  universe: `${ASSETS_BASE}/universe.png`,

  // --- PERSONAS (Por Edad y Género) ---
  // Primaria
  boy_thinking: `${ASSETS_BASE}/ninopensando.jpg`,
  girl_thinking: `${ASSETS_BASE}/ninapensando.png`,
  
  // Secundaria
  teen_boy_thinking: `${ASSETS_BASE}/teenpensando.png`,
  teen_girl_thinking: `${ASSETS_BASE}/teengirlpensando.png`,
  
  // Universidad / Adultos
  uni_thinking: `${ASSETS_BASE}/unipensando.png`,
  man_thinking: `${ASSETS_BASE}/hombrepensando4.png`,
  woman_thinking: `${ASSETS_BASE}/mujerpensando.png`,

  // --- DEFAULT ---
  default: `${ASSETS_BASE}/unipensando.png` 
};