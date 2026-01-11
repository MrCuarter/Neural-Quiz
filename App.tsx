
import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, Option, ExportFormat } from './types';
import { QuizEditor } from './components/QuizEditor';
import { ExportPanel } from './components/ExportPanel';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HelpView } from './components/HelpView'; // New Import
import { translations, Language } from './utils/translations';
import { CyberButton, CyberInput, CyberTextArea, CyberSelect, CyberCard, CyberProgressBar, CyberCheckbox } from './components/ui/CyberUI';
import { BrainCircuit, FileUp, Sparkles, PenTool, ArrowLeft, Terminal, Bot, FileText, Globe, Upload, Sun, Moon, ChevronRight, AlertTriangle, Link as LinkIcon, UploadCloud, FilePlus, ClipboardPaste, Info, FileType } from 'lucide-react';
import { generateQuizQuestions, parseRawTextToQuiz } from './services/geminiService';
import { detectAndParseStructure } from './services/importService';
import { extractTextFromPDF } from './services/pdfService';
import { fetchUrlContent } from './services/urlService';
import { getRandomMessage, getDetectionMessage } from './services/messageService';
import * as XLSX from 'xlsx';

// Types
type ViewState = 'home' | 'create_menu' | 'create_ai' | 'create_manual' | 'convert_upload' | 'convert_analysis' | 'convert_result' | 'help';

const initialQuiz: Quiz = {
  title: '',
  description: '',
  questions: []
};

// Platform Capabilities Matrix
const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'Multiple Choice',
    TRUE_FALSE: 'True/False',
    FILL_GAP: 'Fill in the Blank',
    OPEN_ENDED: 'Open Ended',
    MULTI_SELECT: 'Multi-Select (Checkbox)',
    POLL: 'Poll',
    DRAW: 'Draw'
};

