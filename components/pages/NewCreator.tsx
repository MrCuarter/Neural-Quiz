
import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, QUESTION_TYPES, PLATFORM_SPECS, ExportFormat } from '../../types';
import { CyberButton, CyberInput, CyberCard, CyberSelect, CyberTextArea, CyberCheckbox, CyberProgressBar } from '../ui/CyberUI';
import { QuizEditor } from '../QuizEditor';
import { 
    ArrowLeft, Sparkles, BrainCircuit, Wand2, PenTool, 
    ChevronDown, ChevronUp, FilePlus, UploadCloud, Link as LinkIcon, 
    ClipboardPaste, CheckCircle2, AlertTriangle, Save, Play, 
    Download, LayoutTemplate, Settings, RefreshCw, Plus, FileText, Monitor, Calendar, GraduationCap, Signal, BarChart3, AlignLeft, RotateCcw
} from 'lucide-react';
import { generateQuizQuestions, parseRawTextToQuiz } from '../../services/geminiService';
import { searchImage } from '../../services/imageService';
import { useToast } from '../ui/Toast';
import { getRandomMessage, getDetectionMessage } from '../../services/messageService';
import { analyzeUrl, fetchUrlContent } from '../../services/urlService';
import { extractTextFromPDF } from '../../services/pdfService';
import * as XLSX from 'xlsx';
import { detectAndParseStructure } from '../../services/importService';

interface NewCreatorProps {
    onNavigate: (view: string) => void;
    user: any;
    t: any;
    onSaveQuiz: (asCopy?: boolean) => Promise<void>;
    onExport: () => void;
    onPlay: (quiz: Quiz) => void;
    isSaving: boolean;
    initialQuiz: Quiz;
    setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
}

