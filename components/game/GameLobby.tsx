
import React, { useState, useEffect } from 'react';
import { Quiz, GameTeam } from '../../types';
import { getUserQuizzes } from '../../services/firebaseService';
import { CyberButton, CyberCard, CyberInput } from '../ui/CyberUI';
import { ArrowLeft, Gamepad2, Users, Play, Loader2, Search } from 'lucide-react';

interface GameLobbyProps {
    user: any;
    onBack: () => void;
    onStartGame: (quiz: Quiz, teams: GameTeam[]) => void;
    t: any;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ user, onBack, onStartGame, t }) => {
    const [step, setStep] = useState<'select-quiz' | 'setup-teams'>('select-quiz');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Team State
    const [teamCount, setTeamCount] = useState(2);
    const [teamNames, setTeamNames] = useState<string[]>(["Equipo Rojo", "Equipo Azul"]);

    useEffect(() => {
        if (user && step === 'select-quiz') {
            loadQuizzes();
        }
    }, [user, step]);

    const loadQuizzes = async () => {
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
            alert("Este quiz tiene muy pocas preguntas. Necesitas al menos 4.");
            return;
        }
        setSelectedQuiz(quiz);
        setStep('setup-teams');
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

        onStartGame(selectedQuiz, teams);
    };

    const filteredQuizzes = quizzes.filter(q => q.title.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 w-full pt-8 pb-20">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <CyberButton variant="ghost" onClick={() => step === 'setup-teams' ? setStep('select-quiz') : onBack()} className="pl-0 gap-2">
                    <ArrowLeft className="w-4 h-4" /> {step === 'setup-teams' ? "CAMBIAR QUIZ" : "VOLVER"}
                </CyberButton>
                <div className="flex items-center gap-2 text-cyan-400">
                    <Gamepad2 className="w-6 h-6" />
                    <h2 className="text-2xl font-cyber">NEURAL GAME</h2>
                </div>
            </div>

            {step === 'select-quiz' && (
                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-white">SELECCIONA UN QUIZ</h3>
                        <p className="text-gray-500 text-sm font-mono">Elige el contenido para tu partida de Jeopardy.</p>
                    </div>

                    <div className="max-w-md mx-auto relative">
                        <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                        <CyberInput 
                            placeholder="Buscar quiz..." 
                            className="pl-10"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
                    ) : filteredQuizzes.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                            No tienes quizzes guardados. Crea uno primero.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredQuizzes.map(q => (
                                <button key={q.id} onClick={() => handleQuizSelect(q)} className="text-left group">
                                    <CyberCard className="h-full border-gray-800 group-hover:border-cyan-500/50 group-hover:bg-cyan-950/10 transition-all">
                                        <h4 className="font-bold text-lg text-gray-200 group-hover:text-cyan-300 truncate">{q.title}</h4>
                                        <p className="text-xs text-gray-500 mt-2">{q.questions.length} Preguntas</p>
                                    </CyberCard>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {step === 'setup-teams' && selectedQuiz && (
                <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-10">
                    <CyberCard className="border-cyan-500/30">
                        <div className="flex items-center gap-4 mb-6 border-b border-gray-800 pb-4">
                            <div className="p-3 bg-cyan-900/20 rounded border border-cyan-500/30">
                                <Users className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">CONFIGURACIÓN DE EQUIPOS</h3>
                                <p className="text-xs text-cyan-500 font-mono">Quiz: {selectedQuiz.title}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-mono text-gray-400">NÚMERO DE EQUIPOS:</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateTeamCount(teamCount - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700">-</button>
                                    <span className="w-8 text-center font-bold text-xl">{teamCount}</span>
                                    <button onClick={() => updateTeamCount(teamCount + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded hover:bg-gray-700">+</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {teamNames.map((name, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full shrink-0 bg-gray-700`} />
                                        <CyberInput 
                                            value={name} 
                                            onChange={(e) => handleNameChange(i, e.target.value)}
                                            placeholder={`Nombre Equipo ${i+1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-800">
                            <CyberButton variant="neural" onClick={handleLaunch} className="w-full h-14 text-lg">
                                <Play className="w-5 h-5 mr-2" /> COMENZAR PARTIDA
                            </CyberButton>
                        </div>
                    </CyberCard>
                </div>
            )}
        </div>
    );
};
