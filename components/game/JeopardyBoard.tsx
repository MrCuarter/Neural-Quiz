
import React, { useState, useEffect } from 'react';
import { Quiz, Question, GameTeam, PowerUp, PowerUpType } from '../../types';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { ArrowLeft, X, Trophy, AlertTriangle, Shield, Zap, RefreshCw, Skull, Gem } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface JeopardyBoardProps {
    quiz: Quiz;
    initialTeams: GameTeam[];
    onExit: () => void;
}

// ITEMS DEFINITION
const ITEMS: Record<PowerUpType, Omit<PowerUp, 'id'>> = {
    DOUBLE: { type: 'DOUBLE', name: 'Nano-Boost', icon: '🧪', desc: 'x2 en tu próximo acierto' },
    STEAL: { type: 'STEAL', name: 'Data Leech', icon: '🦹', desc: 'Roba 300 pts al líder' },
    BOMB: { type: 'BOMB', name: 'Logic Bomb', icon: '💣', desc: '-200 pts a todos los rivales' },
    SWAP: { type: 'SWAP', name: 'Glitch Swap', icon: '🔄', desc: 'Intercambia pts con un rival random' },
    SHIELD: { type: 'SHIELD', name: 'Firewall', icon: '🛡️', desc: 'Protege del próximo ataque' },
};