export const NewCreator: React.FC<NewCreatorProps> = ({ 
    onNavigate, user, t, onSaveQuiz, onExport, onPlay, isSaving, initialQuiz, setQuiz 
}) => {
    const toast = useToast();
    
    // --- UI STATE ---
    const [activePanel, setActivePanel] = useState<'NONE' | 'AI' | 'IMPORT'>('NONE'); 

    // --- GLOBAL QUIZ CONTEXT ---
    const [targetAge, setTargetAge] = useState<string>("0-99");
    // Removed targetLevel global state

    // --- AI GENERATOR STATE ---
    const [genParams, setGenParams] = useState<{
        topic: string;
        count: number | string;
        types: string[];
        difficulty: string;
        context: string;
        urls: string;
        tone: string;
        language: string;
        customToneContext: string;
        prioritizeGiphy: boolean; // NEW: Pop Culture Mode
    }>({
        topic: '',
        count: 5,
        types: [QUESTION_TYPES.MULTIPLE_CHOICE],
        difficulty: 'Multinivel', 
        context: '',
        urls: '',
        tone: 'Neutral',
        language: 'Spanish',
        customToneContext: '',
        prioritizeGiphy: false
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState(0);
    const [generationStatus, setGenerationStatus] = useState('');
    const [isGenSuccess, setIsGenSuccess] = useState(false);
    
    // Context Visibility & Tabs State
    const [showContextSection, setShowContextSection] = useState(false);
    const [contextTab, setContextTab] = useState<'upload' | 'url' | 'paste'>('upload');
    const contextFileInputRef = useRef<HTMLInputElement>(null);

    // --- IMPORT STATE ---
    const [importTab, setImportTab] = useState<'upload' | 'url' | 'paste'>('upload');
    const [textToConvert, setTextToConvert] = useState('');
    const [urlToConvert, setUrlToConvert] = useState('');
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [analysisStatus, setAnalysisStatus] = useState('');
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    // --- HELPERS ---
    const uuid = () => Math.random().toString(36).substring(2, 9);

    const toggleQuestionType = (type: string) => {
        setGenParams(prev => {
            if (prev.types.includes(type)) {
                if (prev.types.length === 1) {
                    toast.warning("Debes seleccionar al menos un tipo.");
                    return prev;
                }
                return { ...prev, types: prev.types.filter(t => t !== type) };
            } else {
                return { ...prev, types: [...prev.types, type] };
            }
        });
    };

    const handleAgeChange = (val: string) => {
        // Allow digits, +, - and spaces
        const clean = val.replace(/[^0-9+\-\s]/g, '');
        setTargetAge(clean);
    };

    const handleResetQuiz = () => {
        // Empty state definition
        const emptyState: Quiz = {
            title: '',
            description: '',
            questions: [],
            tags: [],
            id: undefined // Ensure we detach from any DB ID
        };

        // Case 0: Already empty
        if (initialQuiz.questions.length === 0 && !initialQuiz.title) {
            setQuiz(emptyState);
            return;
        }

        // Case 1: Saved in Library (Has ID) -> Safe to clear editor
        if (initialQuiz.id) {
            setQuiz(emptyState);
            toast.info("Editor reiniciado. Tu quiz anterior sigue guardado en tu librería.");
            setActivePanel('NONE');
            return;
        }

        // Case 2: Not Saved (No ID) -> Warn user
        if (window.confirm("Este quiz no está guardado y se perderán todos los datos. ¿Quieres continuar?")) {
            setQuiz(emptyState);
            toast.info("Editor reiniciado.");
            setActivePanel('NONE');
        }
    };

    // --- AI LOGIC ---
    const processContextFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        let combinedText = "";
        let count = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    const pdfText = await extractTextFromPDF(file);
                    combinedText += `\n\n--- DOCUMENTO: ${file.name} (PDF) ---\n${pdfText}\n`;
                    count++;
                } else if (file.type.match(/text.*/) || file.name.match(/\.(md|json|csv|txt)$/)) {
                    const text = await file.text();
                    combinedText += `\n\n--- DOCUMENTO: ${file.name} ---\n${text}\n`;
                    count++;
                }
            } catch (e: any) {
                toast.error(`Error leyendo ${file.name}: ${e.message}`);
            }
        }
        
        if (combinedText) {
            setGenParams(prev => ({ ...prev, context: (prev.context + combinedText).trim() }));
            toast.success(`${count} documento(s) añadidos al contexto.`);
        }
    };

    const handleContextFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { 
        processContextFiles(e.target.files); 
    };

    const handleCreateAI = async () => {
        if (!genParams.topic.trim() && !genParams.context.trim() && !genParams.urls.trim()) { 
            toast.warning("Introduce un tema, texto de contexto o URL."); return; 
        }
        
        setIsGenerating(true); setGenProgress(0); setIsGenSuccess(false);
        setGenerationStatus(getRandomMessage('start', 'es'));
        
        const qCount = Number(genParams.count) || 5;
        const progressTimer = setInterval(() => setGenProgress(prev => { 
            if (prev >= 95) return prev; 
            return prev + (90 / (qCount * 10)); 
        }), 200);
        
        try {
            const urlList = genParams.urls ? genParams.urls.split(/[\n,]+/).map(u => u.trim()).filter(u => u) : [];
            
            // Pass global Age and new Difficulty to AI Service
            const aiResult = await generateQuizQuestions({ 
                ...genParams, 
                age: targetAge, 
                difficulty: genParams.difficulty, // NEW PARAMETER
                count: Number(genParams.count),
                urls: urlList
            });
            
            clearInterval(progressTimer); setGenProgress(98); setGenerationStatus("Buscando imágenes...");
            
            const enhancedQuestions = await Promise.all(aiResult.questions.map(async (gq: any) => {
                const correctIds = gq.correctOptionIds || [gq.correctOptionId];
                let qType = gq.questionType || QUESTION_TYPES.MULTIPLE_CHOICE;
                
                // FIX: Force Multi-Select if multiple correct answers
                if (correctIds && correctIds.length > 1) {
                    qType = QUESTION_TYPES.MULTI_SELECT;
                }

                const qObj = { 
                    ...gq, 
                    id: uuid(), 
                    correctOptionIds: correctIds,
                    questionType: qType,
                    difficulty: gq.difficulty || 1 // Map difficulty from AI
                };
                
                if (!qObj.imageUrl && qObj.imageSearchQuery) {
                    // Pass prioritizeGiphy flag
                    const imgRes = await searchImage(qObj.imageSearchQuery, qObj.fallback_category, genParams.prioritizeGiphy);
                    if (imgRes) qObj.imageUrl = imgRes.url;
                }
                return qObj;
            }));

            setQuiz(prev => ({
                ...prev,
                questions: [...prev.questions, ...enhancedQuestions],
                tags: [...new Set([...(prev.tags || []), ...(aiResult.tags || [])])],
                title: (prev.title === '' || prev.title === 'Untitled Quiz') ? (genParams.topic || 'AI Quiz') : prev.title
            }));
            
            setIsGenSuccess(true);
            toast.success(`+${enhancedQuestions.length} preguntas añadidas`);
            setGenParams(prev => ({...prev, topic: ''})); 
            
            setTimeout(() => {
                setIsGenSuccess(false);
                setGenProgress(0);
                setActivePanel('NONE'); // Auto-close to show Manual Editor
            }, 1000);
            
        } catch (e: any) {
            toast.error("Error: " + e.message);
            setGenProgress(0);
        } finally {
            clearInterval(progressTimer);
            setIsGenerating(false);
        }
    };

    // --- IMPORT LOGIC ---
    const processImportedQuestions = (newQuestions: Question[]) => {
        setQuiz(prev => ({
            ...prev,
            questions: [...prev.questions, ...newQuestions]
        }));
        toast.success(`${newQuestions.length} preguntas importadas.`);
        setActivePanel('NONE');
    };

    const performAnalysis = async (content: string, sourceName: string, isAlreadyStructured: boolean = false, preParsedQuestions: Question[] = []) => {
        setIsGenerating(true); setAnalysisProgress(0); setAnalysisStatus("Analizando estructura...");
        try {
            if (isAlreadyStructured) {
                const readyQs = preParsedQuestions.map(q => ({...q, id: uuid()}));
                processImportedQuestions(readyQs);
            } else {
                const rawQs = await parseRawTextToQuiz(content, 'Spanish');
                const readyQs = rawQs.map((q: any) => ({...q, id: uuid(), correctOptionIds: [q.correctOptionId]}));
                processImportedQuestions(readyQs);
            }
        } catch (e: any) {
            toast.error("Error importando: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsGenerating(true);
        try {
            if (file.name.endsWith('.pdf')) {
                const text = await extractTextFromPDF(file);
                performAnalysis(text, file.name);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const data = evt.target?.result;
                    const wb = XLSX.read(data, { type: file.name.endsWith('.csv') ? 'string' : 'binary' });
                    const detected = detectAndParseStructure(wb);
                    if (detected) performAnalysis("", file.name, true, detected);
                    else toast.error("Formato no reconocido.");
                };
                if(file.name.endsWith('.csv')) reader.readAsText(file); else reader.readAsBinaryString(file);
            } else {
                const text = await file.text();
                performAnalysis(text, file.name);
            }
        } catch (e) { toast.error("Error leyendo archivo"); setIsGenerating(false); }
    };

    const handleUrlAnalysis = async () => {
        if (!urlToConvert) return;
        setIsGenerating(true); setAnalysisStatus("Escaneando URL...");
        try {
            const structured = await analyzeUrl(urlToConvert);
            if (structured) {
                const importedQs = structured.quiz.questions.map(q => ({...q, id: uuid()}));
                processImportedQuestions(importedQs);
                return;
            }
            const content = await fetchUrlContent(urlToConvert);
            performAnalysis(content, "URL Import");
        } catch (e: any) { toast.error("Error URL: " + e.message); } finally { setIsGenerating(false); }
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 pt-20 animate-in fade-in duration-500">
            
            {/* TOP BAR: NAVIGATION & ACTIONS */}
            <div className="max-w-[1600px] mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-black/40 p-4 rounded-xl border border-gray-800 sticky top-16 z-30 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <CyberButton variant="ghost" onClick={() => onNavigate('home')} className="pl-0 gap-2 text-xs">
                        <ArrowLeft className="w-4 h-4" /> HUB
                    </CyberButton>
                    <div className="h-8 w-px bg-gray-700"></div>
                    <div>
                        <h1 className="font-cyber font-bold text-lg text-white leading-none">NEURAL CREATOR <span className="text-cyan-400">v2</span></h1>
                        <p className="text-[10px] text-gray-500 font-mono">{initialQuiz.questions.length} PREGUNTAS EN COLA</p>
                    </div>
                </div>

                {/* CENTRAL TOOLBAR - INTEGRATED */}
                <div className="flex gap-2 bg-gray-900/50 p-1 rounded-lg border border-gray-800 overflow-x-auto max-w-full">
                    <button 
                        onClick={() => setActivePanel('NONE')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-all text-sm font-bold font-mono whitespace-nowrap ${activePanel === 'NONE' ? 'bg-gray-700 border-gray-500 text-white shadow-lg' : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <PenTool className="w-4 h-4" /> MODO MANUAL
                    </button>

                    <button 
                        onClick={() => setActivePanel('AI')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-all text-sm font-bold font-mono whitespace-nowrap ${activePanel === 'AI' ? 'bg-cyan-900/50 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Sparkles className="w-4 h-4" /> GENERADOR IA
                    </button>

                    <button 
                        onClick={() => setActivePanel('IMPORT')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-all text-sm font-bold font-mono whitespace-nowrap ${activePanel === 'IMPORT' ? 'bg-pink-900/50 border-pink-400 text-pink-100 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Wand2 className="w-4 h-4" /> IMPORTAR
                    </button>

                    <div className="w-px bg-gray-700 mx-1"></div>

                    <button 
                        onClick={onExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-md border border-transparent text-green-400 hover:text-green-300 hover:bg-green-900/20 transition-all text-sm font-bold font-mono whitespace-nowrap"
                    >
                        <Download className="w-4 h-4" /> EXPORTAR
                    </button>
                </div>

                {/* START OVER BUTTON */}
                <div className="hidden md:block">
                    <CyberButton 
                        variant="ghost" 
                        onClick={handleResetQuiz}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs px-3"
                        title="Reiniciar Editor (Borrar Todo)"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" /> REINICIAR
                    </CyberButton>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 gap-6 relative">
                
                {/* --- GLOBAL CONFIG SECTION (Always Visible) --- */}
                <div className="bg-black/20 p-4 rounded-xl border border-gray-800 space-y-4">
                    {/* Row 1: Title and Age only */}
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                        <div className="flex-1 w-full">
                            <CyberInput 
                                label="TÍTULO DEL QUIZ" 
                                value={initialQuiz.title} 
                                onChange={(e) => setQuiz({...initialQuiz, title: e.target.value})} 
                                placeholder="Ej: Examen Historia T1" 
                            />
                        </div>
                        
                        {/* Age Selector */}
                        <div className="w-full md:w-32">
                            <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest block mb-1">EDAD</label>
                            <div className="flex items-center bg-black/40 border border-gray-700 rounded-sm">
                                <input 
                                    type="text" 
                                    value={targetAge} 
                                    onChange={(e) => handleAgeChange(e.target.value)} 
                                    className="bg-transparent text-cyan-100 p-3 font-mono text-center w-full focus:outline-none"
                                    placeholder="0-99"
                                    maxLength={7}
                                />
                                <span className="text-xs text-gray-500 pr-2 select-none">años</span>
                            </div>
                        </div>
                        {/* Removed Level Selector from here */}
                    </div>

                    {/* Row 2: Description */}
                    <div className="w-full">
                        <CyberInput 
                            label="DESCRIPCIÓN (OPCIONAL)" 
                            value={initialQuiz.description} 
                            onChange={(e) => setQuiz({...initialQuiz, description: e.target.value})} 
                            placeholder="Detalles, curso, notas..." 
                        />
                    </div>
                </div>

                {/* --- PANEL: AI GENERATOR --- */}
                {activePanel === 'AI' && (
                    <div className="animate-in slide-in-from-top-4">
                        <CyberCard className="border-cyan-500/50 bg-cyan-950/10">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6 border-b border-cyan-500/30 pb-2">
                                <div className="flex items-center gap-2 text-cyan-400">
                                    <BrainCircuit className="w-5 h-5" />
                                    <h2 className="text-lg font-cyber font-bold">GENERADOR NEURAL</h2>
                                </div>
                                <button onClick={() => setActivePanel('NONE')} className="text-xs text-cyan-500 hover:text-white">[X] CERRAR</button>
                            </div>

                            {/* 1. Configuration */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-cyan-400">
                                    <Settings className="w-4 h-4" />
                                    <h3 className="font-mono font-bold text-lg">1. CONFIGURACIÓN PRINCIPAL</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">TEMA / ASUNTO</label>
                                        <CyberInput value={genParams.topic} onChange={(e) => setGenParams({...genParams, topic: e.target.value})} placeholder="Ej. 'Historia de Roma', 'Física Cuántica'" className="h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">NÚMERO DE PREGUNTAS (MAX 50)</label>
                                        <CyberInput 
                                            type="number" 
                                            value={genParams.count} 
                                            onChange={(e) => setGenParams({...genParams, count: e.target.value})} 
                                            className="h-12 font-mono text-lg" 
                                            min={1} 
                                            max={50} 
                                        />
                                    </div>
                                </div>
                                
                                {/* Language, Difficulty & Tone */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">IDIOMA</label>
                                        <CyberSelect options={[{ value: 'Spanish', label: '🇪🇸 Español' }, { value: 'English', label: '🇬🇧 English' }, { value: 'French', label: '🇫🇷 Français' }, { value: 'German', label: '🇩🇪 Deutsch' }, { value: 'Italian', label: '🇮🇹 Italiano' }, { value: 'Portuguese', label: '🇵🇹 Português' }, { value: 'Catalan', label: '🏴 Catalan' }, { value: 'Basque', label: '🏴 Euskera' }, { value: 'Galician', label: '🏴 Galego' }]} value={genParams.language} onChange={(e) => setGenParams({...genParams, language: e.target.value})} className="h-12" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                            <BarChart3 className="w-3 h-3" /> DIFICULTAD
                                        </label>
                                        <CyberSelect 
                                            options={[
                                                { value: 'Multinivel', label: '🔀 Multinivel (Mix)' }, 
                                                { value: '1', label: '⭐ Nivel 1: Básico' }, 
                                                { value: '2', label: '⭐⭐ Nivel 2: Inicial' }, 
                                                { value: '3', label: '⭐⭐⭐ Nivel 3: Intermedio' },
                                                { value: '4', label: '⭐⭐⭐⭐ Nivel 4: Avanzado' },
                                                { value: '5', label: '⭐⭐⭐⭐⭐ Nivel 5: Experto' }
                                            ]} 
                                            value={genParams.difficulty} 
                                            onChange={(e) => setGenParams({...genParams, difficulty: e.target.value})} 
                                            className="h-12 border-cyan-500/50" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">TONO</label>
                                        <CyberSelect 
                                            options={[
                                                { value: 'Neutral', label: '🔘 Neutral / Estándar' }, 
                                                { value: 'Divertido', label: '🎉 Divertido / Casual' }, 
                                                { value: 'Infantil', label: '🧸 Infantil / Amable' }, 
                                                { value: 'Académico', label: '🎓 Académico / Serio' }, 
                                                { value: 'Sarcástico', label: '😏 Sarcástico / Ingenioso' },
                                                { value: 'Custom', label: '✨ Personalizado / Gamificación' }
                                            ]} 
                                            value={genParams.tone} 
                                            onChange={(e) => setGenParams({...genParams, tone: e.target.value})} 
                                            className="h-12 border-purple-500/50 text-purple-200" 
                                        />
                                    </div>
                                </div>

                                {genParams.tone === 'Custom' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2">
                                        <label className="text-xs font-mono text-yellow-400 uppercase tracking-widest">CONTEXTO NARRATIVO</label>
                                        <CyberTextArea 
                                            value={genParams.customToneContext} 
                                            onChange={(e) => setGenParams({...genParams, customToneContext: e.target.value})} 
                                            placeholder="Ej: Una aventura de piratas, Misión espacial, Detectives victorianos..." 
                                            className="h-20 font-mono text-sm border-yellow-500/50 bg-yellow-900/10"
                                        />
                                    </div>
                                )}

                                {/* NEW: POP CULTURE MODE TOGGLE */}
                                <div className="mt-4 bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg flex items-center gap-3">
                                    <CyberCheckbox 
                                        label="🎮 MODO CULTURA POP (Priorizar GIFs/Memes)" 
                                        checked={genParams.prioritizeGiphy} 
                                        onChange={(c) => setGenParams({...genParams, prioritizeGiphy: c})}
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-gray-800 w-full my-6" />

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-cyan-400">
                                    <h3 className="font-mono font-bold text-lg">2. SELECCIONA TIPOS DE PREGUNTA</h3>
                                </div>
                                <p className="text-[10px] text-gray-400 font-mono">
                                    Generamos en formato Universal. Si exportas a una plataforma que no soporta un tipo (ej. Kahoot no tiene 'Ordenar' gratis), te avisaremos en el Exportador.
                                </p>
                                <div className="space-y-6">
                                    <div className="bg-cyan-950/10 border border-cyan-900/30 p-4 rounded-lg">
                                        <h4 className="text-xs font-mono text-cyan-500 uppercase tracking-widest mb-3 border-b border-cyan-900/30 pb-1">CON VALIDACIÓN</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {[QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.FILL_GAP, QUESTION_TYPES.ORDER].map(type => (
                                                <CyberCheckbox 
                                                    key={type} 
                                                    label={type} 
                                                    checked={genParams.types.includes(type)} 
                                                    onChange={() => toggleQuestionType(type)} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-purple-950/10 border border-purple-900/30 p-4 rounded-lg">
                                        <h4 className="text-xs font-mono text-purple-500 uppercase tracking-widest mb-3 border-b border-purple-900/30 pb-1">SIN VALIDACIÓN</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {[QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.POLL].map(type => (
                                                <CyberCheckbox 
                                                    key={type} 
                                                    label={type} 
                                                    checked={genParams.types.includes(type)} 
                                                    onChange={() => toggleQuestionType(type)} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Context (Collapsible) with Tabs */}
                            <div className="h-px bg-gray-800 w-full my-6" />
                            <div className="space-y-4">
                                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowContextSection(!showContextSection)}>
                                    <div className="flex items-center gap-2 text-pink-400">
                                        <ArrowLeft className="w-4 h-4 rotate-180" />
                                        <h3 className="font-mono font-bold text-lg">MATERIAL DE CONTEXTO (OPCIONAL)</h3>
                                    </div>
                                    {showContextSection ? <ChevronUp className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}
                                </div>
                                
                                {showContextSection && (
                                    <div className="animate-in slide-in-from-top-2 space-y-4">
                                        
                                        {/* TAB SWITCHER */}
                                        <div className="flex gap-2 mb-2 bg-black/40 p-1 rounded-lg border border-gray-800 w-full md:w-fit">
                                            <button 
                                                onClick={() => setContextTab('upload')}
                                                className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2 rounded text-xs font-bold font-mono transition-all ${contextTab === 'upload' ? 'bg-pink-900/50 text-pink-100 border border-pink-500/30' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                <UploadCloud className="w-3 h-3" /> SUBIR ARCHIVO
                                            </button>
                                            <button 
                                                onClick={() => setContextTab('url')}
                                                className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2 rounded text-xs font-bold font-mono transition-all ${contextTab === 'url' ? 'bg-pink-900/50 text-pink-100 border border-pink-500/30' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                <LinkIcon className="w-3 h-3" /> PEGAR URL
                                            </button>
                                            <button 
                                                onClick={() => setContextTab('paste')}
                                                className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2 rounded text-xs font-bold font-mono transition-all ${contextTab === 'paste' ? 'bg-pink-900/50 text-pink-100 border border-pink-500/30' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                <AlignLeft className="w-3 h-3" /> PEGAR TEXTO
                                            </button>
                                        </div>

                                        {/* CONTENT AREAS */}
                                        {contextTab === 'upload' && (
                                            <div 
                                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:bg-white/5 ${dragActive ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700'}`}
                                                onDragEnter={(e) => {e.preventDefault(); setDragActive(true)}}
                                                onDragLeave={() => setDragActive(false)}
                                                onDrop={(e) => {e.preventDefault(); setDragActive(false); if(e.dataTransfer.files) processContextFiles(e.dataTransfer.files)}}
                                                onClick={() => contextFileInputRef.current?.click()}
                                            >
                                                <UploadCloud className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                                                <p className="text-gray-300 font-bold">ARRASTRA O HAZ CLIC</p>
                                                <p className="text-xs text-gray-500">(.txt, .md, .csv, .json, .pdf)</p>
                                                <input type="file" ref={contextFileInputRef} className="hidden" accept=".pdf,.txt,.md,.json,.csv" onChange={handleContextFileInput} multiple />
                                            </div>
                                        )}

                                        {contextTab === 'url' && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-mono text-gray-500 uppercase">URLs de referencia (Una por línea)</label>
                                                <CyberTextArea 
                                                    value={genParams.urls} 
                                                    onChange={(e) => setGenParams({...genParams, urls: e.target.value})} 
                                                    placeholder="https://wikipedia.org/wiki/..."
                                                    className="h-24 font-mono text-xs" 
                                                />
                                            </div>
                                        )}

                                        {contextTab === 'paste' && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-mono text-gray-500 uppercase">Pegar Texto Directo</label>
                                                <CyberTextArea 
                                                    value={genParams.context} 
                                                    onChange={(e) => setGenParams({...genParams, context: e.target.value})} 
                                                    placeholder="Pega aquí el contenido de un PDF, Word o web..." 
                                                    className="h-48 font-mono text-sm" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <CyberButton onClick={handleCreateAI} isLoading={isGenerating} className={`w-full h-16 text-xl font-cyber tracking-widest mt-8 transition-colors duration-500 ${isGenSuccess ? 'bg-green-600 hover:bg-green-500 border-green-400' : ''}`}>
                                {isGenSuccess ? <><CheckCircle2 className="w-6 h-6 mr-2 animate-bounce" /> ¡PROCESO FINALIZADO!</> : t.initiate_gen}
                            </CyberButton>
                            
                            {isGenerating && (
                                <div className="mt-4 space-y-3">
                                    <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative">
                                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.6)]" style={{ width: `${genProgress}%` }} />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-mono text-sm md:text-base text-cyan-300 animate-pulse">
                                            <span className="opacity-50 mr-2">[{Math.floor(genProgress)}%]</span>{generationStatus}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CyberCard>
                    </div>
                )}

                {/* --- PANEL: IMPORT --- */}
                {activePanel === 'IMPORT' && (
                    <div className="animate-in slide-in-from-top-4">
                        <CyberCard className="border-pink-500/50 bg-pink-950/10">
                            <div className="flex justify-between items-center mb-6 border-b border-pink-500/30 pb-2">
                                <div className="flex items-center gap-2 text-pink-400">
                                    <Wand2 className="w-5 h-5" />
                                    <h2 className="text-lg font-cyber font-bold">IMPORTADOR UNIVERSAL</h2>
                                </div>
                                <button onClick={() => setActivePanel('NONE')} className="text-xs text-pink-500 hover:text-white">[X] CERRAR</button>
                            </div>

                            {/* TABS */}
                            <div className="flex gap-2 mb-6">
                                <button onClick={() => setImportTab('upload')} className={`flex-1 py-3 font-bold font-mono text-xs rounded transition-colors ${importTab === 'upload' ? 'bg-pink-600 text-white shadow-lg' : 'bg-black/30 text-gray-500 hover:bg-pink-900/20'}`}>
                                    SUBIR ARCHIVO
                                </button>
                                <button onClick={() => setImportTab('url')} className={`flex-1 py-3 font-bold font-mono text-xs rounded transition-colors ${importTab === 'url' ? 'bg-pink-600 text-white shadow-lg' : 'bg-black/30 text-gray-500 hover:bg-pink-900/20'}`}>
                                    COPIAR URL
                                </button>
                                <button onClick={() => setImportTab('paste')} className={`flex-1 py-3 font-bold font-mono text-xs rounded transition-colors ${importTab === 'paste' ? 'bg-pink-600 text-white shadow-lg' : 'bg-black/30 text-gray-500 hover:bg-pink-900/20'}`}>
                                    PEGAR TEXTO
                                </button>
                            </div>

                            {/* TAB CONTENT */}
                            <div className="bg-black/20 p-6 rounded-lg border border-pink-900/30 min-h-[200px] flex flex-col justify-center">
                                
                                {importTab === 'upload' && (
                                    <div 
                                        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer flex flex-col items-center gap-4 ${dragActive ? 'border-pink-400 bg-pink-900/20' : 'border-gray-700 hover:border-pink-500'}`}
                                        onClick={() => importFileInputRef.current?.click()}
                                        onDragOver={(e) => {e.preventDefault(); setDragActive(true)}}
                                        onDragLeave={() => setDragActive(false)}
                                        onDrop={(e) => {e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) handleImportFile({target:{files:e.dataTransfer.files}} as any)}}
                                    >
                                        <FilePlus className="w-12 h-12 text-pink-500" />
                                        <div>
                                            <h3 className="font-bold text-white">ARRASTRA TU ARCHIVO AQUÍ</h3>
                                            <p className="text-xs text-gray-500 mt-1">Excel, CSV, PDF, Imágenes</p>
                                        </div>
                                        <input type="file" ref={importFileInputRef} className="hidden" onChange={handleImportFile} accept=".xlsx,.csv,.pdf,.jpg,.png" />
                                    </div>
                                )}

                                {importTab === 'url' && (
                                    <div className="space-y-4 max-w-lg mx-auto w-full">
                                        <div className="flex items-center gap-2 text-pink-300 justify-center mb-4">
                                            <LinkIcon className="w-5 h-5" />
                                            <span className="font-bold">PEGA EL ENLACE DEL QUIZ</span>
                                        </div>
                                        <CyberInput placeholder="https://kahoot.it/..." value={urlToConvert} onChange={(e) => setUrlToConvert(e.target.value)} />
                                        <CyberButton onClick={handleUrlAnalysis} isLoading={isGenerating} className="w-full bg-pink-600 hover:bg-pink-500 border-none">ESCANEAR WEB</CyberButton>
                                    </div>
                                )}

                                {importTab === 'paste' && (
                                    <div className="space-y-4 w-full h-full">
                                        <CyberTextArea 
                                            className="w-full h-64 font-mono text-sm"
                                            placeholder="Pega aquí el contenido de un PDF, Word o web..."
                                            value={textToConvert}
                                            onChange={(e) => setTextToConvert(e.target.value)}
                                        />
                                        <CyberButton onClick={() => performAnalysis(textToConvert, "Pasted Text")} isLoading={isGenerating} className="w-full bg-pink-600 hover:bg-pink-500 border-none">ANALIZAR TEXTO</CyberButton>
                                    </div>
                                )}

                            </div>
                            
                            {isGenerating && <div className="mt-6"><CyberProgressBar progress={analysisProgress || 50} text={analysisStatus} /></div>}
                        </CyberCard>
                    </div>
                )}

                {/* --- THE LIST (QuizEditor) --- */}
                <div className="mt-4">
                    <QuizEditor 
                        quiz={initialQuiz} 
                        setQuiz={setQuiz} 
                        onSave={onSaveQuiz} 
                        onExport={onExport} 
                        onPlay={onPlay} 
                        isSaving={isSaving} 
                        user={user} 
                        t={t}
                        currentLanguage="es"
                        onNavigate={onNavigate}
                    />
                </div>

            </div>
        </div>
    );
};
