
import React, { useState, useEffect } from 'react';
import { Quiz, ExportFormat } from '../../types';
import { CyberCard, CyberButton } from '../ui/CyberUI';
import { ArrowLeft, AlertTriangle, CheckCircle2, Download, Wand2, FileText, Share2, AlertCircle } from 'lucide-react';
import { validateQuizForPlatform, ValidationIssue } from '../../utils/platformValidators';
import { exportQuiz } from '../../services/exportService';
import { exportToGoogleForms } from '../../services/googleFormsService';
import { exportToGoogleSlides } from '../../services/googleSlidesService';
import { signInWithGoogle } from '../../services/firebaseService';
import { useToast } from '../ui/Toast';

interface ExportHubProps {
    quiz: Quiz;
    onBack: () => void;
}

const PLATFORM_CARDS = [
    { id: ExportFormat.KAHOOT, name: 'Kahoot!', icon: 'https://i.postimg.cc/D8YmShxz/Kahoot.png', color: 'border-purple-500' },
    { id: ExportFormat.BLOOKET, name: 'Blooket', icon: 'https://i.postimg.cc/ZCqCYnxR/Blooket.png', color: 'border-cyan-500' },
    { id: ExportFormat.GOOGLE_FORMS, name: 'Google Forms', icon: 'https://i.postimg.cc/T3HGdbMd/Forms.png', color: 'border-purple-400' },
    { id: ExportFormat.GOOGLE_SLIDES_API, name: 'Google Slides', icon: 'https://i.postimg.cc/9MTyB3f3/slides.png', color: 'border-yellow-500' },
    { id: ExportFormat.PDF_PRINT, name: 'PDF Examen', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg', color: 'border-red-500' },
    { id: ExportFormat.UNIVERSAL_CSV, name: 'Excel / CSV', icon: 'https://i.postimg.cc/yN09hR9W/CSV.png', color: 'border-green-500' },
];

export const ExportHub: React.FC<ExportHubProps> = ({ quiz, onBack }) => {
    const [selectedPlatform, setSelectedPlatform] = useState<ExportFormat | null>(null);
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const toast = useToast();

    // Run validation when platform changes
    useEffect(() => {
        if (selectedPlatform) {
            const validationResults = validateQuizForPlatform(quiz, selectedPlatform);
            setIssues(validationResults);
        } else {
            setIssues([]);
        }
    }, [selectedPlatform, quiz]);

    const handleExport = async () => {
        if (!selectedPlatform) return;
        
        setIsExporting(true);
        try {
            // 1. Google APIs
            if (selectedPlatform === ExportFormat.GOOGLE_FORMS) {
                const url = await exportToGoogleForms(quiz.title, quiz.questions);
                window.open(url, '_blank');
                toast.success("Formulario creado con éxito");
            } 
            else if (selectedPlatform === ExportFormat.GOOGLE_SLIDES_API) {
                const { token } = await signInWithGoogle();
                if (!token) throw new Error("No token");
                const url = await exportToGoogleSlides(quiz.title, quiz.questions, token);
                window.open(url, '_blank');
                toast.success("Presentación creada con éxito");
            }
            // 2. File Downloads
            else {
                const result = await exportQuiz(quiz, selectedPlatform);
                
                // Trigger Download
                const blob = result.isBase64 
                    ? new Blob([Uint8Array.from(atob(result.content), c => c.charCodeAt(0))], { type: result.mimeType })
                    : new Blob(['\uFEFF' + result.content], { type: `${result.mimeType};charset=utf-8` });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = result.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Archivo descargado");
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Error al exportar: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleAutoFix = () => {
        toast.info("Agente IA: 'Función de auto-corrección en desarrollo. Por favor edita manualmente por ahora.'");
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col">
            
            {/* Header */}
            <div className="border-b border-gray-800 bg-black/50 p-4 backdrop-blur-sm sticky top-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2">
                        <ArrowLeft className="w-4 h-4" /> EDITOR
                    </CyberButton>
                    <div className="h-6 w-px bg-gray-700"></div>
                    <h1 className="font-cyber text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        EXPORT HUB
                    </h1>
                </div>
                <div className="text-xs font-mono text-gray-500">
                    {quiz.questions.length} PREGUNTAS LISTAS
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                
                {/* LEFT PANEL: VISOR & VALIDATION */}
                <div className="w-full lg:w-1/3 bg-gray-900/30 border-r border-gray-800 flex flex-col overflow-hidden">
                    <div className="p-4 bg-gray-900/80 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
                            {issues.length > 0 ? `${issues.length} ALERTAS DETECTADAS` : "ESTADO DEL QUIZ"}
                        </span>
                        {issues.length > 0 && (
                            <button onClick={handleAutoFix} className="text-[10px] bg-purple-900/50 text-purple-200 px-2 py-1 rounded border border-purple-500/30 flex items-center gap-1 hover:bg-purple-900">
                                <Wand2 className="w-3 h-3" /> CORREGIR CON IA
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {quiz.questions.map((q, idx) => {
                            const qIssues = issues.filter(i => i.questionIndex === idx);
                            const hasError = qIssues.some(i => i.severity === 'error');
                            
                            return (
                                <div key={q.id} className={`p-3 rounded border transition-all ${hasError ? 'bg-red-950/20 border-red-500/50' : 'bg-black/40 border-gray-800 hover:border-gray-700'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold font-mono ${hasError ? 'text-red-400' : 'text-gray-500'}`}>Q{idx + 1}</span>
                                        {hasError ? <AlertCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500/30" />}
                                    </div>
                                    <p className="text-sm text-gray-300 line-clamp-2 mb-2">{q.text}</p>
                                    
                                    {qIssues.length > 0 && (
                                        <div className="space-y-1 mt-2 border-t border-red-900/30 pt-2">
                                            {qIssues.map((issue, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs text-red-300">
                                                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                                    <span>{issue.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT PANEL: PLATFORM SELECTION */}
                <div className="flex-1 p-6 lg:p-12 overflow-y-auto bg-[url('/bg-grid.png')]">
                    <div className="max-w-4xl mx-auto space-y-8">
                        
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-bold text-white font-cyber">SELECCIONA DESTINO</h2>
                            <p className="text-gray-400 font-mono text-sm">El sistema validará la compatibilidad automáticamente.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {PLATFORM_CARDS.map(platform => {
                                const isSelected = selectedPlatform === platform.id;
                                return (
                                    <button 
                                        key={platform.id}
                                        onClick={() => setSelectedPlatform(platform.id)}
                                        className={`relative group h-32 rounded-xl border-2 transition-all duration-300 overflow-hidden flex flex-col items-center justify-center gap-2
                                            ${isSelected 
                                                ? `bg-black/80 ${platform.color} shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.02]` 
                                                : 'bg-black/40 border-gray-800 hover:border-gray-600 hover:bg-gray-900'
                                            }
                                        `}
                                    >
                                        <img src={platform.icon} alt={platform.name} className={`w-10 h-10 object-contain transition-all ${isSelected ? 'scale-110 drop-shadow-lg' : 'grayscale group-hover:grayscale-0'}`} />
                                        <span className={`font-cyber font-bold ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                            {platform.name}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2">
                                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* EXPORT ACTION BAR */}
                        <div className={`transition-all duration-500 ${selectedPlatform ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                            <CyberCard className="border-t-4 border-t-cyan-500 bg-black/80 backdrop-blur-md p-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div>
                                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                            <Share2 className="w-5 h-5 text-cyan-400" />
                                            LISTO PARA EXPORTAR
                                        </h3>
                                        <p className="text-sm text-gray-400 font-mono mt-1">
                                            {issues.length > 0 
                                                ? `⚠️ Se han detectado ${issues.length} problemas de compatibilidad.` 
                                                : "✅ Todo correcto. Compatible al 100%."}
                                        </p>
                                    </div>
                                    
                                    <CyberButton 
                                        onClick={handleExport} 
                                        isLoading={isExporting}
                                        disabled={issues.some(i => i.severity === 'error')}
                                        className={`w-full md:w-auto h-14 px-8 text-lg ${issues.some(i => i.severity === 'error') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isExporting ? 'PROCESANDO...' : (
                                            <>
                                                <Download className="w-5 h-5 mr-2" /> 
                                                {selectedPlatform?.includes('GOOGLE') ? 'CONECTAR Y CREAR' : 'DESCARGAR ARCHIVO'}
                                            </>
                                        )}
                                    </CyberButton>
                                </div>
                            </CyberCard>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};
