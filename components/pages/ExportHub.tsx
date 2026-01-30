
import React, { useState } from 'react';
import { Quiz, ExportFormat } from '../../types';
import { ExportPanel } from '../ExportPanel';
import { CyberCard, CyberButton } from '../ui/CyberUI';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, FileText, AlertCircle, Edit3 } from 'lucide-react';

interface ExportHubProps {
    quiz: Quiz;
    onBack: () => void;
    setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
    t: any;
}

export const ExportHub: React.FC<ExportHubProps> = ({ quiz, onBack, setQuiz, t }) => {
    const [expandedQ, setExpandedQ] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedQ(prev => prev === id ? null : id);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 pb-20">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-green-900/30 border border-green-500/30 text-green-400 text-[10px] font-mono uppercase tracking-widest">
                            FASE 2: DISTRIBUCIÓN
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black font-cyber text-white">
                        REVISIÓN Y EXPORTACIÓN
                    </h1>
                    <p className="text-gray-400 font-mono mt-2 text-sm">
                        Revisa el contenido final y selecciona los formatos de salida.
                    </p>
                </div>
                <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2">
                    <ArrowLeft className="w-4 h-4" /> VOLVER AL EDITOR
                </CyberButton>
            </div>

            {/* SECTION 1: COMPRESSED REVIEW (SUMMARY) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-cyber text-cyan-400 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> RESUMEN DEL CONTENIDO ({quiz.questions.length})
                    </h3>
                    <CyberButton variant="secondary" onClick={onBack} className="text-xs h-8">
                        <Edit3 className="w-3 h-3 mr-2" /> CORREGIR DATOS
                    </CyberButton>
                </div>

                <div className="grid gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 bg-black/20 p-4 rounded-xl border border-gray-800/50">
                    {quiz.questions.map((q, idx) => {
                        const isExpanded = expandedQ === q.id;
                        const correctOption = q.options.find(o => q.correctOptionIds?.includes(o.id) || o.id === q.correctOptionId);

                        return (
                            <div key={q.id} className={`border rounded-lg transition-all ${isExpanded ? 'bg-gray-900/50 border-cyan-500/50' : 'bg-black/40 border-gray-800 hover:border-gray-600'}`}>
                                <div 
                                    className="p-3 flex items-center justify-between cursor-pointer"
                                    onClick={() => toggleExpand(q.id)}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className="font-mono text-xs text-gray-500 font-bold shrink-0">#{idx + 1}</span>
                                        <span className="text-sm text-gray-200 truncate font-medium">{q.text}</span>
                                        {q.imageUrl && <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 rounded border border-blue-500/30">IMG</span>}
                                    </div>
                                    <div className="text-gray-500">
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 text-xs border-t border-gray-800 mt-2">
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="font-mono text-gray-500 mb-1">RESPUESTA CORRECTA:</p>
                                                <div className="flex items-center gap-2 text-green-400 font-bold bg-green-900/10 p-2 rounded border border-green-500/20">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {correctOption?.text || "No marcada"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-mono text-gray-500 mb-1">DETALLES TÉCNICOS:</p>
                                                <ul className="space-y-1 text-gray-400 font-mono">
                                                    <li>Tipo: {q.questionType}</li>
                                                    <li>Tiempo: {q.timeLimit}s</li>
                                                    <li>Opciones: {q.options.length}</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="h-px bg-gray-800 w-full" />

            {/* SECTION 2: EXPORT PANEL */}
            <div>
                <ExportPanel 
                    quiz={quiz} 
                    setQuiz={setQuiz} 
                    t={t} 
                    initialTargetPlatform={ExportFormat.UNIVERSAL_CSV} // Default to Neural Quiz
                />
            </div>

        </div>
    );
};
