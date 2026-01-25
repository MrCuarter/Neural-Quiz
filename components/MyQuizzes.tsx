
import React, { useEffect, useState } from 'react';
import { Quiz } from '../types';
import { getUserQuizzes, deleteQuizFromFirestore, saveQuizToFirestore } from '../services/firebaseService';
import { CyberButton, CyberCard, CyberInput, CyberSelect, CyberCheckbox } from './ui/CyberUI';
import { ArrowLeft, Edit, Trash2, Calendar, Hash, Search, Filter, Loader2, Sparkles, Merge, CheckSquare, Rocket } from 'lucide-react';
import { useToast } from './ui/Toast';
import { CreateEvaluationModal } from './evaluations/CreateEvaluationModal'; // NEW IMPORT

interface MyQuizzesProps {
    user: any;
    onBack: () => void;
    onEdit: (quiz: Quiz) => void;
}

export const MyQuizzes: React.FC<MyQuizzesProps> = ({ user, onBack, onEdit }) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [mergeMode, setMergeMode] = useState(false);
    const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
    const [isMerging, setIsMerging] = useState(false);
    
    // Evaluation State
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [evalTargetQuiz, setEvalTargetQuiz] = useState<Quiz | null>(null);

    const toast = useToast();

    useEffect(() => {
        if (user) {
            loadQuizzes();
        }
    }, [user]);

    const loadQuizzes = async () => {
        setLoading(true);
        try {
            const data = await getUserQuizzes(user.uid);
            setQuizzes(data);
        } catch (e) {
            console.error(e);
            toast.error("Error cargando quizzes");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("¿Seguro que quieres eliminar este quiz? No se puede deshacer.")) {
            try {
                await deleteQuizFromFirestore(id);
                setQuizzes(prev => prev.filter(q => q.id !== id));
                toast.success("Quiz eliminado");
            } catch (e) {
                toast.error("Error al eliminar");
            }
        }
    };

    const handleMergeToggle = (id: string) => {
        if (selectedForMerge.includes(id)) {
            setSelectedForMerge(prev => prev.filter(i => i !== id));
        } else {
            if (selectedForMerge.length >= 2) {
                toast.warning("Máximo 2 quizzes para fusionar.");
                return;
            }
            setSelectedForMerge(prev => [...prev, id]);
        }
    };

    const confirmMerge = async () => {
        if (selectedForMerge.length !== 2) return;
        setIsMerging(true);
        
        try {
            const q1 = quizzes.find(q => q.id === selectedForMerge[0]);
            const q2 = quizzes.find(q => q.id === selectedForMerge[1]);
            
            if (!q1 || !q2) throw new Error("Quiz not found");

            const mergedQuestions = [
                ...q1.questions.map(q => ({...q, id: Math.random().toString(36).substring(2)})),
                ...q2.questions.map(q => ({...q, id: Math.random().toString(36).substring(2)}))
            ];

            const mergedQuiz: Quiz = {
                title: `${q1.title} + ${q2.title}`,
                description: `Fusión de quizzes. Total: ${mergedQuestions.length} preguntas.`,
                questions: mergedQuestions,
                tags: [...new Set([...(q1.tags || []), ...(q2.tags || []), 'Merged'])],
            };

            await saveQuizToFirestore(mergedQuiz, user.uid);
            toast.success("¡Quizzes fusionados correctamente!");
            setMergeMode(false);
            setSelectedForMerge([]);
            loadQuizzes(); // Reload list
        } catch (e) {
            toast.error("Error en la fusión");
        } finally {
            setIsMerging(false);
        }
    };

    const handleLaunchEvaluation = (quiz: Quiz, e: React.MouseEvent) => {
        e.stopPropagation();
        setEvalTargetQuiz(quiz);
        setShowEvalModal(true);
    };

    // FILTERING LOGIC
    const filteredQuizzes = quizzes.filter(q => {
        const term = searchTerm.toLowerCase();
        const inTitle = q.title.toLowerCase().includes(term);
        const inTags = q.tags?.some(tag => tag.toLowerCase().includes(term));
        return inTitle || inTags;
    }).sort((a, b) => {
        if (sortOrder === 'newest') {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortOrder === 'oldest') {
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        if (sortOrder === 'count_desc') {
            return b.questions.length - a.questions.length;
        }
        return 0;
    });

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 w-full pb-20 pt-8">
            
            {showEvalModal && evalTargetQuiz && (
                <CreateEvaluationModal 
                    isOpen={showEvalModal}
                    onClose={() => setShowEvalModal(false)}
                    quiz={evalTargetQuiz}
                    user={user}
                />
            )}

            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-4">
                    <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2">
                        <ArrowLeft className="w-4 h-4" /> VOLVER
                    </CyberButton>
                    <h2 className="text-3xl font-cyber text-cyan-400">MIS QUIZES</h2>
                </div>
                <div>
                    {!mergeMode ? (
                        <CyberButton onClick={() => setMergeMode(true)} variant="secondary" className="text-xs h-9">
                            <Merge className="w-4 h-4 mr-2" /> FUSIONAR QUIZZES
                        </CyberButton>
                    ) : (
                        <div className="flex gap-2">
                            <CyberButton 
                                onClick={confirmMerge} 
                                disabled={selectedForMerge.length !== 2 || isMerging}
                                className="text-xs h-9 bg-purple-600 hover:bg-purple-500 border-none"
                            >
                                {isMerging ? <Loader2 className="w-4 h-4 animate-spin"/> : "CONFIRMAR FUSIÓN"}
                            </CyberButton>
                            <CyberButton variant="ghost" onClick={() => { setMergeMode(false); setSelectedForMerge([]); }} className="text-xs h-9">
                                CANCELAR
                            </CyberButton>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTROLS */}
            <div className="flex flex-col md:flex-row gap-4 items-end bg-black/20 p-4 rounded border border-gray-800">
                <div className="w-full md:flex-1 relative">
                    <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                    <CyberInput 
                        placeholder="Buscar por título o etiqueta..." 
                        className="pl-10" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-64 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <CyberSelect 
                        options={[
                            { label: "Más recientes", value: "newest" },
                            { label: "Más antiguos", value: "oldest" },
                            { label: "Más preguntas", value: "count_desc" }
                        ]}
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-cyan-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <span className="font-mono text-sm">CARGANDO NEURAL CLOUD...</span>
                </div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800 rounded-lg bg-black/10 text-center">
                    <Sparkles className="w-12 h-12 text-cyan-500/50 mb-4" />
                    <h3 className="text-xl font-cyber text-white mb-2">
                        {searchTerm ? "No se encontraron resultados" : "Aún no tienes quizes"}
                    </h3>
                    <p className="text-gray-500 font-mono text-sm max-w-md">
                        {searchTerm ? "Intenta con otro término de búsqueda." : "¡Es hora de crear el primero! Ve al generador y empieza a crear contenido increíble."}
                    </p>
                    {!searchTerm && (
                        <CyberButton variant="neural" onClick={onBack} className="mt-6">
                            CREAR NUEVO QUIZ
                        </CyberButton>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuizzes.map(quiz => {
                        const isSelected = selectedForMerge.includes(quiz.id!);
                        return (
                            <div 
                                key={quiz.id} 
                                onClick={() => mergeMode ? handleMergeToggle(quiz.id!) : onEdit(quiz)} 
                                className={`group cursor-pointer relative ${mergeMode && isSelected ? 'ring-2 ring-purple-500 rounded-lg' : ''}`}
                            >
                                <CyberCard className={`h-full border-gray-800 hover:border-cyan-500/50 transition-all hover:bg-cyan-950/10 flex flex-col ${mergeMode ? 'opacity-90' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-cyber text-lg text-white group-hover:text-cyan-400 line-clamp-1">{quiz.title}</h3>
                                        {!mergeMode && (
                                            <button 
                                                onClick={(e) => handleDelete(quiz.id!, e)}
                                                className="text-gray-600 hover:text-red-500 p-1 rounded hover:bg-red-950/30 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {mergeMode && (
                                            <div className={`w-5 h-5 border rounded flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-500' : 'border-gray-600'}`}>
                                                {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <p className="text-xs text-gray-500 font-mono mb-4 line-clamp-2 min-h-[32px]">
                                        {quiz.description || "Sin descripción"}
                                    </p>

                                    <div className="mt-auto space-y-3">
                                        <div className="flex flex-wrap gap-1">
                                            {(quiz.tags || []).slice(0, 3).map(tag => (
                                                <span key={tag} className="text-[10px] bg-gray-900 border border-gray-700 px-2 py-0.5 rounded text-gray-400">
                                                    #{tag}
                                                </span>
                                            ))}
                                            {(quiz.tags?.length || 0) > 3 && <span className="text-[10px] text-gray-600">+{quiz.tags!.length - 3}</span>}
                                        </div>

                                        <div className="flex items-center justify-between text-xs font-mono text-gray-500 border-t border-gray-800 pt-3">
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {quiz.questions.length}</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(quiz.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                            {!mergeMode && (
                                                <div className="flex gap-2">
                                                    {/* NEW LAUNCH BUTTON */}
                                                    <button
                                                        onClick={(e) => handleLaunchEvaluation(quiz, e)}
                                                        className="text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-2 py-1 rounded flex items-center gap-1 transition-all shadow-lg hover:shadow-green-500/20"
                                                        title="Lanzar Evaluación Arcade"
                                                    >
                                                        <Rocket className="w-3 h-3" /> LANZAR
                                                    </button>
                                                    <div className="text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                        <Edit className="w-3 h-3" /> EDITAR
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CyberCard>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
