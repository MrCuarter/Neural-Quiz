
import React, { useState, useEffect } from 'react';
import { Quiz, GameTeam, GameMode, JeopardyConfig, DistributionMode } from '../../types';
import { getUserQuizzes } from '../../services/firebaseService';
import { generateQuizCategories } from '../../services/geminiService';
import { CyberButton, CyberInput, CyberCard, CyberSelect, CyberCheckbox } from '../ui/CyberUI';
import { ArrowLeft, Gamepad2, Users, Play, Loader2, Search, Trophy, Map, Zap, Clock, Settings, Monitor, Lock, Shield, PenTool, BrainCircuit, Grid3X3, Dice5, List, CheckSquare, Layers, Type, Wand2, Smile } from 'lucide-react';
import { DEMO_QUIZZES } from '../../data/demoQuizzes';

interface GameLobbyProps {
    user: any;
    onBack: () => void;
    onStartGame: (quiz: Quiz, teams: GameTeam[], mode: GameMode, config: JeopardyConfig) => void;
    t: any;
    preSelectedQuiz?: Quiz | null;
    language?: string;
}

type LobbyPhase = 'SELECTION' | 'CONFIG';

const EMOJIS = ['🚀', '🦁', '⭐', '🔥', '💎', '🍀', '⚡', '🧠', '👾', '🐉', '🍕', '🎸', '⚽', '🦄', '💀', '🤖'];
const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500', 'bg-lime-500', 'bg-teal-500'];

