
import React, { useState, useEffect } from 'react';
import { Campaign, CampaignMission, Quiz, CampaignLog } from '../../../types';
import { createCampaign, getTeacherCampaigns, updateCampaignMissions, injectEvent, subscribeToLogs } from '../../../services/campaignService';
import { getUserQuizzes } from '../../../services/firebaseService';
import { CyberButton, CyberCard } from '../../ui/CyberUI';
import { auth, db } from '../../../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Plus, Map, Zap, History, Share2, Trash2 } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import { CreateQuestModal } from './CreateQuestModal';

interface CampaignManagerProps {
    onBack: () => void;
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({ onBack }) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const toast = useToast();

    // LIVE DATA
    const [liveCampaign, setLiveCampaign] = useState<Campaign | null>(null);
    const [logs, setLogs] = useState<CampaignLog[]>([]);

    useEffect(() => {
        loadCampaigns();
    }, []);

    // Listen to selected campaign updates
    useEffect(() => {
        if (!selectedCampaign?.id) return;
        
        const unsubCamp = onSnapshot(doc(db, 'campaigns', selectedCampaign.id), (doc) => {
            if (doc.exists()) {
                setLiveCampaign({ id: doc.id, ...doc.data() } as Campaign);
            }
        });

        const unsubLogs = subscribeToLogs(selectedCampaign.id, (newLogs) => {
            setLogs(newLogs);
        });

        return () => {
            unsubCamp();
            unsubLogs();
        };
    }, [selectedCampaign?.id]);

    const loadCampaigns = async () => {
        setLoading(true);
        const data = await getTeacherCampaigns();
        setCampaigns(data);
        setLoading(false);
    };

    const handleCreate = async (data: Partial<Campaign>) => {
        if (!auth.currentUser) return;
        try {
            // Mapping new structured data to campaign object
            await createCampaign({
                teacherId: auth.currentUser.uid,
                title: data.title!,
                description: data.description!,
                theme: data.theme!,
                visualSettings: data.visualSettings!,
                resources: data.resources!,
                // Legacy support mapping
                resourceName: data.resources?.[0]?.name || "Puntos",
                resourceEmoji: data.resources?.[0]?.emoji || "⭐",
                goalAmount: data.resources?.[0]?.targetValue || 100,
                missions: []
            });
            
            toast.success("Campaña creada");
            setIsCreating(false);
            loadCampaigns();
        } catch (e) {
            console.error(e);
            toast.error("Error al crear campaña");
        }
    };

    // --- DM ACTIONS ---
    const handleAddEvent = async (amount: number, msg: string) => {
        if (!liveCampaign?.id) return;
        // Defaults to first resource for now in simple DM actions
        await injectEvent(liveCampaign.id, amount, msg, 'DM (Profesor)', 'manual_event');
        toast.info("Evento enviado");
    };

    // --- MISSION MANAGEMENT ---
    const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([]);
    const [showQuizPicker, setShowQuizPicker] = useState(false);

    const loadQuizzes = async () => {
        if (userQuizzes.length > 0) return;
        if (auth.currentUser) {
            const qs = await getUserQuizzes(auth.currentUser.uid);
            setUserQuizzes(qs);
        }
    };

    const addMission = async (quiz: Quiz) => {
        if (!liveCampaign?.id) return;
        const newMission: CampaignMission = {
            id: Math.random().toString(36).substring(7),
            quizId: quiz.id!,
            title: quiz.title,
            status: 'locked',
            multiplier: 1.0,
            unlockDate: undefined
        };
        const updated = [...(liveCampaign.missions || []), newMission];
        await updateCampaignMissions(liveCampaign.id, updated);
        setShowQuizPicker(false);
        toast.success("Misión añadida");
    };

    const toggleMissionStatus = async (idx: number) => {
        if (!liveCampaign?.id) return;
        const missions = [...liveCampaign.missions];
        const current = missions[idx].status;
        missions[idx].status = current === 'locked' ? 'active' : current === 'active' ? 'finished' : 'locked';
        await updateCampaignMissions(liveCampaign.id, missions);
    };

