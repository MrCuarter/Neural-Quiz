
import React, { useEffect, useState } from 'react';
import { Quiz, GameTeam, GameMode } from '../types';
import { getPublicQuiz, importQuizToLibrary } from '../services/shareService';
import { CyberButton, CyberCard } from './ui/CyberUI';
import { Loader2, AlertTriangle, Trophy, Map, Copy, ArrowLeft, Gamepad2, Share2, Download, User } from 'lucide-react';

interface PublicQuizLandingProps {
    quizId: string;
    currentUser: any;
    onPlay: (quiz: Quiz, mode: GameMode) => void;
    onBack: () => void;
    onLoginReq: () => void;
}

export const PublicQuizLanding: React.FC<PublicQuizLandingProps> = ({ quizId, currentUser, onPlay, onBack, onLoginReq }) => {
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        loadQuiz();
    }, [quizId]);

    const loadQuiz = async () => {
        setLoading(true);
        try {
            const data = await getPublicQuiz(quizId);
            setQuiz(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!currentUser) {
            onLoginReq();
            return;
        }
        if (!quiz) return;

        setImporting(true);
        try {
            await importQuizToLibrary(quiz, currentUser.uid);
            alert("¡Quiz guardado en tu biblioteca!");
            setTimeout(() => onBack(), 500); 
        } catch (e: any) {
            alert("Error al importar: " + e.message);
        } finally {
            setImporting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-cyan-500">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <span className="font-mono animate-pulse">RECUPERANDO DATOS DE LA RED NEURAL...</span>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <CyberCard className="max-w-md border-red-500/50 text-center space-y-6">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
                    <h2 className="text-2xl font-cyber text-red-400">ERROR 404: QUIZ NO ENCONTRADO</h2>
                    <p className="text-gray-400 font-mono text-sm">Este enlace está roto, el quiz es privado o ha sido eliminado por el autor.</p>
                    <CyberButton onClick={onBack} variant="secondary">VOLVER AL INICIO</CyberButton>
                </CyberCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-10 pb-20 px-4 relative overflow-hidden">
            {/* Background FX */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-black to-black -z-10"></div>
            
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> INICIO
                    </button>
                    <div className="flex items-center gap-2 text-xs font-mono text-gray-600 bg-black/40 px-3 py-1 rounded border border-gray-800">
                        <Share2 className="w-3 h-3" /> VISTA PÚBLICA
                    </div>
                </div>

                {/* Main Card */}
                <CyberCard className="border-cyan-500/30 p-8 md:p-12 relative overflow-hidden">
                    {/* Decorative Header */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
                    
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-4">
                            <h1 className="text-4xl md:text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 leading-tight">
                                {quiz.title}
                            </h1>
                            <div className="flex items-center gap-4 text-sm font-mono text-gray-400">
                                <span className="flex items-center gap-1"><User className="w-4 h-4 text-cyan-400" /> {quiz.authorName || 'Anónimo'}</span>
                                <span>|</span>
                                <span>{quiz.questions.length} Preguntas</span>
                                <span>|</span>
                                <span>{new Date(quiz.updatedAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <p className="text-lg text-gray-300 leading-relaxed border-l-2 border-gray-700 pl-4">
                                {quiz.description || "Sin descripción proporcionada."}
                            </p>
                            
                            <div className="flex gap-2 flex-wrap pt-2">
                                {quiz.tags?.map(t => (
                                    <span key={t} className="text-xs bg-gray-900 border border-gray-700 px-2 py-1 rounded text-gray-400">#{t}</span>
                                ))}
                            </div>
                        </div>

                        {/* Action Column */}
                        <div className="w-full md:w-72 flex flex-col gap-4">
                            
                            {/* CLONE BUTTON */}
                            {quiz.allowCloning ? (
                                <CyberButton 
                                    onClick={handleImport} 
                                    isLoading={importing}
                                    className="w-full h-14 text-sm bg-gradient-to-r from-cyan-900 to-blue-900 border-cyan-500 hover:border-white"
                                >
                                    <Download className="w-5 h-5 mr-2" /> 
                                    {currentUser ? "GUARDAR EN MI LIBRERÍA" : "REGÍSTRATE PARA GUARDAR"}
                                </CyberButton>
                            ) : (
                                <div className="p-4 bg-gray-900/50 border border-gray-800 rounded text-center text-xs text-gray-500 font-mono">
                                    <div className="flex justify-center mb-2"><User className="w-4 h-4"/></div>
                                    El autor ha desactivado la clonación de este quiz.
                                </div>
                            )}

                            <div className="h-px bg-gray-800 w-full my-2"></div>
                            <p className="text-center text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Jugar Ahora</p>

                            <button onClick={() => onPlay(quiz, 'JEOPARDY')} className="group relative w-full p-4 bg-purple-950/20 border border-purple-500/30 hover:border-purple-400 rounded-lg transition-all hover:bg-purple-900/30 text-left">
                                <div className="flex items-center justify-between">
                                    <span className="font-cyber font-bold text-purple-200 group-hover:text-white">JEOPARDY</span>
                                    <Trophy className="w-5 h-5 text-purple-500" />
                                </div>
                                <span className="text-[10px] text-purple-400/60 font-mono">Modo Concurso Clásico</span>
                            </button>

                            <button onClick={() => onPlay(quiz, 'HEX_CONQUEST')} className="group relative w-full p-4 bg-yellow-950/20 border border-yellow-500/30 hover:border-yellow-400 rounded-lg transition-all hover:bg-yellow-900/30 text-left">
                                <div className="flex items-center justify-between">
                                    <span className="font-cyber font-bold text-yellow-200 group-hover:text-white">HEX CONQUEST</span>
                                    <Map className="w-5 h-5 text-yellow-500" />
                                </div>
                                <span className="text-[10px] text-yellow-400/60 font-mono">Estrategia Territorial</span>
                            </button>

                        </div>
                    </div>
                </CyberCard>

                {/* Footer Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50">
                    <div className="bg-black/20 p-4 rounded border border-gray-800 text-center">
                        <div className="text-2xl font-mono font-bold text-white">{quiz.clones || 0}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Clonaciones</div>
                    </div>
                    <div className="bg-black/20 p-4 rounded border border-gray-800 text-center">
                        <div className="text-2xl font-mono font-bold text-white">{quiz.visits || 0}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Visitas</div>
                    </div>
                </div>

            </div>
        </div>
    );
};
