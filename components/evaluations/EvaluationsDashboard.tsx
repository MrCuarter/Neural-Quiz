
import React, { useEffect, useState } from 'react';
import { db, auth } from '../../services/firebaseService';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { Evaluation } from '../../types';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { Loader2, Clock, CheckCircle2, XCircle, MoreVertical, Play, Pause, ExternalLink } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface EvaluationsDashboardProps {
    onClose: () => void;
}

export const EvaluationsDashboard: React.FC<EvaluationsDashboardProps> = ({ onClose }) => {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        loadEvaluations();
    }, []);

    const loadEvaluations = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'evaluations'),
                where('hostUserId', '==', auth.currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
            setEvaluations(items);
        } catch (e) {
            console.error(e);
            toast.error("Error cargando evaluaciones");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (evalId: string, currentState: boolean) => {
        try {
            await updateDoc(doc(db, 'evaluations', evalId), { isActive: !currentState });
            setEvaluations(prev => prev.map(e => e.id === evalId ? { ...e, isActive: !currentState } : e));
            toast.success(currentState ? "Evaluación Pausada" : "Evaluación Reactivada");
        } catch (e) {
            toast.error("Error actualizando estado");
        }
    };

    const handleExtend = async (evalId: string) => {
        try {
            // Add 24 hours to endDate (or create it)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await updateDoc(doc(db, 'evaluations', evalId), { 
                'config.endDate': tomorrow.toISOString(),
                isActive: true
            });
            toast.success("Tiempo extendido 24h");
            loadEvaluations();
        } catch (e) {
            toast.error("Error extendiendo tiempo");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#050505] overflow-y-auto p-4 md:p-8 animate-in fade-in">
            <div className="max-w-6xl mx-auto space-y-6">
                
                <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                    <h2 className="text-3xl font-cyber text-white">PANEL DE CONTROL ACADÉMICO</h2>
                    <CyberButton onClick={onClose} variant="ghost">CERRAR PANEL</CyberButton>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-cyan-500" /></div>
                ) : evaluations.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">No hay evaluaciones activas.</div>
                ) : (
                    <div className="grid gap-4">
                        <div className="grid grid-cols-12 gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest px-4 pb-2 border-b border-gray-800 hidden md:grid">
                            <div className="col-span-4">Título / Quiz</div>
                            <div className="col-span-2">Estado</div>
                            <div className="col-span-2">Participantes</div>
                            <div className="col-span-2">Cierre</div>
                            <div className="col-span-2 text-right">Acciones</div>
                        </div>

                        {evaluations.map(ev => (
                            <CyberCard key={ev.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 hover:border-cyan-500/30 transition-colors">
                                <div className="col-span-4">
                                    <h3 className="font-bold text-white text-lg">{ev.title}</h3>
                                    <p className="text-xs text-gray-500">{ev.quizTitle}</p>
                                    <a href={`${window.location.origin}/play/${ev.id}`} target="_blank" className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 mt-1">
                                        <ExternalLink className="w-3 h-3" /> Ver Enlace Público
                                    </a>
                                </div>

                                <div className="col-span-2 flex items-center gap-2">
                                    {ev.isActive ? (
                                        <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs border border-green-500/30 flex items-center gap-1"><Play className="w-3 h-3"/> ACTIVA</span>
                                    ) : (
                                        <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs border border-red-500/30 flex items-center gap-1"><Pause className="w-3 h-3"/> CERRADA</span>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <span className="text-xl font-mono text-white">{ev.participants || 0}</span>
                                    <span className="text-xs text-gray-600 ml-1">alumnos</span>
                                </div>

                                <div className="col-span-2 text-sm text-gray-400">
                                    {ev.config.endDate ? new Date(ev.config.endDate).toLocaleDateString() : "Indefinido"}
                                </div>

                                <div className="col-span-2 flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleToggleActive(ev.id!, ev.isActive)}
                                        className={`p-2 rounded border transition-colors ${ev.isActive ? 'border-red-500/30 hover:bg-red-900/20 text-red-400' : 'border-green-500/30 hover:bg-green-900/20 text-green-400'}`}
                                        title={ev.isActive ? "Pausar" : "Reactivar"}
                                    >
                                        {ev.isActive ? <XCircle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
                                    </button>
                                    <button 
                                        onClick={() => handleExtend(ev.id!)}
                                        className="p-2 rounded border border-blue-500/30 hover:bg-blue-900/20 text-blue-400"
                                        title="Extender 24h"
                                    >
                                        <Clock className="w-5 h-5"/>
                                    </button>
                                </div>
                            </CyberCard>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