    const deleteMission = async (idx: number) => {
        if (!liveCampaign?.id) return;
        const missions = [...liveCampaign.missions];
        missions.splice(idx, 1);
        await updateCampaignMissions(liveCampaign.id, missions);
    };

    // --- RENDER ---

    if (selectedCampaign) {
        if (!liveCampaign) return <div>Cargando enlace neural...</div>;

        const mainRes = liveCampaign.resources?.[0] || { name: 'Puntos', emoji: '⭐', targetValue: 100 };
        const progress = Math.min(100, (liveCampaign.currentAmount / mainRes.targetValue) * 100);

        return (
            <div className="min-h-screen bg-[#050505] text-white p-4 pb-20 animate-in fade-in">
                
                {/* HEADER */}
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-4">
                        <CyberButton variant="ghost" onClick={() => setSelectedCampaign(null)} className="pl-0 gap-2"><ArrowLeft className="w-4 h-4"/> SALIR</CyberButton>
                        <h1 className="text-2xl font-cyber text-yellow-400 uppercase">{liveCampaign.title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={`/c/${liveCampaign.publicId}`} target="_blank" className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1">
                            <Share2 className="w-3 h-3"/> VISTA PÚBLICA
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT: STATUS & DM CONTROLS */}
                    <div className="space-y-6">
                        {/* PROGRESS CARD */}
                        <CyberCard className="border-yellow-500/30 text-center">
                            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">META PRINCIPAL</div>
                            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-800" />
                                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-yellow-500 transition-all duration-1000" strokeDasharray={440} strokeDashoffset={440 - (440 * progress) / 100} />
                                </svg>
                                <div className="absolute text-center">
                                    <span className="text-3xl font-black text-white">{Math.round(progress)}%</span>
                                </div>
                            </div>
                            <div className="mt-4 text-2xl font-mono font-bold text-yellow-300">
                                {liveCampaign.currentAmount} / {mainRes.targetValue} {mainRes.emoji}
                            </div>
                        </CyberCard>

                        {/* DM ACTIONS */}
                        <CyberCard className="border-purple-500/30">
                            <h3 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2"><Zap className="w-4 h-4"/> ACCIONES DE DM</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleAddEvent(500, "Bonificación Global")} className="p-3 bg-green-900/30 border border-green-600 rounded text-green-200 text-xs hover:bg-green-900/50">+500 {mainRes.name}</button>
                                <button onClick={() => handleAddEvent(-500, "Penalización Global")} className="p-3 bg-red-900/30 border border-red-600 rounded text-red-200 text-xs hover:bg-red-900/50">-500 {mainRes.name}</button>
                                <button onClick={() => handleAddEvent(1000, "Tesoro Encontrado")} className="p-3 bg-yellow-900/30 border border-yellow-600 rounded text-yellow-200 text-xs hover:bg-yellow-900/50">COFRE (+1k)</button>
                                <button onClick={() => handleAddEvent(-100, "Impuesto")} className="p-3 bg-gray-800 border border-gray-600 rounded text-gray-300 text-xs hover:bg-gray-700">IMPUESTO</button>
                            </div>
                        </CyberCard>
                    </div>

                    {/* MIDDLE: MISSIONS */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* MISSION BOARD */}
                        <CyberCard className="border-cyan-500/30">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-cyber font-bold text-cyan-400 flex items-center gap-2"><Map className="w-5 h-5"/> MAPA DE MISIONES</h3>
                                <button onClick={() => { setShowQuizPicker(true); loadQuizzes(); }} className="text-xs bg-cyan-900/50 px-3 py-1 rounded border border-cyan-500 text-cyan-200 hover:bg-cyan-800"><Plus className="w-3 h-3 inline"/> AÑADIR MISIÓN</button>
                            </div>

                            {showQuizPicker && (
                                <div className="mb-4 p-4 bg-black/50 border border-gray-700 rounded max-h-40 overflow-y-auto custom-scrollbar">
                                    {userQuizzes.map(q => (
                                        <button key={q.id} onClick={() => addMission(q)} className="block w-full text-left p-2 hover:bg-gray-800 text-sm text-gray-300 border-b border-gray-800 last:border-0">
                                            {q.title}
                                        </button>
                                    ))}
                                    <button onClick={() => setShowQuizPicker(false)} className="mt-2 text-xs text-red-400">Cancelar</button>
                                </div>
                            )}

                            <div className="space-y-2">
                                {liveCampaign.missions.length === 0 ? (
                                    <div className="text-center text-gray-500 text-sm py-4">No hay misiones activas.</div>
                                ) : (
                                    liveCampaign.missions.map((m, idx) => (
                                        <div key={m.id} className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-800 rounded group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${m.status === 'active' ? 'bg-green-500 animate-pulse' : m.status === 'finished' ? 'bg-gray-500' : 'bg-red-500'}`}></div>
                                                <span className={`${m.status === 'finished' ? 'text-gray-500 line-through' : 'text-white'} font-bold`}>{m.title}</span>
                                                <span className="text-xs bg-black px-2 py-0.5 rounded text-yellow-500">x{m.multiplier}</span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => toggleMissionStatus(idx)} className="text-xs text-cyan-400 hover:underline px-2">{m.status.toUpperCase()}</button>
                                                <button onClick={() => deleteMission(idx)} className="text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CyberCard>

                        {/* LIVE LOG */}
                        <CyberCard className="border-gray-700 bg-black/40 h-64 flex flex-col">
                            <h3 className="font-cyber font-bold text-gray-400 mb-2 flex items-center gap-2"><History className="w-4 h-4"/> BITÁCORA EN VIVO</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 p-2 bg-black/20 rounded border border-gray-800 font-mono text-xs">
                                {logs.map(log => (
                                    <div key={log.id} className="flex justify-between items-start text-gray-400 border-b border-gray-800/50 pb-1 mb-1 last:border-0">
                                        <div>
                                            <span className="text-cyan-600 mr-2">[{new Date(log.timestamp?.seconds * 1000).toLocaleTimeString()}]</span>
                                            <span className="font-bold text-white">{log.studentAlias}</span> {log.realName && <span className="text-[10px] text-gray-600">({log.realName})</span>}: {log.message}
                                        </div>
                                        <span className={log.amount > 0 ? "text-green-500" : "text-red-500"}>{log.amount > 0 ? '+' : ''}{log.amount}</span>
                                    </div>
                                ))}
                            </div>
                        </CyberCard>

                    </div>
                </div>
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-10 pt-12 pb-20">
            {isCreating && (
                <CreateQuestModal 
                    onClose={() => setIsCreating(false)} 
                    onCreate={handleCreate} 
                />
            )}

            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <div className="flex items-center gap-4">
                    <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2"><ArrowLeft className="w-4 h-4"/> VOLVER</CyberButton>
                    <h2 className="text-3xl font-cyber text-yellow-400">CAMPAÑAS</h2>
                </div>
                <CyberButton onClick={() => setIsCreating(true)}><Plus className="w-4 h-4 mr-2"/> NUEVA CAMPAÑA</CyberButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? <div>Cargando...</div> : campaigns.map(c => (
                    <CyberCard key={c.id} className="group hover:border-yellow-500/50 cursor-pointer" onClick={() => setSelectedCampaign(c)}>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-xl text-white font-cyber">{c.title}</h3>
                            <span className="text-xs bg-gray-900 px-2 py-1 rounded border border-gray-700 uppercase text-gray-400">{c.theme}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-yellow-500" style={{ width: `${(c.currentAmount/(c.resources?.[0]?.targetValue || 100))*100}%` }}></div>
                        </div>
                        <p className="text-xs font-mono text-gray-400 text-right">
                            {c.currentAmount} / {c.resources?.[0]?.targetValue || 100} {c.resources?.[0]?.emoji || '⭐'}
                        </p>
                    </CyberCard>
                ))}
                {campaigns.length === 0 && !loading && (
                    <div className="col-span-full text-center py-20 border-2 border-dashed border-gray-800 rounded-lg text-gray-500">
                        No hay campañas activas. ¡Crea una nueva aventura!
                    </div>
                )}
            </div>
        </div>
    );
};
