
import React, { useState, useEffect } from 'react';
import { Quiz, Question, GameTeam, HexCell } from '../../types';
import { CyberButton, CyberCard, CyberSelect } from '../ui/CyberUI';
import { ArrowLeft, Coins, Gem, HelpCircle, Lock, Shield, Map, X, CheckSquare, Square } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { GameInstructionsModal } from './GameInstructionsModal';
import { translations } from '../../utils/translations';

interface HexConquestGameProps {
    quiz: Quiz;
    initialTeams: GameTeam[];
    onExit: () => void;
}

const ROWS = 5;
const COLS = 6;
const COSTS = {
    CONQUER: 50,
    INVADE: 150,
    SHIELD: 100,
    BLOCK: 75
};

export const HexConquestGame: React.FC<HexConquestGameProps> = ({ quiz, initialTeams, onExit }) => {
    const t = translations['es'];
    const toast = useToast();
    const [teams, setTeams] = useState<GameTeam[]>(initialTeams.map(t => ({...t, score: 0}))); // Reset gold to 0
    const [cells, setCells] = useState<HexCell[]>([]);
    const [activeTeamIndex, setActiveTeamIndex] = useState(0);
    const [showInstructions, setShowInstructions] = useState(false);
    
    // Question State
    const [questionQueue, setQuestionQueue] = useState<Question[]>([...quiz.questions]);
    const [currentQ, setCurrentQ] = useState<Question | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [selectedWinners, setSelectedWinners] = useState<number[]>([]); // Indices of teams who answered correctly

    // Action State
    const [selectedCellId, setSelectedCellId] = useState<number | null>(null);

    // Init Grid
    useEffect(() => {
        const grid: HexCell[] = [];
        let id = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                grid.push({
                    id: id++,
                    row: r,
                    col: c,
                    ownerId: null,
                    isLocked: false,
                    isShielded: false
                });
            }
        }
        setCells(grid);
    }, []);

    // --- LOGIC ---

    const nextQuestion = () => {
        if (questionQueue.length === 0) {
            toast.info("¡Se acabaron las preguntas! Reiniciando ciclo.");
            setQuestionQueue([...quiz.questions]);
            return;
        }
        const next = questionQueue[0];
        setQuestionQueue(prev => prev.slice(1));
        setCurrentQ(next);
        setShowAnswer(false);
        setSelectedWinners([]);
    };

    const toggleWinner = (teamIdx: number) => {
        setSelectedWinners(prev => 
            prev.includes(teamIdx) ? prev.filter(i => i !== teamIdx) : [...prev, teamIdx]
        );
    };

    const confirmWinners = () => {
        const newTeams = [...teams];
        selectedWinners.forEach(idx => {
            newTeams[idx].score += 100; // Add Gold
        });
        setTeams(newTeams);
        toast.success(`+100 Oro a ${selectedWinners.length} equipos.`);
        setCurrentQ(null);
    };

    const handleCellClick = (cell: HexCell) => {
        setSelectedCellId(cell.id);
    };

    const executeAction = (action: 'CONQUER' | 'INVADE' | 'SHIELD' | 'BLOCK') => {
        if (selectedCellId === null) return;
        const cell = cells[selectedCellId];
        const activeTeam = teams[activeTeamIndex];
        const cost = COSTS[action];

        if (activeTeam.score < cost) {
            toast.error(`Oro insuficiente. Necesitas ${cost}.`);
            return;
        }

        const newCells = [...cells];
        const targetCell = newCells[selectedCellId];

        // LOGIC CHECKS
        if (targetCell.isLocked) {
            toast.error("¡Casilla Bloqueada!");
            return;
        }

        if (action === 'CONQUER') {
            if (targetCell.ownerId !== null) {
                toast.error("¡Ya tiene dueño! Usa INVADIR.");
                return;
            }
            targetCell.ownerId = activeTeam.id;
        } 
        else if (action === 'INVADE') {
            if (targetCell.ownerId === null) {
                toast.error("Es neutral. Usa CONQUISTAR (más barato).");
                return;
            }
            if (targetCell.ownerId === activeTeam.id) {
                toast.error("¡Ya es tuya!");
                return;
            }
            if (targetCell.isShielded) {
                targetCell.isShielded = false; // Break shield
                toast.warning("¡Escudo roto! Invasión fallida pero escudo eliminado.");
                // Pay cost anyway
            } else {
                targetCell.ownerId = activeTeam.id;
            }
        }
        else if (action === 'SHIELD') {
            if (targetCell.ownerId !== activeTeam.id) {
                toast.error("Solo puedes proteger tus casillas.");
                return;
            }
            targetCell.isShielded = true;
        }
        else if (action === 'BLOCK') {
            if (targetCell.ownerId !== null) {
                toast.error("Solo puedes bloquear casillas neutrales.");
                return;
            }
            targetCell.isLocked = true;
        }

        // Pay & Update
        const newTeams = [...teams];
        newTeams[activeTeamIndex].score -= cost;
        setTeams(newTeams);
        setCells(newCells);
        setSelectedCellId(null);
        toast.success(`Acción ${action} realizada.`);
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col relative overflow-hidden">
            <GameInstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} gameMode="HEX_CONQUEST" t={t} />
            
            {/* HEADER */}
            <div className="bg-black/60 backdrop-blur-md border-b border-gray-800 p-4 flex justify-between items-center z-10 sticky top-0">
                <CyberButton variant="ghost" onClick={onExit} className="pl-0 gap-2 text-xs">
                    <ArrowLeft className="w-4 h-4" /> SALIR
                </CyberButton>
                <div className="flex items-center gap-4">
                    <h1 className="font-cyber text-2xl text-yellow-400">HEX CONQUEST</h1>
                    <button onClick={() => setShowInstructions(true)}><HelpCircle className="w-5 h-5 text-gray-400 hover:text-white"/></button>
                </div>
                
                {/* ACTIVE TURN SELECTOR */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 uppercase">TURNO DE COMPRA:</span>
                    <select 
                        className="bg-gray-800 border border-gray-600 text-white text-xs p-2 rounded"
                        value={activeTeamIndex}
                        onChange={(e) => { setActiveTeamIndex(parseInt(e.target.value)); setSelectedCellId(null); }}
                    >
                        {teams.map((t, i) => (
                            <option key={t.id} value={i}>{t.name} ({t.score} Gold)</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* LEFT: TEAMS STATUS */}
                <div className="w-full lg:w-64 bg-gray-900/80 border-r border-gray-800 p-4 space-y-4 overflow-y-auto">
                    <CyberButton onClick={nextQuestion} variant="neural" className="w-full mb-4">
                        <Gem className="w-4 h-4 mr-2" /> NUEVA PREGUNTA
                    </CyberButton>

                    {teams.map((team, idx) => (
                        <div key={team.id} className={`p-3 rounded border transition-all ${idx === activeTeamIndex ? 'border-yellow-500 bg-yellow-900/20' : 'border-gray-700 bg-black/40'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold ${idx === activeTeamIndex ? 'text-yellow-200' : 'text-gray-300'}`}>{team.name}</span>
                                <div className={`w-3 h-3 rounded-full ${team.avatarColor}`}></div>
                            </div>
                            <div className="flex items-center gap-2 text-yellow-400 font-mono text-lg">
                                <Coins className="w-4 h-4" /> {team.score}
                            </div>
                        </div>
                    ))}
                </div>

                {/* CENTER: MAP */}
                <div className="flex-1 p-8 bg-slate-900 overflow-auto flex items-center justify-center relative">
                    <div 
                        className="grid gap-2"
                        style={{ 
                            display: 'grid',
                            gridTemplateColumns: `repeat(${COLS}, minmax(60px, 1fr))`,
                            width: '100%',
                            maxWidth: '800px'
                        }}
                    >
                        {cells.map((cell) => {
                            const owner = teams.find(t => t.id === cell.ownerId);
                            const isActive = selectedCellId === cell.id;
                            const isEvenRow = cell.row % 2 === 0;
                            
                            return (
                                <button
                                    key={cell.id}
                                    onClick={() => handleCellClick(cell)}
                                    className={`
                                        aspect-square rounded-xl border-2 flex items-center justify-center relative transition-all duration-300
                                        ${isActive ? 'scale-110 z-10 shadow-[0_0_20px_rgba(255,255,255,0.5)] border-white' : 'border-gray-700 hover:border-gray-500'}
                                        ${owner ? '' : 'bg-gray-800/50'}
                                        ${cell.row % 2 !== 0 ? 'translate-x-[50%]' : ''} 
                                    `}
                                    style={{ 
                                        backgroundColor: owner ? undefined : '', // Default handled by tailwind
                                        // Inject owner color dynamically if owned, else fallback
                                        ...(owner ? { backgroundColor: getComputedStyle(document.documentElement).getPropertyValue(owner.avatarColor.replace('bg-', '--')) } : {}),
                                    }}
                                >
                                    {/* Using the tailwind class for background color directly is hard without safelist, using style simulation */}
                                    {owner && (
                                        <div className={`absolute inset-0 opacity-60 rounded-xl ${owner.avatarColor}`}></div>
                                    )}

                                    {cell.isLocked && <Lock className="w-6 h-6 text-gray-400 z-10" />}
                                    {cell.isShielded && <Shield className="w-6 h-6 text-cyan-400 z-10 drop-shadow-md" />}
                                    {isActive && <div className="absolute inset-0 border-2 border-white rounded-xl animate-pulse"></div>}
                                </button>
                            );
                        })}
                    </div>

                    {/* ACTION MENU (FLOATING) */}
                    {selectedCellId !== null && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/90 border border-yellow-500/50 p-4 rounded-lg flex gap-4 animate-in slide-in-from-bottom-4 shadow-2xl z-20">
                            <button onClick={() => executeAction('CONQUER')} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded text-green-400">
                                <Map className="w-6 h-6" />
                                <span className="text-[10px] font-bold">CONQUISTAR</span>
                                <span className="text-[10px] text-yellow-500">50g</span>
                            </button>
                            <div className="w-px bg-gray-700"></div>
                            <button onClick={() => executeAction('INVADE')} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded text-red-400">
                                <X className="w-6 h-6" />
                                <span className="text-[10px] font-bold">INVADIR</span>
                                <span className="text-[10px] text-yellow-500">150g</span>
                            </button>
                            <div className="w-px bg-gray-700"></div>
                            <button onClick={() => executeAction('SHIELD')} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded text-cyan-400">
                                <Shield className="w-6 h-6" />
                                <span className="text-[10px] font-bold">ESCUDO</span>
                                <span className="text-[10px] text-yellow-500">100g</span>
                            </button>
                            <div className="w-px bg-gray-700"></div>
                            <button onClick={() => executeAction('BLOCK')} className="flex flex-col items-center gap-1 p-2 hover:bg-white/10 rounded text-gray-400">
                                <Lock className="w-6 h-6" />
                                <span className="text-[10px] font-bold">BLOQUEO</span>
                                <span className="text-[10px] text-yellow-500">75g</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* QUESTION MODAL (SIMULTANEOUS) */}
            {currentQ && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in zoom-in-95">
                    <CyberCard className="w-full max-w-4xl border-yellow-500/30">
                        <div className="text-center space-y-6">
                            <h2 className="text-2xl md:text-3xl font-bold text-white">{currentQ.text}</h2>
                            
                            {!showAnswer ? (
                                <CyberButton onClick={() => setShowAnswer(true)} className="mx-auto">
                                    VER RESPUESTA
                                </CyberButton>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                                    <div className="bg-green-900/20 p-4 rounded border border-green-500/50">
                                        <p className="text-green-400 text-xl font-mono">
                                            {currentQ.options.find(o => currentQ.correctOptionIds?.includes(o.id) || o.id === currentQ.correctOptionId)?.text}
                                        </p>
                                    </div>

                                    <div className="text-left bg-black/40 p-6 rounded border border-gray-800">
                                        <h3 className="text-yellow-400 font-bold mb-4 uppercase tracking-widest text-sm">¿QUIÉNES ACERTARON? (+100 Gold)</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {teams.map((team, idx) => (
                                                <button 
                                                    key={team.id}
                                                    onClick={() => toggleWinner(idx)}
                                                    className={`flex items-center gap-3 p-3 rounded border transition-all ${selectedWinners.includes(idx) ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                                >
                                                    {selectedWinners.includes(idx) ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5"/>}
                                                    <span className="font-bold">{team.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <CyberButton variant="neural" onClick={confirmWinners} className="w-full h-14 text-lg">
                                        CONFIRMAR Y VOLVER AL MAPA
                                    </CyberButton>
                                </div>
                            )}
                        </div>
                    </CyberCard>
                </div>
            )}
        </div>
    );
};