export const JeopardyBoard: React.FC<JeopardyBoardProps> = ({ quiz, initialTeams, onExit }) => {
    const toast = useToast();
    const [teams, setTeams] = useState<GameTeam[]>(initialTeams);
    const [activeTeamIndex, setActiveTeamIndex] = useState(0); // Optional: if we want turn-based, currently free-for-all
    
    // Board State
    const [categories, setCategories] = useState<{ name: string, questions: { q: Question, points: number, answered: boolean }[] }[]>([]);
    const [currentQ, setCurrentQ] = useState<{ q: Question, points: number, catIdx: number, qIdx: number } | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [lastEvent, setLastEvent] = useState<string | null>(null);

    // Initialization
    useEffect(() => {
        // Distribute questions into 4 columns (max 5 rows) -> Max 20 questions
        const cols = 4;
        const rows = 5;
        const totalSlots = cols * rows;
        
        // Take subset of questions to fit board
        const pool = quiz.questions.slice(0, totalSlots);
        
        const newCats: typeof categories = Array.from({ length: cols }, (_, i) => ({
            name: `SECTOR 0${i + 1}`,
            questions: []
        }));

        pool.forEach((q, idx) => {
            const catIndex = idx % cols;
            const rowIndex = Math.floor(idx / cols);
            if (rowIndex < rows) {
                newCats[catIndex].questions.push({
                    q,
                    points: (rowIndex + 1) * 100,
                    answered: false
                });
            }
        });

        setCategories(newCats);
    }, [quiz]);

    // --- GAMEPLAY MECHANICS ---

    const handleQuestionClick = (catIdx: number, qIdx: number) => {
        const item = categories[catIdx].questions[qIdx];
        if (item.answered) return;
        setCurrentQ({ q: item.q, points: item.points, catIdx, qIdx });
        setShowAnswer(false);
    };

    const handleScore = (teamIdx: number, isCorrect: boolean) => {
        if (!currentQ) return;
        
        const newTeams = [...teams];
        const team = newTeams[teamIdx];
        let points = currentQ.points;

        if (isCorrect) {
            // Apply Multiplier
            points = points * team.multiplier;
            team.multiplier = 1; // Reset potion
            team.score += points;
            
            // Loot Logic (40% Chance)
            if (Math.random() < 0.4 && team.inventory.length < 3) {
                const itemKeys = Object.keys(ITEMS) as PowerUpType[];
                const randomType = itemKeys[Math.floor(Math.random() * itemKeys.length)];
                const newItem = { ...ITEMS[randomType], id: Math.random().toString() };
                team.inventory.push(newItem);
                setLastEvent(`${team.name} encontró ${newItem.icon} ${newItem.name}!`);
                toast.success(`${team.name} obtiend item: ${newItem.name}`);
            } else {
                setLastEvent(`${team.name} gana ${points} pts!`);
            }

        } else {
            team.score -= Math.floor(points / 2); // Penalty half points
            setLastEvent(`${team.name} pierde ${Math.floor(points/2)} pts...`);
        }

        setTeams(newTeams);
        
        // Mark as answered
        const newCats = [...categories];
        newCats[currentQ.catIdx].questions[currentQ.qIdx].answered = true;
        setCategories(newCats);
        setCurrentQ(null);
    };

    const useItem = (teamIdx: number, itemIdx: number) => {
        const newTeams = [...teams];
        const userTeam = newTeams[teamIdx];
        const item = userTeam.inventory[itemIdx];
        
        // Remove item
        userTeam.inventory.splice(itemIdx, 1);

        // Execute Effect
        let msg = "";
        
        switch (item.type) {
            case 'DOUBLE':
                userTeam.multiplier = 2;
                msg = `${userTeam.name} activa NANO-BOOST (x2)`;
                break;
            case 'SHIELD':
                userTeam.shielded = true;
                msg = `${userTeam.name} activa FIREWALL`;
                break;
            case 'STEAL':
                // Find leader (excluding self)
                const others = newTeams.filter((_, i) => i !== teamIdx);
                if (others.length > 0) {
                    const leader = others.reduce((prev, current) => (prev.score > current.score) ? prev : current);
                    if (!leader.shielded) {
                        leader.score -= 300;
                        userTeam.score += 300;
                        msg = `¡${userTeam.name} roba 300 pts a ${leader.name}!`;
                    } else {
                        leader.shielded = false; // Break shield
                        msg = `${leader.name} bloqueó el robo con FIREWALL!`;
                    }
                }
                break;
            case 'BOMB':
                newTeams.forEach((t, i) => {
                    if (i !== teamIdx) {
                        if (!t.shielded) {
                            t.score -= 200;
                        } else {
                            t.shielded = false;
                        }
                    }
                });
                msg = `¡BOOM! ${userTeam.name} lanza una bomba lógica!`;
                break;
            case 'SWAP':
                const targets = newTeams.map((_, i) => i).filter(i => i !== teamIdx);
                if (targets.length > 0) {
                    const targetIdx = targets[Math.floor(Math.random() * targets.length)];
                    const targetTeam = newTeams[targetIdx];
                    if (!targetTeam.shielded) {
                        const temp = userTeam.score;
                        userTeam.score = targetTeam.score;
                        targetTeam.score = temp;
                        msg = `GLITCH! ${userTeam.name} cambió puntos con ${targetTeam.name}`;
                    } else {
                        targetTeam.shielded = false;
                        msg = `${targetTeam.name} evitó el Glitch con FIREWALL!`;
                    }
                }
                break;
        }

        setTeams(newTeams);
        setLastEvent(msg);
        toast.info(msg);
    };

    // --- RENDER ---

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col relative overflow-hidden">
            {/* BACKGROUND EFFECTS */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black -z-10 pointer-events-none"></div>
            
            {/* HEADER */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/50 backdrop-blur-md z-10">
                <CyberButton variant="ghost" onClick={onExit} className="pl-0 gap-2 text-xs">
                    <ArrowLeft className="w-4 h-4" /> SALIR
                </CyberButton>
                <h1 className="font-cyber text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-widest">
                    NEURAL // JEOPARDY
                </h1>
                <div className="w-20"></div> {/* Spacer */}
            </div>

            {/* MAIN LAYOUT */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* LEFT: TEAMS & SCOREBOARD */}
                <div className="w-full lg:w-80 bg-gray-900/50 border-r border-gray-800 overflow-y-auto p-4 space-y-4 z-10 custom-scrollbar">
                    {teams.sort((a,b) => b.score - a.score).map((team, idx) => (
                        <div key={team.id} className={`relative p-4 rounded border-2 transition-all ${idx === 0 ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-gray-700 bg-black/40'}`}>
                            {idx === 0 && <Trophy className="absolute -top-3 -right-3 w-8 h-8 text-yellow-400 drop-shadow-lg" />}
                            
                            <div className="flex justify-between items-center mb-2">
                                <h3 className={`font-bold font-mono ${idx === 0 ? 'text-yellow-100' : 'text-gray-300'}`}>{team.name}</h3>
                                {team.shielded && <Shield className="w-4 h-4 text-cyan-400 animate-pulse" title="Shielded" />}
                            </div>
                            
                            <div className="text-3xl font-cyber text-white mb-2">{team.score}</div>
                            
                            {/* Inventory */}
                            <div className="flex gap-2 min-h-[30px]">
                                {team.inventory.map((item, iIdx) => (
                                    <button 
                                        key={iIdx} 
                                        onClick={() => useItem(teams.indexOf(team), iIdx)}
                                        className="w-8 h-8 bg-black/60 border border-gray-600 rounded flex items-center justify-center text-lg hover:scale-110 hover:border-white transition-transform"
                                        title={item.desc}
                                    >
                                        {item.icon}
                                    </button>
                                ))}
                                {team.inventory.length === 0 && <span className="text-[10px] text-gray-600 italic mt-1">Inventario vacío</span>}
                            </div>

                            {team.multiplier > 1 && (
                                <div className="absolute top-2 right-2 text-xs font-bold text-pink-400 animate-bounce">
                                    x{team.multiplier} ACTIVE
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Event Log */}
                    {lastEvent && (
                        <div className="mt-4 p-3 bg-black/80 border border-cyan-500/30 text-cyan-300 text-xs font-mono rounded animate-in fade-in slide-in-from-bottom-2">
                            > SYSTEM_LOG: {lastEvent}
                        </div>
                    )}
                </div>

                {/* CENTER: GAME BOARD */}
                <div className="flex-1 p-4 lg:p-8 overflow-y-auto flex items-center justify-center relative">
                    <div className="grid grid-cols-4 gap-4 w-full max-w-6xl h-full max-h-[800px]">
                        {/* Headers */}
                        {categories.map((cat, i) => (
                            <div key={i} className="bg-cyan-950/40 border border-cyan-500/30 p-2 text-center flex items-center justify-center rounded">
                                <h3 className="font-cyber text-cyan-400 text-xs md:text-sm tracking-wider break-words">{cat.name}</h3>
                            </div>
                        ))}

                        {/* Cells */}
                        {Array.from({ length: 5 }).map((_, rIdx) => (
                            <React.Fragment key={rIdx}>
                                {categories.map((cat, cIdx) => {
                                    const q = cat.questions[rIdx];
                                    if (!q) return <div key={`${cIdx}-${rIdx}`} className="opacity-0"></div>;
                                    
                                    return (
                                        <button 
                                            key={`${cIdx}-${rIdx}`}
                                            disabled={q.answered}
                                            onClick={() => handleQuestionClick(cIdx, rIdx)}
                                            className={`
                                                relative h-20 md:h-28 rounded border-2 flex items-center justify-center text-xl md:text-3xl font-cyber transition-all duration-300
                                                ${q.answered 
                                                    ? 'border-gray-800 bg-black/20 text-gray-700 cursor-default' 
                                                    : 'border-cyan-500/50 bg-cyan-900/10 text-cyan-300 hover:bg-cyan-500 hover:text-black hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] cursor-pointer'
                                                }
                                            `}
                                        >
                                            {q.answered ? '' : q.points}
                                        </button>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL: ACTIVE QUESTION */}
            {currentQ && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in-95">
                    <CyberCard className="w-full max-w-4xl border-pink-500/50 shadow-[0_0_100px_rgba(236,72,153,0.2)]">
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-pink-900/20 px-3 py-1 rounded border border-pink-500/30 text-pink-400 font-mono text-sm">
                                {categories[currentQ.catIdx].name} // {currentQ.points} PTS
                            </div>
                            <button onClick={() => setCurrentQ(null)} className="text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        {/* Content */}
                        <div className="text-center space-y-8 py-4">
                            {currentQ.q.imageUrl && (
                                <img src={currentQ.q.imageUrl} alt="Question Media" className="max-h-60 mx-auto rounded border border-gray-700 object-contain" />
                            )}
                            
                            <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                                {currentQ.q.text}
                            </h2>

                            {!showAnswer ? (
                                <CyberButton onClick={() => setShowAnswer(true)} className="mx-auto animate-pulse">
                                    <Gem className="w-4 h-4 mr-2" /> REVELAR RESPUESTA
                                </CyberButton>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                    <div className="bg-green-950/30 border border-green-500/50 p-6 rounded-lg">
                                        <p className="text-green-400 font-cyber text-xl md:text-2xl">
                                            {currentQ.q.options.find(o => currentQ.q.correctOptionIds?.includes(o.id) || o.id === currentQ.q.correctOptionId)?.text || "Respuesta no definida"}
                                        </p>
                                    </div>

                                    {/* Score Assignment */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {teams.map((team, idx) => (
                                            <div key={idx} className="flex flex-col gap-2">
                                                <button 
                                                    onClick={() => handleScore(idx, true)}
                                                    className="bg-green-600 hover:bg-green-500 text-white p-2 rounded text-xs font-bold shadow-lg shadow-green-900/50"
                                                >
                                                    + {team.name}
                                                </button>
                                                <button 
                                                    onClick={() => handleScore(idx, false)}
                                                    className="bg-red-900/50 hover:bg-red-800 text-red-200 p-2 rounded text-xs font-bold border border-red-900"
                                                >
                                                    - Fallo
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CyberCard>
                </div>
            )}
        </div>
    );
};
