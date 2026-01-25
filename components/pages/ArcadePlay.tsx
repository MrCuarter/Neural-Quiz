
import React, { useState, useEffect, useRef } from 'react';
import { getEvaluation, saveEvaluationAttempt } from '../../services/firebaseService';
import { Evaluation, Question, EvaluationAttempt, QUESTION_TYPES, BossSettings } from '../../types';
import { CyberButton, CyberCard, CyberInput } from '../ui/CyberUI';
import { Loader2, AlertTriangle, User, Rocket, Monitor, Clock, CheckCircle2, XCircle, Trophy, Star, RotateCcw, Timer, Flame, CloudUpload, CheckSquare, Square, Type, Check, Skull, Shield, Heart } from 'lucide-react';
import { Leaderboard } from './Leaderboard';
import { PRESET_BOSSES } from '../../data/bossPresets';

interface ArcadePlayProps {
    evaluationId: string;
    onExit?: () => void;
}

type GameState = 'LOBBY' | 'PLAYING' | 'FINISHED';
type CombatState = 'IDLE' | 'PLAYER_ATTACK' | 'BOSS_ATTACK' | 'VICTORY' | 'DEFEAT';

// --- UTILS ---

const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

const cleanQuestionText = (text: string): string => {
    if (!text) return "";
    return text.replace(/(\n|\s)+(?:[a-d1-4][\.\)]|[•\-])\s+.*$/is, "").trim();
};

const normalizeText = (text: string): string => {
    return text.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""); 
};

