
import React, { useState, useEffect, useRef } from 'react';
import { getEvaluation, saveEvaluationAttempt } from '../../services/firebaseService';
import { Evaluation, Question, BossSettings } from '../../types';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { Loader2, AlertTriangle, Rocket, Backpack, Skull } from 'lucide-react';
import { Leaderboard } from './Leaderboard';
import { PRESET_BOSSES } from '../../data/bossPresets';

// --- CONSTANTS & TYPES ---

const ASSETS_BASE = "https://assets.mistercuarter.es";

type GameState = 'LOBBY' | 'ROULETTE' | 'PLAYING' | 'FINISH_IT' | 'STATS';
type CombatState = 'IDLE' | 'PLAYER_ATTACK' | 'BOSS_ATTACK' | 'VICTORY' | 'DEFEAT' | 'REVIVE';

type PassiveType = 'agil' | 'answer' | 'certero' | 'escudo' | 'fuerza' | 'suerte' | 'tiempo';
type PotionType = 'salud' | 'veneno' | 'vulnerable' | 'esquiva' | 'fuerzatemp';

interface ItemData {
    id: string;
    name: string;
    description: string;
    image: string;
}

interface StatusEffect {
    type: PotionType;
    turns: number;
}

interface BattleStats {
    totalDamage: number;
    maxCrit: number;
    dodges: number;
    potionsUsed: number;
    potionsStolen: number;
    correctAnswers: number;
    totalAnswers: number;
}

// Rutas remotas actualizadas (Elements)
const PASSIVES: Record<PassiveType, ItemData> = {
    agil: { id: 'agil', name: 'Reflejos Felinos', description: '20% Evasión.', image: `${ASSETS_BASE}/elements/agil.png` },
    answer: { id: 'answer', name: 'Visión Cuántica', description: '50/50 en opciones.', image: `${ASSETS_BASE}/elements/answer.png` },
    certero: { id: 'certero', name: 'Ojo de Halcón', description: '+Crit Chance.', image: `${ASSETS_BASE}/elements/certero.png` },
    escudo: { id: 'escudo', name: 'Piel de Titanio', description: '-15% Daño recibido.', image: `${ASSETS_BASE}/elements/escudo.png` },
    fuerza: { id: 'fuerza', name: 'Furia Berserker', description: '+20% Daño base.', image: `${ASSETS_BASE}/elements/fuerza.png` },
    suerte: { id: 'suerte', name: 'Fortuna', description: '+Loot Chance.', image: `${ASSETS_BASE}/elements/suerte.png` },
    tiempo: { id: 'tiempo', name: 'Cronometrista', description: '+5s Tiempo.', image: `${ASSETS_BASE}/elements/tiempo.png` },
};

const POTIONS: Record<PotionType, ItemData> = {
    salud: { id: 'salud', name: 'Poción de Vida', description: 'Recupera Salud.', image: `${ASSETS_BASE}/elements/salud.png` },
    veneno: { id: 'veneno', name: 'Veneno', description: 'Daño por turno.', image: `${ASSETS_BASE}/elements/veneno.png` },
    vulnerable: { id: 'vulnerable', name: 'Rompe-Guardia', description: 'Doble daño recibido.', image: `${ASSETS_BASE}/elements/vulnerable.png` },
    esquiva: { id: 'esquiva', name: 'Humo Ninja', description: 'Evasión garantizada.', image: `${ASSETS_BASE}/elements/esquiva.png` },
    fuerzatemp: { id: 'fuerzatemp', name: 'Esteroides', description: 'Daño masivo 1 turno.', image: `${ASSETS_BASE}/elements/fuerzatemp.png` },
};

// Utils
const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

// --- MAIN COMPONENT ---

interface ArcadePlayProps {
    evaluationId: string;
}

