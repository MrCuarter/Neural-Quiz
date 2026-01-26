
import React, { useState, useEffect, useRef } from 'react';
import { getEvaluation, saveEvaluationAttempt } from '../../services/firebaseService';
import { Evaluation, Question, BossSettings, QUESTION_TYPES } from '../../types';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { Loader2, AlertTriangle, Backpack, Skull, Sword, CheckSquare, Square, Type, ArrowUp, ArrowDown } from 'lucide-react';
import { Leaderboard } from './Leaderboard';
import { PRESET_BOSSES } from '../../data/bossPresets';
import { StudentLogin } from '../student/StudentLogin';

// --- CONSTANTS & TYPES ---

const ASSETS_BASE = "https://assets.mistercuarter.es";

type GameState = 'LOBBY' | 'ROULETTE' | 'PLAYING' | 'FINISH_IT' | 'STATS';
type CombatState = 'IDLE' | 'PLAYER_ATTACK' | 'BOSS_ATTACK' | 'VICTORY' | 'DEFEAT' | 'REVIVE';

type PassiveType = 'agil' | 'answer' | 'certero' | 'escudo' | 'fuerza' | 'suerte' | 'tiempo';
type PotionType = 'salud' | 'veneno' | 'vulnerable' | 'esquiva' | 'fuerzatemp';

interface ItemData { id: string; name: string; description: string; image: string; }
interface StatusEffect { type: PotionType; turns: number; }
interface BattleStats { totalDamage: number; maxCrit: number; dodges: number; potionsUsed: number; potionsStolen: number; correctAnswers: number; totalAnswers: number; }

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

const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

// --- MAIN COMPONENT ---

interface ArcadePlayProps {
    evaluationId?: string;
    previewConfig?: { quiz: any; bossConfig: BossSettings }; // For Preview Mode
}

