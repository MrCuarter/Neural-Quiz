
import React, { useState, useEffect } from 'react';
import { Quiz, GameTeam, GameMode } from '../../types';
import { getUserQuizzes } from '../../services/firebaseService';
import { CyberButton, CyberInput, CyberCard, CyberSelect, CyberCheckbox } from '../ui/CyberUI';
import { ArrowLeft, Gamepad2, Users, Play, Loader2, Search, Trophy, Map, Zap, Clock, Settings, Monitor, Lock, Shield, PenTool, BrainCircuit } from 'lucide-react';
import { DEMO_QUIZZES } from '../../data/demoQuizzes';

interface GameLobbyProps {
    user: any;
    onBack: () => void;
    onStartGame: (quiz: Quiz, teams: GameTeam[], mode: GameMode, timer: number, negativePoints: boolean) => void;
    t: any;
}

type LobbyPhase = 'SELECTION' | 'CONFIG';

export const GameLobby: React.FC<GameLobbyProps> = ({ user, onBack, onStartGame, t }) => {
    // --- STATE ---
    const [phase, setPhase] = useState<LobbyPhase>('SELECTION');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Selection State
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    
    // Config State
    const [selectedMode, setSelectedMode] = useState<GameMode>('JEOPARDY');
    const [teamCount, setTeamCount] = useState(2);
    const [teamNames, setTeamNames] = useState<string[]>(["Equipo Rojo", "Equipo Azul"]);
    const [timerValue, setTimerValue] = useState(20); 
    const [allowNegativePoints, setAllowNegativePoints] = useState(false);

    useEffect(() => {
        if (user) {
            loadUserQuizzes();
        }
    }, [user]);

    const loadUserQuizzes = async () => {
        setLoading(true);
        try {
            const data = await getUserQuizzes(user.uid);
            setQuizzes(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleQuizSelect = (quiz: Quiz) => {
        if (quiz.questions.length < 4) {
            alert("Este quiz tiene muy pocas preguntas. Necesitas al menos 4 para jugar.");
            return;
        }
        setSelectedQuiz(quiz);
        setPhase('CONFIG'); // Advance to next phase
    };

    const updateTeamCount = (count: number) => {
        const c = Math.max(2, Math.min(8, count));
        setTeamCount(c);
        setTeamNames(prev => {
            const next = [...prev];
            if (c > prev.length) {
                for(let i=prev.length; i<c; i++) next.push(`Equipo ${i+1}`);
            } else {
                next.length = c;
            }
            return next;
        });
    };

    const handleNameChange = (idx: number, name: string) => {
        const next = [...teamNames];
        next[idx] = name;
        setTeamNames(next);
    };

    const handleLaunch = () => {
        if (!selectedQuiz) return;
        
        const colors = [
            'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
            'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'
        ];

        const teams: GameTeam[] = teamNames.map((name, i) => ({
            id: `team-${i}`,
            name,
            score: 0,
            inventory: [],
            usedInventory: [],
            shielded: false,
            multiplier: 1,
            avatarColor: colors[i % colors.length]
        }));

        onStartGame(selectedQuiz, teams, selectedMode, timerValue, allowNegativePoints);
    };

    const filteredUserQuizzes = quizzes.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // --- RENDER PHASE 1: SELECTION ---
    const renderSelectionPhase = () => (
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 animate-in slide-in-from-right-8">
            {/* SEARCH & CREATE ACTIONS */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <input 
                        type="text"
                        placeholder="Buscar quizzes..."
                        className="w-full bg-black/50 border border-gray-700 rounded-full px-4 py-3 pl-10 text-sm text-cyan-100 focus:border-cyan-500 outline-none font-mono transition-all focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                </div>
                <div className="flex gap-2">
                    <CyberButton variant="secondary" onClick={onBack} className="text-xs h-10 px-4">
                        <PenTool className="w-3 h-3 mr-2" /> CREAR MANUAL
                    </CyberButton>
                    <CyberButton variant="neural" onClick={onBack} className="text-xs h-10 px-4">
                        <BrainCircuit className="w-3 h-3 mr-2" /> CREAR CON IA
                    </CyberButton>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[50vh]">
                {/* COLUMN 1: DEMOS */}
                <CyberCard className="flex flex-col h-full border-yellow-900/30 bg-black/40">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-cyber font-bold text-yellow-100">DEMOS RÁPIDAS</h3>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                        {DEMO_QUIZZES.map(q => (
                            <button 
                                key={q.id} 
                                onClick={() => handleQuizSelect(q)}
                                className="w-full text-left p-4 rounded border border-gray-800 bg-gray-900/50 hover:bg-yellow-900/20 hover:border-yellow-500/50 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-yellow-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <div className="relative z-10">
                                    <h4 className="font-bold text-sm text-white group-hover:text-yellow-300">{q.title}</h4>
                                    <p className="text-[10px] text-gray-500 mt-1">{q.description}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className="text-[9px] bg-black px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{q.questions.length} Qs</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </CyberCard>

                {/* COLUMN 2: MY LIBRARY */}
                <CyberCard className="flex flex-col h-full border-cyan-900/30 bg-black/40">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                        <Users className="w-5 h-5 text-cyan-400" />
                        <h3 className="font-cyber font-bold text-cyan-100">MI LIBRERÍA</h3>
                    </div>
                    
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                        {!user ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-gray-800 rounded">
                                <Lock className="w-8 h-8 text-gray-600 mb-2" />
                                <p className="text-xs text-gray-500">Inicia sesión para ver tus quizzes</p>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
                        ) : filteredUserQuizzes.length === 0 ? (
                            <div className="text-center py-10 text-xs text-gray-500">No se encontraron quizzes.</div>
                        ) : (
                            filteredUserQuizzes.map(q => (
                                <button 
                                    key={q.id} 
                                    onClick={() => handleQuizSelect(q)}
                                    className="w-full text-left p-4 rounded border border-gray-800 bg-gray-900/50 hover:bg-cyan-900/20 hover:border-cyan-500/50 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-cyan-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <div className="relative z-10">
                                        <h4 className="font-bold text-sm text-white group-hover:text-cyan-300">{q.title}</h4>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[9px] bg-black px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{q.questions.length} Qs</span>
                                            {q.tags?.[0] && <span className="text-[9px] bg-black px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">#{q.tags[0]}</span>}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </CyberCard>
            </div>
        </div>
    );

    // --- RENDER PHASE 2: CONFIGURATION ---
    const renderConfigPhase = () => (
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-8">
            
            {/* LEFT: GAME SETTINGS */}
            <div className="space-y-6">
                <CyberCard className="border-purple-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-cyber font-bold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-purple-400" /> CONFIGURACIÓN
                        </h3>
                        <button onClick={() => setPhase('SELECTION')} className="text-xs text-gray-500 hover:text-white underline">Cambiar Quiz</button>
                    </div>

                    <div className="space-y-6">
                        {/* MODE */}
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setSelectedMode('JEOPARDY')} className={`p-4 rounded border-2 transition-all flex flex-col items-center gap-2 ${selectedMode === 'JEOPARDY' ? 'bg-purple-900/30 border-purple-500' : 'bg-black/20 border-gray-800 opacity-60'}`}>
                                <Trophy className={`w-6 h-6 ${selectedMode === 'JEOPARDY' ? 'text-purple-400' : 'text-gray-500'}`} />
                                <span className="font-bold text-xs">JEOPARDY</span>
                            </button>
                            <button onClick={() => setSelectedMode('HEX_CONQUEST')} className={`p-4 rounded border-2 transition-all flex flex-col items-center gap-2 ${selectedMode === 'HEX_CONQUEST' ? 'bg-yellow-900/30 border-yellow-500' : 'bg-black/20 border-gray-800 opacity-60'}`}>
                                <Map className={`w-6 h-6 ${selectedMode === 'HEX_CONQUEST' ? 'text-yellow-400' : 'text-gray-500'}`} />
                                <span className="font-bold text-xs">HEX MAP</span>
                            </button>
                        </div>

                        {/* TIMER */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Tiempo por Pregunta
                            </label>
                            <div className="flex items-center gap-4 bg-black/40 p-3 rounded border border-gray-800">
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="120" 
                                    step="5"
                                    value={timerValue} 
                                    onChange={(e) => setTimerValue(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                                <span className="bg-black border border-cyan-500/50 text-cyan-300 font-mono font-bold px-3 py-1 rounded min-w-[60px] text-center">
                                    {timerValue}s
                                </span>
                            </div>
                        </div>

                        {/* OPTIONS */}
                        <div className="space-y-3 bg-black/40 p-4 rounded border border-gray-800">
                            <label className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 block">Reglas Especiales</label>
                            <CyberCheckbox 
                                label="Permitir Puntos Negativos (< 0)" 
                                checked={allowNegativePoints} 
                                onChange={setAllowNegativePoints} 
                                warning={allowNegativePoints}
                            />
                            <div className="text-[10px] text-gray-500 pl-8">
                                {allowNegativePoints 
                                    ? "¡Cuidado! Los equipos pueden quedar en bancarrota." 
                                    : "Modo seguro: La puntuación mínima es 0."}
                            </div>
                        </div>
                    </div>
                </CyberCard>
            </div>

            {/* RIGHT: TEAMS & LAUNCH */}
            <div className="space-y-6 flex flex-col h-full">
                <CyberCard className="border-green-500/30 flex-1 flex flex-col">
                    <h3 className="font-cyber font-bold text-white flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-green-400" /> EQUIPOS
                    </h3>
                    
                    <div className="flex items-center gap-4 mb-4 bg-black/40 p-2 rounded">
                        <button onClick={() => updateTeamCount(teamCount - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700 text-white font-bold">-</button>
                        <span className="flex-1 text-center font-mono font-bold text-xl">{teamCount} Equipos</span>
                        <button onClick={() => updateTeamCount(teamCount + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700 text-white font-bold">+</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[300px] mb-6">
                        {teamNames.map((name, i) => (
                            <div key={i} className="flex items-center gap-3 bg-black/20 p-2 rounded border border-gray-800">
                                <div className={`w-3 h-3 rounded-full ${['bg-red-500','bg-blue-500','bg-green-500','bg-yellow-500','bg-purple-500','bg-pink-500','bg-cyan-500','bg-orange-500'][i%8]}`}></div>
                                <input 
                                    value={name} 
                                    onChange={(e) => handleNameChange(i, e.target.value)}
                                    className="bg-transparent text-sm text-gray-300 w-full focus:outline-none font-mono"
                                    placeholder={`Nombre Equipo ${i+1}`}
                                />
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleLaunch} 
                        className="w-full py-4 rounded-xl font-black font-cyber tracking-widest text-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-500/20 hover:scale-[1.02]"
                    >
                        <Play className="w-6 h-6 fill-current" /> START GAME
                    </button>
                </CyberCard>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col relative w-full pt-8 pb-20 px-4">
            {/* BACKGROUND */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black -z-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 -z-10 mix-blend-overlay"></div>

            {/* HEADER */}
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors uppercase font-mono font-bold tracking-widest text-sm group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    EXIT ARCADE
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500 text-black rounded font-bold shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                        <Gamepad2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black font-cyber tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                            NEURAL ARCADE
                        </h2>
                        <div className="flex gap-2">
                            <span className={`w-2 h-2 rounded-full ${phase === 'SELECTION' ? 'bg-cyan-500' : 'bg-purple-500'} animate-pulse`}></span>
                            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                                {phase === 'SELECTION' ? 'SELECCIÓN DE QUIZ' : 'CONFIGURACIÓN DE SALA'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* PHASE RENDERER */}
            {phase === 'SELECTION' ? renderSelectionPhase() : renderConfigPhase()}
        </div>
    );
};