export const ArcadePlay: React.FC<ArcadePlayProps> = ({ evaluationId }) => {
    // --- STATE: SYSTEM ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [bossConfig, setBossConfig] = useState<BossSettings | null>(null);

    // --- STATE: GAMEPLAY ---
    const [gameState, setGameState] = useState<GameState>('LOBBY');
    const [combatState, setCombatState] = useState<CombatState>('IDLE');
    const [nickname, setNickname] = useState("");
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    
    // Questions Queue
    const [playableQuestions, setPlayableQuestions] = useState<Question[]>([]);
    const [retryQueue, setRetryQueue] = useState<Question[]>([]);
    const [incorrectQuestions, setIncorrectQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);

    // RPG Stats
    const [bossHP, setBossHP] = useState({ current: 1000, max: 1000 });
    const [playerHP, setPlayerHP] = useState({ current: 100, max: 100 });
    const [playerInventory, setPlayerInventory] = useState<PotionType[]>([]);
    const [passiveEffect, setPassiveEffect] = useState<PassiveType | null>(null);
    const [playerStatus, setPlayerStatus] = useState<StatusEffect[]>([]);
    const [bossStatus, setBossStatus] = useState<StatusEffect[]>([]);
    const [lootDrop, setLootDrop] = useState<PotionType | null>(null);
    const [combatLog, setCombatLog] = useState<string | null>(null);
    
    // Stats Tracking
    const [battleStats, setBattleStats] = useState<BattleStats>({
        totalDamage: 0, maxCrit: 0, dodges: 0, potionsUsed: 0, potionsStolen: 0, correctAnswers: 0, totalAnswers: 0
    });
    const startTimeRef = useRef<number>(0);
    const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);

    // UI State
    const [timeLeft, setTimeLeft] = useState(20);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [isHit, setIsHit] = useState(false);

    // Refs
    const timerRef = useRef<any>(null);
    const bgmRef = useRef<HTMLAudioElement | null>(null); // SINGLE SOURCE OF TRUTH FOR BGM

    // --- AUDIO SYSTEM (REMOTE) ---
    
    const playBGM = (trackName: string) => {
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current.src = "";
            bgmRef.current = null;
        }

        const path = `${ASSETS_BASE}/sounds/${trackName}.mp3`;
        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = 0.3;
        bgmRef.current = audio;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Audio play interrupted/prevented:", error);
            });
        }
    };

    const stopBGM = () => {
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current = null;
        }
    };

    const playSFX = (trackName: string) => {
        const audio = new Audio(`${ASSETS_BASE}/sounds/${trackName}.mp3`);
        audio.volume = 0.8;
        audio.play().catch(() => {}); // Fire and forget
    };

    // --- EFFECT: AUDIO STATE MANAGER ---
    useEffect(() => {
        if (loading) return;

        // Map state to track
        let track = '';
        if (gameState === 'ROULETTE') track = 'menu';
        else if (gameState === 'PLAYING') {
            track = 'battlelevel2';
            if (bossConfig?.difficulty === 'easy') track = 'battlelevel1';
            if (bossConfig?.difficulty === 'hard') track = 'battlelevel3';
            if (bossConfig?.difficulty === 'legend') track = 'battlelevel4';
        } 
        else if (gameState === 'FINISH_IT') {
            track = retryQueue.length > 5 ? 'finishit' : 'finishit2';
        }
        else if (gameState === 'STATS') {
            track = combatState === 'VICTORY' ? 'stats' : 'gameover2';
        }

        if (track) playBGM(track);
        else stopBGM(); 

        return () => stopBGM();
    }, [gameState, loading, bossConfig, combatState]); // Dependencies are STABLE

    // --- INITIALIZATION ---
    useEffect(() => {
        const init = async () => {
            try {
                const data = await getEvaluation(evaluationId);
                if (!data) throw new Error("Evaluación no encontrada");
                
                // Config Boss
                let settings = data.config.bossSettings;
                if (!settings) settings = PRESET_BOSSES['kryon_v']; // Fallback
                
                setEvaluation(data);
                setBossConfig(settings);
                
                // Init HP
                setBossHP({ current: settings.health.bossHP, max: settings.health.bossHP });
                setPlayerHP({ current: settings.health.playerHP, max: settings.health.playerHP });

                // Prepare Questions
                const shuffled = shuffleArray(data.questions).slice(0, data.config.questionCount || 10);
                const prepared = shuffled.map(q => ({
                    ...q,
                    options: shuffleArray(q.options)
                }));
                setPlayableQuestions(prepared);

            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [evaluationId]);

    // --- TIMER LOGIC ---
    useEffect(() => {
        if ((gameState === 'PLAYING' || gameState === 'FINISH_IT') && !isAnswered && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [gameState, isAnswered, timeLeft]); 

    // --- GAME ACTIONS ---

    const handleStart = () => {
        if (!nickname.trim()) return;
        setGameState('ROULETTE');
    };

    const handleRouletteEnd = (passive: PassiveType) => {
        setPassiveEffect(passive);
        setGameState('PLAYING');
        startTimeRef.current = Date.now();
        startQuestion(0);
    };

    const startQuestion = (index: number) => {
        const queue = gameState === 'FINISH_IT' ? retryQueue : playableQuestions;
        if (!queue || queue.length === 0 || index >= queue.length) {
            // Safety fallback
            finishGame('LOSE'); 
            return;
        }

        setCurrentQIndex(index);
        const q = queue[index];
        
        let time = q.timeLimit || 20;
        if (passiveEffect === 'tiempo') time += 5;
        
        setTimeLeft(time);
        setIsAnswered(false);
        setIsCorrect(null);
        setSelectedOptionId(null);
        setCombatState('IDLE');
        setShakeScreen(false);
        setIsHit(false);
        setLootDrop(null);
        setCombatLog(null);
    };

    const handleAnswer = (optionId: string) => {
        if (isAnswered) return;
        setIsAnswered(true);
        setSelectedOptionId(optionId);
        clearInterval(timerRef.current);

        const currentQ = gameState === 'FINISH_IT' ? retryQueue[currentQIndex] : playableQuestions[currentQIndex];
        const correctIds = currentQ.correctOptionIds || [currentQ.correctOptionId];
        const isRight = correctIds.includes(optionId);

        setIsCorrect(isRight);
        
        // Update Stats
        setBattleStats(prev => ({
            ...prev,
            totalAnswers: prev.totalAnswers + 1,
            correctAnswers: isRight ? prev.correctAnswers + 1 : prev.correctAnswers
        }));

        processTurn(isRight, currentQ);
    };

    const handleTimeUp = () => {
        if (isAnswered) return;
        setIsAnswered(true);
        setIsCorrect(false);
        const currentQ = gameState === 'FINISH_IT' ? retryQueue[currentQIndex] : playableQuestions[currentQIndex];
        processTurn(false, currentQ);
    };

    // --- COMBAT LOGIC CHAIN ---
    
    const processTurn = (correct: boolean, q: Question) => {
        // 1. Tick Effects
        setPlayerStatus(prev => prev.map(s => ({...s, turns: s.turns - 1})).filter(s => s.turns > 0));
        setBossStatus(prev => prev.map(s => ({...s, turns: s.turns - 1})).filter(s => s.turns > 0));

        // 2. Player Action
        if (correct) {
            processPlayerAttack();
        } else {
            processPlayerMiss(q);
        }

        // 3. Queue Next Step
        setTimeout(() => {
            checkWinConditionOrNext(correct);
        }, 2500);
    };

    const processPlayerAttack = () => {
        playSFX('correct');
        setStreak(s => s + 1);
        setScore(s => s + (100 + (streak * 10)));

        let damage = 100;
        if (passiveEffect === 'fuerza') damage *= 1.2;
        if (playerStatus.some(s => s.type === 'fuerzatemp')) damage *= 1.5;
        if (bossStatus.some(s => s.type === 'vulnerable')) damage *= 2;

        const isCrit = Math.random() < (passiveEffect === 'certero' ? 0.3 : 0.1);
        if (isCrit) damage *= 1.5;
        damage = Math.ceil(damage);

        setBossHP(prev => ({ ...prev, current: Math.max(0, prev.current - damage) }));
        setBattleStats(prev => ({ ...prev, totalDamage: prev.totalDamage + damage, maxCrit: Math.max(prev.maxCrit, damage) }));

        setCombatState('PLAYER_ATTACK');
        setIsHit(true);
        setTimeout(() => { playSFX('hit'); setShakeScreen(true); }, 200);
        setTimeout(() => { setShakeScreen(false); setIsHit(false); }, 500);

        const lootChance = passiveEffect === 'suerte' ? 0.25 : 0.10;
        if (Math.random() < lootChance) {
            const types = Object.keys(POTIONS) as PotionType[];
            const loot = types[Math.floor(Math.random() * types.length)];
            setLootDrop(loot);
            setPlayerInventory(prev => [...prev, loot]);
            setBattleStats(prev => ({ ...prev, potionsStolen: prev.potionsStolen + 1 }));
            playSFX('powerup');
        }
    };

    const processPlayerMiss = (q: Question) => {
        playSFX('wrong');
        setStreak(0);
        
        if (!incorrectQuestions.some(iq => iq.id === q.id)) {
            setIncorrectQuestions(prev => [...prev, q]);
        }

        // BOSS TURN
        const dodgeChance = passiveEffect === 'agil' ? 0.2 : 0;
        if (playerStatus.some(s => s.type === 'esquiva') || Math.random() < dodgeChance) {
            setCombatLog("¡ATAQUE ESQUIVADO!");
            playSFX('miss');
            setBattleStats(prev => ({ ...prev, dodges: prev.dodges + 1 }));
            return;
        }

        let damage = Math.ceil(playerHP.max * 0.2);
        if (passiveEffect === 'escudo') damage = Math.ceil(damage * 0.85);
        if (playerStatus.some(s => s.type === 'vulnerable')) damage *= 2;

        setPlayerHP(prev => ({ ...prev, current: Math.max(0, prev.current - damage) }));
        setCombatState('BOSS_ATTACK');
        setTimeout(() => { playSFX('hit'); setShakeScreen(true); }, 200);
        setTimeout(() => setShakeScreen(false), 500);

        // --- BOSS VOICE ATTACK (REMOTE URL) ---
        const voiceUrl = (bossConfig as any)?.attackVoice;
        if (voiceUrl) {
            setTimeout(() => {
                // Assuming URL is already absolute from bossPresets.ts
                const voice = new Audio(voiceUrl);
                voice.volume = 1.0;
                voice.play().catch(e => console.warn("Voice play prevented", e));
            }, 300);
        }
    };

    const checkWinConditionOrNext = (lastWasCorrect: boolean) => {
        // 1. Check Death
        if (playerHP.current <= 0) {
            setCombatState('DEFEAT');
            playSFX('gameover');
            setTimeout(() => finishGame('LOSE'), 1000);
            return;
        }

        // 2. Check Victory (Boss Dead)
        if (bossHP.current <= 0) {
            const hasPending = retryQueue.length > 0 || incorrectQuestions.length > 0;
            if (!hasPending) {
                setCombatState('VICTORY');
                setTimeout(() => finishGame('WIN'), 1000);
            } else {
                if (gameState !== 'FINISH_IT') {
                    const queue = retryQueue.length > 0 ? retryQueue : incorrectQuestions;
                    setRetryQueue(queue); 
                    setGameState('FINISH_IT'); 
                    startQuestion(0);
                } else {
                    setCombatState('VICTORY');
                    setTimeout(() => finishGame('WIN'), 1000);
                }
            }
            return;
        }

        // 3. Continue Game
        if (gameState === 'FINISH_IT') {
            if (!lastWasCorrect) {
                setCombatState('REVIVE');
                setBossHP(p => ({ ...p, current: Math.ceil(p.max * 0.10) }));
                setGameState('PLAYING'); 
                setRetryQueue([]);
                const nextIdx = (currentQIndex + 1) % playableQuestions.length;
                startQuestion(nextIdx);
            } else {
                const nextIdx = currentQIndex + 1;
                if (nextIdx < retryQueue.length) {
                    startQuestion(nextIdx);
                } else {
                    setCombatState('VICTORY');
                    setTimeout(() => finishGame('WIN'), 1000);
                }
            }
        } else {
            const nextIdx = currentQIndex + 1;
            if (nextIdx < playableQuestions.length) {
                startQuestion(nextIdx);
            } else {
                if (incorrectQuestions.length > 0) {
                    setRetryQueue(incorrectQuestions);
                    setIncorrectQuestions([]);
                    setGameState('FINISH_IT'); 
                    startQuestion(0);
                } else {
                    setCombatState('DEFEAT');
                    setTimeout(() => finishGame('LOSE'), 1000);
                }
            }
        }
    };

    const finishGame = async (result: 'WIN' | 'LOSE') => {
        setGameState('STATS'); 
        if (evaluationId && !evaluationId.includes('demo')) {
            const attemptId = await saveEvaluationAttempt({
                evaluationId,
                nickname,
                score,
                totalTime: Math.floor((Date.now() - startTimeRef.current) / 1000),
                accuracy: (battleStats.correctAnswers / Math.max(1, battleStats.totalAnswers)) * 100,
                answersSummary: { correct: battleStats.correctAnswers, incorrect: battleStats.totalAnswers - battleStats.correctAnswers, total: battleStats.totalAnswers }
            });
            setSavedAttemptId(attemptId);
        }
    };

    const handleUsePotion = (potion: PotionType, index: number) => {
        if (isAnswered) return;
        playSFX('potion');
        
        const newInv = [...playerInventory];
        newInv.splice(index, 1);
        setPlayerInventory(newInv);
        setBattleStats(p => ({...p, potionsUsed: p.potionsUsed + 1}));

        if (potion === 'salud') setPlayerHP(p => ({...p, current: p.max}));
        else if (potion === 'veneno') setBossStatus(p => [...p, {type: 'veneno', turns: 3}]);
        else if (potion === 'vulnerable') setBossStatus(p => [...p, {type: 'vulnerable', turns: 2}]);
        else if (potion === 'esquiva') setPlayerStatus(p => [...p, {type: 'esquiva', turns: 1}]);
        else if (potion === 'fuerzatemp') setPlayerStatus(p => [...p, {type: 'fuerzatemp', turns: 1}]);
    };

    // --- RENDER HELPERS ---

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500"><Loader2 className="animate-spin w-12 h-12" /></div>;
    if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500"><AlertTriangle className="w-12 h-12 mb-4" /> {error}</div>;

    // ROULETTE
    if (gameState === 'ROULETTE') {
        const items = Object.values(PASSIVES);
        const RouletteInner = () => {
            const [idx, setIdx] = useState(0);
            useEffect(() => {
                const interval = setInterval(() => setIdx(i => (i + 1) % items.length), 100);
                const timeout = setTimeout(() => {
                    clearInterval(interval);
                    const win = Math.floor(Math.random() * items.length);
                    setIdx(win);
                    setTimeout(() => handleRouletteEnd(items[win].id as PassiveType), 1500);
                }, 3000);
                return () => { clearInterval(interval); clearTimeout(timeout); };
            }, []);
            return (
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                    <h2 className="text-3xl font-cyber text-purple-400 mb-8 animate-pulse">SISTEMA RPG INICIANDO...</h2>
                    <div className="w-64 h-64 border-4 border-purple-500 rounded-xl flex items-center justify-center bg-gray-900 shadow-[0_0_50px_purple]">
                        <img src={items[idx].image} className="w-40 h-40 object-contain" />
                    </div>
                    <p className="mt-6 text-xl text-white font-mono">{items[idx].name}</p>
                </div>
            );
        };
        return <RouletteInner />;
    }

    // LOBBY
    if (gameState === 'LOBBY') {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white bg-[url('/bg-grid.png')]">
                <CyberCard className="max-w-md w-full border-cyan-500/50 p-8 text-center bg-black/80 backdrop-blur">
                    <h1 className="text-4xl font-cyber text-cyan-400 mb-2">{evaluation?.title}</h1>
                    <div className="flex justify-center my-6">
                        <img 
                            src={bossConfig?.images.idle} 
                            crossOrigin="anonymous" 
                            className="w-32 h-32 object-contain animate-pulse drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]" 
                        />
                    </div>
                    <input 
                        value={nickname} 
                        onChange={(e) => setNickname(e.target.value)} 
                        placeholder="NOMBRE DEL JUGADOR"
                        className="w-full bg-black border border-gray-700 p-4 text-center text-xl font-bold rounded mb-4 focus:border-cyan-500 outline-none uppercase text-white"
                        maxLength={15}
                    />
                    <CyberButton onClick={handleStart} disabled={!nickname.trim()} className="w-full h-14 text-lg">
                        <Rocket className="w-5 h-5 mr-2" /> INICIAR MISIÓN
                    </CyberButton>
                </CyberCard>
            </div>
        );
    }

    // STATS
    if (gameState === 'STATS') {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
                <CyberCard className="max-w-2xl w-full border-gray-700 bg-gray-900/90 p-8 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-2 ${combatState === 'VICTORY' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    
                    <div className="text-center mb-8">
                        <h2 className={`text-5xl font-black font-cyber mb-2 ${combatState === 'VICTORY' ? 'text-green-400' : 'text-red-500'}`}>
                            {combatState === 'VICTORY' ? "MISIÓN CUMPLIDA" : "GAME OVER"}
                        </h2>
                        <p className="text-gray-400 font-mono italic">"{combatState === 'VICTORY' ? bossConfig?.messages.playerWins : bossConfig?.messages.bossWins}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-black/40 p-4 rounded border border-gray-700">
                            <div className="text-xs text-gray-500 uppercase">Daño Total</div>
                            <div className="text-2xl font-mono text-white">{battleStats.totalDamage}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded border border-gray-700">
                            <div className="text-xs text-gray-500 uppercase">Golpe Crítico</div>
                            <div className="text-2xl font-mono text-yellow-400">{battleStats.maxCrit}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded border border-gray-700">
                            <div className="text-xs text-gray-500 uppercase">Precisión</div>
                            <div className="text-2xl font-mono text-cyan-400">{Math.round((battleStats.correctAnswers / Math.max(1, battleStats.totalAnswers)) * 100)}%</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded border border-gray-700">
                            <div className="text-xs text-gray-500 uppercase">Loot Robado</div>
                            <div className="text-2xl font-mono text-purple-400">{battleStats.potionsStolen}</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Leaderboard evaluationId={evaluationId} currentAttemptId={savedAttemptId} />
                        <CyberButton onClick={() => window.location.href = '/'} variant="ghost" className="w-full">VOLVER AL INICIO</CyberButton>
                    </div>
                </CyberCard>
            </div>
        );
    }

    // PLAYING VIEW
    const currentQ = gameState === 'FINISH_IT' ? retryQueue[currentQIndex] : playableQuestions[currentQIndex];
    if (!currentQ) return null;

    const bgClass = gameState === 'FINISH_IT' ? (retryQueue.length > 5 ? 'bg-red-950' : 'bg-gray-900') : 'bg-[#050505]';

    return (
        <div className={`min-h-screen ${bgClass} text-white flex flex-col font-sans select-none overflow-hidden relative transition-colors duration-1000 ${shakeScreen ? 'animate-shake' : ''}`}>
            
            {/* BOSS HUD */}
            <div className="absolute top-0 left-0 w-full p-4 z-20 pointer-events-none flex justify-between items-start">
                <div className="w-1/2 md:w-1/3">
                    <div className="flex items-center gap-2 mb-1">
                        <Skull className="w-5 h-5 text-red-500" />
                        <span className="font-cyber font-bold text-red-500 text-shadow-red">{bossConfig?.bossName}</span>
                    </div>
                    <div className="w-full h-6 bg-gray-900 rounded border border-red-900 overflow-hidden relative">
                        <div className="h-full bg-red-600 transition-all duration-500 ease-out" style={{ width: `${(bossHP.current / bossHP.max) * 100}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white/80">{bossHP.current}/{bossHP.max}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                        {bossStatus.map((s, i) => <img key={i} src={POTIONS[s.type].image} className="w-6 h-6 border border-red-500 rounded bg-black" title={s.type}/>)}
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <div className={`text-4xl font-black font-mono ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}</div>
                    <div className="text-xs text-gray-500 font-mono">Q: {currentQIndex + 1}</div>
                </div>
            </div>

            {/* BOSS AVATAR */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full flex justify-center z-10 pointer-events-none">
                <img 
                    src={combatState === 'PLAYER_ATTACK' ? bossConfig?.images.damage : bossConfig?.images.idle} 
                    crossOrigin="anonymous" // CRITICAL FOR REMOTE ASSETS
                    className={`h-[35vh] max-h-[350px] object-contain transition-all duration-100 ${isHit ? 'filter brightness-200 contrast-150 scale-105' : 'drop-shadow-[0_0_30px_rgba(255,0,0,0.2)]'}`}
                    style={isHit ? { transform: 'translate(5px, -5px) skew(10deg)' } : {}}
                    alt="Boss"
                />
                {combatState === 'PLAYER_ATTACK' && <div className="absolute top-10 text-6xl font-black text-yellow-400 font-cyber animate-bounce drop-shadow-lg">CRITICAL!</div>}
                {combatLog && <div className="absolute -bottom-10 bg-red-900/80 text-white px-4 py-2 rounded font-mono font-bold animate-in fade-in slide-in-from-top-4">{combatLog}</div>}
            </div>

            {/* PLAYER HUD */}
            <div className="flex-1 flex flex-col justify-end pb-4 px-4 z-20">
                <div className="max-w-4xl mx-auto w-full flex justify-between items-end mb-4 pointer-events-auto">
                    <div className="flex gap-2">
                        {playerInventory.map((item, idx) => (
                            <button key={idx} onClick={() => handleUsePotion(item, idx)} disabled={isAnswered} className="w-12 h-12 bg-black/60 border border-gray-600 rounded hover:border-yellow-400 flex items-center justify-center relative group transition-all hover:scale-110">
                                <img src={POTIONS[item].image} className="w-8 h-8" />
                                <span className="absolute -top-8 bg-black text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap border border-yellow-500 text-yellow-300 z-50">{POTIONS[item].name}</span>
                            </button>
                        ))}
                        {playerInventory.length < 5 && Array.from({length: 5 - playerInventory.length}).map((_, i) => (
                            <div key={i} className="w-12 h-12 bg-black/20 border border-gray-800 rounded flex items-center justify-center opacity-30"><Backpack className="w-4 h-4"/></div>
                        ))}
                    </div>

                    <div className="flex flex-col items-end gap-1 w-1/3">
                        <div className="flex items-center gap-2">
                            {passiveEffect && (
                                <div className="w-8 h-8 rounded-full bg-purple-900 border border-purple-500 flex items-center justify-center" title={PASSIVES[passiveEffect].name}>
                                    <img src={PASSIVES[passiveEffect].image} className="w-6 h-6" />
                                </div>
                            )}
                            {playerStatus.map((s, i) => <img key={i} src={POTIONS[s.type].image} className="w-5 h-5 border border-green-500 rounded bg-black" />)}
                            <span className="font-cyber font-bold text-green-400">{nickname}</span>
                        </div>
                        <div className="w-full h-4 bg-gray-900 rounded border border-green-900 overflow-hidden relative">
                            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(playerHP.current / playerHP.max) * 100}%` }} />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-black/80">{playerHP.current}/{playerHP.max}</span>
                        </div>
                    </div>
                </div>

                {/* QUESTION CARD */}
                <div className="max-w-4xl mx-auto w-full bg-black/80 backdrop-blur-md border border-gray-700 p-6 rounded-xl shadow-2xl relative">
                    {lootDrop && (
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-yellow-500/20 border border-yellow-400 p-4 rounded-full animate-bounce flex items-center gap-2">
                            <img src={POTIONS[lootDrop].image} className="w-8 h-8" />
                            <span className="text-yellow-300 font-bold">¡LOOT!</span>
                        </div>
                    )}

                    {currentQ.imageUrl && (
                        <div className="flex justify-center mb-4">
                            <img src={currentQ.imageUrl} className="max-h-32 object-contain rounded border border-gray-600" />
                        </div>
                    )}

                    <h3 className="text-xl md:text-2xl font-bold text-center mb-6 min-h-[40px] flex items-center justify-center">{currentQ.text}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQ.options.map((opt, i) => {
                            let btnClass = "bg-gray-800 hover:bg-gray-700 border-gray-600";
                            if (isAnswered) {
                                const isOptCorrect = (currentQ.correctOptionIds || [currentQ.correctOptionId]).includes(opt.id);
                                if (isOptCorrect) btnClass = "bg-green-600 border-green-400 text-white";
                                else if (selectedOptionId === opt.id) btnClass = "bg-red-600 border-red-400 text-white";
                                else btnClass = "opacity-50 bg-gray-900";
                            }
                            
                            return (
                                <button 
                                    key={opt.id} 
                                    onClick={() => handleAnswer(opt.id)}
                                    disabled={isAnswered}
                                    className={`p-4 rounded-lg border-2 text-left transition-all transform active:scale-95 ${btnClass} flex items-center gap-3`}
                                >
                                    <span className="bg-black/30 w-8 h-8 flex items-center justify-center rounded-full font-mono text-sm border border-white/10">{String.fromCharCode(65+i)}</span>
                                    <span className="text-sm font-bold">{opt.text}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