export const ArcadePlay: React.FC<ArcadePlayProps> = ({ evaluationId, previewConfig }) => {
    // --- STATE: SYSTEM ---
    const [loading, setLoading] = useState(!previewConfig);
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
    const [battleStats, setBattleStats] = useState<BattleStats>({ totalDamage: 0, maxCrit: 0, dodges: 0, potionsUsed: 0, potionsStolen: 0, correctAnswers: 0, totalAnswers: 0 });
    const startTimeRef = useRef<number>(0);
    const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);

    // UI State
    const [timeLeft, setTimeLeft] = useState(20);
    const [shakeScreen, setShakeScreen] = useState(false);
    const [isHit, setIsHit] = useState(false);

    // --- MANUAL INPUT STATES ---
    const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
    const [textInput, setTextInput] = useState("");
    const [orderedOptions, setOrderedOptions] = useState<any[]>([]);

    // Refs
    const timerRef = useRef<any>(null);
    const bgmRef = useRef<HTMLAudioElement | null>(null);

    // --- AUDIO SYSTEM ---
    const playBGM = (trackName: string) => {
        if (bgmRef.current) { bgmRef.current.pause(); bgmRef.current = null; }
        const audio = new Audio(`${ASSETS_BASE}/sounds/${trackName}.mp3`);
        audio.loop = true; audio.volume = 0.3; bgmRef.current = audio;
        audio.play().catch(() => {});
    };
    const playSFX = (trackName: string) => {
        const audio = new Audio(`${ASSETS_BASE}/sounds/${trackName}.mp3`);
        audio.volume = 0.8; audio.play().catch(() => {});
    };

    // --- EFFECT: AUDIO STATE MANAGER ---
    useEffect(() => {
        if (loading) return;
        let track = '';
        if (gameState === 'ROULETTE') track = 'menu';
        else if (gameState === 'PLAYING') {
            track = 'battlelevel2';
            if (bossConfig?.difficulty === 'easy') track = 'battlelevel1';
            if (bossConfig?.difficulty === 'hard') track = 'battlelevel3';
            if (bossConfig?.difficulty === 'legend') track = 'battlelevel4';
        } else if (gameState === 'FINISH_IT') {
            track = retryQueue.length > 5 ? 'finishit' : 'finishit2';
        } else if (gameState === 'STATS') {
            track = combatState === 'VICTORY' ? 'stats' : 'gameover2';
        }
        if (track) playBGM(track); else if (bgmRef.current) { bgmRef.current.pause(); bgmRef.current = null; }
        return () => { if (bgmRef.current) bgmRef.current.pause(); };
    }, [gameState, loading, bossConfig, combatState]);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (previewConfig) {
            setBossConfig(previewConfig.bossConfig);
            setEvaluation({ title: "MODO PREVIEW", ...previewConfig.quiz } as any);
            setBossHP({ current: previewConfig.bossConfig.health.bossHP, max: previewConfig.bossConfig.health.bossHP });
            setPlayerHP({ current: previewConfig.bossConfig.health.playerHP, max: previewConfig.bossConfig.health.playerHP });
            setPlayableQuestions(shuffleArray(previewConfig.quiz.questions).slice(0, 10));
            setLoading(false);
            return;
        }

        const init = async () => {
            if (!evaluationId) return;
            try {
                const data = await getEvaluation(evaluationId);
                if (!data) throw new Error("Evaluación no encontrada");
                let settings = data.config.bossSettings || PRESET_BOSSES['kryon_v'];
                setEvaluation(data);
                setBossConfig(settings);
                setBossHP({ current: settings.health.bossHP, max: settings.health.bossHP });
                setPlayerHP({ current: settings.health.playerHP, max: settings.health.playerHP });
                
                const shuffled = shuffleArray(data.questions).slice(0, data.config.questionCount || 10);
                const prepared = shuffled.map(q => ({
                    ...q,
                    options: (q.questionType !== QUESTION_TYPES.TRUE_FALSE && q.questionType !== QUESTION_TYPES.ORDER) 
                        ? shuffleArray(q.options) 
                        : q.options
                }));
                setPlayableQuestions(prepared);
            } catch (e: any) { setError(e.message); } finally { setLoading(false); }
        };
        init();
    }, [evaluationId, previewConfig]);

    // --- TIMER LOGIC ---
    useEffect(() => {
        if ((gameState === 'PLAYING' || gameState === 'FINISH_IT') && combatState === 'IDLE' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { handleAttack(true); return 0; } // Auto-submit on time up
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [gameState, combatState, timeLeft]);

    // --- GAME ACTIONS ---
    const handleStart = (name: string) => {
        setNickname(name);
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
        if (!queue || index >= queue.length) { finishGame('LOSE'); return; }

        setCurrentQIndex(index);
        const q = queue[index];
        
        let time = q.timeLimit || 30;
        if (passiveEffect === 'tiempo') time += 5;
        
        setTimeLeft(time);
        setCombatState('IDLE');
        setShakeScreen(false);
        setIsHit(false);
        setLootDrop(null);
        setCombatLog(null);
        
        // Reset Inputs
        setSelectedOptionIds([]);
        setTextInput("");
        if (q.questionType === QUESTION_TYPES.ORDER) {
            setOrderedOptions(shuffleArray([...q.options]));
        }
    };

    // --- BATTLE LOGIC ---
    const handleAttack = (isTimeout = false) => {
        clearInterval(timerRef.current);
        const currentQ = gameState === 'FINISH_IT' ? retryQueue[currentQIndex] : playableQuestions[currentQIndex];
        let isRight = false;

        // Validation Logic
        if (isTimeout) {
            isRight = false;
        } else {
            const correctIds = currentQ.correctOptionIds || (currentQ.correctOptionId ? [currentQ.correctOptionId] : []);
            
            if (currentQ.questionType === QUESTION_TYPES.FILL_GAP || currentQ.questionType === 'Short Answer') {
                // Short Answer Validation
                const validAnswers = currentQ.options.map(o => o.text.trim().toLowerCase());
                const playerText = textInput.trim().toLowerCase();
                isRight = validAnswers.includes(playerText);
            } 
            else if (currentQ.questionType === QUESTION_TYPES.MULTI_SELECT) {
                // Multi Select: Must match ALL correct IDs exactly
                const selectedSet = new Set(selectedOptionIds);
                const correctSet = new Set(correctIds);
                // Check sets equality
                if (selectedSet.size === correctSet.size) {
                    isRight = [...selectedSet].every(id => correctSet.has(id));
                }
            } 
            else if (currentQ.questionType === QUESTION_TYPES.ORDER) {
                // Order: Compare IDs in order
                isRight = orderedOptions.every((opt, idx) => opt.id === currentQ.options[idx].id); 
                // Note: currentQ.options is usually the "correct order" if data is structured that way.
                // Actually, original data structure stores options in correct order usually.
            }
            else {
                // Single Choice / TF
                isRight = correctIds.includes(selectedOptionIds[0]);
            }
        }

        setBattleStats(prev => ({
            ...prev,
            totalAnswers: prev.totalAnswers + 1,
            correctAnswers: isRight ? prev.correctAnswers + 1 : prev.correctAnswers
        }));

        processTurn(isRight, currentQ);
    };

    const processTurn = (correct: boolean, q: Question) => {
        setPlayerStatus(p => p.map(s => ({...s, turns: s.turns-1})).filter(s => s.turns > 0));
        setBossStatus(p => p.map(s => ({...s, turns: s.turns-1})).filter(s => s.turns > 0));

        if (correct) {
            processPlayerAttack();
        } else {
            processPlayerMiss(q);
        }

        setTimeout(() => checkWinConditionOrNext(correct), 2500);
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

        if (Math.random() < (passiveEffect === 'suerte' ? 0.25 : 0.10)) {
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

        if (playerStatus.some(s => s.type === 'esquiva') || (passiveEffect === 'agil' && Math.random() < 0.2)) {
            setCombatLog("¡ESQUIVADO!");
            playSFX('miss');
            setBattleStats(p => ({ ...p, dodges: p.dodges + 1 }));
            return;
        }

        let damage = Math.ceil(playerHP.max * 0.2);
        if (passiveEffect === 'escudo') damage = Math.ceil(damage * 0.85);
        if (playerStatus.some(s => s.type === 'vulnerable')) damage *= 2;

        setPlayerHP(prev => ({ ...prev, current: Math.max(0, prev.current - damage) }));
        setCombatState('BOSS_ATTACK');
        setTimeout(() => { playSFX('hit'); setShakeScreen(true); }, 200);
        setTimeout(() => setShakeScreen(false), 500);

        const voiceUrl = (bossConfig as any)?.attackVoice;
        if (voiceUrl) {
            setTimeout(() => {
                const voice = new Audio(voiceUrl);
                voice.volume = 1.0;
                voice.play().catch(() => {});
            }, 300);
        }
    };

    const checkWinConditionOrNext = (lastWasCorrect: boolean) => {
        if (playerHP.current <= 0) {
            setCombatState('DEFEAT'); // Boss Wins logic here (Image update)
            playSFX('gameover');
            setTimeout(() => finishGame('LOSE'), 1500);
            return;
        }
        if (bossHP.current <= 0) {
            // Boss Defeated Logic
            const hasPending = retryQueue.length > 0 || incorrectQuestions.length > 0;
            if (!hasPending || gameState === 'FINISH_IT') {
                setCombatState('VICTORY');
                setTimeout(() => finishGame('WIN'), 1500);
            } else {
                setRetryQueue(retryQueue.length > 0 ? retryQueue : incorrectQuestions); 
                setGameState('FINISH_IT'); 
                startQuestion(0);
            }
            return;
        }

        // Next Question
        if (gameState === 'FINISH_IT') {
            if (!lastWasCorrect) {
                setCombatState('REVIVE');
                setBossHP(p => ({ ...p, current: Math.ceil(p.max * 0.10) }));
                setGameState('PLAYING'); 
                setRetryQueue([]);
                startQuestion((currentQIndex + 1) % playableQuestions.length);
            } else {
                const nextIdx = currentQIndex + 1;
                if (nextIdx < retryQueue.length) startQuestion(nextIdx);
                else { setCombatState('VICTORY'); setTimeout(() => finishGame('WIN'), 1500); }
            }
        } else {
            const nextIdx = currentQIndex + 1;
            if (nextIdx < playableQuestions.length) startQuestion(nextIdx);
            else {
                if (incorrectQuestions.length > 0) {
                    setRetryQueue(incorrectQuestions);
                    setIncorrectQuestions([]);
                    setGameState('FINISH_IT'); 
                    startQuestion(0);
                } else {
                    setCombatState('DEFEAT');
                    setTimeout(() => finishGame('LOSE'), 1500);
                }
            }
        }
    };

    const finishGame = async (result: 'WIN' | 'LOSE') => {
        setGameState('STATS'); 
        if (evaluationId && !evaluationId.includes('demo') && !previewConfig) {
            await saveEvaluationAttempt({
                evaluationId, nickname, score,
                totalTime: Math.floor((Date.now() - startTimeRef.current) / 1000),
                accuracy: (battleStats.correctAnswers / Math.max(1, battleStats.totalAnswers)) * 100,
                answersSummary: { correct: battleStats.correctAnswers, incorrect: battleStats.totalAnswers - battleStats.correctAnswers, total: battleStats.totalAnswers }
            });
        }
    };

    const handleUsePotion = (potion: PotionType, index: number) => {
        playSFX('potion');
        const newInv = [...playerInventory]; newInv.splice(index, 1); setPlayerInventory(newInv);
        setBattleStats(p => ({...p, potionsUsed: p.potionsUsed + 1}));
        if (potion === 'salud') setPlayerHP(p => ({...p, current: p.max}));
        else if (potion === 'veneno') setBossStatus(p => [...p, {type: 'veneno', turns: 3}]);
        else if (potion === 'vulnerable') setBossStatus(p => [...p, {type: 'vulnerable', turns: 2}]);
        else if (potion === 'esquiva') setPlayerStatus(p => [...p, {type: 'esquiva', turns: 1}]);
        else if (potion === 'fuerzatemp') setPlayerStatus(p => [...p, {type: 'fuerzatemp', turns: 1}]);
    };

    // --- HELPER: GET CURRENT BOSS IMAGE ---
    const getBossImage = () => {
        if (combatState === 'VICTORY') return bossConfig?.images.defeat; // Boss loses -> Defeat img
        if (combatState === 'DEFEAT') return bossConfig?.images.win;     // Boss wins -> Win img (Laughing)
        if (combatState === 'PLAYER_ATTACK') return bossConfig?.images.damage || bossConfig?.images.idle;
        return bossConfig?.images.idle;
    };

    // --- HELPER: RENDER INPUT ---
    const renderInputArea = (q: Question) => {
        // 1. TEXT INPUT (Short Answer)
        if (q.questionType === QUESTION_TYPES.FILL_GAP || q.questionType === 'Short Answer') {
            return (
                <div className="w-full">
                    <input 
                        autoFocus
                        type="text" 
                        value={textInput} 
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        className="w-full bg-black/50 border-2 border-cyan-500/50 rounded-lg p-4 text-xl text-center text-white focus:border-cyan-400 outline-none font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleAttack()}
                    />
                </div>
            );
        }

        // 2. ORDERING
        if (q.questionType === QUESTION_TYPES.ORDER) {
            const moveItem = (fromIdx: number, toIdx: number) => {
                const list = [...orderedOptions];
                const [moved] = list.splice(fromIdx, 1);
                list.splice(toIdx, 0, moved);
                setOrderedOptions(list);
            };
            return (
                <div className="w-full space-y-2">
                    {orderedOptions.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-2 bg-gray-800 p-3 rounded border border-gray-600">
                            <span className="font-bold font-mono text-cyan-400 w-6">{idx + 1}</span>
                            <span className="flex-1 text-sm">{opt.text}</span>
                            <div className="flex flex-col gap-1">
                                <button onClick={() => idx > 0 && moveItem(idx, idx - 1)} className="p-1 hover:bg-gray-700 rounded"><ArrowUp className="w-4 h-4"/></button>
                                <button onClick={() => idx < orderedOptions.length - 1 && moveItem(idx, idx + 1)} className="p-1 hover:bg-gray-700 rounded"><ArrowDown className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // 3. MULTIPLE CHOICE / MULTI SELECT
        const isMulti = q.questionType === QUESTION_TYPES.MULTI_SELECT;
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {q.options.map((opt, i) => {
                    const isSelected = selectedOptionIds.includes(opt.id);
                    return (
                        <button 
                            key={opt.id} 
                            onClick={() => {
                                if (isMulti) {
                                    setSelectedOptionIds(prev => prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]);
                                } else {
                                    setSelectedOptionIds([opt.id]);
                                }
                            }}
                            className={`p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3 relative overflow-hidden group
                                ${isSelected ? 'bg-cyan-900/40 border-cyan-400' : 'bg-gray-900/40 border-gray-700 hover:border-gray-500'}
                            `}
                        >
                            <div className={`w-6 h-6 rounded border flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-gray-500'}`}>
                                {isMulti ? (isSelected && <CheckSquare className="w-4 h-4"/>) : (isSelected && <div className="w-3 h-3 bg-black rounded-full"/>)}
                            </div>
                            <span className="text-sm font-bold flex-1">{opt.text}</span>
                            {opt.imageUrl && <img src={opt.imageUrl} className="w-12 h-12 object-cover rounded border border-gray-600" />}
                        </button>
                    );
                })}
            </div>
        );
    };

    // --- RENDERS ---
    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500"><Loader2 className="animate-spin w-12 h-12" /></div>;
    if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500"><AlertTriangle className="w-12 h-12 mb-4" /> {error}</div>;

    // ROULETTE
    if (gameState === 'ROULETTE') {
        const items = Object.values(PASSIVES);
        const RouletteInner = () => {
            const [idx, setIdx] = useState(0);
            useEffect(() => {
                const interval = setInterval(() => setIdx(i => (i + 1) % items.length), 100);
                setTimeout(() => { clearInterval(interval); setIdx(Math.floor(Math.random() * items.length)); setTimeout(() => handleRouletteEnd(items[idx].id as PassiveType), 1500); }, 3000);
                return () => clearInterval(interval);
            }, []);
            return (
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
                    <h2 className="text-3xl font-cyber text-purple-400 mb-8 animate-pulse">SISTEMA RPG INICIANDO...</h2>
                    <img src={items[idx].image} className="w-40 h-40 object-contain border-4 border-purple-500 rounded-xl p-4 bg-gray-900 shadow-[0_0_50px_purple]" />
                    <p className="mt-6 text-xl text-white font-mono">{items[idx].name}</p>
                </div>
            );
        };
        return <RouletteInner />;
    }

    // LOBBY (Login)
    if (gameState === 'LOBBY') {
        return <StudentLogin bossConfig={bossConfig!} quizTitle={evaluation?.title || "Quiz"} onJoin={handleStart} />;
    }

    // STATS / GAME OVER
    if (gameState === 'STATS') {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
                <CyberCard className="max-w-2xl w-full border-gray-700 bg-gray-900/90 p-8 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-2 ${combatState === 'VICTORY' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div className="text-center mb-8">
                        <h2 className={`text-5xl font-black font-cyber mb-2 ${combatState === 'VICTORY' ? 'text-green-400' : 'text-red-500'}`}>{combatState === 'VICTORY' ? "MISIÓN CUMPLIDA" : "GAME OVER"}</h2>
                        <p className="text-gray-400 font-mono italic">"{combatState === 'VICTORY' ? bossConfig?.messages.playerWins : bossConfig?.messages.bossWins}"</p>
                    </div>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-black/40 p-4 rounded border border-gray-700"><div className="text-xs text-gray-500 uppercase">Daño Total</div><div className="text-2xl font-mono text-white">{battleStats.totalDamage}</div></div>
                        <div className="bg-black/40 p-4 rounded border border-gray-700"><div className="text-xs text-gray-500 uppercase">Golpe Crítico</div><div className="text-2xl font-mono text-yellow-400">{battleStats.maxCrit}</div></div>
                        <div className="bg-black/40 p-4 rounded border border-gray-700"><div className="text-xs text-gray-500 uppercase">Precisión</div><div className="text-2xl font-mono text-cyan-400">{Math.round((battleStats.correctAnswers / Math.max(1, battleStats.totalAnswers)) * 100)}%</div></div>
                        <div className="bg-black/40 p-4 rounded border border-gray-700"><div className="text-xs text-gray-500 uppercase">Loot Robado</div><div className="text-2xl font-mono text-purple-400">{battleStats.potionsStolen}</div></div>
                    </div>
                    {!previewConfig ? <Leaderboard evaluationId={evaluationId!} currentAttemptId={savedAttemptId} /> : <div className="text-center text-yellow-500 font-mono">Modo Preview: No se guardan resultados.</div>}
                    <CyberButton onClick={() => window.location.href = '/'} variant="ghost" className="w-full mt-4">VOLVER AL INICIO</CyberButton>
                </CyberCard>
            </div>
        );
    }

    const currentQ = gameState === 'FINISH_IT' ? retryQueue[currentQIndex] : playableQuestions[currentQIndex];
    if (!currentQ) return null;

    return (
        <div className={`min-h-screen bg-[#050505] text-white flex flex-col font-sans select-none overflow-hidden relative transition-colors duration-1000 ${shakeScreen ? 'animate-shake' : ''}`}>
            
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

            {/* BOSS AVATAR (CENTER) */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full flex justify-center z-10 pointer-events-none">
                <img 
                    src={getBossImage()} 
                    crossOrigin="anonymous"
                    className={`h-[35vh] max-h-[350px] object-contain transition-all duration-100 ${isHit ? 'filter brightness-200 contrast-150 scale-105' : 'drop-shadow-[0_0_30px_rgba(255,0,0,0.2)]'}`}
                    style={isHit ? { transform: 'translate(5px, -5px) skew(10deg)' } : {}}
                    alt="Boss"
                />
                {combatState === 'PLAYER_ATTACK' && <div className="absolute top-10 text-6xl font-black text-yellow-400 font-cyber animate-bounce drop-shadow-lg">CRITICAL!</div>}
                {combatLog && <div className="absolute -bottom-10 bg-red-900/80 text-white px-4 py-2 rounded font-mono font-bold animate-in fade-in slide-in-from-top-4">{combatLog}</div>}
            </div>

            {/* PLAYER INTERFACE (BOTTOM) */}
            <div className="flex-1 flex flex-col justify-end pb-4 px-4 z-20">
                {/* Inventory & HP */}
                <div className="max-w-4xl mx-auto w-full flex justify-between items-end mb-4 pointer-events-auto">
                    <div className="flex gap-2">
                        {playerInventory.map((item, idx) => (
                            <button key={idx} onClick={() => handleUsePotion(item, idx)} disabled={combatState !== 'IDLE'} className="w-12 h-12 bg-black/60 border border-gray-600 rounded hover:border-yellow-400 flex items-center justify-center relative group transition-all hover:scale-110">
                                <img src={POTIONS[item].image} className="w-8 h-8" />
                            </button>
                        ))}
                        {playerInventory.length < 5 && Array.from({length: 5 - playerInventory.length}).map((_, i) => (
                            <div key={i} className="w-12 h-12 bg-black/20 border border-gray-800 rounded flex items-center justify-center opacity-30"><Backpack className="w-4 h-4"/></div>
                        ))}
                    </div>
                    <div className="flex flex-col items-end gap-1 w-1/3">
                        <div className="flex items-center gap-2">
                            {passiveEffect && <img src={PASSIVES[passiveEffect].image} className="w-6 h-6 border border-purple-500 rounded-full bg-purple-900" />}
                            <span className="font-cyber font-bold text-green-400">{nickname}</span>
                        </div>
                        <div className="w-full h-4 bg-gray-900 rounded border border-green-900 overflow-hidden relative">
                            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(playerHP.current / playerHP.max) * 100}%` }} />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-black/80">{playerHP.current}/{playerHP.max}</span>
                        </div>
                    </div>
                </div>

                {/* ACTION CARD */}
                <div className="max-w-4xl mx-auto w-full bg-black/80 backdrop-blur-md border border-gray-700 p-6 rounded-xl shadow-2xl relative pointer-events-auto">
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

                    {/* DYNAMIC INPUT AREA */}
                    {combatState === 'IDLE' ? (
                        <div className="space-y-6">
                            {renderInputArea(currentQ)}
                            
                            <button 
                                onClick={() => handleAttack()} 
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black font-cyber text-xl tracking-widest rounded shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 border-2 border-red-400"
                            >
                                <Sword className="w-6 h-6" /> ATACAR
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-20">
                            <span className="font-cyber text-2xl animate-pulse text-cyan-400">PROCESANDO COMBATE...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