export const ArcadePlay: React.FC<ArcadePlayProps> = ({ evaluationId }) => {
    // --- DATA LOADING STATE ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [playableQuestions, setPlayableQuestions] = useState<Question[]>([]);
    
    // --- PLAYER STATE ---
    const [nickname, setNickname] = useState("");
    const [gameState, setGameState] = useState<GameState>('LOBBY');
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0); 

    // --- GAME ENGINE STATE ---
    const [currentQIndex, setCurrentQIndex] = useState(0);
    
    // Timers
    const [timeLeft, setTimeLeft] = useState(20);
    const [globalTimeLeft, setGlobalTimeLeft] = useState(0);
    
    // Stats Tracking
    const startTimeRef = useRef<number>(0);
    const [correctCount, setCorrectCount] = useState(0);
    
    // --- ANSWER STATE ---
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [selectedMultiIds, setSelectedMultiIds] = useState<string[]>([]);
    const [textAnswer, setTextAnswer] = useState("");

    // Redemption & Retry Logic
    const [incorrectQuestions, setIncorrectQuestions] = useState<Question[]>([]); 
    const [retryQueue, setRetryQueue] = useState<Question[]>([]); 
    const [isRedemptionRound, setIsRedemptionRound] = useState(false);

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [savedAttemptId, setSavedAttemptId] = useState<string | null>(null);

    // --- BOSS BATTLE STATE (New Phase 6-B) ---
    const [bossConfig, setBossConfig] = useState<BossSettings | null>(null);
    const [combatState, setCombatState] = useState<CombatState>('IDLE');
    const [bossHP, setBossHP] = useState({ current: 1000, max: 1000 });
    const [playerHP, setPlayerHP] = useState({ current: 100, max: 100 });
    const [shakeScreen, setShakeScreen] = useState(false); // Visual effect

    // Refs for intervals
    const timerRef = useRef<any>(null);
    const globalTimerRef = useRef<any>(null);

    // --- 1. LOAD EVALUATION DATA ---
    useEffect(() => {
        const loadEvaluation = async () => {
            setLoading(true);
            try {
                const data = await getEvaluation(evaluationId);
                
                if (!data.isActive) throw new Error("Esta evaluación ha sido cerrada por el profesor.");
                
                const now = new Date();
                const startDate = new Date(data.config.startDate);
                if (now < startDate) throw new Error(`La evaluación comienza el ${startDate.toLocaleString()}`);
                if (data.config.endDate && now > new Date(data.config.endDate)) throw new Error("El plazo ha finalizado.");

                setEvaluation(data);
                prepareGame(data);

            } catch (e: any) {
                console.error(e);
                setError(e.message || "No se pudo cargar la evaluación.");
            } finally {
                setLoading(false);
            }
        };

        loadEvaluation();
    }, [evaluationId]);

    // --- 2. SUBMISSION LOGIC ---
    useEffect(() => {
        const submitScore = async () => {
            if (gameState === 'FINISHED' && !isRedemptionRound && !hasSubmitted && !isSubmitting && evaluation) {
                setIsSubmitting(true);
                try {
                    const endTime = Date.now();
                    const totalDurationSeconds = Math.floor((endTime - startTimeRef.current) / 1000);
                    const saneDuration = Math.min(totalDurationSeconds, 3600); 
                    
                    const totalQs = evaluation.config.questionCount;
                    const accuracy = totalQs > 0 ? (correctCount / totalQs) * 100 : 0;

                    const attemptData: Omit<EvaluationAttempt, 'id' | 'timestamp'> = {
                        evaluationId: evaluationId,
                        nickname: nickname,
                        score: score,
                        totalTime: saneDuration,
                        accuracy: accuracy,
                        answersSummary: {
                            correct: correctCount,
                            incorrect: totalQs - correctCount,
                            total: totalQs
                        }
                    };

                    const id = await saveEvaluationAttempt(attemptData);
                    setSavedAttemptId(id);
                    setHasSubmitted(true);
                } catch (e) {
                    console.error("Submission failed", e);
                } finally {
                    setIsSubmitting(false);
                }
            }
        };

        submitScore();
    }, [gameState, isRedemptionRound, hasSubmitted, isSubmitting, evaluation, correctCount, score, nickname, evaluationId]);


    // Initial Preparation
    const prepareGame = (data: Evaluation) => {
        const shuffled = shuffleArray(data.questions);
        const limit = data.config.questionCount || data.questions.length;
        const finalSet = shuffled.slice(0, limit);
        
        const readyQuestions = finalSet.map(q => ({
            ...q,
            options: shuffleArray(q.options)
        }));

        setPlayableQuestions(readyQuestions);
        
        // Mode Specific Setup
        if (data.config.gameMode === 'time_attack' && data.config.timeLimit) {
            setGlobalTimeLeft(data.config.timeLimit);
        } else if (data.config.gameMode === 'final_boss') {
            // Setup Boss
            const settings = data.config.bossSettings || PRESET_BOSSES.CYBORG_PRIME;
            setBossConfig(settings);
            setBossHP({ current: settings.health.bossHP, max: settings.health.bossHP });
            setPlayerHP({ current: settings.health.playerHP, max: settings.health.playerHP });
        }
    };

    // --- 3. TIMERS ---
    // A. Local Timer
    useEffect(() => {
        if (gameState === 'PLAYING' && !isRedemptionRound && evaluation?.config.gameMode !== 'time_attack' && !isAnswered && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (isRedemptionRound && gameState === 'PLAYING' && !isAnswered && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameState, isAnswered, timeLeft, evaluation?.config.gameMode, isRedemptionRound]);

    // B. Global Timer (Time Attack Only)
    useEffect(() => {
        if (gameState === 'PLAYING' && !isRedemptionRound && evaluation?.config.gameMode === 'time_attack') {
            globalTimerRef.current = setInterval(() => {
                setGlobalTimeLeft((prev) => {
                    if (prev <= 1) {
                        finishGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (globalTimerRef.current) clearInterval(globalTimerRef.current); };
    }, [gameState, evaluation?.config.gameMode, isRedemptionRound]);

    // --- 4. GAME ACTIONS & VALIDATION ---

    const handleJoin = () => {
        if (!nickname.trim()) return;
        setGameState('PLAYING');
        startTimeRef.current = Date.now();
        startQuestion(0);
    };

    const startQuestion = (index: number) => {
        setCurrentQIndex(index);
        const q = playableQuestions[index];
        const timeLimit = q.timeLimit && q.timeLimit > 0 ? q.timeLimit : 20;
        
        if (evaluation?.config.gameMode === 'classic' || evaluation?.config.gameMode === 'final_boss' || isRedemptionRound) {
            setTimeLeft(timeLimit);
        }
        
        // Reset State
        setIsAnswered(false);
        setIsCorrect(null);
        setSelectedOptionId(null);
        setSelectedMultiIds([]);
        setTextAnswer("");
        setCombatState('IDLE'); // Reset combat anim
        setShakeScreen(false);
    };

    // UNIFIED VALIDATOR
    const validateAnswer = (type: 'SINGLE' | 'MULTI' | 'TEXT', payload: string | string[]): boolean => {
        const currentQ = playableQuestions[currentQIndex];
        const correctIds = currentQ.correctOptionIds || [currentQ.correctOptionId];

        if (type === 'SINGLE') return correctIds.includes(payload as string);
        if (type === 'MULTI') {
            const userSet = new Set(payload as string[]);
            const correctSet = new Set(correctIds);
            if (userSet.size !== correctSet.size) return false;
            for (let id of userSet) if (!correctSet.has(id)) return false;
            return true;
        }
        if (type === 'TEXT') {
            const userText = normalizeText(payload as string);
            return currentQ.options.some(opt => normalizeText(opt.text) === userText);
        }
        return false;
    };

    const submitAnswer = (type: 'SINGLE' | 'MULTI' | 'TEXT') => {
        if (isAnswered) return;
        if (timerRef.current) clearInterval(timerRef.current);
        
        setIsAnswered(true);
        let result = false;

        if (type === 'SINGLE') result = validateAnswer('SINGLE', selectedOptionId!);
        if (type === 'MULTI') result = validateAnswer('MULTI', selectedMultiIds);
        if (type === 'TEXT') result = validateAnswer('TEXT', textAnswer);

        setIsCorrect(result);
        handleResult(result);
    };

    const handleSingleClick = (optId: string) => {
        if (isAnswered) return;
        setSelectedOptionId(optId);
        if (timerRef.current) clearInterval(timerRef.current);
        setIsAnswered(true);
        const result = validateAnswer('SINGLE', optId);
        setIsCorrect(result);
        handleResult(result);
    };

    const handleMultiToggle = (optId: string) => {
        if (isAnswered) return;
        setSelectedMultiIds(prev => prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]);
    };

    // --- RESULT & COMBAT LOGIC ---
    const handleResult = (correct: boolean) => {
        const currentQ = playableQuestions[currentQIndex];

        if (correct) {
            let points = 100;
            if (evaluation?.config.allowSpeedPoints) points += (timeLeft * 10);
            if (streak > 2) points += 50;
            setScore(prev => prev + points);
            setStreak(prev => prev + 1);
            if (!isRedemptionRound) setCorrectCount(prev => prev + 1);

            // BOSS BATTLE: PLAYER ATTACK
            if (evaluation?.config.gameMode === 'final_boss' && bossConfig) {
                const totalQs = playableQuestions.length;
                const baseDmg = bossConfig.health.bossHP / totalQs;
                const critMultiplier = 1 + (Math.random() * 0.2); // 1.0 - 1.2
                const damage = Math.ceil(baseDmg * critMultiplier);
                
                setCombatState('PLAYER_ATTACK');
                setTimeout(() => {
                    setBossHP(prev => ({ ...prev, current: Math.max(0, prev.current - damage) }));
                    setShakeScreen(true);
                    setTimeout(() => setShakeScreen(false), 500);
                }, 500);
            }

        } else {
            setStreak(0);
            if (!incorrectQuestions.some(q => q.id === currentQ.id)) {
                setIncorrectQuestions(prev => [...prev, currentQ]);
            }
            if ((evaluation?.config.gameMode === 'time_attack' || evaluation?.config.gameMode === 'final_boss') && !isRedemptionRound) {
                // In boss mode, we might push to retry later if finishHimMove is on, but mainly calculate damage
            }

            // BOSS BATTLE: BOSS ATTACK
            if (evaluation?.config.gameMode === 'final_boss' && bossConfig) {
                let damagePercent = 0.20; // Medium default
                switch(bossConfig.difficulty) {
                    case 'easy': damagePercent = 0.15; break;
                    case 'medium': damagePercent = 0.25; break;
                    case 'hard': damagePercent = 0.35; break;
                    case 'legend': damagePercent = 0.50; break;
                }
                const damage = Math.ceil(playerHP.max * damagePercent);
                
                setCombatState('BOSS_ATTACK');
                setTimeout(() => {
                    setPlayerHP(prev => ({ ...prev, current: Math.max(0, prev.current - damage) }));
                    setShakeScreen(true);
                    setTimeout(() => setShakeScreen(false), 500);
                }, 500);
            }
        }

        setTimeout(() => {
            advanceGame();
        }, 2500); // Slightly longer delay for combat anims
    };

    const handleTimeUp = () => {
        setIsAnswered(true);
        setIsCorrect(false);
        setStreak(0);
        if (timerRef.current) clearInterval(timerRef.current);
        
        // Handle Boss Damage on Time Up
        if (evaluation?.config.gameMode === 'final_boss' && bossConfig) {
             const damage = Math.ceil(playerHP.max * 0.25); // Time out penalty
             setCombatState('BOSS_ATTACK');
             setPlayerHP(prev => ({ ...prev, current: Math.max(0, prev.current - damage) }));
        }

        setTimeout(() => {
            advanceGame();
        }, 2000);
    };

    const advanceGame = () => {
        // CHECK BOSS CONDITIONS FIRST
        if (evaluation?.config.gameMode === 'final_boss') {
            if (bossHP.current <= 0) {
                setCombatState('VICTORY');
                setTimeout(() => finishGame(), 1000);
                return;
            }
            if (playerHP.current <= 0) {
                setCombatState('DEFEAT');
                setTimeout(() => finishGame(), 1000);
                return;
            }
        }

        const nextIndex = currentQIndex + 1;
        if (nextIndex < playableQuestions.length) {
            startQuestion(nextIndex);
        } else {
            // End of Questions List
            if (evaluation?.config.gameMode === 'time_attack' && !isRedemptionRound && retryQueue.length > 0 && globalTimeLeft > 5) {
                const loopQuestions = shuffleArray(retryQueue);
                setPlayableQuestions(loopQuestions);
                setRetryQueue([]); 
                startQuestion(0);
            } else {
                // If boss still alive but no questions, check damage
                // Usually we design math so boss dies if mostly correct. 
                // If options run out, we check HP.
                if (evaluation?.config.gameMode === 'final_boss') {
                    if (bossHP.current > 0) setCombatState('DEFEAT'); // Ran out of ammo
                    else setCombatState('VICTORY');
                }
                finishGame();
            }
        }
    };

    const finishGame = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (globalTimerRef.current) clearInterval(globalTimerRef.current);
        setGameState('FINISHED');
    };

    const startRedemptionRound = () => {
        setPlayableQuestions(shuffleArray(incorrectQuestions));
        setIsRedemptionRound(true);
        setGameState('PLAYING');
        startQuestion(0);
    };

    // --- 5. RENDER HELPERS ---

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-cyan-500">
                <Loader2 className="w-16 h-16 animate-spin mb-6" />
                <span className="font-cyber text-xl animate-pulse tracking-widest">CONNECTING TO ARCADE SERVER...</span>
            </div>
        );
    }

    if (error || !evaluation) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
                <CyberCard className="max-w-md border-red-500/50 bg-red-950/10">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-3xl font-cyber text-red-400 mb-2">ACCESS DENIED</h2>
                    <p className="text-gray-300 font-mono text-sm leading-relaxed">{error || "Evaluación no encontrada."}</p>
                </CyberCard>
            </div>
        );
    }

    const currentQ = playableQuestions[currentQIndex];
    const totalQs = playableQuestions.length;
    const progressPercent = ((currentQIndex + 1) / totalQs) * 100;
    
    // Determine Logic Type
    const isMultiSelect = currentQ?.questionType === QUESTION_TYPES.MULTI_SELECT || (currentQ?.correctOptionIds && currentQ.correctOptionIds.length > 1);
    const isShortAnswer = currentQ?.questionType === QUESTION_TYPES.FILL_GAP || currentQ?.questionType === QUESTION_TYPES.OPEN_ENDED;
    const isSingleChoice = !isMultiSelect && !isShortAnswer;

    const isTimeAttack = evaluation.config.gameMode === 'time_attack' && !isRedemptionRound;
    const isBossMode = evaluation.config.gameMode === 'final_boss' && bossConfig;
    
    // Timer Colors
    const displayTime = isTimeAttack ? globalTimeLeft : timeLeft;
    const maxDisplayTime = isTimeAttack ? evaluation.config.timeLimit! : (currentQ?.timeLimit || 20);
    const timerPercent = (displayTime / maxDisplayTime) * 100;
    let timerColor = "bg-green-500";
    if (timerPercent < 50) timerColor = "bg-yellow-500";
    if (timerPercent < 20) timerColor = "bg-red-500";

    return (
        <div className={`min-h-screen bg-[#050505] text-white relative overflow-hidden flex flex-col font-sans select-none ${shakeScreen ? 'animate-shake' : ''}`}>
            
            {/* ARCADE BACKGROUND FX */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.15),transparent_70%)] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_2px,transparent_2px),linear-gradient(90deg,rgba(18,18,18,0)_2px,transparent_2px)] bg-[size:40px_40px] [background-position:center] opacity-20 pointer-events-none"></div>
            
            {/* --- LOBBY VIEW --- */}
            {gameState === 'LOBBY' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-500 z-10">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-purple-900/30 border border-purple-500/50 text-purple-300 text-xs font-mono font-bold mb-4 uppercase tracking-widest animate-pulse">
                            <Monitor className="w-3 h-3" /> ARCADE MODE ONLINE
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-2">
                            {evaluation.title.toUpperCase()}
                        </h1>
                        <div className="flex items-center justify-center gap-4 mt-2">
                            <span className="text-cyan-400 font-mono text-sm tracking-wide bg-cyan-950/30 px-3 py-1 rounded border border-cyan-500/30">
                                {evaluation.config.questionCount} NIVELES
                            </span>
                            <span className={`text-sm font-mono tracking-wide px-3 py-1 rounded border ${evaluation.config.gameMode === 'time_attack' ? 'text-red-400 bg-red-950/30 border-red-500/30' : 'text-blue-400 bg-blue-950/30 border-blue-500/30'}`}>
                                {evaluation.config.gameMode === 'time_attack' ? `TIME ATTACK (${evaluation.config.timeLimit}s)` : (evaluation.config.gameMode === 'final_boss' ? 'BOSS BATTLE' : 'CLASSIC MODE')}
                            </span>
                        </div>
                    </div>

                    <CyberCard className={`w-full max-w-md border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-black/80 backdrop-blur-xl p-8 ${isBossMode ? 'border-red-500/50 shadow-red-900/50' : ''}`}>
                        
                        {isBossMode && bossConfig && (
                            <div className="flex justify-center -mt-12 mb-4">
                                <img src={bossConfig.images.idle} className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse" alt="Boss" />
                            </div>
                        )}

                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-cyan-900/20 rounded-full flex items-center justify-center border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                <User className="w-10 h-10 text-cyan-300" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-gray-500 uppercase tracking-widest text-center block">INSERT COIN / NAME</label>
                                <input 
                                    type="text" 
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="TU NICKNAME..."
                                    className="w-full bg-black border-2 border-gray-700 focus:border-cyan-500 text-center text-2xl font-bold font-cyber py-4 text-white uppercase tracking-wider rounded-lg outline-none transition-all placeholder:text-gray-800 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                    maxLength={15}
                                    autoFocus
                                />
                            </div>

                            <button 
                                onClick={handleJoin}
                                disabled={!nickname.trim()}
                                className={`w-full py-4 rounded-lg font-black font-cyber text-xl tracking-widest flex items-center justify-center gap-3 transition-all duration-300 transform active:scale-95 ${nickname.trim() ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-[1.02] shadow-[0_0_30px_rgba(6,182,212,0.4)] text-white cursor-pointer' : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'}`}
                            >
                                {nickname.trim() ? <><Rocket className="w-6 h-6 animate-bounce" /> PRESS START</> : "ENTER NAME"}
                            </button>
                        </div>
                    </CyberCard>
                </div>
            )}

            {/* --- PLAYING VIEW --- */}
            {gameState === 'PLAYING' && currentQ && (
                <div className="flex-1 flex flex-col z-10 h-full max-h-screen relative">
                    
                    {/* BOSS BATTLE HUD */}
                    {isBossMode && bossConfig && (
                        <div className="absolute top-0 left-0 w-full z-20 p-2 md:p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                                {/* BOSS HP */}
                                <div className="flex-1 flex flex-col items-end">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-cyber font-bold text-red-500 text-shadow-red">{bossConfig.bossName}</span>
                                        {/* @ts-ignore */}
                                        <img src={bossConfig.badgeUrl} className="w-8 h-8 rounded-full border border-red-500" />
                                    </div>
                                    <div className="w-full h-4 bg-gray-900 rounded-full border border-red-900 overflow-hidden relative">
                                        <div 
                                            className="h-full bg-red-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                                            style={{ width: `${(bossHP.current / bossHP.max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* CENTER BOSS AVATAR */}
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 flex justify-center">
                                <img 
                                    src={combatState === 'PLAYER_ATTACK' ? bossConfig.images.damage : bossConfig.images.idle} 
                                    className={`h-32 md:h-48 object-contain transition-all duration-100 ${combatState === 'PLAYER_ATTACK' ? 'brightness-200 contrast-200 scale-110' : 'drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`}
                                    alt="Boss"
                                />
                                {combatState === 'PLAYER_ATTACK' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="text-4xl font-black text-yellow-400 font-cyber animate-bounce">CRITICAL!</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CLASSIC TOP BAR (Hidden in Boss Mode) */}
                    {!isBossMode && (
                        <div className="bg-black/40 backdrop-blur-md border-b border-gray-800 p-4 flex justify-between items-center relative">
                            <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
                                <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="bg-gray-900 px-3 py-1 rounded border border-gray-700 font-mono text-sm text-gray-300">
                                    {isRedemptionRound ? 'REDEMPTION' : `Q ${currentQIndex + 1} / ${totalQs}`}
                                </div>
                                <div className="font-bold text-cyan-400 font-cyber flex items-center gap-2">
                                    {nickname.toUpperCase()}
                                    {streak > 1 && <span className="text-xs bg-orange-600 text-white px-2 rounded-full animate-pulse">🔥 {streak}</span>}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-2xl font-black font-mono text-yellow-400 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
                                <Trophy className="w-6 h-6" /> {score}
                            </div>
                        </div>
                    )}

                    {/* TIMER BAR (Bottom in Classic, Custom in Boss) */}
                    {!isBossMode && (
                        <div className="w-full h-3 bg-gray-900 relative">
                            <div 
                                className={`h-full transition-all duration-1000 ease-linear ${timerColor}`}
                                style={{ width: `${timerPercent}%` }}
                            />
                        </div>
                    )}

                    {/* MAIN CONTENT AREA */}
                    <div className={`flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto ${isBossMode ? 'pt-40 md:pt-60' : ''}`}>
                        <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            
                            {/* --- MEDIA & QUESTION --- */}
                            {currentQ.imageUrl && !isBossMode && (
                                <div className="flex justify-center mb-4">
                                    <img src={currentQ.imageUrl} alt="Question Media" className="max-h-48 md:max-h-64 rounded-lg border-2 border-gray-700 shadow-2xl object-contain bg-black" />
                                </div>
                            )}

                            <div className={`bg-black/60 border border-gray-700 p-6 md:p-8 rounded-xl text-center backdrop-blur-sm shadow-xl relative ${isBossMode ? 'border-red-500/30' : ''}`}>
                                {isRedemptionRound && <div className="absolute -top-3 -right-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">REDEMPTION</div>}
                                <h2 className="text-2xl md:text-4xl font-bold font-cyber text-white leading-tight">
                                    {cleanQuestionText(currentQ.text)}
                                </h2>
                                {isMultiSelect && <p className="text-purple-400 text-xs font-mono mt-2 uppercase tracking-widest animate-pulse">[ SELECCIÓN MÚLTIPLE: ELIGE TODAS LAS CORRECTAS ]</p>}
                                {isShortAnswer && <p className="text-yellow-400 text-xs font-mono mt-2 uppercase tracking-widest animate-pulse">[ ESCRIBE TU RESPUESTA EXACTA ]</p>}
                            </div>

                            {/* --- INTERACTION AREA --- */}
                            
                            {/* CASE A: SHORT ANSWER */}
                            {isShortAnswer && (
                                <div className="max-w-xl mx-auto w-full space-y-4">
                                    <input 
                                        type="text" 
                                        value={textAnswer}
                                        onChange={(e) => setTextAnswer(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !isAnswered && submitAnswer('TEXT')}
                                        disabled={isAnswered}
                                        placeholder="Escribe aquí..."
                                        className={`w-full bg-black/50 border-2 rounded-lg p-6 text-2xl text-center text-white font-mono outline-none transition-all
                                            ${isAnswered 
                                                ? (isCorrect ? 'border-green-500 bg-green-950/30' : 'border-red-500 bg-red-950/30') 
                                                : 'border-cyan-700 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)]'}
                                        `}
                                        autoFocus
                                    />
                                    <button 
                                        onClick={() => submitAnswer('TEXT')}
                                        disabled={isAnswered || !textAnswer.trim()}
                                        className={`w-full py-4 rounded font-black font-cyber text-xl tracking-widest flex items-center justify-center gap-2 transition-all ${isAnswered ? 'opacity-0' : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:scale-[1.02] text-white shadow-lg'}`}
                                    >
                                        <Check className="w-6 h-6" /> VALIDAR
                                    </button>
                                </div>
                            )}

                            {/* CASE B: MULTI SELECT */}
                            {isMultiSelect && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {currentQ.options.map((opt) => {
                                            const isSelected = selectedMultiIds.includes(opt.id);
                                            const correctIds = currentQ.correctOptionIds || [];
                                            const isActuallyCorrect = correctIds.includes(opt.id);

                                            let btnClass = "bg-gray-800/80 border-gray-600 hover:bg-gray-700 hover:border-purple-500 text-gray-200"; 
                                            
                                            if (isAnswered) {
                                                if (isSelected && isActuallyCorrect) btnClass = "bg-green-600 border-green-400 text-white"; // Correct Pick
                                                else if (isSelected && !isActuallyCorrect) btnClass = "bg-red-600 border-red-400 text-white"; // Wrong Pick
                                                else if (!isSelected && isActuallyCorrect) btnClass = "bg-green-900/30 border-green-500/50 text-green-200 opacity-70"; // Missed
                                                else btnClass = "bg-gray-900 border-gray-800 text-gray-600 opacity-50"; // Neutral
                                            } else if (isSelected) {
                                                btnClass = "bg-purple-900/50 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]";
                                            }

                                            return (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => handleMultiToggle(opt.id)}
                                                    disabled={isAnswered}
                                                    className={`
                                                        relative p-6 rounded-xl border-2 text-lg md:text-xl font-bold transition-all duration-200 transform flex items-center justify-between
                                                        ${!isAnswered ? 'active:scale-95' : 'cursor-default'}
                                                        ${btnClass}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {isSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                                        <span className="text-left">{opt.text}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button 
                                        onClick={() => submitAnswer('MULTI')}
                                        disabled={isAnswered || selectedMultiIds.length === 0}
                                        className={`mx-auto px-12 py-4 rounded-full font-black font-cyber text-xl tracking-widest flex items-center justify-center gap-2 transition-all ${isAnswered ? 'opacity-0' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 text-white shadow-xl'}`}
                                    >
                                        <Check className="w-6 h-6" /> CONFIRMAR SELECCIÓN
                                    </button>
                                </div>
                            )}

                            {/* CASE C: SINGLE CHOICE (INSTANT) */}
                            {isSingleChoice && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    {currentQ.options.map((opt) => {
                                        const isSelected = selectedOptionId === opt.id;
                                        const correctIds = currentQ.correctOptionIds || [currentQ.correctOptionId];
                                        const isActuallyCorrect = correctIds.includes(opt.id);
                                        
                                        let btnClass = "bg-gray-800/80 border-gray-600 hover:bg-gray-700 hover:border-cyan-500 text-gray-200"; 
                                        
                                        if (isAnswered) {
                                            if (isSelected && isCorrect) {
                                                btnClass = "bg-green-600 border-green-400 text-white animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.5)]"; 
                                            } else if (isSelected && !isCorrect) {
                                                btnClass = "bg-red-600 border-red-400 text-white animate-shake"; 
                                            } else if (!isSelected && isActuallyCorrect) {
                                                btnClass = "bg-green-900/30 border-green-500/50 text-green-200 opacity-70"; 
                                            } else {
                                                btnClass = "bg-gray-900 border-gray-800 text-gray-600 opacity-50"; 
                                            }
                                        }

                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleSingleClick(opt.id)}
                                                disabled={isAnswered}
                                                className={`
                                                    relative p-6 rounded-xl border-2 text-lg md:text-xl font-bold transition-all duration-200 transform
                                                    flex items-center justify-between group
                                                    ${!isAnswered ? 'active:scale-95' : 'cursor-default'}
                                                    ${btnClass}
                                                `}
                                            >
                                                <span className="flex-1 text-left">{opt.text}</span>
                                                {isAnswered && isSelected && isCorrect && <CheckCircle2 className="w-8 h-8 text-white" />}
                                                {isAnswered && isSelected && !isCorrect && <XCircle className="w-8 h-8 text-white" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Timer / Status Feedback */}
                            <div className="h-8 flex justify-center items-center mt-4">
                                {!isAnswered ? (
                                    <div className={`flex items-center gap-2 font-mono font-bold text-xl ${displayTime <= 5 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                                        <Clock className="w-5 h-5" /> {displayTime}s
                                        {isTimeAttack && <span className="text-xs text-gray-500 ml-2">(GLOBAL)</span>}
                                    </div>
                                ) : (
                                    <div className="font-cyber text-lg tracking-widest animate-in zoom-in">
                                        {isCorrect ? <span className="text-green-400">¡CORRECTO! +{streak > 2 ? 'BONUS!' : ''}</span> : <span className="text-red-400">INCORRECTO</span>}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* BOSS PLAYER HP BAR (Bottom) */}
                    {isBossMode && (
                        <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                            <div className="max-w-4xl mx-auto flex flex-col gap-1">
                                <div className="flex justify-between items-end text-green-400 font-cyber text-sm">
                                    <span>PLAYER HP</span>
                                    <span>{playerHP.current} / {playerHP.max}</span>
                                </div>
                                <div className="w-full h-4 bg-gray-900 rounded-full border border-green-900 overflow-hidden">
                                    <div 
                                        className="h-full bg-green-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(34,197,94,0.6)]"
                                        style={{ width: `${(playerHP.current / playerHP.max) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- FINISHED VIEW --- */}
            {gameState === 'FINISHED' && (
                <div className="flex-1 flex flex-col items-center justify-center p-4 animate-in slide-in-from-bottom duration-700 z-10 text-center overflow-y-auto">
                    
                    {/* BOSS END SCREENS */}
                    {isBossMode && bossConfig && (combatState === 'VICTORY' || combatState === 'DEFEAT') ? (
                        <div className="mb-8 relative max-w-lg mx-auto">
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                            <img 
                                src={combatState === 'VICTORY' ? bossConfig.images.defeat : bossConfig.images.win} 
                                className="w-64 h-64 mx-auto object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] mb-6 animate-pulse"
                                alt="Ending"
                            />
                            <h2 className={`text-5xl font-black font-cyber mb-2 ${combatState === 'VICTORY' ? 'text-green-400' : 'text-red-500'}`}>
                                {combatState === 'VICTORY' ? "MISSION ACCOMPLISHED" : "GAME OVER"}
                            </h2>
                            <p className="text-xl font-mono text-gray-300 italic">
                                "{combatState === 'VICTORY' ? bossConfig.messages.playerWins : bossConfig.messages.bossWins}"
                            </p>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-yellow-500/20 blur-[60px] rounded-full"></div>
                                <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-2 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-bounce" />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600">
                                GAME OVER
                            </h1>
                        </div>
                    )}

                    {isSubmitting ? (
                        <div className="flex flex-col items-center gap-4 text-cyan-400 animate-pulse">
                            <CloudUpload className="w-12 h-12" />
                            <p className="font-mono text-lg">SUBIENDO PUNTUACIÓN...</p>
                        </div>
                    ) : (
                        <div className="w-full max-w-2xl space-y-6 flex flex-col items-center">
                            
                            <Leaderboard 
                                evaluationId={evaluationId} 
                                currentAttemptId={savedAttemptId} 
                            />

                            <CyberCard className="w-full bg-gray-900/50 border-gray-700 p-4">
                                <div className="flex justify-between items-center text-sm font-mono text-gray-400 mb-2">
                                    <span>TU PUNTUACIÓN</span>
                                    <span>{nickname}</span>
                                </div>
                                <div className="text-4xl font-black font-mono text-white tracking-wider">{score}</div>
                                {evaluation && (
                                    <p className="text-xs text-cyan-300 mt-2 italic">
                                        "{evaluation.config.feedbackMessages.high}"
                                    </p>
                                )}
                            </CyberCard>

                            <div className="w-full space-y-3">
                                {!isRedemptionRound && incorrectQuestions.length > 0 && !isBossMode && (
                                    <button 
                                        onClick={startRedemptionRound}
                                        className="w-full py-4 bg-red-900/40 border border-red-500/50 text-red-200 rounded-lg font-bold font-cyber hover:bg-red-900/60 hover:text-white transition-all animate-pulse flex items-center justify-center gap-2 hover:scale-[1.02]"
                                    >
                                        <Flame className="w-5 h-5" /> JUGAR RONDA DE REDENCIÓN ({incorrectQuestions.length})
                                    </button>
                                )}

                                <CyberButton onClick={() => window.location.href = '/'} className="w-full h-14 text-lg bg-white text-black hover:bg-gray-200 border-none font-bold">
                                    <RotateCcw className="w-5 h-5 mr-2" /> VOLVER AL INICIO
                                </CyberButton>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};
