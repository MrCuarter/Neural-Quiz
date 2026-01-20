
import React, { useState, useEffect } from 'react';
import { Quiz, GameTeam, GameMode } from '../../types';
import { getUserQuizzes } from '../../services/firebaseService';
import { CyberButton, CyberInput } from '../ui/CyberUI';
import { ArrowLeft, Gamepad2, Users, Play, Loader2, Search, Trophy, Map, Zap, Crown, Lock } from 'lucide-react';
import { DEMO_QUIZZES } from '../../data/demoQuizzes';

interface GameLobbyProps {
    user: any;
    onBack: () => void;
    onStartGame: (quiz: Quiz, teams: GameTeam[], mode: GameMode) => void;
    t: any;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ user, onBack, onStartGame, t }) => {
    const [step, setStep] = useState<'select-quiz' | 'select-mode' | 'setup-teams'>('select-quiz');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [selectedMode, setSelectedMode] = useState<GameMode>('JEOPARDY');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Team State
    const [teamCount, setTeamCount] = useState(2);
    const [teamNames, setTeamNames] = useState<string[]>(["Equipo Rojo", "Equipo Azul"]);

    useEffect(() => {
        if (user && step === 'select-quiz') {
            loadUserQuizzes();
        }
    }, [user, step]);

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
        setStep('select-mode');
    };

    const updateTeamCount = (count: number) => {
        const c = Math.max(2, Math.min(8, count));
        setTeamCount(c);
        
        // Adjust names array
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
            shielded: false,
            multiplier: 1,
            avatarColor: colors[i % colors.length]
        }));

        onStartGame(selectedQuiz, teams, selectedMode);
    };

    const filteredUserQuizzes = quizzes.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // --- UI HELPERS ---
    const goBack = () => {
        if (step === 'setup-teams') setStep('select-mode');
        else if (step === 'select-mode') setStep('select-quiz');
        else onBack();
    };

    // --- RENDER SECTIONS ---

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col relative w-full pt-8 pb-20 px-4">
            
            {/* ARCADE BACKGROUND */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black -z-10 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 -z-10 mix-blend-overlay"></div>

            {/* HEADER */}
            <div className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-white/10 pb-6 mb-8">
                <button onClick={goBack} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors uppercase font-mono font-bold tracking-widest text-sm group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {step !== 'select-quiz' ? "BACK" : "EXIT ARCADE"}
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
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">SYSTEM ONLINE</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* STEP 1: SELECT QUIZ */}
            {step === 'select-quiz' && (
                <div className="max-w-6xl mx-auto w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* DEMO SECTION */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-yellow-400 pl-4">
                            <Zap className="w-6 h-6 text-yellow-400" />
                            <h3 className="text-xl font-bold font-cyber text-white tracking-wide">
                                INSTANT PLAY <span className="text-yellow-400 text-sm font-mono ml-2">// NO LOGIN REQUIRED</span>
                            </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {DEMO_QUIZZES.map(q => (
                                <button key={q.id} onClick={() => handleQuizSelect(q)} className="group relative text-left h-full">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
                                    <div className="relative h-full bg-black border border-white/10 rounded-lg p-6 flex flex-col hover:bg-gray-900 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="px-2 py-1 bg-yellow-900/50 border border-yellow-500/30 rounded text-[10px] text-yellow-400 font-mono uppercase tracking-wider">DEMO</span>
                                            <Crown className="w-5 h-5 text-yellow-500" />
                                        </div>
                                        <h4 className="text-xl font-bold text-white group-hover:text-yellow-300 transition-colors mb-2 font-cyber leading-tight">{q.title}</h4>
                                        <p className="text-sm text-gray-400 font-mono mb-4 flex-1">{q.description}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/10 pt-3 font-mono">
                                            <span>{q.questions.length} QUESTIONS</span>
                                            <span className="text-yellow-500 group-hover:translate-x-1 transition-transform">PLAY NOW &rarr;</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* USER SECTION */}
                    <div className="space-y-6 pt-8 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 border-l-4 border-cyan-400 pl-4">
                                <Users className="w-6 h-6 text-cyan-400" />
                                <h3 className="text-xl font-bold font-cyber text-white tracking-wide">
                                    YOUR LIBRARY <span className="text-cyan-400 text-sm font-mono ml-2">// CUSTOM CONTENT</span>
                                </h3>
                            </div>
                            {user && (
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="text"
                                        placeholder="Search database..."
                                        className="w-full bg-black/50 border border-white/10 rounded px-4 pl-10 py-2 text-sm text-cyan-300 focus:border-cyan-500 focus:outline-none focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all font-mono"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {!user ? (
                            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                                <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-white mb-2">Authenticated Access Required</h4>
                                <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">Log in to access your personal quiz collection and create custom game lobbies.</p>
                                {/* We don't render a login button here to avoid complex state lifting, just info */}
                                <div className="text-xs text-gray-600 font-mono">PLEASE LOGIN VIA HOME PAGE</div>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
                        ) : filteredUserQuizzes.length === 0 ? (
                            <div className="text-center py-20 text-gray-600 border-2 border-dashed border-gray-800 rounded-lg font-mono">
                                NO DATA FOUND
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredUserQuizzes.map(q => (
                                    <button key={q.id} onClick={() => handleQuizSelect(q)} className="group text-left h-full">
                                        <div className="h-full bg-black/40 border border-white/10 rounded-lg p-4 hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all hover:scale-[1.02] duration-300 shadow-lg">
                                            <h4 className="font-bold text-white group-hover:text-cyan-400 truncate mb-1">{q.title}</h4>
                                            <div className="flex gap-2 mb-3">
                                                {q.tags?.slice(0, 2).map(tag => (
                                                    <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 border border-gray-700">{tag}</span>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-mono text-right">{q.questions.length} Qs</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STEP 2: SELECT MODE */}
            {step === 'select-mode' && (
                <div className="max-w-5xl mx-auto w-full animate-in zoom-in-95 duration-500">
                    <div className="text-center mb-12 space-y-2">
                        <h3 className="text-3xl font-black font-cyber text-white uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">Select Game Protocol</h3>
                        <p className="text-gray-400 font-mono text-sm">Choose your battlefield</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* JEOPARDY CARD */}
                        <button onClick={() => { setSelectedMode('JEOPARDY'); setStep('setup-teams'); }} className="group relative h-80 w-full perspective-1000">
                            <div className="absolute inset-0 bg-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
                            <div className="relative h-full bg-black/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 flex flex-col items-center text-center hover:border-purple-400 transition-all group-hover:transform group-hover:-translate-y-2">
                                <div className="p-6 rounded-full bg-purple-900/30 border border-purple-500/50 mb-6 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-500">
                                    <Trophy className="w-16 h-16 text-purple-400" />
                                </div>
                                <h4 className="text-3xl font-cyber font-bold text-white mb-2 group-hover:text-purple-300">JEOPARDY</h4>
                                <p className="text-gray-400 font-mono text-sm leading-relaxed max-w-xs">{t.game_jeopardy_desc}</p>
                                <div className="mt-auto pt-6 w-full">
                                    <div className="w-full py-2 rounded bg-purple-600/20 border border-purple-500/50 text-purple-300 font-mono text-xs font-bold uppercase tracking-widest group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        INITIALIZE
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* HEX CONQUEST CARD */}
                        <button onClick={() => { setSelectedMode('HEX_CONQUEST'); setStep('setup-teams'); }} className="group relative h-80 w-full perspective-1000">
                            <div className="absolute inset-0 bg-yellow-600 rounded-2xl blur opacity-20 group-hover:opacity-60 transition duration-500"></div>
                            <div className="relative h-full bg-black/80 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-8 flex flex-col items-center text-center hover:border-yellow-400 transition-all group-hover:transform group-hover:-translate-y-2">
                                <div className="p-6 rounded-full bg-yellow-900/30 border border-yellow-500/50 mb-6 group-hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transition-all duration-500">
                                    <Map className="w-16 h-16 text-yellow-400" />
                                </div>
                                <h4 className="text-3xl font-cyber font-bold text-white mb-2 group-hover:text-yellow-300">HEX CONQUEST</h4>
                                <p className="text-gray-400 font-mono text-sm leading-relaxed max-w-xs">{t.game_hex_desc}</p>
                                <div className="mt-auto pt-6 w-full">
                                    <div className="w-full py-2 rounded bg-yellow-600/20 border border-yellow-500/50 text-yellow-300 font-mono text-xs font-bold uppercase tracking-widest group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                                        INITIALIZE
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: SETUP TEAMS */}
            {step === 'setup-teams' && selectedQuiz && (
                <div className="max-w-2xl mx-auto w-full animate-in slide-in-from-right-10 duration-500">
                    <div className="relative bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-t-2xl"></div>
                        
                        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                            <div className="p-3 bg-cyan-900/20 rounded border border-cyan-500/30">
                                <Users className="w-8 h-8 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-cyber text-white">{t.game_setup_teams}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-300 font-mono border border-gray-700">{selectedQuiz.title}</span>
                                    <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-300 font-mono border border-gray-700">{selectedMode}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Counter */}
                            <div className="flex items-center justify-between bg-black/40 p-4 rounded-lg border border-white/5">
                                <label className="text-sm font-mono text-gray-300 uppercase tracking-wider">TEAM COUNT</label>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => updateTeamCount(teamCount - 1)} className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded border border-gray-600 hover:bg-gray-700 hover:border-white transition-all text-white font-bold text-xl">-</button>
                                    <span className="w-8 text-center font-bold text-2xl font-cyber text-cyan-400">{teamCount}</span>
                                    <button onClick={() => updateTeamCount(teamCount + 1)} className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded border border-gray-600 hover:bg-gray-700 hover:border-white transition-all text-white font-bold text-xl">+</button>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {teamNames.map((name, i) => (
                                    <div key={i} className="group relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                                        <input 
                                            value={name} 
                                            onChange={(e) => handleNameChange(i, e.target.value)}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 pl-8 text-white font-mono focus:border-cyan-500 focus:outline-none focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all"
                                            placeholder={`Team ${i+1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-white/10">
                            <button 
                                onClick={handleLaunch} 
                                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold font-cyber tracking-widest text-lg rounded-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3"
                            >
                                <Play className="w-5 h-5 fill-current" /> LAUNCH GAME
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
