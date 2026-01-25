
import React, { useState, useEffect } from 'react';
import { Quiz, Evaluation, EvaluationConfig } from '../../types';
import { createEvaluation } from '../../services/firebaseService';
import { CyberButton, CyberCard, CyberInput, CyberCheckbox, CyberTextArea, CyberSelect } from '../ui/CyberUI';
import { X, Rocket, Calendar, Zap, Trophy, MessageSquare, Copy, Check, ExternalLink, Shield, AlertCircle, Timer, List } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface CreateEvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    quiz: Quiz;
    user: any;
}

export const CreateEvaluationModal: React.FC<CreateEvaluationModalProps> = ({ isOpen, onClose, quiz, user }) => {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [createdUrl, setCreatedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    
    // New: Game Mode Config
    const [gameMode, setGameMode] = useState<'classic' | 'time_attack'>('classic');
    const [questionCount, setQuestionCount] = useState(0);
    const [timeLimit, setTimeLimit] = useState(180); // Default 3 mins for Time Attack
    const [countWarning, setCountWarning] = useState(false);

    // Mechanics
    const [speedPoints, setSpeedPoints] = useState(true);
    const [powerUps, setPowerUps] = useState(false); // Default false for evaluation
    const [showRanking, setShowRanking] = useState(true);

    // Feedback
    const [msgHigh, setMsgHigh] = useState("¡Impresionante! Eres un maestro.");
    const [msgMed, setMsgMed] = useState("¡Buen trabajo! Vas por buen camino.");
    const [msgLow, setMsgLow] = useState("Sigue practicando, ¡tú puedes!");

    useEffect(() => {
        if (isOpen && quiz) {
            // Reset state on open
            setTitle(quiz.title || "Evaluación");
            // Set default start date to NOW
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setStartDate(now.toISOString().slice(0, 16));
            setEndDate("");
            setCreatedUrl(null);
            setCopied(false);
            
            // Initialize count
            setQuestionCount(quiz.questions.length);
            setCountWarning(false);
        }
    }, [isOpen, quiz]);

    // Handle Question Count Change with Validation
    const handleCountChange = (val: number) => {
        setQuestionCount(val);
        if (val > quiz.questions.length) {
            setCountWarning(true);
        } else {
            setCountWarning(false);
        }
    };

    const handleSave = async () => {
        if (!user || !quiz) return;
        if (!title.trim()) {
            toast.error("El título es obligatorio");
            return;
        }

        setIsLoading(true);
        try {
            // Normalize count if exceeds max
            const finalCount = Math.min(Math.max(1, questionCount), quiz.questions.length);

            const config: EvaluationConfig = {
                gameMode,
                questionCount: finalCount,
                timeLimit: gameMode === 'time_attack' ? timeLimit : undefined,
                allowSpeedPoints: speedPoints,
                allowPowerUps: powerUps,
                showRanking: showRanking,
                feedbackMessages: {
                    high: msgHigh,
                    medium: msgMed,
                    low: msgLow
                },
                startDate: new Date(startDate).toISOString(),
                endDate: endDate ? new Date(endDate).toISOString() : undefined
            };

            const evaluationData: Omit<Evaluation, 'id' | 'createdAt'> = {
                quizId: quiz.id!,
                quizTitle: quiz.title,
                hostUserId: user.uid,
                title: title,
                config: config,
                isActive: true,
                participants: 0,
                questions: quiz.questions // Snapshot of current questions
            };

            const evalId = await createEvaluation(evaluationData);
            
            // Generate Play URL
            const url = `${window.location.origin}/play/${evalId}`;
            setCreatedUrl(url);
            toast.success("¡Evaluación creada con éxito!");

        } catch (e: any) {
            console.error(e);
            toast.error("Error creando la evaluación: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (createdUrl) {
            navigator.clipboard.writeText(createdUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.info("Enlace copiado");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <CyberCard className="w-full max-w-2xl border-cyan-500/50 flex flex-col max-h-[90vh] overflow-hidden relative shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4 shrink-0">
                    <div className="flex items-center gap-3 text-cyan-400">
                        <Rocket className="w-6 h-6" />
                        <div>
                            <h2 className="font-cyber font-bold text-lg leading-none">LANZAR EVALUACIÓN ARCADE</h2>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">CREA UNA SESIÓN ASÍNCRONA PARA TUS ALUMNOS</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-6">
                    
                    {!createdUrl ? (
                        <>
                            {/* 1. GENERAL CONFIG */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-mono font-bold text-white bg-gray-900/50 p-2 rounded border-l-2 border-cyan-500 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-cyan-400" /> CONFIGURACIÓN GENERAL
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <CyberInput 
                                        label="TÍTULO DE LA SESIÓN" 
                                        value={title} 
                                        onChange={(e) => setTitle(e.target.value)} 
                                        placeholder="Ej: Examen Unidad 1"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">FECHA INICIO</label>
                                            <input 
                                                type="datetime-local" 
                                                value={startDate} 
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="bg-black/40 border border-gray-700 text-white p-3 rounded text-sm focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">FECHA FIN (OPCIONAL)</label>
                                            <input 
                                                type="datetime-local" 
                                                value={endDate} 
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="bg-black/40 border border-gray-700 text-white p-3 rounded text-sm focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. MODE & MECHANICS */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-mono font-bold text-white bg-gray-900/50 p-2 rounded border-l-2 border-purple-500 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-purple-400" /> MODO Y REGLAS
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">MODO DE JUEGO</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setGameMode('classic')}
                                                className={`flex-1 p-3 rounded border text-center transition-all ${gameMode === 'classic' ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}
                                            >
                                                <div className="font-bold text-sm">CLASSIC</div>
                                                <div className="text-[10px] opacity-70">Ritmo normal</div>
                                            </button>
                                            <button 
                                                onClick={() => setGameMode('time_attack')}
                                                className={`flex-1 p-3 rounded border text-center transition-all ${gameMode === 'time_attack' ? 'bg-red-900/40 border-red-500 text-white' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}
                                            >
                                                <div className="font-bold text-sm">TIME ATTACK</div>
                                                <div className="text-[10px] opacity-70">Contrarreloj</div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <CyberInput 
                                                    type="number"
                                                    label="CANTIDAD PREGUNTAS"
                                                    value={questionCount}
                                                    onChange={(e) => handleCountChange(parseInt(e.target.value))}
                                                    min={1}
                                                />
                                                {countWarning && (
                                                    <div className="flex items-center gap-1 text-[10px] text-yellow-500 mt-1">
                                                        <AlertCircle className="w-3 h-3" /> Máximo disponible: {quiz.questions.length}
                                                    </div>
                                                )}
                                            </div>
                                            {gameMode === 'time_attack' && (
                                                <div className="flex-1 animate-in slide-in-from-left-2">
                                                    <CyberInput 
                                                        type="number"
                                                        label="TIEMPO TOTAL (SEG)"
                                                        value={timeLimit}
                                                        onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                                                        min={30}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-800">
                                    <CyberCheckbox 
                                        label="Puntos por Velocidad" 
                                        checked={speedPoints} 
                                        onChange={setSpeedPoints} 
                                    />
                                    <CyberCheckbox 
                                        label="Habilitar Power-Ups" 
                                        checked={powerUps} 
                                        onChange={setPowerUps} 
                                    />
                                    <CyberCheckbox 
                                        label="Mostrar Ranking Final" 
                                        checked={showRanking} 
                                        onChange={setShowRanking} 
                                    />
                                </div>
                            </div>

                            {/* 3. FEEDBACK */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-mono font-bold text-white bg-gray-900/50 p-2 rounded border-l-2 border-green-500 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-green-400" /> MENSAJES DE FEEDBACK
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-4 h-4 text-yellow-400" />
                                        <label className="text-xs font-mono text-gray-400 w-20"> &gt; 90%</label>
                                        <input className="flex-1 bg-black/40 border border-gray-700 rounded p-2 text-sm text-white" value={msgHigh} onChange={(e) => setMsgHigh(e.target.value)} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-blue-400" />
                                        <label className="text-xs font-mono text-gray-400 w-20"> 60% - 90%</label>
                                        <input className="flex-1 bg-black/40 border border-gray-700 rounded p-2 text-sm text-white" value={msgMed} onChange={(e) => setMsgMed(e.target.value)} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-red-400" />
                                        <label className="text-xs font-mono text-gray-400 w-20"> &lt; 60%</label>
                                        <input className="flex-1 bg-black/40 border border-gray-700 rounded p-2 text-sm text-white" value={msgLow} onChange={(e) => setMsgLow(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        // SUCCESS STATE
                        <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                                <Rocket className="w-10 h-10 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-cyber font-bold text-white mb-2">¡EVALUACIÓN LANZADA!</h3>
                                <p className="text-gray-400 text-sm max-w-sm mx-auto">Comparte este enlace con tus alumnos para que accedan a la prueba.</p>
                            </div>

                            <div className="w-full bg-black/50 border border-green-500/30 rounded-lg p-4 flex flex-col gap-2">
                                <label className="text-xs font-mono text-green-400 uppercase tracking-widest text-left">ENLACE DE ACCESO PÚBLICO</label>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        value={createdUrl} 
                                        className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono text-cyan-300 focus:outline-none select-all"
                                    />
                                    <button 
                                        onClick={copyToClipboard}
                                        className={`p-3 rounded border transition-all ${copied ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                                    >
                                        {copied ? <Check className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 w-full pt-4">
                                <a 
                                    href={createdUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded border border-gray-600 text-sm font-bold transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" /> PROBAR ENLACE
                                </a>
                                <CyberButton onClick={onClose} className="flex-1">
                                    FINALIZAR
                                </CyberButton>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions (Only show if not created yet) */}
                {!createdUrl && (
                    <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end gap-3 shrink-0">
                        <CyberButton variant="ghost" onClick={onClose} disabled={isLoading}>
                            CANCELAR
                        </CyberButton>
                        <CyberButton onClick={handleSave} isLoading={isLoading} className="px-8">
                            CREAR Y OBTENER LINK
                        </CyberButton>
                    </div>
                )}

            </CyberCard>
        </div>
    );
};
