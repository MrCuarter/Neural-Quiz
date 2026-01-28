import React, { useEffect, useState } from 'react';
import { db, auth } from '../../services/firebaseService';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { Evaluation } from '../../types';
import { CyberButton, CyberCard, CyberInput, CyberSelect } from '../ui/CyberUI';
import { Loader2, Clock, CheckCircle2, XCircle, Play, Pause, ExternalLink, Trash2, Calendar, Search, Filter, SortDesc, AlertTriangle } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface EvaluationsDashboardProps {
    onClose: () => void;
}

export const EvaluationsDashboard: React.FC<EvaluationsDashboardProps> = ({ onClose }) => {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters & Sorting State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, ENDED, PAUSED
    const [sortOrder, setSortOrder] = useState("NEWEST"); // NEWEST, OLDEST, MOST_PLAYED

    const toast = useToast();

    useEffect(() => {
        loadEvaluations();
    }, []);

    const loadEvaluations = async () => {
        if (!auth.currentUser) return;
        setLoading(true);
        try {
            // Consulta estándar optimizada con índice compuesto (userId + createdAt)
            const q = query(
                collection(db, 'evaluations'),
                where('hostUserId', '==', auth.currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
            setEvaluations(items);
        } catch (error: any) {
            console.error("Error loading evaluations:", error);
            // Fallback if index missing: simple query
            try {
                const qSimple = query(collection(db, 'evaluations'), where('hostUserId', '==', auth.currentUser.uid));
                const snapSimple = await getDocs(qSimple);
                const itemsSimple = snapSimple.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
                setEvaluations(itemsSimple);
            } catch(e) {
                toast.error("Error cargando evaluaciones.");
            }
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
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await updateDoc(doc(db, 'evaluations', evalId), { 
                'config.endDate': tomorrow.toISOString(),
                isActive: true
            });
            toast.success("Tiempo extendido 24h");
            // Optimistic update
            setEvaluations(prev => prev.map(e => e.id === evalId ? { 
                ...e, 
                isActive: true, 
                config: { ...e.config, endDate: tomorrow.toISOString() } 
            } : e));
        } catch (e) {
            toast.error("Error extendiendo tiempo");
        }
    };

    const handleDelete = async (evalId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta evaluación? Perderás los resultados.")) return;
        try {
            await deleteDoc(doc(db, 'evaluations', evalId));
            setEvaluations(prev => prev.filter(e => e.id !== evalId));
            toast.success("Evaluación eliminada");
        } catch (e) {
            toast.error("Error al eliminar");
        }
    };

    // --- HELPER: GET STATUS ---
    const getEvaluationStatus = (ev: Evaluation) => {
        if (!ev.isActive) return 'PAUSED';
        if (ev.config.endDate && new Date(ev.config.endDate) < new Date()) return 'ENDED';
        return 'ACTIVE';
    };

    // --- FILTER & SORT LOGIC ---
    const filteredEvaluations = evaluations
        .filter(ev => {
            // Search
            const searchMatch = ev.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                ev.quizTitle.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Status Filter
            const status = getEvaluationStatus(ev);
            let statusMatch = true;
            if (statusFilter === 'ACTIVE') statusMatch = status === 'ACTIVE';
            if (statusFilter === 'ENDED') statusMatch = status === 'ENDED';
            if (statusFilter === 'PAUSED') statusMatch = status === 'PAUSED';

            return searchMatch && statusMatch;
        })
        .sort((a, b) => {
            if (sortOrder === 'NEWEST') {
                const da = a.createdAt?.seconds || 0;
                const db = b.createdAt?.seconds || 0;
                return db - da;
            }
            if (sortOrder === 'OLDEST') {
                const da = a.createdAt?.seconds || 0;
                const db = b.createdAt?.seconds || 0;
                return da - db;
            }
            if (sortOrder === 'MOST_PLAYED') {
                return (b.participants || 0) - (a.participants || 0);
            }
            return 0;
        });

    return (
        <div className="fixed inset-0 z-50 bg-[#050505] overflow-y-auto p-4 md:p-8 animate-in fade-in">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
                    <h2 className="text-3xl font-cyber text-white">PANEL DE CONTROL ACADÉMICO</h2>
                    <CyberButton onClick={onClose} variant="ghost">CERRAR PANEL</CyberButton>
                </div>

                {/* --- TOOLBAR --- */}
                <div className="flex flex-col md:flex-row gap-4 bg-gray-900/50 p-4 rounded border border-gray-800 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar evaluación..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative w-40">
                            <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none appearance-none"
                            >
                                <option value="ALL">Todos</option>
                                <option value="ACTIVE">Activos</option>
                                <option value="ENDED">Finalizados</option>
                                <option value="PAUSED">Pausados</option>
                            </select>
                        </div>
                        <div className="relative w-40">
                            <SortDesc className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <select 
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-cyan-500 outline-none appearance-none"
                            >
                                <option value="NEWEST">Más Recientes</option>
                                <option value="OLDEST">Más Antiguos</option>
                                <option value="MOST_PLAYED">Más Jugados</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-cyan-500" /></div>
                ) : filteredEvaluations.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-lg">
                        <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500">No se encontraron evaluaciones con estos filtros.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {/* Table Header (Desktop) */}
                        <div className="grid grid-cols-12 gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest px-4 pb-2 border-b border-gray-800 hidden md:grid">
                            <div className="col-span-4">Título / Quiz</div>
                            <div className="col-span-2">Estado</div>
                            <div className="col-span-3">Fechas (Inicio - Fin)</div>
                            <div className="col-span-1 text-center">Part.</div>
                            <div className="col-span-2 text-right">Acciones</div>
                        </div>

                        {filteredEvaluations.map(ev => {
                            const status = getEvaluationStatus(ev);
                            const startDateStr = new Date(ev.config.startDate).toLocaleDateString();
                            const endDateStr = ev.config.endDate ? new Date(ev.config.endDate).toLocaleDateString() : "∞";

                            return (
                                <CyberCard key={ev.id} className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 hover:border-opacity-50 transition-colors ${status === 'ENDED' ? 'border-gray-800 opacity-70' : 'border-cyan-500/30'}`}>
                                    
                                    {/* INFO */}
                                    <div className="col-span-4">
                                        <h3 className="font-bold text-white text-lg line-clamp-1">{ev.title}</h3>
                                        <p className="text-xs text-gray-500 truncate">{ev.quizTitle}</p>
                                        <a href={`${window.location.origin}/play/${ev.id}`} target="_blank" className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 mt-1 w-fit">
                                            <ExternalLink className="w-3 h-3" /> Link Público
                                        </a>
                                    </div>

                                    {/* STATUS */}
                                    <div className="col-span-2">
                                        {status === 'ACTIVE' && (
                                            <span className="bg-green-900/30 text-green-400 px-2 py-1 rounded text-xs border border-green-500/30 flex items-center gap-1 w-fit"><Play className="w-3 h-3"/> ACTIVA</span>
                                        )}
                                        {status === 'PAUSED' && (
                                            <span className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded text-xs border border-yellow-500/30 flex items-center gap-1 w-fit"><Pause className="w-3 h-3"/> PAUSADA</span>
                                        )}
                                        {status === 'ENDED' && (
                                            <span className="bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs border border-red-500/30 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3"/> CERRADA</span>
                                        )}
                                    </div>

                                    {/* DATES */}
                                    <div className="col-span-3 text-xs text-gray-400 font-mono flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-green-600"/> {startDateStr}</div>
                                        <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-red-600"/> {endDateStr}</div>
                                    </div>

                                    {/* PARTICIPANTS */}
                                    <div className="col-span-1 text-center">
                                        <span className="text-xl font-mono text-white block">{ev.participants || 0}</span>
                                    </div>

                                    {/* ACTIONS */}
                                    <div className="col-span-2 flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleToggleActive(ev.id!, ev.isActive)}
                                            className={`p-2 rounded border transition-colors ${ev.isActive ? 'border-yellow-500/30 hover:bg-yellow-900/20 text-yellow-400' : 'border-green-500/30 hover:bg-green-900/20 text-green-400'}`}
                                            title={ev.isActive ? "Pausar Evaluación" : "Reactivar Evaluación"}
                                        >
                                            {ev.isActive ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleExtend(ev.id!)}
                                            className="p-2 rounded border border-blue-500/30 hover:bg-blue-900/20 text-blue-400"
                                            title="Posponer Cierre (+24h)"
                                        >
                                            <Clock className="w-4 h-4"/>
                                        </button>

                                        <button 
                                            onClick={() => handleDelete(ev.id!)}
                                            className="p-2 rounded border border-red-500/30 hover:bg-red-900/20 text-red-400"
                                            title="Eliminar permanentemente"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </CyberCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};