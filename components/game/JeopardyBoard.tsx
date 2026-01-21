
import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Question, GameTeam, PowerUp, PowerUpType } from '../../types';
import { CyberButton, CyberCard, CyberSelect, CyberCheckbox } from '../ui/CyberUI';
import { ArrowLeft, X, Trophy, Shield, Zap, Skull, Gem, HelpCircle, Settings, Play, Check, Minus, Gavel, Dna, Crown, Clock, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { GameInstructionsModal } from './GameInstructionsModal';
import { translations } from '../../utils/translations';
import { soundService } from '../../services/soundService';

interface JeopardyBoardProps {
    quiz: Quiz;
    initialTeams: GameTeam[];
    onExit: () => void;
    timerValue: number; 
    allowNegativePoints?: boolean; // New Prop
}

// --- CONSTANTS & TYPES ---

type GamePhase = 'CONFIG' | 'BOARD' | 'EVENT_REVEAL' | 'QUESTION' | 'SCORING' | 'ROULETTE';

interface BoardCell {
    id: string;
    q: Question | null;
    points: number;
    answered: boolean;
    isWildcard: boolean;
    row: number;
    col: number;
}

interface RandomEvent {
    id: string;
    name: string;
    desc: string;
    icon: React.ReactNode;
    effect: 'DOUBLE_LAST' | 'DOUBLE_PENALTY' | 'TOTAL_PENALTY' | 'ROBIN_HOOD' | 'RANDOM_SCORE' | 'NONE';
}

const RANDOM_EVENTS: RandomEvent[] = [
    { id: 'ev1', name: 'Robin Hood', desc: 'El líder da 20% de sus puntos al último.', effect: 'ROBIN_HOOD', icon: <Crown className="w-12 h-12 text-green-400" /> },
    { id: 'ev2', name: 'Doble o Nada (Último)', desc: 'Si el equipo que va último acierta, gana doble.', effect: 'DOUBLE_LAST', icon: <Zap className="w-12 h-12 text-yellow-400" /> },
    { id: 'ev3', name: 'Zona de Peligro', desc: 'Fallar esta pregunta resta EL DOBLE.', effect: 'DOUBLE_PENALTY', icon: <Skull className="w-12 h-12 text-red-500" /> },
    { id: 'ev4', name: 'Muerte Súbita', desc: 'Fallar elimina TODOS los puntos de esa pregunta.', effect: 'TOTAL_PENALTY', icon: <Gavel className="w-12 h-12 text-purple-500" /> },
    { id: 'ev5', name: 'Caos Numérico', desc: 'La puntuación será aleatoria (100-1000) si aciertas.', effect: 'RANDOM_SCORE', icon: <Dna className="w-12 h-12 text-pink-400" /> },
];

const ITEMS: Record<PowerUpType, Omit<PowerUp, 'id'>> = {
    DOUBLE: { type: 'DOUBLE', name: 'Nano-Boost', icon: '🧪', desc: 'x2 en tu próximo acierto' },
    STEAL: { type: 'STEAL', name: 'Data Leech', icon: '🦹', desc: 'Roba 300 pts al líder' },
    BOMB: { type: 'BOMB', name: 'Logic Bomb', icon: '💣', desc: '-200 pts a todos los rivales' },
    SWAP: { type: 'SWAP', name: 'Glitch Swap', icon: '🔄', desc: 'Intercambia pts con un rival random' },
    SHIELD: { type: 'SHIELD', name: 'Firewall', icon: '🛡️', desc: 'Protege del próximo ataque' },
};

// SCORE ANIMATION COMPONENT
const ScoreDelta: React.FC<{ value: number, onEnd: () => void }> = ({ value, onEnd }) => {
    useEffect(() => {
        const timer = setTimeout(onEnd, 1500);
        return () => clearTimeout(timer);
    }, []);

    if (value === 0) return null;

    return (
        <div className={`
            absolute top-0 right-0 font-bold text-xl animate-out fade-out slide-out-to-top-10 duration-1000
            ${value > 0 ? 'text-green-400' : 'text-red-500'}
        `}>
            {value > 0 ? '+' : ''}{value}
        </div>
    );
};

export const JeopardyBoard: React.FC<JeopardyBoardProps> = ({ quiz, initialTeams, onExit, timerValue, allowNegativePoints }) => {
    const toast = useToast();
    const t = translations['es'];
    
    // --- STATE ---
    const [phase, setPhase] = useState<GamePhase>('CONFIG');
    const [teams, setTeams] = useState<GameTeam[]>(initialTeams);
    const [showInstructions, setShowInstructions] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    
    // Visual Effects State
    const [scoreDeltas, setScoreDeltas] = useState<Record<string, number | null>>({});

    // Config State
    const [config, setConfig] = useState({
        rows: 5,
        cols: 5,
        distribution: 'STANDARD' as 'STANDARD' | 'RIGGED' | 'SPLIT',
        usePowerUps: true,
        randomEvents: true,
        catchUpLogic: true // "Ajuste"
    });

    // Game Board State
    const [grid, setGrid] = useState<BoardCell[]>([]);
    const [activeCell, setActiveCell] = useState<BoardCell | null>(null);
    const [activeEvent, setActiveEvent] = useState<RandomEvent | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [lastLog, setLastLog] = useState<string>("");

    // Timer State
    const [timeLeft, setTimeLeft] = useState(timerValue);
    const [isTimeUp, setIsTimeUp] = useState(false);

    // Scoring State
    const [teamAnswers, setTeamAnswers] = useState<Record<string, 'CORRECT' | 'WRONG' | 'NONE'>>({});

    // Roulette State
    const [rouletteWinnerIdx, setRouletteWinnerIdx] = useState<number | null>(null);
    const [rouletteItem, setRouletteItem] = useState<PowerUp | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);

    // --- SOUND MUTE TOGGLE ---
    const toggleMute = () => {
        const muted = soundService.toggleMute();
        setIsMuted(muted);
    };

    // --- TIMER EFFECT ---
    useEffect(() => {
        let interval: any = null;
        if (phase === 'QUESTION' && !showAnswer && !isTimeUp) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setIsTimeUp(true);
                        soundService.play('wrong');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [phase, showAnswer, isTimeUp]);

    // --- LOGIC: Helper to trigger score animation ---
    const applyScoreDelta = (teamId: string, amount: number) => {
        setScoreDeltas(prev => ({ ...prev, [teamId]: amount }));
    };

    // --- 1. CONFIGURATION LOGIC ---
    const generateGrid = () => {
        const totalCells = config.rows * config.cols;
        const newGrid: BoardCell[] = [];
        let qIndex = 0;

        for (let c = 0; c < config.cols; c++) {
            for (let r = 0; r < config.rows; r++) {
                let questionForCell: Question | null = null;
                let isWildcard = false;

                if (config.distribution === 'RIGGED') {
                    if (c < quiz.questions.length) questionForCell = quiz.questions[c];
                    else isWildcard = true;
                } else if (config.distribution === 'SPLIT') {
                    const qIdxBase = c * 2; 
                    if (r < 3) {
                        if (qIdxBase < quiz.questions.length) questionForCell = quiz.questions[qIdxBase];
                        else isWildcard = true;
                    } else {
                        if (qIdxBase + 1 < quiz.questions.length) questionForCell = quiz.questions[qIdxBase + 1];
                        else isWildcard = true;
                    }
                } else {
                    if (qIndex < quiz.questions.length) {
                        questionForCell = quiz.questions[qIndex];
                        qIndex++;
                    } else {
                        isWildcard = true;
                    }
                }

                newGrid.push({
                    id: `${c}-${r}`,
                    q: questionForCell,
                    points: (r + 1) * 100,
                    answered: false,
                    isWildcard,
                    row: r,
                    col: c
                });
            }
        }
        setGrid(newGrid);
        setPhase('BOARD');
        soundService.play('click');
    };

    // --- 2. GAMEPLAY FLOW ---
    const handleCellClick = (cellId: string) => {
        const cell = grid.find(c => c.id === cellId);
        if (!cell || cell.answered) return;

        setActiveCell(cell);
        
        // RESET STATE FOR NEW QUESTION
        setTimeLeft(timerValue);
        setIsTimeUp(false);
        setShowAnswer(false);
        
        soundService.play('click');

        // Reset Scoring State
        const initialAnswers: Record<string, any> = {};
        teams.forEach(t => initialAnswers[t.id] = 'NONE');
        setTeamAnswers(initialAnswers);

        // RANDOM EVENT ROLL (50% Chance if enabled)
        if (config.randomEvents && Math.random() > 0.5) {
            const evt = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
            setActiveEvent(evt);
            setPhase('EVENT_REVEAL');
            soundService.play('event');
        } else {
            setActiveEvent(null);
            setPhase('QUESTION');
        }
    };

    const resolveEvent = () => {
        // Apply immediate effects like Robin Hood
        if (activeEvent?.effect === 'ROBIN_HOOD') {
            const sorted = [...teams].sort((a,b) => b.score - a.score);
            if (sorted.length > 1) {
                const rich = sorted[0];
                const poor = sorted[sorted.length - 1];
                
                // SHIELD CHECK FOR RICH
                if (rich.shielded) {
                    rich.shielded = false;
                    toast.info(`${rich.name} bloqueó ROBIN HOOD con su escudo!`);
                    soundService.play('block');
                } else {
                    const transfer = Math.floor(rich.score * 0.2);
                    rich.score -= transfer;
                    poor.score += transfer;
                    applyScoreDelta(rich.id, -transfer);
                    applyScoreDelta(poor.id, transfer);
                    setTeams([...teams]); 
                    toast.info(`${rich.name} dio ${transfer} pts a ${poor.name}!`);
                }
            }
        }
        setPhase('QUESTION');
    };

    // --- 3. SCORING SYSTEM ---
    const toggleTeamAnswer = (teamId: string) => {
        setTeamAnswers(prev => {
            const current = prev[teamId];
            const next = current === 'NONE' ? 'CORRECT' : current === 'CORRECT' ? 'WRONG' : 'NONE';
            return { ...prev, [teamId]: next };
        });
        soundService.play('click');
    };

    const submitScores = () => {
        if (!activeCell) return;
        
        const newTeams = [...teams];
        let correctCount = 0;

        newTeams.forEach(team => {
            const status = teamAnswers[team.id];
            let points = activeCell.points;

            // Apply Event Modifiers
            if (activeEvent?.effect === 'RANDOM_SCORE' && status === 'CORRECT') {
                points = Math.floor(Math.random() * 10) * 100 + 100; // 100-1000
            }
            if (activeEvent?.effect === 'DOUBLE_LAST') {
                const minScore = Math.min(...teams.map(t => t.score));
                if (team.score === minScore) points *= 2;
            }

            if (status === 'CORRECT') {
                correctCount++;
                // Apply Personal Multiplier
                if (team.multiplier > 1) {
                    points *= team.multiplier;
                    team.multiplier = 1; // Consume potion
                }
                
                team.score += points;
                applyScoreDelta(team.id, points);
                soundService.play('correct');

            } else if (status === 'WRONG') {
                let penalty = Math.floor(points / 2);
                if (activeEvent?.effect === 'DOUBLE_PENALTY') penalty = points; 
                if (activeEvent?.effect === 'TOTAL_PENALTY') penalty = activeCell.points; 
                
                // SHIELD CHECK (Passive Logic)
                if (team.shielded) {
                    team.shielded = false; // Break shield
                    toast.info(`🛡️ ${team.name} usó su ESCUDO para evitar la penalización!`);
                    soundService.play('block');
                    applyScoreDelta(team.id, 0); // Visual indicator of 0 loss
                } else {
                    team.score -= penalty;
                    // Clamp at 0 if negative points disabled
                    if (!allowNegativePoints && team.score < 0) team.score = 0;
                    
                    applyScoreDelta(team.id, -penalty);
                    soundService.play('wrong');
                }
            }
        });

        // Mark cell answered
        setGrid(prev => prev.map(c => c.id === activeCell.id ? { ...c, answered: true } : c));
        
        setTeams(newTeams);
        setShowAnswer(false);
        setActiveCell(null);

        // TRIGGER ROULETTE?
        if (config.usePowerUps && correctCount > 0) {
            // Only teams who got it correct participate? Or standard catch-up?
            // Usually catch-up allows anyone to win, but let's stick to standard logic:
            setPhase('ROULETTE');
        } else {
            setPhase('BOARD');
        }
    };

    // --- 4. ROULETTE LOGIC ---
    const spinRoulette = () => {
        setIsSpinning(true);
        soundService.play('spin');

        // Determine Winner Logic
        let winnerIndex = 0;
        if (config.catchUpLogic) {
            const maxScore = Math.max(...teams.map(t => t.score)) + 100; 
            const weights = teams.map(t => maxScore - t.score);
            const totalWeight = weights.reduce((a,b) => a+b, 0);
            let random = Math.random() * totalWeight;
            
            for(let i=0; i<teams.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    winnerIndex = i;
                    break;
                }
            }
        } else {
            winnerIndex = Math.floor(Math.random() * teams.length);
        }

        // Determine Item
        const itemKeys = Object.keys(ITEMS) as PowerUpType[];
        const randomType = itemKeys[Math.floor(Math.random() * itemKeys.length)];
        const wonItem = { ...ITEMS[randomType], id: Math.random().toString() };

        // Visual Spin Animation
        let spins = 0;
        const maxSpins = 20 + Math.floor(Math.random() * 10);
        const interval = setInterval(() => {
            setRouletteWinnerIdx(spins % teams.length);
            soundService.play('click'); // Ticking sound
            spins++;
            if (spins >= maxSpins) {
                clearInterval(interval);
                setRouletteWinnerIdx(winnerIndex);
                setRouletteItem(wonItem);
                
                // Award Item
                const newTeams = [...teams];
                newTeams[winnerIndex].inventory.push(wonItem);
                setTeams(newTeams);
                
                setIsSpinning(false);
                soundService.play('win_item');
            }
        }, 100);
    };

    const closeRoulette = () => {
        setRouletteWinnerIdx(null);
        setRouletteItem(null);
        setPhase('BOARD');
    };

    // --- 5. POWER UP USAGE ---
    const useItem = (teamIdx: number, itemIdx: number) => {
        const newTeams = [...teams];
        const userTeam = newTeams[teamIdx];
        const item = userTeam.inventory[itemIdx];
        
        // Move to used inventory
        userTeam.usedInventory = userTeam.usedInventory || [];
        userTeam.usedInventory.push(item);
        userTeam.inventory.splice(itemIdx, 1);

        let msg = "";
        
        // APPLY EFFECT
        if (item.type === 'DOUBLE') {
            userTeam.multiplier = 2;
            msg = `${userTeam.name} activa NANO-BOOST (x2)`;
        } 
        else if (item.type === 'SHIELD') {
            userTeam.shielded = true;
            msg = `${userTeam.name} activa FIREWALL (Escudo Pasivo)`;
        }
        else if (item.type === 'STEAL') {
            const others = newTeams.filter((_, i) => i !== teamIdx);
            if (others.length > 0) {
                const leader = others.reduce((prev, current) => (prev.score > current.score) ? prev : current);
                if (leader.shielded) {
                    leader.shielded = false; // Consume shield
                    msg = `¡${leader.name} BLOQUEÓ el robo con su ESCUDO!`;
                    soundService.play('block');
                } else {
                    leader.score -= 300;
                    userTeam.score += 300;
                    if (!allowNegativePoints && leader.score < 0) leader.score = 0;
                    
                    applyScoreDelta(leader.id, -300);
                    applyScoreDelta(userTeam.id, 300);
                    msg = `¡${userTeam.name} roba 300 pts a ${leader.name}!`;
                }
            }
        }
        else if (item.type === 'BOMB') {
            let blockedCount = 0;
            newTeams.forEach((t, i) => {
                if (i !== teamIdx) {
                    if (t.shielded) {
                        t.shielded = false; // Consume shield
                        blockedCount++;
                    } else {
                        t.score -= 200;
                        if (!allowNegativePoints && t.score < 0) t.score = 0;
                        applyScoreDelta(t.id, -200);
                    }
                }
            });
            msg = `¡BOOM! Bomba lanzada. ${blockedCount > 0 ? `${blockedCount} escudos rotos.` : ''}`;
            soundService.play('event');
        }
        else if (item.type === 'SWAP') {
            // ... Logic for swap (complex with shield, simplify for now: blocked or not)
            const targets = newTeams.map((_, i) => i).filter(i => i !== teamIdx);
            if (targets.length > 0) {
                const targetIdx = targets[Math.floor(Math.random() * targets.length)];
                const targetTeam = newTeams[targetIdx];
                
                if (targetTeam.shielded) {
                    targetTeam.shielded = false;
                    msg = `${targetTeam.name} evitó el Glitch Swap con su ESCUDO!`;
                    soundService.play('block');
                } else {
                    const temp = userTeam.score;
                    userTeam.score = targetTeam.score;
                    targetTeam.score = temp;
                    msg = `GLITCH! ${userTeam.name} cambió puntos con ${targetTeam.name}`;
                }
            }
        }

        setTeams(newTeams);
        toast.info(msg);
        soundService.play('click');
    };

    // --- UI HELPERS ---
    const getCellColor = (points: number, answered: boolean) => {
        if (answered) return 'bg-gray-900 border-gray-800 text-gray-700';
        if (points >= 500) return 'bg-red-900/20 border-red-500/50 text-red-400';
        if (points >= 300) return 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400';
        return 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400';
    };

    // --- RENDER CONFIG PHASE ---
    if (phase === 'CONFIG') {
        // Reuse config logic but wrap it nicely (though Lobby handles main config now, we keep this for grid adjustment)
        // Since we moved full config to lobby, this phase might be redundant or just for confirmation.
        // Let's assume we skip directly to board or generate grid immediately.
        // For safety, we keep it but autoskip if everything is ready.
        useEffect(() => {
            generateGrid();
        }, []);
        return <div className="flex items-center justify-center h-screen"><div className="animate-spin text-cyan-500">Generating Neural Grid...</div></div>;
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col relative overflow-hidden">
            {/* INSTRUCTIONS & BG */}
            <GameInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} gameMode="JEOPARDY" t={t} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black -z-10 pointer-events-none"></div>

            {/* HEADER */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/50 backdrop-blur-md z-10">
                <CyberButton variant="ghost" onClick={onExit} className="pl-0 gap-2 text-xs">
                    <ArrowLeft className="w-4 h-4" /> SALIR
                </CyberButton>
                <div className="flex flex-col items-center">
                    <h1 className="font-cyber text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-widest">
                        NEURAL // JEOPARDY
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={toggleMute} className="p-2 text-gray-400 hover:text-white transition-colors">
                        {isMuted ? <VolumeX className="w-6 h-6 text-red-500" /> : <Volume2 className="w-6 h-6 text-green-400" />}
                    </button>
                    <button onClick={() => setShowInstructions(true)} className="p-2 text-cyan-400 hover:text-white transition-colors">
                        <HelpCircle className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* SIDEBAR: TEAMS */}
                <div className="w-full lg:w-80 bg-gray-900/50 border-r border-gray-800 overflow-y-auto p-4 space-y-4 z-10 custom-scrollbar">
                    {teams.sort((a,b) => b.score - a.score).map((team, idx) => (
                        <div key={team.id} className={`relative p-4 rounded border-2 transition-all ${idx === 0 ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-gray-700 bg-black/40'}`}>
                            {idx === 0 && <Trophy className="absolute -top-3 -right-3 w-8 h-8 text-yellow-400 drop-shadow-lg" />}
                            
                            <div className="flex justify-between items-center mb-2">
                                <h3 className={`font-bold font-mono ${idx === 0 ? 'text-yellow-100' : 'text-gray-300'}`}>{team.name}</h3>
                                <div className="flex gap-2">
                                    {team.shielded && <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />}
                                    {team.multiplier > 1 && <Zap className="w-4 h-4 text-yellow-400" />}
                                </div>
                            </div>
                            
                            <div className="relative">
                                <div className="text-3xl font-cyber text-white mb-2">{team.score}</div>
                                {/* Score Delta Animation */}
                                <ScoreDelta value={scoreDeltas[team.id] || 0} onEnd={() => setScoreDeltas(prev => ({ ...prev, [team.id]: null }))} />
                            </div>

                            {/* Active Inventory */}
                            <div className="flex gap-1 flex-wrap mb-2">
                                {team.inventory.map((item, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => useItem(teams.indexOf(team), i)}
                                        className="text-lg hover:scale-110 transition-transform bg-black/50 rounded p-1 border border-gray-600 hover:border-white" 
                                        title={`Usar ${item.name}`}
                                    >
                                        {item.icon}
                                    </button>
                                ))}
                            </div>

                            {/* Used Inventory (History) */}
                            {team.usedInventory && team.usedInventory.length > 0 && (
                                <div className="flex gap-1 flex-wrap opacity-40 grayscale border-t border-gray-800 pt-2">
                                    {team.usedInventory.map((item, i) => (
                                        <span key={`used-${i}`} className="text-xs">{item.icon}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* BOARD AREA */}
                <div className="flex-1 p-4 lg:p-8 overflow-y-auto flex items-center justify-center">
                    <div className="grid gap-3 w-full max-w-6xl aspect-video" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)` }}>
                        {grid.map((cell) => (
                            <button
                                key={cell.id}
                                onClick={() => handleCellClick(cell.id)}
                                disabled={cell.answered}
                                className={`
                                    relative rounded-lg border-2 flex items-center justify-center flex-col
                                    font-cyber text-2xl transition-all duration-300 transform
                                    ${getCellColor(cell.points, cell.answered)}
                                    ${!cell.answered && 'hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer'}
                                `}
                            >
                                {cell.answered ? <Check className="w-8 h-8 opacity-20" /> : (
                                    <>
                                        <span>{cell.points}</span>
                                        {cell.isWildcard && <span className="text-[10px] text-yellow-500 absolute bottom-2">WILD</span>}
                                    </>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- MODALS FOR PHASES --- */}

            {/* 1. EVENT REVEAL */}
            {phase === 'EVENT_REVEAL' && activeEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur animate-in zoom-in-95">
                    <CyberCard className="w-full max-w-lg border-purple-500 text-center space-y-6 p-10">
                        <div className="flex justify-center animate-bounce">{activeEvent.icon}</div>
                        <h2 className="text-3xl font-cyber text-purple-400">EVENTO ALEATORIO</h2>
                        <h3 className="text-xl font-bold text-white">{activeEvent.name}</h3>
                        <p className="text-gray-400 font-mono">{activeEvent.desc}</p>
                        <CyberButton onClick={resolveEvent} className="w-full mt-4">CONTINUAR</CyberButton>
                    </CyberCard>
                </div>
            )}

            {/* 2. QUESTION & SCORING */}
            {(phase === 'QUESTION' || phase === 'SCORING') && activeCell && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur animate-in slide-in-from-bottom-10">
                    <CyberCard className="w-full max-w-5xl border-cyan-500/30 flex flex-col max-h-[90vh] relative overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4 z-10 relative">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl font-cyber text-cyan-400">{activeCell.points} PTS</span>
                                {activeEvent && <span className="text-xs bg-purple-900/50 px-2 py-1 rounded text-purple-300 border border-purple-500">Event Active: {activeEvent.name}</span>}
                            </div>
                            
                            {/* TIMER DISPLAY */}
                            {!showAnswer && (
                                <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                    <Clock className="w-6 h-6" /> {timeLeft}s
                                </div>
                            )}

                            <button onClick={() => { setActiveCell(null); setPhase('BOARD'); }}><X className="w-6 h-6 text-gray-500 hover:text-white"/></button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto mb-6 text-center space-y-6 px-4 z-10 relative">
                            {activeCell.q?.imageUrl && (
                                <img src={activeCell.q.imageUrl} className="max-h-60 mx-auto rounded border border-gray-700" alt="Q" />
                            )}
                            <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                                {activeCell.q?.text || "COMODÍN / PREGUNTA SORPRESA"}
                            </h2>
                            
                            {!showAnswer ? (
                                <CyberButton onClick={() => { setShowAnswer(true); setPhase('SCORING'); }} className="mx-auto animate-pulse z-20 relative">
                                    <Gem className="w-4 h-4 mr-2"/> VER RESPUESTA
                                </CyberButton>
                            ) : (
                                <div className="bg-green-900/20 border border-green-500/50 p-6 rounded-lg animate-in fade-in">
                                    <p className="text-green-400 font-cyber text-xl">
                                        {activeCell.q ? (activeCell.q.options.find(o => activeCell.q!.correctOptionIds?.includes(o.id) || o.id === activeCell.q!.correctOptionId)?.text) : "El docente valida la respuesta."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* TIME UP OVERLAY */}
                        {isTimeUp && !showAnswer && (
                            <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center animate-in fade-in duration-500 pointer-events-none">
                                <h1 className="text-6xl md:text-8xl font-black text-red-600 font-cyber tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse">
                                    ¡TIEMPO AGOTADO!
                                </h1>
                                <p className="text-gray-400 font-mono mt-4">Esperando al profesor...</p>
                            </div>
                        )}

                        {/* Scoring Grid (Only visible after reveal) */}
                        {showAnswer && (
                            <div className="border-t border-gray-800 pt-6 animate-in slide-in-from-bottom-4 z-10 relative">
                                <h3 className="text-sm font-mono text-gray-500 mb-4 text-center uppercase tracking-widest">ASIGNAR PUNTUACIÓN</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                    {teams.map(team => {
                                        const status = teamAnswers[team.id];
                                        return (
                                            <button 
                                                key={team.id}
                                                onClick={() => toggleTeamAnswer(team.id)}
                                                className={`
                                                    flex items-center justify-between p-3 rounded border transition-all
                                                    ${status === 'CORRECT' ? 'bg-green-900/40 border-green-500 text-green-200' : 
                                                      status === 'WRONG' ? 'bg-red-900/40 border-red-500 text-red-200' : 
                                                      'bg-gray-800 border-gray-700 text-gray-500'}
                                                `}
                                            >
                                                <span className="font-bold truncate max-w-[100px]">{team.name}</span>
                                                <div className="flex gap-1">
                                                    {status === 'CORRECT' && <Check className="w-5 h-5" />}
                                                    {status === 'WRONG' && <X className="w-5 h-5" />}
                                                    {status === 'NONE' && <Minus className="w-5 h-5" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <CyberButton onClick={submitScores} variant="neural" className="w-full h-12 text-lg">
                                    APLICAR RESULTADOS
                                </CyberButton>
                            </div>
                        )}
                    </CyberCard>
                </div>
            )}

            {/* 3. ROULETTE */}
            {phase === 'ROULETTE' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur animate-in zoom-in-95">
                    <div className="text-center space-y-8 w-full max-w-lg">
                        <h2 className="text-4xl font-cyber text-yellow-400 animate-pulse">BONUS ROUND</h2>
                        
                        <div className="relative h-64 w-64 mx-auto border-4 border-yellow-600 rounded-full flex items-center justify-center bg-gray-900 overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                            {isSpinning ? (
                                <div className="text-6xl animate-spin">🎲</div>
                            ) : rouletteItem ? (
                                <div className="animate-in zoom-in duration-500">
                                    <div className="text-6xl mb-2">{rouletteItem.icon}</div>
                                </div>
                            ) : (
                                <CyberButton onClick={spinRoulette} className="rounded-full w-24 h-24 text-xl">GIRAR</CyberButton>
                            )}
                            
                            {/* Team Spinner Effect */}
                            {rouletteWinnerIdx !== null && (
                                <div className="absolute bottom-4 left-0 right-0 text-center bg-black/80 py-1">
                                    <span className="font-mono font-bold text-cyan-300">
                                        {teams[rouletteWinnerIdx].name}
                                    </span>
                                </div>
                            )}
                        </div>

                        {rouletteItem && !isSpinning && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4">
                                <div className="bg-yellow-900/30 border border-yellow-500/50 p-6 rounded-lg">
                                    <h3 className="text-2xl font-bold text-white mb-2">{rouletteItem.name}</h3>
                                    <p className="text-gray-300">{rouletteItem.desc}</p>
                                    <div className="mt-4 text-sm font-mono text-cyan-400">
                                        GANADOR: {teams[rouletteWinnerIdx!].name}
                                    </div>
                                </div>
                                <CyberButton onClick={closeRoulette} className="w-full">VOLVER AL TABLERO</CyberButton>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};
