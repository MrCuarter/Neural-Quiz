
import React, { useState, useEffect, useRef } from 'react';
import { getEvaluation, saveEvaluationAttempt } from '../../services/firebaseService';
import { Evaluation, Question, EvaluationAttempt, QUESTION_TYPES, BossSettings } from '../../types';
import { CyberButton, CyberCard, CyberInput } from '../ui/CyberUI';
import { Loader2, AlertTriangle, User, Rocket, Monitor, Clock, CheckCircle2, XCircle, Trophy, Star, RotateCcw, Timer, Flame, CloudUpload, CheckSquare, Square, Type, Check, Skull, Shield, Heart, Zap, Plus, Backpack, Sword, Activity } from 'lucide-react';
import { Leaderboard } from './Leaderboard';
import { PRESET_BOSSES } from '../../data/bossPresets';

// --- 1. LOCAL DATA STRUCTURES & CONFIG ---

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
    potionsStolen: number; // Looted
    correctAnswers: number;
    totalAnswers: number;
}

const PASSIVES: Record<PassiveType, ItemData> = {
    agil: { id: 'agil', name: 'Reflejos Felinos', description: '20% Evasión.', image: '/elements/agil.png' },
    answer: { id: 'answer', name: 'Visión Cuántica', description: '50/50 en opciones.', image: '/elements/answer.png' },
    certero: { id: 'certero', name: 'Ojo de Halcón', description: '+Crit Chance.', image: '/elements/certero.png' },
    escudo: { id: 'escudo', name: 'Piel de Titanio', description: '-15% Daño recibido.', image: '/elements/escudo.png' },
    fuerza: { id: 'fuerza', name: 'Furia Berserker', description: '+20% Daño base.', image: '/elements/fuerza.png' },
    suerte: { id: 'suerte', name: 'Fortuna', description: '+Loot Chance.', image: '/elements/suerte.png' },
    tiempo: { id: 'tiempo', name: 'Cronometrista', description: '+5s Tiempo.', image: '/elements/tiempo.png' },
};

const POTIONS: Record<PotionType, ItemData> = {
    salud: { id: 'salud', name: 'Poción de Vida', description: 'Recupera Salud.', image: '/elements/salud.png' },
    veneno: { id: 'veneno', name: 'Veneno', description: 'Daño por turno.', image: '/elements/veneno.png' },
    vulnerable: { id: 'vulnerable', name: 'Rompe-Guardia', description: 'Doble daño recibido.', image: '/elements/vulnerable.png' },
    esquiva: { id: 'esquiva', name: 'Humo Ninja', description: 'Evasión garantizada.', image: '/elements/esquiva.png' },
    fuerzatemp: { id: 'fuerzatemp', name: 'Esteroides', description: 'Daño masivo 1 turno.', image: '/elements/fuerzatemp.png' },
};

// --- UTILS ---
const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);
const normalizeText = (text: string): string => text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

// --- MAIN COMPONENT ---
interface ArcadePlayProps {
    evaluationId: string;
    onExit?: () => void;
}

