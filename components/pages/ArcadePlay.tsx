
import React, { useState, useEffect, useRef } from 'react';
import { getEvaluation } from '../../services/firebaseService';
import { Evaluation, Question } from '../../types';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { Loader2, AlertTriangle, Gamepad2, User, Rocket, Monitor, Zap, Clock, CheckCircle2, XCircle, Trophy, Star, ArrowRight, RotateCcw, Timer, Flame } from 'lucide-react';

interface ArcadePlayProps {
    evaluationId: string;
    onExit?: () => void;
}

type GameState = 'LOBBY' | 'PLAYING' | 'FINISHED';

// Utility for shuffling
const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
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
    const [timeLeft, setTimeLeft] = useState(20); // Local (Classic)
    const [globalTimeLeft, setGlobalTimeLeft] = useState(0); // Global (Time Attack)
    
    const [isAnswered, setIsAnswered] = useState(false);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    
    // Redemption & Retry Logic
    const [incorrectQuestions, setIncorrectQuestions] = useState<Question[]>([]); // Permanent record for Redemption
    const [retryQueue, setRetryQueue] = useState<Question[]>([]); // Temporary loop for Time Attack
    const [isRedemptionRound, setIsRedemptionRound] = useState(false);

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

                if (!data.questions || data.questions.length === 0) {
                    throw new Error("Error de integridad: No hay preguntas en esta evaluación.");
                }

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

    // Initial Preparation (Shuffle & Slice)
    const prepareGame = (data: Evaluation) => {
        const shuffled = shuffleArray(data.questions);
        const limit = data.config.questionCount || data.questions.length;
        const finalSet = shuffled.slice(0, limit);
        
        // Shuffle options for each question
        const readyQuestions = finalSet.map(q => ({
            ...q,
            options: shuffleArray(q.options)
        }));

        setPlayableQuestions(readyQuestions);
        
        // Set Global Timer if Time Attack
        if (data.config.gameMode === 'time_attack' && data.config.timeLimit) {
            setGlobalTimeLeft(data.config.timeLimit);
        }
    };

    // --- 2. TIMER LOGIC ---
    
    // A. Local Timer (Classic Mode)
    useEffect(() => {
        if (gameState === 'PLAYING' && !isRedemptionRound && evaluation?.config.gameMode === 'classic' && !isAnswered && timeLeft > 0) {
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
            // Redemption always behaves like Classic
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

    // B. Global Timer (Time Attack Mode)
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

    // --- 3. GAME ACTIONS ---

    const handleJoin = () => {
        if (!nickname.trim()) return;
        setGameState('PLAYING');
        startQuestion(0);
    };

    const startQuestion = (index: number) => {
        setCurrentQIndex(index);
        const q = playableQuestions[index];
        const timeLimit = q.timeLimit && q.timeLimit > 0 ? q.timeLimit : 20;
        
        // Reset timers based on mode
        if (evaluation?.config.gameMode === 'classic' || isRedemptionRound) {
            setTimeLeft(timeLimit);
        }
        
        setIsAnswered(false);
        setSelectedOptionId(null);
        setIsCorrect(null);
        setShowNextButton(false);
    };

    const handleAnswer = (optionId: string) => {
        if (isAnswered) return;
        
        // Stop Local Timer
        if (timerRef.current) clearInterval(timerRef.current);
        
        setIsAnswered(true);
        setSelectedOptionId(optionId);

        const currentQ = playableQuestions[currentQIndex];
        const correctIds = currentQ.correctOptionIds || [currentQ.correctOptionId];
        const correct = correctIds.includes(optionId);
        setIsCorrect(correct);

        // Scoring Logic
        if (correct) {
            let points = 100;
            if (evaluation?.config.allowSpeedPoints) {
                // Classic: Based on timeLeft. Time Attack: Flat bonus or based on speed of click?
                // Simplifying: Use local timeLeft variable which works for Classic. For TA we ignore speed bonus or use fixed.
                if (evaluation.config.gameMode === 'classic') points += (timeLeft * 10);
                else points += 50; // Flat bonus for TA
            }
            if (streak > 2) points += 50;
            setScore(prev => prev + points);
            setStreak(prev => prev + 1);
        } else {
            setStreak(0);
            // Track incorrect for Redemption
            if (!incorrectQuestions.some(q => q.id === currentQ.id)) {
                setIncorrectQuestions(prev => [...prev, currentQ]);
            }
            // Track for Time Attack Loop
            if (evaluation?.config.gameMode === 'time_attack' && !isRedemptionRound) {
                setRetryQueue(prev => [...prev, currentQ]);
            }
        }

        // Transition Logic
        setTimeout(() => {
            advanceGame();
        }, 2000); 
    };

    const handleTimeUp = () => {
        setIsAnswered(true);
        setIsCorrect(false);
        setStreak(0);
        if (timerRef.current) clearInterval(timerRef.current);
        
        const currentQ = playableQuestions[currentQIndex];
        if (!incorrectQuestions.some(q => q.id === currentQ.id)) {
            setIncorrectQuestions(prev => [...prev, currentQ]);
        }
        if (evaluation?.config.gameMode === 'time_attack' && !isRedemptionRound) {
            setRetryQueue(prev => [...prev, currentQ]);
        }

        setTimeout(() => {
            advanceGame();
        }, 2000);
    };

    const advanceGame = () => {
        const nextIndex = currentQIndex + 1;

        if (nextIndex < playableQuestions.length) {
            // Normal progression
            startQuestion(nextIndex);
        } else {
            // End of list reached
            if (evaluation?.config.gameMode === 'time_attack' && !isRedemptionRound) {
                // Time Attack Loop Logic
                if (retryQueue.length > 0 && globalTimeLeft > 5) {
                    // Start Loop
                    const loopQuestions = shuffleArray(retryQueue);
                    setPlayableQuestions(loopQuestions);
                    setRetryQueue([]); // Clear queue for next pass
                    startQuestion(0);
                    // Optional: Visual indication of Loop?
                } else {
                    finishGame();
                }
            } else {
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
        // Reset counters but keep score? Usually reset score for sub-game or add to it?
        // Let's add to it but maybe visual distinction.
        setGameState('PLAYING');
        startQuestion(0);
    };

    // --- 4. RENDER HELPERS ---

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
    
    // Timer Logic for Display
    const isTimeAttack = evaluation.config.gameMode === 'time_attack' && !isRedemptionRound;
    const displayTime = isTimeAttack ? globalTimeLeft : timeLeft;
    const maxDisplayTime = isTimeAttack ? evaluation.config.timeLimit! : (currentQ?.timeLimit || 20);
    const timerPercent = (displayTime / maxDisplayTime) * 100;
    
    let timerColor = "bg-green-500";
    if (timerPercent < 50) timerColor = "bg-yellow-500";
    if (timerPercent < 20) timerColor = "bg-red-500";

    return (
        <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex flex-col font-sans select-none">
            
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
                                {evaluation.config.gameMode === 'time_attack' ? `TIME ATTACK (${evaluation.config.timeLimit}s)` : 'CLASSIC MODE'}
                            </span>
                        </div>
                    </div>

                    <CyberCard className="w-full max-w-md border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-black/80 backdrop-blur-xl p-8">
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
                <div className="flex-1 flex flex-col z-10 h-full max-h-screen">
                    
                    {/* TOP BAR */}
                    <div className="bg-black/40 backdrop-blur-md border-b border-gray-800 p-4 flex justify-between items-center relative">
                        {/* Progress Line */}
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

                    {/* TIMER BAR (Floating) */}
                    <div className="w-full h-3 bg-gray-900 relative">
                        <div 
                            className={`h-full transition-all duration-1000 ease-linear ${timerColor}`}
                            style={{ width: `${timerPercent}%` }}
                        />
                    </div>

                    {/* QUESTION AREA */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
                        <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            
                            {/* Image (Optional) */}
                            {currentQ.imageUrl && (
                                <div className="flex justify-center mb-4">
                                    <img src={currentQ.imageUrl} alt="Question Media" className="max-h-48 md:max-h-64 rounded-lg border-2 border-gray-700 shadow-2xl object-contain bg-black" />
                                </div>
                            )}

                            {/* Question Text */}
                            <div className="bg-black/60 border border-gray-700 p-6 md:p-8 rounded-xl text-center backdrop-blur-sm shadow-xl relative">
                                {isRedemptionRound && <div className="absolute -top-3 -right-3 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">REDEMPTION</div>}
                                <h2 className="text-2xl md:text-4xl font-bold font-cyber text-white leading-tight">
                                    {currentQ.text}
                                </h2>
                            </div>

                            {/* OPTIONS GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {currentQ.options.map((opt, idx) => {
                                    const isSelected = selectedOptionId === opt.id;
                                    const correctIds = currentQ.correctOptionIds || [currentQ.correctOptionId];
                                    const isActuallyCorrect = correctIds.includes(opt.id);
                                    
                                    // Visual State Logic
                                    let btnClass = "bg-gray-800/80 border-gray-600 hover:bg-gray-700 hover:border-cyan-500 text-gray-200"; // Default
                                    
                                    if (isAnswered) {
                                        if (isSelected && isCorrect) {
                                            btnClass = "bg-green-600 border-green-400 text-white animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.5)]"; // Correct Pick
                                        } else if (isSelected && !isCorrect) {
                                            btnClass = "bg-red-600 border-red-400 text-white animate-shake"; // Wrong Pick
                                        } else if (!isSelected && isActuallyCorrect) {
                                            btnClass = "bg-green-900/30 border-green-500/50 text-green-200 opacity-70"; // Reveal Correct
                                        } else {
                                            btnClass = "bg-gray-900 border-gray-800 text-gray-600 opacity-50"; // Dim others
                                        }
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleAnswer(opt.id)}
                                            disabled={isAnswered}
                                            className={`
                                                relative p-6 rounded-xl border-2 text-lg md:text-xl font-bold transition-all duration-200 transform
                                                flex items-center justify-between group
                                                ${!isAnswered ? 'active:scale-95' : 'cursor-default'}
                                                ${btnClass}
                                            `}
                                        >
                                            <span className="flex-1 text-left">{opt.text}</span>
                                            
                                            {/* Icons for feedback */}
                                            {isAnswered && isSelected && isCorrect && <CheckCircle2 className="w-8 h-8 text-white" />}
                                            {isAnswered && isSelected && !isCorrect && <XCircle className="w-8 h-8 text-white" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Timer / Status Feedback */}
                            <div className="h-8 flex justify-center items-center">
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
                </div>
            )}

            {/* --- FINISHED VIEW --- */}
            {gameState === 'FINISHED' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom duration-700 z-10 text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] rounded-full"></div>
                        <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-bounce" />
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-2">
                        GAME OVER
                    </h1>
                    <p className="text-xl text-gray-400 font-mono mb-8">{nickname}</p>

                    <CyberCard className="w-full max-w-md border-yellow-500/30 bg-black/80 backdrop-blur-xl p-8 space-y-6">
                        <div className="space-y-2">
                            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">PUNTUACIÓN FINAL</p>
                            <div className="text-6xl font-black font-mono text-white">{score}</div>
                        </div>

                        {/* REDEMPTION ROUND BUTTON */}
                        {!isRedemptionRound && incorrectQuestions.length > 0 && (
                            <button 
                                onClick={startRedemptionRound}
                                className="w-full py-3 bg-red-900/50 border border-red-500 text-red-200 rounded font-bold font-cyber hover:bg-red-900 hover:text-white transition-all animate-pulse flex items-center justify-center gap-2"
                            >
                                <Flame className="w-5 h-5" /> RONDA DE REDENCIÓN
                            </button>
                        )}

                        <div className="h-px bg-gray-800 w-full"></div>

                        {evaluation && (
                            <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                                <p className="text-sm text-cyan-300 font-bold mb-1">
                                    <Star className="w-4 h-4 inline mr-2 text-yellow-400" /> 
                                    FEEDBACK
                                </p>
                                <p className="text-gray-300 text-sm italic">"{evaluation.config.feedbackMessages.high}"</p>
                            </div>
                        )}

                        <CyberButton onClick={() => window.location.href = '/'} className="w-full h-14 text-lg bg-white text-black hover:bg-gray-200 border-none font-bold">
                            <RotateCcw className="w-5 h-5 mr-2" /> VOLVER AL INICIO
                        </CyberButton>
                    </CyberCard>
                </div>
            )}

        </div>
    );
};
