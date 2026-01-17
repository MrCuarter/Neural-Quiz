
import React, { useEffect, useState } from 'react';
import { Quiz } from '../types';
import { getUserQuizzes, deleteQuizFromFirestore } from '../services/firebaseService';
import { CyberButton, CyberCard, CyberInput, CyberSelect } from './ui/CyberUI';
import { ArrowLeft, Edit, Trash2, Calendar, Hash, Tag, Search, Filter, Loader2 } from 'lucide-react';

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
            alert("Error loading quizzes");
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
            } catch (e) {
                alert("Error al eliminar");
            }
        }
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
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 w-full pb-20">
            <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
                <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2">
                    <ArrowLeft className="w-4 h-4" /> VOLVER
                </CyberButton>
                <h2 className="text-3xl font-cyber text-cyan-400">MIS QUIZES</h2>
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
                <div className="text-center py-20 text-gray-500 font-mono border-2 border-dashed border-gray-800 rounded-lg">
                    {searchTerm ? "No se encontraron resultados para tu búsqueda." : "Aún no has guardado ningún quiz."}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuizzes.map(quiz => (
                        <div key={quiz.id} onClick={() => onEdit(quiz)} className="group cursor-pointer">
                            <CyberCard className="h-full border-gray-800 hover:border-cyan-500/50 transition-all hover:bg-cyan-950/10 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-cyber text-lg text-white group-hover:text-cyan-400 line-clamp-1">{quiz.title}</h3>
                                    <button 
                                        onClick={(e) => handleDelete(quiz.id!, e)}
                                        className="text-gray-600 hover:text-red-500 p-1 rounded hover:bg-red-950/30 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <p className="text-xs text-gray-500 font-mono mb-4 line-clamp-2 min-h-[32px]">
                                    {quiz.description || "Sin descripción"}
                                </p>

                                <div className="mt-auto space-y-3">
                                    {/* TAGS */}
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
                                        <div className="text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <Edit className="w-3 h-3" /> EDITAR
                                        </div>
                                    </div>
                                </div>
                            </CyberCard>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