export const ArcadePlay: React.FC<ArcadePlayProps> = ({ evaluationId }) => {
    // SYSTEM STATE
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    
    // GAME STATE
    const [gameState, setGameState] = useState<GameState>('LOBBY');
    const [nickname, setNickname] = useState("");
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [playableQuestions, setPlayableQuestions] = useState<Question[]>([]);
    
    // TIMERS
    const [timeLeft, setTimeLeft] = useState(20);
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);

    // BATTLE STATE
    const [bossConfig, setBossConfig] = useState<BossSettings | null>(null);
    const [bossHP, setBossHP] = useState({ current: 1000, max: 1000 });
    const [playerHP, setPlayerHP] = useState({ current: 100, max: 100 });
    const [combatState, setCombatState] = useState<CombatState>('IDLE');
    const [combatLog, setCombatLog] = useState<string | null>(null);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [isHit, setIsHit] = useState(false); // Glitch effect

    // RPG INVENTORY & STATS
    const [passiveEffect, setPassiveEffect] = useState<PassiveType | null>(null);
    const [playerInventory, setPlayerInventory] = useState<PotionType[]>([]);
    const [playerStatus, setPlayerStatus] = useState<StatusEffect[]>([]);
    const [bossStatus, setBossStatus] = useState<StatusEffect[]>([]);
    const [lootDrop, setLootDrop] = useState<PotionType | null>(null);
    
    const [battleStats, setBattleStats] = useState<BattleStats>({
        totalDamage: 0, maxCrit: 0, dodges: 0, potionsUsed: 0, potionsStolen: 0, correctAnswers: 0, totalAnswers: 0
    });

    // RETRY & FINISH IT
    const [incorrectQuestions, setIncorrectQuestions] = useState<Question[]>([]);
    const [retryQueue, setRetryQueue] = useState<Question[]>([]);

    // ANSWER INPUT
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [textAnswer, setTextAnswer] = useState("");
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);

    // AUDIO SYSTEM
    const bgmRef = useRef<HTMLAudioElement | null>(null);
    const sfxRef = useRef<HTMLAudioElement | null>(null);

    // --- AUDIO MANAGER ---
    const playBGM = (trackName: string, loop: boolean = true) => {
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current = null;
        }
        const audio = new Audio(`/sounds/${trackName}.mp3`);
        audio.loop = loop;
        audio.volume = 0.3; // Background Volume
        audio.play().catch(e => console.warn("Audio play failed:", e));
        bgmRef.current = audio;
    };

    const playSFX = (trackName: string) => {
        const audio = new Audio(`/sounds/${trackName}.mp3`);
        audio.volume = 0.8; // SFX Volume
        audio.play().catch(e => console.warn("SFX play failed:", e));
    };

    const stopBGM = () => {
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current = null;
        }
    };

    // --- INITIALIZATION ---
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const data = await getEvaluation(evaluationId);
                if (!data.isActive) throw new Error("Evaluación cerrada.");
                setEvaluation(data);
                
                // SETUP BOSS
                // Prefer preset if available to ensure assets load correctly
                const presetKey = Object.keys(PRESET_BOSSES).find(k => PRESET_BOSSES[k].bossName === data.config.bossSettings?.bossName);
                const settings = presetKey ? PRESET_BOSSES[presetKey] : (data.config.bossSettings || PRESET_BOSSES['kryon_v']);
                
                setBossConfig(settings);
                setBossHP({ current: settings.health.bossHP, max: settings.health.bossHP });
                setPlayerHP({ current: settings.health.playerHP, max: settings.health.playerHP });

                // PREPARE QUESTIONS
                const shuffled = shuffleArray(data.questions).slice(0, data.config.questionCount || 10);
                setPlayableQuestions(shuffled.map(q => ({ ...q, options: shuffleArray(q.options) })));

            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        init();
        return () => stopBGM();
    }, [evaluationId]);

    // --- GAME LOOP: TIMER ---
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

    // --- ACTIONS ---

    const handleStart = () => {
        if (!nickname.trim()) return;
        setGameState('ROULETTE');
        playBGM('menu', true); // Menu loop
    };

    const handleRouletteEnd = (passive: PassiveType) => {
        setPassiveEffect(passive);
        stopBGM();
        
        // DETERMINE BATTLE MUSIC BASED ON DIFFICULTY
        let track = 'battlelevel2'; // Medium default
        if (bossConfig?.difficulty === 'easy') track = 'battlelevel1';
        if (bossConfig?.difficulty === 'hard') track = 'battlelevel3';
        if (bossConfig?.difficulty === 'legend') track = 'battlelevel4';
        
        playBGM(track, true);
        
        setTimeout(() => {
            setGameState('PLAYING');
            startTimeRef.current = Date.now();
            startQuestion(0);
        }, 2000);
    };

    const startQuestion = (index: number) => {
        setCurrentQIndex(index);
        const q = gameState === 'FINISH_IT' ? retryQueue[index] : playableQuestions[index];
        
        let time = q.timeLimit || 20;
        if (passiveEffect === 'tiempo') time += 5;
        setTimeLeft(time);

        setIsAnswered(false);
        setIsCorrect(null);
        setSelectedOptionId(null);
        setTextAnswer("");
        setCombatState('IDLE');
        setShakeScreen(false);
        setIsHit(false);
        setLootDrop(null);
        setCombatLog(null);
    };

    const handleAnswer = (optionId: string | null, textVal: string | null) => {
        if (isAnswered) return;
        setIsAnswered(true);
        clearInterval(timerRef.current);

        const currentQ = gameState === 'FINISH_IT' ? retryQueue[currentQIndex] : playableQuestions[currentQIndex];
        let correct = false;

        // VALIDATION LOGIC
        if (optionId) {
            setSelectedOptionId(optionId);
            correct = (currentQ.correctOptionIds || [currentQ.correctOptionId]).includes(optionId);
        } else if (textVal !== null) {
            const norm = normalizeText(textVal);
            correct = currentQ.options.some(o => normalizeText(o.text) === norm);
        }

        setIsCorrect(correct);
        setBattleStats(prev => ({ ...prev, totalAnswers: prev.totalAnswers + 1, correctAnswers: correct ? prev.correctAnswers + 1 : prev.correctAnswers }));

        processTurn(correct, currentQ);
    };

    const processTurn = (correct: boolean, q: Question) => {
        if (correct) {
            // --- PLAYER TURN ---
            playSFX('correct');
            setStreak(s => s + 1);
            setScore(s => s + (100 + (streak * 10)));

            // DAMAGE CALC
            let damage = 100; // Base
            if (passiveEffect === 'fuerza') damage *= 1.2;
            if (playerStatus.some(s => s.type === 'fuerzatemp')) damage *= 1.5;
            if (bossStatus.some(s => s.type === 'vulnerable')) damage *= 2;
            
            // CRIT
            const critChance = passiveEffect === 'certero' ? 0.3 : 0.1;
            const isCrit = Math.random() < critChance;
            if (isCrit) damage *= 1.5;

            damage = Math.ceil(damage);
            
            // Apply Damage
            setBossHP(prev => ({ ...prev, current: Math.max(0, prev.current - damage) }));
            setBattleStats(prev => ({ ...prev, totalDamage: prev.totalDamage + damage, maxCrit: isCrit && damage > prev.maxCrit ? damage : prev.maxCrit }));
            
            // Visuals
            setCombatState('PLAYER_ATTACK');
            setIsHit(true);
            setTimeout(() => { playSFX('hit'); setShakeScreen(true); }, 200);
            setTimeout(() => { setShakeScreen(false); setIsHit(false); }, 500);

            // Loot Check
            const lootChance = passiveEffect === 'suerte' ? 0.25 : 0.10;
            if (Math.random() < lootChance) {
                const types = Object.keys(POTIONS) as PotionType[];
                const loot = types[Math.floor(Math.random() * types.length)];
                setLootDrop(loot);
                setPlayerInventory(prev => [...prev, loot]);
                setBattleStats(prev => ({ ...prev, potionsStolen: prev.potionsStolen + 1 }));
                setTimeout(() => playSFX('powerup'), 600);
            }

        } else {
            // --- BOSS TURN ---
            playSFX('wrong');
            setStreak(0);
            if (!incorrectQuestions.some(iq => iq.id === q.id)) setIncorrectQuestions(p => [...p, q]);

            // BOSS AI ATTACK
            // 1. Check Dodge
            if (passiveEffect === 'agil' && Math.random() < 0.2) {
                setCombatLog("¡ESQUIVADO!");
                setBattleStats(prev => ({ ...prev, dodges: prev.dodges + 1 }));
                playSFX('miss');
            } else if (playerStatus.some(s => s.type === 'esquiva')) {
                setCombatLog("¡Manto de Sombras absorbe el golpe!");
                playSFX('miss');
            } else {
                // 2. Damage
                let dmg = Math.ceil(playerHP.max * 0.2); // 20% Base
                if (passiveEffect === 'escudo') dmg = Math.ceil(dmg * 0.85);
                if (playerStatus.some(s => s.type === 'vulnerable')) dmg *= 2;

                setPlayerHP(prev => ({ ...prev, current: Math.max(0, prev.current - dmg) }));
                setCombatState('BOSS_ATTACK');
                setTimeout(() => { playSFX('hit'); setShakeScreen(true); }, 200);
                setTimeout(() => setShakeScreen(false), 500);
            }

            // 3. Boss Potion Logic (Difficulty Based)
            let potionChance = 0;
            if (bossConfig?.difficulty === 'medium') potionChance = 0.1;
            if (bossConfig?.difficulty === 'hard') potionChance = 0.25;
            if (bossConfig?.difficulty === 'legend') potionChance = 0.40;

            if (Math.random() < potionChance) {
                const bossMoves: PotionType[] = ['salud', 'veneno', 'vulnerable'];
                const move = bossMoves[Math.floor(Math.random() * bossMoves.length)];
                
                setTimeout(() => {
                    playSFX('badpotion');
                    if (move === 'salud') {
                        const heal = Math.ceil(bossHP.max * 0.15); // Nerfed
                        setBossHP(p => ({...p, current: Math.min(p.max, p.current + heal)}));
                        setCombatLog("¡Boss usa Poción de Vida!");
                    } else if (move === 'veneno') {
                        setPlayerStatus(p => [...p, {type: 'veneno', turns: 3}]);
                        setCombatLog("¡Boss te ha envenenado!");
                    } else if (move === 'vulnerable') {
                        setPlayerStatus(p => [...p, {type: 'vulnerable', turns: 2}]);
                        setCombatLog("¡Boss rompió tu defensa!");
                    }
                }, 1000);
            }
        }

        // NEXT STEP
        setTimeout(() => checkGameState(), 2500);
    };

    const handleTimeUp = () => {
        setIsAnswered(true);
        setIsCorrect(false);
        processTurn(false, gameState === 'FINISH_IT' ? retryQueue[currentQIndex] : playableQuestions[currentQIndex]);
    };

    const handleUsePotion = (potion: PotionType, idx: number) => {
        if (isAnswered) return; // Only in turn
        playSFX('potion');
        
        const newInv = [...playerInventory];
        newInv.splice(idx, 1);
        setPlayerInventory(newInv);
        setBattleStats(prev => ({ ...prev, potionsUsed: prev.potionsUsed + 1 }));

        if (potion === 'salud') setPlayerHP(p => ({ ...p, current: p.max }));
        else if (potion === 'veneno') setBossStatus(p => [...p, {type: 'veneno', turns: 3}]);
        else if (potion === 'vulnerable') setBossStatus(p => [...p, {type: 'vulnerable', turns: 2}]);
        else if (potion === 'esquiva') setPlayerStatus(p => [...p, {type: 'esquiva', turns: 1}]);
        else if (potion === 'fuerzatemp') setPlayerStatus(p => [...p, {type: 'fuerzatemp', turns: 1}]);
    };

    // --- GAME STATE MACHINE ---
    const checkGameState = () => {
        // 1. Tick Effects
        const tick = (s: StatusEffect[]) => s.map(e => ({...e, turns: e.turns-1})).filter(e => e.turns > 0);
        setPlayerStatus(prev => tick(prev));
        setBossStatus(prev => tick(prev));

        // 2. DoT
        if (bossStatus.some(s => s.type === 'veneno')) {
            const dmg = Math.ceil(bossHP.max * 0.05);
            setBossHP(p => ({...p, current: Math.max(0, p.current - dmg)}));
        }
        if (playerStatus.some(s => s.type === 'veneno')) {
            const dmg = Math.ceil(playerHP.max * 0.05);
            setPlayerHP(p => ({...p, current: Math.max(0, p.current - dmg)}));
        }

        // 3. Win/Loss Checks
        // DELAYED CHECK TO ALLOW STATE UPDATES
        setTimeout(() => {
            if (playerHP.current <= 0) {
                setCombatState('DEFEAT');
                playSFX('gameover');
                setTimeout(() => finishGame('LOSE'), 1500);
                return;
            }

            if (bossHP.current <= 0) {
                // VICTORY CONDITION CHECK
                if (retryQueue.length === 0 && incorrectQuestions.length === 0) {
                    // Pure Win
                    setCombatState('VICTORY');
                    setTimeout(() => finishGame('WIN'), 1500);
                } else {
                    // FINISH IT MODE START
                    if (gameState !== 'FINISH_IT') {
                        // Enter Finish It
                        const queue = retryQueue.length > 0 ? retryQueue : incorrectQuestions;
                        setRetryQueue(queue); // Load ammo
                        setGameState('FINISH_IT');
                        
                        stopBGM();
                        if (queue.length > 5) playBGM('finishit', true);
                        else playBGM('finishit2', true);
                        
                        startQuestion(0);
                    } else {
                        // Already in Finish It, Boss Died Again -> Victory
                        setCombatState('VICTORY');
                        setTimeout(() => finishGame('WIN'), 1500);
                    }
                }
                return;
            }

            // Continue Game
            if (gameState === 'FINISH_IT') {
                // In finish it, if we miss, boss revives
                if (isCorrect === false) {
                    setCombatState('REVIVE');
                    setBossHP(p => ({ ...p, current: Math.ceil(p.max * 0.10) })); // 10% Revive
                    setGameState('PLAYING'); // Back to normal
                    stopBGM();
                    playBGM('battlelevel3', true); // Hard music penalty
                    const nextIdx = (currentQIndex + 1) % playableQuestions.length;
                    startQuestion(nextIdx);
                } else {
                    // Correct in Finish It -> Next in Queue
                    const nextIdx = currentQIndex + 1;
                    if (nextIdx < retryQueue.length) {
                        startQuestion(nextIdx);
                    } else {
                        // Queue Cleared -> Victory
                        setCombatState('VICTORY');
                        setTimeout(() => finishGame('WIN'), 1500);
                    }
                }
            } else {
                // Normal Playing
                const nextIdx = currentQIndex + 1;
                if (nextIdx < playableQuestions.length) {
                    startQuestion(nextIdx);
                } else {
                    // Out of questions but Boss alive?
                    // Check if we have failures to retry loop, else damage check
                    if (incorrectQuestions.length > 0) {
                        setRetryQueue(incorrectQuestions);
                        setIncorrectQuestions([]); // Clear for next pass
                        startQuestion(0); // Loop logic simplified for arcade
                    } else {
                        // No more Qs, Boss alive -> Defeat by attrition
                        setCombatState('DEFEAT');
                        setTimeout(() => finishGame('LOSE'), 1500);
                    }
                }
            }
        }, 100);
    };

    const finishGame = async (result: 'WIN' | 'LOSE') => {
        stopBGM();
        if (result === 'WIN') playBGM('stats', false);
        else playBGM('gameover2', false);
        
        setGameState('STATS');
        
        // Save Stats
        if (evaluation && !evaluationId.includes('demo')) {
            const attemptId = await saveEvaluationAttempt({
                evaluationId,
                nickname,
                score,
                totalTime: Math.floor((Date.now() - startTimeRef.current)/1000),
                accuracy: (battleStats.correctAnswers / Math.max(1, battleStats.totalAnswers)) * 100,
                answersSummary: { correct: battleStats.correctAnswers, incorrect: battleStats.totalAnswers - battleStats.correctAnswers, total: battleStats.totalAnswers }
            });
            setSavedAttemptId(attemptId);
        }
    };

    // --- RENDERERS ---

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500"><Loader2 className="animate-spin w-10 h-10"/></div>;
    if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500"><AlertTriangle className="w-10 h-10 mb-4"/> {error}</div>;

    // ROULETTE
    if (gameState === 'ROULETTE') {
        const items = Object.values(PASSIVES);
        const [spinIdx, setSpinIdx] = useState(0);
        
        useEffect(() => {
            const int = setInterval(() => setSpinIdx(i => (i + 1) % items.length), 100);
            const timeout = setTimeout(() => {
                clearInterval(int);
                const winIdx = Math.floor(Math.random() * items.length);
                setSpinIdx(winIdx);
                setTimeout(() => handleRouletteEnd(items[winIdx].id as PassiveType), 1000);
            }, 3000);
            return () => { clearInterval(int); clearTimeout(timeout); };
        }, []);

        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
                <h2 className="text-3xl font-cyber text-purple-400 mb-8 animate-pulse">SINCRONIZANDO SISTEMA...</h2>
                <div className="w-64 h-64 border-4 border-purple-500 rounded-xl flex items-center justify-center bg-gray-900 shadow-[0_0_50px_purple]">
                    <img src={items[spinIdx].image} className="w-40 h-40 object-contain" />
                </div>
                <p className="mt-6 text-xl text-white font-mono">{items[spinIdx].name}</p>
            </div>
        );
    }

    // LOBBY
    if (gameState === 'LOBBY') {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white bg-[url('/bg-grid.png')]">
                <CyberCard className="max-w-md w-full border-cyan-500/50 p-8 text-center bg-black/80 backdrop-blur">
                    <h1 className="text-4xl font-cyber text-cyan-400 mb-2">{evaluation?.title}</h1>
                    {bossConfig && <div className="flex justify-center my-6"><img src={bossConfig.images.idle} className="w-32 h-32 object-contain animate-pulse drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]" /></div>}
                    <input 
                        value={nickname} 
                        onChange={(e) => setNickname(e.target.value)} 
                        placeholder="NOMBRE DEL JUGADOR"
                        className="w-full bg-black border border-gray-700 p-4 text-center text-xl font-bold rounded mb-4 focus:border-cyan-500 outline-none"
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

                    <div className="flex gap-4">
                        <Leaderboard evaluationId={evaluationId} currentAttemptId={savedAttemptId} />
                        <div className="flex-1 flex flex-col justify-end gap-3">
                            <CyberButton onClick={() => window.location.href = '/'} variant="ghost" className="w-full">VOLVER</CyberButton>
                        </div>
                    </div>
                </CyberCard>
            </div>
        );
    }

    // PLAYING & FINISH IT (BATTLE UI)
    const currentQ = gameState === 'FINISH_IT' ? retryQueue[currentQIndex] : playableQuestions[currentQIndex];
    const isBossMode = true; // Always true in this refactor context
    
    // Background based on state
    const bgClass = gameState === 'FINISH_IT' 
        ? (retryQueue.length > 5 ? 'bg-red-950' : 'bg-gray-900') 
        : 'bg-[#050505]';

    return (
        <div className={`min-h-screen ${bgClass} text-white flex flex-col font-sans select-none overflow-hidden relative transition-colors duration-1000 ${shakeScreen ? 'animate-shake' : ''}`}>
            
            {/* BOSS HUD */}
            <div className="absolute top-0 left-0 w-full p-4 z-20 pointer-events-none flex justify-between items-start">
                {/* BOSS HP */}
                <div className="w-1/2 md:w-1/3">
                    <div className="flex items-center gap-2 mb-1">
                        <Skull className="w-5 h-5 text-red-500" />
                        <span className="font-cyber font-bold text-red-500 text-shadow-red">{bossConfig?.bossName}</span>
                    </div>
                    <div className="w-full h-6 bg-gray-900 rounded border border-red-900 overflow-hidden relative">
                        <div className="h-full bg-red-600 transition-all duration-500 ease-out" style={{ width: `${(bossHP.current / bossHP.max) * 100}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-white/80">{bossHP.current}/{bossHP.max}</span>
                    </div>
                    {/* BOSS STATUS */}
                    <div className="flex gap-1 mt-1">
                        {bossStatus.map((s, i) => <img key={i} src={POTIONS[s.type].image} className="w-6 h-6 border border-red-500 rounded bg-black" title={s.type}/>)}
                    </div>
                </div>

                {/* TIMER & ROUND */}
                <div className="flex flex-col items-end">
                    <div className={`text-4xl font-black font-mono ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}</div>
                    <div className="text-xs text-gray-500 font-mono">Q: {currentQIndex + 1}</div>
                </div>
            </div>

            {/* BOSS AVATAR (CENTER) */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full flex justify-center z-10 pointer-events-none">
                <img 
                    src={combatState === 'PLAYER_ATTACK' ? bossConfig?.images.damage : bossConfig?.images.idle} 
                    className={`h-[40vh] max-h-[400px] object-contain transition-all duration-100 ${isHit ? 'filter brightness-200 contrast-150 scale-105' : 'drop-shadow-[0_0_30px_rgba(255,0,0,0.2)]'}`}
                    style={isHit ? { transform: 'translate(5px, -5px) skew(10deg)' } : {}}
                />
                {combatState === 'PLAYER_ATTACK' && <div className="absolute top-10 text-6xl font-black text-yellow-400 font-cyber animate-bounce drop-shadow-lg">CRITICAL!</div>}
                {combatLog && <div className="absolute -bottom-10 bg-red-900/80 text-white px-4 py-2 rounded font-mono font-bold animate-in fade-in slide-in-from-top-4">{combatLog}</div>}
            </div>

            {/* PLAYER HUD (BOTTOM) */}
            <div className="flex-1 flex flex-col justify-end pb-4 px-4 z-20">
                {/* STATUS BAR */}
                <div className="max-w-4xl mx-auto w-full flex justify-between items-end mb-4 pointer-events-auto">
                    {/* INVENTORY */}
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

                    {/* PLAYER HEALTH & PASSIVE */}
                    <div className="flex flex-col items-end gap-1 w-1/3">
                        <div className="flex items-center gap-2">
                            {/* PASSIVE ICON */}
                            {passiveEffect && (
                                <div className="w-8 h-8 rounded-full bg-purple-900 border border-purple-500 flex items-center justify-center" title={PASSIVES[passiveEffect].name}>
                                    <img src={PASSIVES[passiveEffect].image} className="w-6 h-6" />
                                </div>
                            )}
                            {/* PLAYER STATUS ICONS */}
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

                    <h3 className="text-xl md:text-2xl font-bold text-center mb-6 min-h-[60px] flex items-center justify-center">{currentQ?.text}</h3>

                    {/* OPTIONS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQ?.options.map((opt, i) => {
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
                                    onClick={() => handleAnswer(opt.id, null)}
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