export const GameLobby: React.FC<GameLobbyProps> = ({ user, onBack, onStartGame, t, preSelectedQuiz, language }) => {
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
    const [teamData, setTeamData] = useState<{name: string, color: string, emoji: string}[]>([
        { name: "Equipo Rojo", color: COLORS[0], emoji: EMOJIS[0] },
        { name: "Equipo Azul", color: COLORS[1], emoji: EMOJIS[1] }
    ]);
    
    // Detailed Config
    const [config, setConfig] = useState<JeopardyConfig>({
        timer: 20,
        allowNegativePoints: false,
        rows: 5,
        cols: 5,
        usePowerUps: true,
        randomEvents: true,
        catchUpLogic: true,
        distributionMode: 'STANDARD',
        selectedQuestionIds: [],
        categories: []
    });

    const [isGeneratingCats, setIsGeneratingCats] = useState(false);
    const [questionsExpanded, setQuestionsExpanded] = useState(false);

    // HANDLE PRE-SELECTED QUIZ (FROM EDITOR)
    useEffect(() => {
        if (preSelectedQuiz) {
            handleQuizSelect(preSelectedQuiz);
        } else if (user) {
            loadUserQuizzes();
        }
    }, [user, preSelectedQuiz]);

    // Initial Question Selection & Categories Logic
    useEffect(() => {
        if (selectedQuiz) {
            const slotsNeeded = getSlotsNeeded(config.distributionMode, config.rows, config.cols);
            const initialIds = selectedQuiz.questions.slice(0, slotsNeeded).map(q => q.id);
            
            setConfig(prev => {
                const currentCats = [...prev.categories];
                if (currentCats.length < config.cols) {
                    for(let i=currentCats.length; i<config.cols; i++) currentCats.push(`Cat ${i+1}`);
                } else {
                    currentCats.length = config.cols;
                }
                return { ...prev, selectedQuestionIds: initialIds, categories: currentCats };
            });
        }
    }, [selectedQuiz, config.distributionMode, config.rows, config.cols]); 

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
        setPhase('CONFIG'); 
    };

    const updateTeamCount = (count: number) => {
        const c = Math.max(2, Math.min(8, count));
        setTeamCount(c);
        setTeamData(prev => {
            const next = [...prev];
            if (c > prev.length) {
                for(let i=prev.length; i<c; i++) {
                    const color = COLORS[i % COLORS.length];
                    const name = color.replace('bg-', 'Equipo ').replace('-500', '');
                    next.push({ 
                        name: name.charAt(0).toUpperCase() + name.slice(1), 
                        color: color, 
                        emoji: EMOJIS[i % EMOJIS.length] 
                    });
                }
            } else {
                next.length = c;
            }
            return next;
        });
    };

    const updateTeamProp = (idx: number, field: string, val: string) => {
        const next = [...teamData];
        // @ts-ignore
        next[idx][field] = val;
        setTeamData(next);
    };

    const handleGenerateCategories = async () => {
        if (!selectedQuiz) return;
        setIsGeneratingCats(true);
        try {
            const qTexts = selectedQuiz.questions
                .filter(q => config.selectedQuestionIds.includes(q.id))
                .slice(0, 15)
                .map(q => q.text);
            const newCats = await generateQuizCategories(qTexts, config.cols);
            while(newCats.length < config.cols) newCats.push(`Cat ${newCats.length+1}`);
            setConfig(prev => ({ ...prev, categories: newCats }));
        } catch (e) {
            alert("Error generando categorías.");
        } finally {
            setIsGeneratingCats(false);
        }
    };

    const toggleQuestionSelection = (qId: string) => {
        setConfig(prev => {
            const current = prev.selectedQuestionIds;
            if (current.includes(qId)) return { ...prev, selectedQuestionIds: current.filter(id => id !== qId) };
            return { ...prev, selectedQuestionIds: [...current, qId] };
        });
    };

    const getSlotsNeeded = (mode: DistributionMode, rows: number, cols: number) => {
        if (mode === 'RIGGED') return cols; 
        if (mode === 'SPLIT') return cols * 2; 
        return rows * cols; 
    };

    const handleLaunch = () => {
        if (!selectedQuiz) return;
        const teams: GameTeam[] = teamData.map((t, i) => ({
            id: `team-${i}`,
            name: t.name,
            score: 0,
            inventory: [],
            usedInventory: [],
            shielded: false,
            multiplier: 1,
            avatarColor: t.color
        }));
        onStartGame(selectedQuiz, teams, selectedMode, config);
    };

    const filteredUserQuizzes = quizzes.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const slotsNeeded = getSlotsNeeded(config.distributionMode, config.rows, config.cols);
    const selectedCount = config.selectedQuestionIds.length;

    // --- RENDER PHASE 1: SELECTION ---
    if (phase === 'SELECTION') return (
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 animate-in slide-in-from-right-8">
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
                <CyberCard className="flex flex-col h-full border-yellow-900/30 bg-black/40">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-cyber font-bold text-yellow-100">DEMOS RÁPIDAS</h3>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                        {DEMO_QUIZZES.map(q => (
                            <button key={q.id} onClick={() => handleQuizSelect(q)} className="w-full text-left p-4 rounded border border-gray-800 bg-gray-900/50 hover:bg-yellow-900/20 hover:border-yellow-500/50 transition-all group relative overflow-hidden">
                                <div className="absolute inset-0 bg-yellow-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <div className="relative z-10">
                                    <h4 className="font-bold text-sm text-white group-hover:text-yellow-300">{q.title}</h4>
                                    <div className="mt-2 flex gap-2"><span className="text-[9px] bg-black px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{q.questions.length} Qs</span></div>
                                </div>
                            </button>
                        ))}
                    </div>
                </CyberCard>

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
                                <button key={q.id} onClick={() => handleQuizSelect(q)} className="w-full text-left p-4 rounded border border-gray-800 bg-gray-900/50 hover:bg-cyan-900/20 hover:border-cyan-500/50 transition-all group relative overflow-hidden">
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

    // --- RENDER PHASE 2: CONFIGURATION (VERTICAL BLOCKS) ---
    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-right-8 pb-20">
            
            {/* BLOCK 1: GAME SETTINGS */}
            <CyberCard className="border-purple-500/30">
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                    <h3 className="font-cyber font-bold text-white flex items-center gap-2 text-lg">
                        <Settings className="w-5 h-5 text-purple-400" /> 1. AJUSTES DE PARTIDA
                    </h3>
                    {!preSelectedQuiz && <button onClick={() => setPhase('SELECTION')} className="text-xs text-gray-500 hover:text-white underline">Cambiar Quiz</button>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 block">MODO DE JUEGO</label>
                        <div className="flex gap-3">
                            <button onClick={() => setSelectedMode('JEOPARDY')} className={`flex-1 p-3 rounded border-2 transition-all flex flex-col items-center gap-1 ${selectedMode === 'JEOPARDY' ? 'bg-purple-900/30 border-purple-500' : 'bg-black/20 border-gray-800 opacity-60'}`}>
                                <Trophy className={`w-5 h-5 ${selectedMode === 'JEOPARDY' ? 'text-purple-400' : 'text-gray-500'}`} />
                                <span className="font-bold text-[10px]">JEOPARDY</span>
                            </button>
                            <button onClick={() => setSelectedMode('HEX_CONQUEST')} className={`flex-1 p-3 rounded border-2 transition-all flex flex-col items-center gap-1 ${selectedMode === 'HEX_CONQUEST' ? 'bg-yellow-900/30 border-yellow-500' : 'bg-black/20 border-gray-800 opacity-60'}`}>
                                <Map className={`w-5 h-5 ${selectedMode === 'HEX_CONQUEST' ? 'text-yellow-400' : 'text-gray-500'}`} />
                                <span className="font-bold text-[10px]">HEX MAP</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2 block">REGLAS</label>
                        <div className="grid grid-cols-2 gap-2">
                            <CyberCheckbox label="Power-Ups" checked={config.usePowerUps} onChange={(c) => setConfig({...config, usePowerUps: c})} />
                            <CyberCheckbox label="Eventos Random" checked={config.randomEvents} onChange={(c) => setConfig({...config, randomEvents: c})} />
                            <CyberCheckbox label="Negativos" checked={config.allowNegativePoints} onChange={(c) => setConfig({...config, allowNegativePoints: c})} warning={config.allowNegativePoints} />
                            <CyberCheckbox label="Catch-Up" checked={config.catchUpLogic} onChange={(c) => setConfig({...config, catchUpLogic: c})} />
                        </div>
                    </div>
                </div>
            </CyberCard>

            {/* BLOCK 2: QUESTIONS & CATEGORIES */}
            <CyberCard className="border-cyan-500/30">
                <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setQuestionsExpanded(!questionsExpanded)}>
                    <h3 className="font-cyber font-bold text-white flex items-center gap-2 text-lg">
                        <List className="w-5 h-5 text-cyan-400" /> 2. PREGUNTAS Y CATEGORÍAS
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                        {selectedCount} / {slotsNeeded} Seleccionadas
                        {questionsExpanded ? <ArrowLeft className="w-4 h-4 -rotate-90"/> : <ArrowLeft className="w-4 h-4 rotate-90"/>}
                    </div>
                </div>

                {questionsExpanded && (
                    <div className="animate-in slide-in-from-top-2 space-y-4">
                        {selectedMode === 'JEOPARDY' && (
                            <div className="bg-black/20 p-3 rounded border border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-mono text-purple-400">CATEGORÍAS DEL TABLERO ({config.cols})</span>
                                    <button onClick={handleGenerateCategories} disabled={isGeneratingCats} className="text-[10px] bg-purple-900/50 text-purple-200 px-2 py-1 rounded flex items-center gap-1 border border-purple-500/30">
                                        <Wand2 className={`w-3 h-3 ${isGeneratingCats ? 'animate-spin' : ''}`} /> GENERAR IA
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                    {config.categories.map((cat, idx) => (
                                        <input key={idx} value={cat} onChange={(e) => {const n=[...config.categories]; n[idx]=e.target.value; setConfig({...config, categories: n})}} className="bg-black/40 border border-gray-700 text-xs text-white p-2 rounded focus:border-cyan-500 outline-none w-full" placeholder={`Col ${idx+1}`} />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto custom-scrollbar border border-gray-800 rounded bg-black/20 p-2 space-y-1">
                            {selectedQuiz?.questions.map((q, idx) => {
                                const isSelected = config.selectedQuestionIds.includes(q.id);
                                return (
                                    <div key={q.id} onClick={() => toggleQuestionSelection(q.id)} className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-all ${isSelected ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-black/20 border-transparent opacity-60 hover:opacity-100'}`}>
                                        <div className={`mt-0.5 ${isSelected ? 'text-cyan-400' : 'text-gray-600'}`}>{isSelected ? <CheckSquare className="w-4 h-4" /> : <div className="w-4 h-4 border border-gray-600 rounded" />}</div>
                                        <p className={`text-xs font-mono truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>{idx+1}. {q.text}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CyberCard>

            {/* BLOCK 3: TEAMS */}
            <CyberCard className="border-green-500/30">
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                    <h3 className="font-cyber font-bold text-white flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-green-400" /> 3. EQUIPOS
                    </h3>
                    <div className="flex items-center gap-2 bg-black/40 p-1 rounded">
                        <button onClick={() => updateTeamCount(teamCount - 1)} className="w-6 h-6 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700">-</button>
                        <span className="w-8 text-center font-mono font-bold text-sm">{teamCount}</span>
                        <button onClick={() => updateTeamCount(teamCount + 1)} className="w-6 h-6 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700">+</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {teamData.map((team, i) => (
                        <div key={i} className={`p-3 rounded border border-gray-700 bg-black/40 flex flex-col gap-2 relative group overflow-hidden`}>
                            <div className={`absolute top-0 left-0 w-full h-1 ${team.color}`}></div>
                            
                            <div className="flex items-center gap-2">
                                <input value={team.name} onChange={(e) => updateTeamProp(i, 'name', e.target.value)} className="bg-transparent text-sm font-bold text-white w-full focus:outline-none border-b border-transparent focus:border-white" />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <select 
                                    value={team.emoji} 
                                    onChange={(e) => updateTeamProp(i, 'emoji', e.target.value)}
                                    className="bg-gray-800 border border-gray-600 rounded text-lg w-12 h-8 text-center appearance-none cursor-pointer hover:bg-gray-700"
                                >
                                    {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                <div className={`w-4 h-4 rounded-full ${team.color} shadow-sm ring-2 ring-white/10`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </CyberCard>

            {/* LAUNCH BUTTON */}
            <button 
                onClick={handleLaunch} 
                className="w-full py-5 rounded-xl font-black font-cyber tracking-widest text-2xl flex items-center justify-center gap-4 transition-all duration-300 shadow-[0_0_30px_rgba(34,197,94,0.3)] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:scale-[1.02]"
            >
                <Play className="w-8 h-8 fill-current" /> START GAME
            </button>
        </div>
    );
};
