
import React, { useState, useEffect } from 'react';
import { Quiz, Evaluation, EvaluationConfig, BossSettings } from '../../types';
import { createEvaluation, auth } from '../../services/firebaseService';
import { signInAnonymously } from 'firebase/auth';
import { CyberButton, CyberCard, CyberInput, CyberCheckbox } from '../ui/CyberUI';
import { X, Rocket, Calendar, Zap, Trophy, MessageSquare, Copy, Check, ExternalLink, Shield, AlertCircle, Skull, Heart, Sword, Edit3, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { PRESET_BOSSES } from '../../data/bossPresets';

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
    
    // Game Mode Config
    const [gameMode, setGameMode] = useState<'classic' | 'time_attack' | 'final_boss'>('classic');
    const [questionCount, setQuestionCount] = useState(0);
    const [timeLimit, setTimeLimit] = useState(180); 
    const [countWarning, setCountWarning] = useState(false);

    // --- BOSS SETTINGS STATE ---
    const [selectedPreset, setSelectedPreset] = useState<string | null>('kryon_v');
    const [bossName, setBossName] = useState("Dr. Caos");
    const [bossDifficulty, setBossDifficulty] = useState<'easy' | 'medium' | 'hard' | 'legend'>('medium');
    const [bossHP, setBossHP] = useState(1000);
    const [playerHP, setPlayerHP] = useState(100);
    
    // Boss Images (Only used if Custom)
    const [imgIdle, setImgIdle] = useState("");
    const [imgDamage, setImgDamage] = useState("");
    const [imgDefeat, setImgDefeat] = useState("");
    const [imgWin, setImgWin] = useState("");

    // Boss Messages
    const [msgBossWin, setMsgBossWin] = useState("");
    const [msgPlayerWin, setMsgPlayerWin] = useState("");
    const [msgPerfect, setMsgPerfect] = useState("");
    
    const [finishHim, setFinishHim] = useState(true);
    const [speedPoints, setSpeedPoints] = useState(true);
    const [powerUps, setPowerUps] = useState(false);
    const [showRanking, setShowRanking] = useState(true);

    const [msgHigh, setMsgHigh] = useState("¡Impresionante! Eres un maestro.");
    const [msgMed, setMsgMed] = useState("¡Buen trabajo! Vas por buen camino.");
    const [msgLow, setMsgLow] = useState("Sigue practicando, ¡tú puedes!");

    useEffect(() => {
        if (isOpen && quiz) {
            setTitle(quiz.title || "Evaluación");
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setStartDate(now.toISOString().slice(0, 16));
            setEndDate("");
            setCreatedUrl(null);
            setCopied(false);
            setQuestionCount(quiz.questions.length);
            setCountWarning(false);
            handleSelectPreset('kryon_v');
        }
    }, [isOpen, quiz]);

    const handleSelectPreset = (key: string) => {
        setSelectedPreset(key);
        if (key === 'CUSTOM') {
            setBossName("Mi Jefe Personalizado");
            setBossHP(1000);
            setPlayerHP(100);
            setImgIdle("");
            setImgDamage("");
            setImgDefeat("");
            setImgWin("");
            setMsgBossWin("¡Has perdido!");
            setMsgPlayerWin("¡Has ganado!");
            setMsgPerfect("¡Victoria perfecta!");
        } else {
            const p = PRESET_BOSSES[key];
            if (p) {
                setBossName(p.bossName);
                setBossDifficulty(p.difficulty);
                setBossHP(p.health.bossHP);
                setPlayerHP(p.health.playerHP);
                setImgIdle(p.images.idle);
                setImgDamage(p.images.damage || p.images.idle);
                setImgDefeat(p.images.defeat);
                setImgWin(p.images.win);
                setMsgBossWin(p.messages.bossWins);
                setMsgPlayerWin(p.messages.playerWins);
                setMsgPerfect(p.messages.perfectWin);
            }
        }
    };

    const handleCountChange = (val: number) => {
        setQuestionCount(val);
        if (val > quiz.questions.length) setCountWarning(true);
        else setCountWarning(false);
    };

    const applyDifficultyPreset = (diff: 'easy' | 'medium' | 'hard' | 'legend') => {
        setBossDifficulty(diff);
        switch(diff) {
            case 'easy': setBossHP(500); setPlayerHP(200); break;
            case 'medium': setBossHP(1000); setPlayerHP(100); break;
            case 'hard': setBossHP(2000); setPlayerHP(50); break;
            case 'legend': setBossHP(5000); setPlayerHP(1); break;
        }
    };

    const handleSave = async () => {
        if (!quiz) return;
        if (!title.trim()) { toast.error("El título es obligatorio"); return; }

        setIsLoading(true);
        try {
            let hostUserId = user?.uid;
            if (!hostUserId) {
                try {
                    const cred = await signInAnonymously(auth);
                    hostUserId = cred.user.uid;
                } catch (e) {
                    console.warn("Anonymous auth failed", e);
                    hostUserId = "guest_host"; 
                }
            }

            const finalCount = Math.min(Math.max(1, questionCount), quiz.questions.length);

            let bossSettings: BossSettings | undefined = undefined;
            if (gameMode === 'final_boss') {
                bossSettings = {
                    bossName,
                    difficulty: bossDifficulty,
                    health: { bossHP, playerHP },
                    images: { idle: imgIdle, damage: imgDamage, defeat: imgDefeat, win: imgWin },
                    messages: { bossWins: msgBossWin, playerWins: msgPlayerWin, perfectWin: msgPerfect },
                    mechanics: { enablePowerUps: powerUps, finishHimMove: finishHim }
                };
            }

            const config: EvaluationConfig = {
                gameMode,
                questionCount: finalCount,
                timeLimit: gameMode === 'time_attack' ? timeLimit : undefined,
                allowSpeedPoints: speedPoints,
                allowPowerUps: powerUps,
                showRanking: showRanking,
                feedbackMessages: { high: msgHigh, medium: msgMed, low: msgLow },
                startDate: new Date(startDate).toISOString(),
                endDate: endDate ? new Date(endDate).toISOString() : undefined,
                bossSettings
            };

            const evaluationData: Omit<Evaluation, 'id' | 'createdAt'> = {
                quizId: quiz.id || "temp-quiz",
                quizTitle: quiz.title,
                hostUserId: hostUserId,
                title: title,
                config: config,
                isActive: true,
                participants: 0,
                questions: quiz.questions
            };

            const evalId = await createEvaluation(evaluationData);
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
            <CyberCard className={`w-full max-w-2xl border-cyan-500/50 flex flex-col max-h-[90vh] overflow-hidden relative shadow-[0_0_50px_rgba(6,182,212,0.2)] ${gameMode === 'final_boss' ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : ''}`}>
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4 shrink-0">
                    <div className={`flex items-center gap-3 ${gameMode === 'final_boss' ? 'text-red-500' : 'text-cyan-400'}`}>
                        {gameMode === 'final_boss' ? <Skull className="w-6 h-6 animate-pulse" /> : <Rocket className="w-6 h-6" />}
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
                                    <CyberInput label="TÍTULO DE LA SESIÓN" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Examen Unidad 1"/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">FECHA INICIO</label>
                                            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-black/40 border border-gray-700 text-white p-3 rounded text-sm focus:border-cyan-500 outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">FECHA FIN (OPCIONAL)</label>
                                            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-black/40 border border-gray-700 text-white p-3 rounded text-sm focus:border-cyan-500 outline-none"/>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. MODE & MECHANICS */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-mono font-bold text-white bg-gray-900/50 p-2 rounded border-l-2 border-purple-500 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-purple-400" /> MODO Y REGLAS
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-3">
                                        <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">MODO DE JUEGO</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setGameMode('classic')} className={`flex-1 p-3 rounded border text-center transition-all ${gameMode === 'classic' ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                                <div className="font-bold text-sm">CLASSIC</div>
                                                <div className="text-[10px] opacity-70">Ritmo normal</div>
                                            </button>
                                            <button onClick={() => setGameMode('time_attack')} className={`flex-1 p-3 rounded border text-center transition-all ${gameMode === 'time_attack' ? 'bg-blue-900/40 border-blue-500 text-white' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                                <div className="font-bold text-sm">TIME ATTACK</div>
                                                <div className="text-[10px] opacity-70">Contrarreloj</div>
                                            </button>
                                            <button onClick={() => setGameMode('final_boss')} className={`flex-1 p-3 rounded border text-center transition-all ${gameMode === 'final_boss' ? 'bg-red-900/40 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                                <div className="font-bold text-sm flex items-center justify-center gap-1"><Skull className="w-3 h-3"/> FINAL BOSS</div>
                                                <div className="text-[10px] opacity-70">RPG Battle</div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="md:col-span-3 space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <CyberInput type="number" label="CANTIDAD PREGUNTAS" value={questionCount} onChange={(e) => handleCountChange(parseInt(e.target.value))} min={1} />
                                                {countWarning && <div className="flex items-center gap-1 text-[10px] text-yellow-500 mt-1"><AlertCircle className="w-3 h-3" /> Máximo disponible: {quiz.questions.length}</div>}
                                            </div>
                                            {gameMode === 'time_attack' && (
                                                <div className="flex-1 animate-in slide-in-from-left-2">
                                                    <CyberInput type="number" label="TIEMPO TOTAL (SEG)" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value))} min={30} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* BOSS CONFIGURATION PANEL */}
                                {gameMode === 'final_boss' && (
                                    <div className="mt-6 space-y-6 animate-in slide-in-from-top-4 border border-red-500/30 bg-red-950/10 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 text-red-400 border-b border-red-500/30 pb-2 mb-2">
                                            <Skull className="w-5 h-5" />
                                            <h4 className="font-cyber font-bold text-sm">CONFIGURACIÓN DEL JEFE</h4>
                                        </div>

                                        {/* PRESET SELECTOR */}
                                        <div>
                                            <label className="text-xs font-mono text-red-400/80 uppercase tracking-widest block mb-3">SELECCIONAR ENEMIGO</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {Object.entries(PRESET_BOSSES).map(([key, boss]) => (
                                                    <button 
                                                        key={key}
                                                        onClick={() => handleSelectPreset(key)}
                                                        className={`relative p-2 rounded border-2 transition-all flex flex-col items-center gap-2 group overflow-hidden ${selectedPreset === key ? 'border-red-500 bg-red-900/40' : 'border-gray-700 bg-black/40 hover:border-gray-500'}`}
                                                    >
                                                        <div className="w-12 h-12 rounded-full border border-gray-600 overflow-hidden bg-black">
                                                            <img src={boss.images.idle} className="w-full h-full object-cover" alt={boss.bossName} />
                                                        </div>
                                                        <span className={`text-[10px] font-bold font-cyber text-center ${selectedPreset === key ? 'text-red-300' : 'text-gray-400'}`}>{boss.bossName}</span>
                                                        {selectedPreset === key && <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_red]"></div>}
                                                    </button>
                                                ))}
                                                {/* CUSTOM CARD */}
                                                <button 
                                                    onClick={() => handleSelectPreset('CUSTOM')}
                                                    className={`relative p-2 rounded border-2 transition-all flex flex-col items-center justify-center gap-2 group border-dashed ${selectedPreset === 'CUSTOM' ? 'border-red-500 bg-red-900/40' : 'border-gray-600 bg-black/20 hover:bg-black/40'}`}
                                                >
                                                    <div className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center bg-black/50">
                                                        <Edit3 className="w-6 h-6 text-gray-500 group-hover:text-white" />
                                                    </div>
                                                    <span className={`text-[10px] font-bold font-cyber text-center ${selectedPreset === 'CUSTOM' ? 'text-red-300' : 'text-gray-400'}`}>PERSONALIZADO</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* PRESET SUMMARY OR CUSTOM FIELDS */}
                                        {selectedPreset !== 'CUSTOM' ? (
                                            <div className="flex items-center gap-4 bg-black/20 p-3 rounded border border-red-900/30">
                                                <img src={imgIdle} className="w-16 h-16 object-contain border border-gray-700 rounded bg-black" />
                                                <div>
                                                    <h3 className="font-cyber font-bold text-red-300">{bossName}</h3>
                                                    <p className="text-xs text-gray-500 font-mono">Dificultad: {bossDifficulty.toUpperCase()}</p>
                                                    <p className="text-xs text-gray-500 font-mono">HP: {bossHP}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <CyberInput label="NOMBRE DEL BOSS" value={bossName} onChange={(e) => setBossName(e.target.value)} />
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <label className="text-xs font-mono text-red-400/80 uppercase tracking-widest">DIFICULTAD (PRESETS)</label>
                                                        <select 
                                                            value={bossDifficulty} 
                                                            onChange={(e) => applyDifficultyPreset(e.target.value as any)}
                                                            className="bg-black/40 border border-red-500/50 text-red-100 p-3 rounded text-sm focus:border-red-400 outline-none"
                                                        >
                                                            <option value="easy">RECLUTA (Fácil)</option>
                                                            <option value="medium">GUERRERO (Normal)</option>
                                                            <option value="hard">PESADILLA (Difícil)</option>
                                                            <option value="legend">LEYENDA (Imposible)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* IMAGES */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-mono text-gray-500 uppercase">IMÁGENES (URLs)</label>
                                                        <div className="flex items-center gap-1 text-[9px] text-gray-600 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                                                            <ImageIcon className="w-3 h-3" />
                                                            <span>Usa enlaces directos (Imgur, PostImage)</span>
                                                        </div>
                                                    </div>
                                                    <CyberInput label="IMAGEN PRINCIPAL (BATALLA)" placeholder="URL del Boss..." value={imgIdle} onChange={(e) => setImgIdle(e.target.value)} className="text-xs" />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <CyberInput label="IMAGEN: ENEMIGO DERROTADO" placeholder="URL al morir..." value={imgDefeat} onChange={(e) => setImgDefeat(e.target.value)} className="text-xs" />
                                                        <CyberInput label="IMAGEN: ENEMIGO GANA" placeholder="URL al ganar..." value={imgWin} onChange={(e) => setImgWin(e.target.value)} className="text-xs" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Health Stats */}
                                        <div className="grid grid-cols-2 gap-4 bg-black/20 p-2 rounded">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-mono text-red-400 uppercase flex items-center gap-1"><Shield className="w-3 h-3"/> VIDA JEFE</label>
                                                <input type="number" value={bossHP} onChange={(e) => setBossHP(parseInt(e.target.value))} className="bg-transparent border-b border-red-500 text-2xl font-black text-white w-full focus:outline-none text-center" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-mono text-green-400 uppercase flex items-center gap-1"><Heart className="w-3 h-3"/> VIDA JUGADOR</label>
                                                <input type="number" value={playerHP} onChange={(e) => setPlayerHP(parseInt(e.target.value))} className="bg-transparent border-b border-green-500 text-2xl font-black text-white w-full focus:outline-none text-center" />
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono text-gray-500 uppercase">MENSAJES DE BATALLA</label>
                                            <CyberInput label="SI EL BOSS GANA" value={msgBossWin} onChange={(e) => setMsgBossWin(e.target.value)} className="text-xs text-red-200" />
                                            <CyberInput label="SI EL JUGADOR GANA" value={msgPlayerWin} onChange={(e) => setMsgPlayerWin(e.target.value)} className="text-xs text-green-200" />
                                        </div>

                                        <CyberCheckbox label="ACTIVAR GOLPE DE GRACIA (Repasar fallos al final)" checked={finishHim} onChange={setFinishHim} warning={finishHim} />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-800">
                                    <CyberCheckbox label="Puntos por Velocidad" checked={speedPoints} onChange={setSpeedPoints} />
                                    <CyberCheckbox label="Habilitar Power-Ups" checked={powerUps} onChange={setPowerUps} />
                                    <CyberCheckbox label="Mostrar Ranking Final" checked={showRanking} onChange={setShowRanking} />
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
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-[0_0_30px_rgba(34,197,94,0.4)] ${gameMode === 'final_boss' ? 'bg-red-500/20 border-red-500' : 'bg-green-500/20 border-green-500'}`}>
                                {gameMode === 'final_boss' ? <Sword className="w-10 h-10 text-red-400" /> : <Rocket className="w-10 h-10 text-green-400" />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-cyber font-bold text-white mb-2">¡EVALUACIÓN LANZADA!</h3>
                                <p className="text-gray-400 text-sm max-w-sm mx-auto">Comparte este enlace con tus alumnos para que accedan a la prueba.</p>
                            </div>

                            <div className="w-full bg-black/50 border border-green-500/30 rounded-lg p-4 flex flex-col gap-2">
                                <label className="text-xs font-mono text-green-400 uppercase tracking-widest text-left">ENLACE DE ACCESO PÚBLICO</label>
                                <div className="flex gap-2">
                                    <input readOnly value={createdUrl} className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono text-cyan-300 focus:outline-none select-all"/>
                                    <button onClick={copyToClipboard} className={`p-3 rounded border transition-all ${copied ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
                                        {copied ? <Check className="w-5 h-5"/> : <Copy className="w-5 h-5"/>}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 w-full pt-4">
                                <a href={createdUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded border border-gray-600 text-sm font-bold transition-colors">
                                    <ExternalLink className="w-4 h-4" /> PROBAR ENLACE
                                </a>
                                <CyberButton onClick={onClose} className="flex-1">FINALIZAR</CyberButton>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                {!createdUrl && (
                    <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end gap-3 shrink-0">
                        <CyberButton variant="ghost" onClick={onClose} disabled={isLoading}>CANCELAR</CyberButton>
                        <CyberButton onClick={handleSave} isLoading={isLoading} className="px-8">CREAR Y OBTENER LINK</CyberButton>
                    </div>
                )}

            </CyberCard>
        </div>
    );
};