const PLATFORM_SPECS: Record<string, { name: string, types: string[] }> = {
    'UNIVERSAL': { 
        name: 'Universal / Generic', 
        types: Object.values(QUESTION_TYPES) 
    },
    [ExportFormat.GENIALLY]: { 
        name: 'Genially', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.FILL_GAP, QUESTION_TYPES.OPEN_ENDED] 
    },
    [ExportFormat.WAYGROUND]: { 
        name: 'Wayground', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.FILL_GAP, QUESTION_TYPES.OPEN_ENDED, QUESTION_TYPES.POLL, QUESTION_TYPES.DRAW] 
    },
    [ExportFormat.KAHOOT]: { 
        name: 'Kahoot', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.FILL_GAP] 
    },
    [ExportFormat.BLOOKET]: { 
        name: 'Blooket', 
        types: [QUESTION_TYPES.MULTIPLE_CHOICE] 
    },
    [ExportFormat.GIMKIT_CLASSIC]: {
        name: 'Gimkit',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.FILL_GAP]
    },
    [ExportFormat.QUIZALIZE]: {
        name: 'Quizalize',
        types: [QUESTION_TYPES.MULTIPLE_CHOICE, QUESTION_TYPES.TRUE_FALSE, QUESTION_TYPES.FILL_GAP]
    }
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [isClassroomMode, setIsClassroomMode] = useState(false);
  const [language, setLanguage] = useState<Language>('es');
  
  // Translation Helper
  const t = translations[language];

  // AI Generation State
  const [targetPlatform, setTargetPlatform] = useState('UNIVERSAL');
  const [genParams, setGenParams] = useState<{
    topic: string;
    count: number;
    types: string[];
    age: string;
    context: string;
    urls: string; // Store as string for input, split for API
  }>({
    topic: '',
    count: 5,
    types: [QUESTION_TYPES.MULTIPLE_CHOICE], 
    age: 'Universal',
    context: '',
    urls: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const contextFileInputRef = useRef<HTMLInputElement>(null);

  // Conversion State
  const [convertTab, setConvertTab] = useState<'upload' | 'paste' | 'url'>('upload');
  const [textToConvert, setTextToConvert] = useState('');
  const [urlToConvert, setUrlToConvert] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportSectionRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  // Helper for ID generation
  const uuid = () => Math.random().toString(36).substring(2, 9);

  // --- Effects: Persistence & Theme ---

  useEffect(() => {
    if (isClassroomMode) {
      document.body.classList.add('classroom-mode');
    } else {
      document.body.classList.remove('classroom-mode');
    }
  }, [isClassroomMode]);

  useEffect(() => {
    const saved = localStorage.getItem('neuralQuizBackup');
    const savedMode = localStorage.getItem('neuralQuizTheme');
    if (saved) {
      try {
        setQuiz(JSON.parse(saved));
      } catch (e) { console.error("Restore failed", e); }
    }
    if (savedMode === 'classroom') {
      setIsClassroomMode(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('neuralQuizBackup', JSON.stringify(quiz));
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (quiz.questions.length > 0) {
            e.preventDefault();
            e.returnValue = ''; 
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [quiz]);

  const toggleTheme = () => {
    const newMode = !isClassroomMode;
    setIsClassroomMode(newMode);
    localStorage.setItem('neuralQuizTheme', newMode ? 'classroom' : 'cyber');
  };

  // --- Handlers ---

  const scrollToExport = () => {
    exportSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePlatformChange = (platformKey: string) => {
      setTargetPlatform(platformKey);
      const validTypes = PLATFORM_SPECS[platformKey].types;
      setGenParams(prev => ({
          ...prev,
          types: validTypes
      }));
  };

  const toggleQuestionType = (type: string) => {
      setGenParams(prev => {
          if (prev.types.includes(type)) {
              if (prev.types.length === 1) return prev;
              return { ...prev, types: prev.types.filter(t => t !== type) };
          } else {
              return { ...prev, types: [...prev.types, type] };
          }
      });
  };

  // --- Context File Handling (Drag & Drop) ---
  const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
          setDragActive(true);
      } else if (e.type === 'dragleave') {
          setDragActive(false);
      }
  };

  const processContextFiles = async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      
      let combinedText = "";
      let count = 0;

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          try {
             if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                 const pdfText = await extractTextFromPDF(file);
                 combinedText += `\n\n--- DOCUMENT START: ${file.name} (PDF) ---\n${pdfText}\n--- DOCUMENT END ---\n`;
                 count++;
             }
             else if (file.type.match(/text.*/) || file.name.match(/\.(md|json|csv|txt)$/)) {
                const text = await file.text();
                combinedText += `\n\n--- DOCUMENT START: ${file.name} ---\n${text}\n--- DOCUMENT END ---\n`;
                count++;
             } else {
                 alert(`Skipped ${file.name}: Binary files (Docx, Images) need manual copy-paste.`);
             }
          } catch (e: any) {
             console.error("Error reading file", file.name, e);
             alert(`Error reading ${file.name}: ${e.message}`);
          }
      }

      if (combinedText) {
          setGenParams(prev => ({
              ...prev,
              context: (prev.context + combinedText).trim()
          }));
          alert(`${count} document(s) added to context!`);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processContextFiles(e.dataTransfer.files);
      }
  };

  const handleContextFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      processContextFiles(e.target.files);
  };

  // ---

  const handleCreateAI = async () => {
    if (!genParams.topic.trim() && !genParams.context.trim() && !genParams.urls.trim()) {
      alert("Please enter a topic, paste context text, or add a URL.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const langMap: Record<string, string> = {
          'es': 'Spanish', 'en': 'English', 'fr': 'French', 'it': 'Italian', 'de': 'German'
      };
      const selectedLang = langMap[language] || 'Spanish';

      // Split URLs by comma or newline
      const urlList = genParams.urls.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);

      const generatedQs = await generateQuizQuestions({
        topic: genParams.topic,
        count: genParams.count,
        types: genParams.types,
        age: genParams.age,
        context: genParams.context,
        urls: urlList,
        language: selectedLang
      });
      
      const newQuestions: Question[] = generatedQs.map(gq => {
        const qId = uuid();
        const options: Option[] = gq.rawOptions.map(optText => ({ id: uuid(), text: optText }));
        const correctIdx = (gq.correctIndex >= 0 && gq.correctIndex < options.length) ? gq.correctIndex : 0;
        
        return {
          id: qId,
          text: gq.text,
          options: options,
          correctOptionId: options[correctIdx].id,
          timeLimit: 30,
          feedback: gq.feedback,
          questionType: gq.questionType || QUESTION_TYPES.MULTIPLE_CHOICE
        };
      });

      setQuiz({
        title: genParams.topic || 'AI Generated Quiz',
        description: `Generated for ${genParams.age} - ${targetPlatform}`,
        questions: newQuestions
      });
      
      setView('create_manual'); 
    } catch (e) {
      alert("AI Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Centralized cleanup for timers
  const clearAnalysisInterval = () => {
      if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
      }
  };

  const performAnalysis = async (content: string, sourceName: string, isAlreadyStructured: boolean = false, preParsedQuestions: Question[] = []) => {
    setView('convert_analysis');
    setAnalysisProgress(0);
    setAnalysisStatus(getRandomMessage('start'));

    // Config
    const MIN_DURATION = 8000; // 8 Seconds minimum show
    const startTime = Date.now();
    let currentVirtualProgress = 0;

    clearAnalysisInterval();
    
    // We start the AI process in parallel
    const processingPromise = (async () => {
        try {
            if (isAlreadyStructured && preParsedQuestions.length > 0) {
                 return preParsedQuestions;
            } else {
                const langMap: Record<string, string> = {
                    'es': 'Spanish', 'en': 'English', 'fr': 'French', 'it': 'Italian', 'de': 'German'
                };
                const selectedLang = langMap[language] || 'Spanish';
                
                const generatedQs = await parseRawTextToQuiz(content, selectedLang);
                return generatedQs.map(gq => {
                  const qId = uuid();
                  const options: Option[] = gq.rawOptions.map(optText => ({ id: uuid(), text: optText }));
                  const correctIdx = (gq.correctIndex >= 0 && gq.correctIndex < options.length) ? gq.correctIndex : 0;
                  return {
                    id: qId,
                    text: gq.text,
                    options: options,
                    correctOptionId: options[correctIdx].id,
                    timeLimit: 30,
                    feedback: gq.feedback,
                    questionType: gq.questionType
                  };
                });
            }
        } catch (e) {
            throw e;
        }
    })();

    // Animation Loop: Updates UI every 100ms
    progressIntervalRef.current = window.setInterval(() => {
       const elapsed = Date.now() - startTime;
       
       let targetP = 0;
       if (elapsed < MIN_DURATION) {
           targetP = (elapsed / MIN_DURATION) * 80;
       } else {
           const extraTime = elapsed - MIN_DURATION;
           const creep = 19 * (1 - Math.exp(-extraTime / 10000)); // takes ~30s more to reach 99
           targetP = 80 + creep;
       }
       
       if (targetP > currentVirtualProgress) {
           currentVirtualProgress = targetP;
       }
       
       setAnalysisProgress(currentVirtualProgress);

       if (elapsed > 1000 && elapsed < 1200) {
           setAnalysisStatus(getDetectionMessage(sourceName, content));
       } else if (elapsed > 4000 && elapsed < 4200) {
           setAnalysisStatus(getRandomMessage('detect_generic'));
       } else if (elapsed > 6000 && elapsed < 6200) {
           setAnalysisStatus(getRandomMessage('progress'));
       }

    }, 100);

    try {
        const questions = await processingPromise;

        if (questions.length === 0) {
            throw new Error("No questions extracted.");
        }

        const elapsedNow = Date.now() - startTime;
        if (elapsedNow < MIN_DURATION) {
            await new Promise(r => setTimeout(r, MIN_DURATION - elapsedNow));
        }

        clearAnalysisInterval();
        setAnalysisProgress(100);
        setAnalysisStatus(getRandomMessage('success'));
        
        setQuiz({
            title: sourceName,
            description: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI',
            questions: questions
        });

        setTimeout(() => {
            setView('create_manual');
        }, 1500); 

    } catch (error: any) {
        clearAnalysisInterval();
        setAnalysisProgress(0);
        setAnalysisStatus(getRandomMessage('error'));
        console.error(error);
        
        setTimeout(() => {
            setView('convert_upload');
        }, 4000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset view
    setAnalysisProgress(0);
    
    try {
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        
        // 1. Try Deterministic Parsing First
        const strictQuestions = detectAndParseStructure(workbook);

        if (strictQuestions && strictQuestions.length > 0) {
            await performAnalysis("", file.name.split('.')[0], true, strictQuestions);
        } else {
             // 2. Fallback to AI
             let contentToAnalyze = "";
             workbook.SheetNames.forEach(name => {
                 contentToAnalyze += `\n--- SHEET: ${name} ---\n`;
                 contentToAnalyze += XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
             });
             await performAnalysis(contentToAnalyze, file.name.split('.')[0]);
        }
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
         const pdfText = await extractTextFromPDF(file);
         await performAnalysis(pdfText, file.name);
      } else {
         // Text file
         const content = await file.text();
         await performAnalysis(content, file.name.split('.')[0]);
      }

    } catch (e: any) {
      alert("File Read Error: " + e.message);
      clearAnalysisInterval();
    } finally {
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasteAnalysis = async () => {
      if (!textToConvert.trim()) {
          alert("Please paste some text first.");
          return;
      }
      // Simple heuristic cleanup for PDF copy-paste
      const cleaned = textToConvert
          .replace(/Page \d+ of \d+/g, '') 
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, " "); 
      
      await performAnalysis(cleaned, "Pasted Content");
  };

  const handleUrlAnalysis = async () => {
    if (!urlToConvert.trim()) {
        alert("Please enter a valid URL.");
        return;
    }
    
    setView('convert_analysis');
    setAnalysisStatus("Iniciando escaneo de red neural...");
    setAnalysisProgress(5);

    try {
        const content = await fetchUrlContent(urlToConvert);
        await performAnalysis(content, urlToConvert);
    } catch (e: any) {
        setAnalysisStatus(getRandomMessage('error'));
        setTimeout(() => {
            setView('convert_upload');
        }, 4000);
    }
  };

  // --- Components ---

  const Stepper = () => {
    let step = 1;
    if (view === 'home' || view === 'create_menu' || view === 'convert_upload' || view === 'help') step = 1;
    if (view === 'create_ai' || view === 'convert_analysis') step = 2;
    if (view === 'create_manual') step = 3;
    if (view === 'convert_result') step = 4;

    const steps = [
        { num: 1, label: 'SETUP' },
        { num: 2, label: 'GENERATE' },
        { num: 3, label: 'EDIT' },
        { num: 4, label: 'EXPORT' }
    ];

    if (view === 'home' || view === 'help') return null;

    return (
        <div className="flex justify-center mb-8 font-mono text-xs tracking-wider">
            <div className="flex items-center gap-2">
                {steps.map((s, idx) => (
                    <div key={s.num} className="flex items-center">
                        <div className={`flex flex-col items-center gap-1 ${step >= s.num ? 'text-cyan-400' : 'text-gray-600'}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${step >= s.num ? 'border-cyan-400 bg-cyan-950/30' : 'border-gray-700'}`}>
                                {s.num}
                            </div>
                            <span>{s.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`w-12 h-[1px] mx-2 ${step > s.num ? 'bg-cyan-500' : 'bg-gray-800'}`} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
  };

  // --- Views ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in zoom-in-95 duration-500">
       <div className="text-center space-y-4 mb-8">
         <h1 className="text-4xl md:text-7xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-500 tracking-tight drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
           NEURAL QUIZ
         </h1>
         <p className="text-base md:text-xl font-mono-cyber text-gray-400 tracking-widest">
           {t.app_subtitle}
         </p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
         <button 
           onClick={() => setView('create_menu')}
           className="group relative bg-black/40 border border-cyan-500/30 p-12 hover:bg-cyan-950/20 transition-all hover:scale-[1.02] hover:border-cyan-400 overflow-hidden"
         >
           <div className="absolute inset-0 bg-cyan-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
           <div className="flex flex-col items-center gap-6 relative z-10">
             <div className="p-6 rounded-full bg-cyan-950/50 border border-cyan-500/50 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all">
               <BrainCircuit className="w-16 h-16 text-cyan-400" />
             </div>
             <div className="text-center">
               <h2 className="text-3xl font-cyber text-white mb-2 group-hover:text-cyan-300">{t.create_quiz}</h2>
               <p className="font-mono text-gray-400 text-sm">{t.create_quiz_desc}</p>
             </div>
           </div>
         </button>

         <button 
           onClick={() => setView('convert_upload')}
           className="group relative bg-black/40 border border-pink-500/30 p-12 hover:bg-pink-950/20 transition-all hover:scale-[1.02] hover:border-pink-400 overflow-hidden"
         >
           <div className="absolute inset-0 bg-pink-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
           <div className="flex flex-col items-center gap-6 relative z-10">
             <div className="p-6 rounded-full bg-pink-950/50 border border-pink-500/50 group-hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all">
               <FileUp className="w-16 h-16 text-pink-400" />
             </div>
             <div className="text-center">
               <h2 className="text-3xl font-cyber text-white mb-2 group-hover:text-pink-300">{t.convert_quiz}</h2>
               <p className="font-mono text-gray-400 text-sm">{t.convert_quiz_desc}</p>
             </div>
           </div>
         </button>
       </div>
    </div>
  );

  const renderCreateMenu = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-300 w-full">
      <CyberButton variant="ghost" onClick={() => setView('home')} className="pl-0 gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t.back_hub}
      </CyberButton>
      
      <h2 className="text-3xl font-cyber text-cyan-400 border-b border-gray-800 pb-4">{t.select_protocol}</h2>

      <div className="grid gap-4">
        <button 
          onClick={() => setView('create_ai')}
          className="flex items-center gap-6 p-6 bg-black/40 border border-gray-700 hover:border-purple-500 hover:bg-purple-950/10 transition-all group text-left"
        >
          <Sparkles className="w-10 h-10 text-purple-400 group-hover:scale-110 transition-transform" />
          <div>
            <h3 className="text-xl font-bold font-cyber text-white">{t.ai_gen}</h3>
            <p className="text-sm font-mono text-gray-400">{t.ai_gen_desc}</p>
          </div>
        </button>

        <button 
          onClick={() => setView('create_manual')}
          className="flex items-center gap-6 p-6 bg-black/40 border border-gray-700 hover:border-cyan-500 hover:bg-cyan-950/10 transition-all group text-left"
        >
          <PenTool className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
          <div>
            <h3 className="text-xl font-bold font-cyber text-white">{t.manual_editor}</h3>
            <p className="text-sm font-mono text-gray-400">{t.manual_editor_desc}</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderCreateAI = () => (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 w-full">
      <CyberButton variant="ghost" onClick={() => setView('create_menu')} className="pl-0 gap-2">
        <ArrowLeft className="w-4 h-4" /> {t.back}
      </CyberButton>

      <CyberCard title={t.neural_config}>
        <div className="space-y-6">
           {/* Step 1: Platform Selection */}
           <div className="border-b border-gray-800 pb-6">
              <div className="flex flex-col gap-2 mb-4">
                  <label className="text-sm font-mono-cyber text-cyan-400/80 uppercase tracking-widest flex items-center gap-2">
                      <Globe className="w-4 h-4" /> {t.select_platform}
                  </label>
                  <p className="text-xs text-gray-500 font-mono">
                      {t.select_platform_desc}
                  </p>
              </div>
              <CyberSelect 
                options={Object.keys(PLATFORM_SPECS).map(key => ({ value: key, label: PLATFORM_SPECS[key].name }))}
                value={targetPlatform}
                onChange={(e) => handlePlatformChange(e.target.value)}
              />
           </div>

           {/* Step 2: Basic Params */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CyberInput 
                label={t.topic_label} 
                placeholder={t.gen_placeholder}
                value={genParams.topic}
                onChange={e => setGenParams({...genParams, topic: e.target.value})}
              />
              <CyberInput 
                label={t.count_label} 
                type="number"
                min={1}
                max={20}
                value={genParams.count}
                onChange={e => setGenParams({...genParams, count: parseInt(e.target.value) || 5})}
              />
              <CyberInput 
                 label={t.age_label}
                 placeholder="e.g. 10 years, University"
                 value={genParams.age}
                 onChange={e => setGenParams({...genParams, age: e.target.value})}
              />
           </div>

           {/* Step 3: Question Types */}
           <div className="space-y-3 bg-black/30 p-4 rounded border border-gray-800">
               <label className="text-sm font-mono-cyber text-cyan-400/80 uppercase tracking-widest block mb-2">
                   {t.select_types}
               </label>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                   {Object.values(QUESTION_TYPES).map((type) => {
                       const isCompatible = PLATFORM_SPECS[targetPlatform].types.includes(type);
                       const isSelected = genParams.types.includes(type);
                       const showWarning = isSelected && !isCompatible;

                       return (
                           <CyberCheckbox 
                               key={type}
                               label={type}
                               checked={isSelected}
                               onChange={() => toggleQuestionType(type)}
                               warning={showWarning}
                           />
                       );
                   })}
               </div>
               {genParams.types.some(t => !PLATFORM_SPECS[targetPlatform].types.includes(t)) && (
                   <div className="flex items-center gap-2 text-yellow-500 text-xs font-mono mt-2 animate-pulse">
                       <AlertTriangle className="w-4 h-4" />
                       <span>{t.incompatible_desc}</span>
                   </div>
               )}
           </div>

           {/* Step 4: Context (Files & Text) */}
           <div className="space-y-4">
             <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
               <FileText className="w-4 h-4 text-pink-400" />
               <span className="text-sm font-mono-cyber text-pink-400">{t.context_label}</span>
             </div>

             {/* Drag & Drop Zone */}
             <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${dragActive ? 'border-pink-400 bg-pink-950/20' : 'border-gray-700 bg-black/20 hover:border-pink-500/50'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => contextFileInputRef.current?.click()}
             >
                 <input 
                    type="file" 
                    multiple 
                    ref={contextFileInputRef} 
                    onChange={handleContextFileInput} 
                    className="hidden" 
                 />
                 <UploadCloud className={`w-10 h-10 ${dragActive ? 'text-pink-400' : 'text-gray-500'}`} />
                 <div>
                    <p className="text-sm text-gray-300 font-bold">{t.drop_file}</p>
                    <p className="text-xs text-gray-500 font-mono">(.txt, .md, .csv, .json, .pdf)</p>
                 </div>
             </div>

             <CyberTextArea 
                placeholder="...or paste text from a website, PDF, or document here manually..."
                value={genParams.context}
                onChange={e => setGenParams({...genParams, context: e.target.value})}
                className="h-32"
             />
           </div>

           {/* Step 5: URLs */}
           <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-mono-cyber text-cyan-400 uppercase tracking-widest">REFERENCE URLS</span>
              </div>
              <CyberTextArea 
                 placeholder="Paste URLs here (one per line or comma separated). The AI will use these as references."
                 value={genParams.urls}
                 onChange={e => setGenParams({...genParams, urls: e.target.value})}
                 className="h-24"
              />
           </div>

           <CyberButton 
             variant="neural" 
             onClick={handleCreateAI}
             isLoading={isGenerating}
             className="w-full h-16 text-lg"
           >
             {t.initiate_gen}
           </CyberButton>
        </div>
      </CyberCard>
    </div>
  );

  const renderConvertUpload = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-300 w-full">
      <CyberButton variant="ghost" onClick={() => setView('home')} className="pl-0 gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t.back_hub}
      </CyberButton>

      <div className="text-center space-y-2 mb-6">
        <h2 className="text-3xl font-cyber text-pink-400">{t.upload_source}</h2>
        <p className="text-gray-400 font-mono">Extract questions from existing files, text, or URLs.</p>
      </div>

      <CyberCard className="border-pink-500/30">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
            <button 
                onClick={() => setConvertTab('upload')}
                className={`flex-1 py-3 font-mono font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${convertTab === 'upload' ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <FileUp className="w-4 h-4" /> UPLOAD
            </button>
            <button 
                onClick={() => setConvertTab('paste')}
                className={`flex-1 py-3 font-mono font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${convertTab === 'paste' ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <ClipboardPaste className="w-4 h-4" /> PASTE
            </button>
            <button 
                onClick={() => setConvertTab('url')}
                className={`flex-1 py-3 font-mono font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${convertTab === 'url' ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <LinkIcon className="w-4 h-4" /> URL
            </button>
        </div>

        {convertTab === 'upload' ? (
            <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center hover:border-pink-500 hover:bg-pink-950/5 transition-all cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-16 h-16 text-pink-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">{t.drop_file}</h3>
                    <p className="text-sm text-gray-500 font-mono">Supports: .CSV, .XLSX, .TXT, .PDF</p>
                    <p className="text-xs text-gray-600 font-mono mt-2">Auto-detection for Kahoot, Socrative, Blooket templates.</p>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv,.xlsx,.xls,.txt,.pdf"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>
        ) : convertTab === 'paste' ? (
            <div className="space-y-4">
                <div className="bg-pink-950/10 border border-pink-900/50 p-3 rounded flex items-start gap-3">
                    <Info className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-pink-200 font-mono">
                        For PDF files: Open your PDF, select all text (Ctrl+A), copy it (Ctrl+C), and paste it below. 
                        The AI will extract the questions automatically.
                    </p>
                </div>
                <CyberTextArea 
                    placeholder="Paste your raw text, PDF content, or webpage content here..."
                    className="h-64 font-mono text-sm"
                    value={textToConvert}
                    onChange={(e) => setTextToConvert(e.target.value)}
                />
                <CyberButton 
                    variant="neural" 
                    className="w-full"
                    onClick={handlePasteAnalysis}
                    disabled={!textToConvert.trim()}
                >
                    <Bot className="w-4 h-4" /> ANALYZE TEXT WITH AI
                </CyberButton>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="bg-pink-950/10 border border-pink-900/50 p-3 rounded flex items-start gap-3">
                    <Globe className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs text-pink-200 font-mono">
                            Paste a public URL from Kahoot, Wayground, Gimkit, etc. 
                            We will attempt to fetch the page content for the AI to analyze.
                        </p>
                        <p className="text-[10px] text-pink-400 font-mono">
                            Note: Some sites block direct access. If this fails, please copy the text from the site manually and use the Paste tab.
                        </p>
                    </div>
                </div>
                <CyberInput 
                    placeholder="https://create.kahoot.it/details/..."
                    value={urlToConvert}
                    onChange={(e) => setUrlToConvert(e.target.value)}
                />
                <CyberButton 
                    variant="neural" 
                    className="w-full"
                    onClick={handleUrlAnalysis}
                    disabled={!urlToConvert.trim()}
                >
                    <Bot className="w-4 h-4" /> SCAN URL WITH AI
                </CyberButton>
            </div>
        )}

      </CyberCard>
    </div>
  );

  const renderAnalysis = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-xl mx-auto gap-8">
       <Bot className="w-24 h-24 text-cyan-400 animate-bounce" />
       <div className="w-full space-y-4">
         <h2 className="text-2xl font-cyber text-center text-white animate-pulse min-h-[64px] flex items-center justify-center px-4">
            {analysisStatus}
         </h2>
         <CyberProgressBar progress={analysisProgress} text="NEURAL PROCESSING" />
       </div>
    </div>
  );

  const renderConvertResult = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-10 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
          {t.completed}
        </h2>
      </div>
      <CyberButton onClick={() => setView('create_manual')}>{t.proceed_editor}</CyberButton>
    </div>
  );

  return (
    <div className="min-h-screen relative text-gray-200 selection:bg-cyan-500/30 transition-colors duration-300 flex flex-col overflow-x-hidden">
      
      {/* New Header */}
      <Header 
          language={language} 
          setLanguage={setLanguage} 
          onHelp={() => setView('help')} // Hook up help button
      />

      <main className="container mx-auto px-4 pb-20 relative z-10 pt-8 flex-1 w-full max-w-7xl">
        <div className="flex justify-end mb-4">
             <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-cyan-400 border border-transparent hover:border-cyan-500/30"
                title={isClassroomMode ? "Switch to Cyber Mode" : "Switch to Classroom Mode"}
             >
                {isClassroomMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
             </button>
        </div>

        <Stepper />
        
        {view === 'help' && <HelpView onBack={() => setView('home')} t={t} />}

        {view === 'home' && renderHome()}
        {view === 'create_menu' && renderCreateMenu()}
        {view === 'create_ai' && renderCreateAI()}
        {view === 'create_manual' && (
          <div className="animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-6">
                <CyberButton variant="ghost" onClick={() => setView('create_menu')}><ArrowLeft className="w-4 h-4 mr-2"/> {t.back}</CyberButton>
                <h2 className="font-cyber text-2xl text-cyan-400">{t.manual_override}</h2>
             </div>
             
             <div className="space-y-12">
                <QuizEditor 
                  quiz={quiz} 
                  setQuiz={setQuiz} 
                  onExport={scrollToExport}
                  showImportOptions={quiz.questions.length === 0}
                  t={t} 
                />
                
                {quiz.questions.length > 0 && (
                   <div ref={exportSectionRef} className="border-t border-gray-800 pt-12">
                      <h3 className="text-2xl font-cyber text-center mb-8 text-white">{t.export_data}</h3>
                      <ExportPanel quiz={quiz} setQuiz={setQuiz} t={t} />
                   </div>
                )}
             </div>
          </div>
        )}
        {view === 'convert_upload' && renderConvertUpload()}
        {view === 'convert_analysis' && renderAnalysis()}
        {view === 'convert_result' && renderConvertResult()}
      </main>

      {/* New Footer */}
      <Footer />

    </div>
  );
};

export default App;