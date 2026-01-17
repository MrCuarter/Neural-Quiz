
import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, Option, ExportFormat, QUESTION_TYPES, PLATFORM_SPECS, UniversalDiscoveryReport } from './types';
import { QuizEditor } from './components/QuizEditor';
import { ExportPanel } from './components/ExportPanel';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HelpView } from './components/HelpView';
import { PrivacyView } from './components/PrivacyView'; 
import { TermsView } from './components/TermsView'; 
import { MyQuizzes } from './components/MyQuizzes'; // NEW IMPORT
import { translations, Language } from './utils/translations';
import { CyberButton, CyberInput, CyberTextArea, CyberSelect, CyberCard, CyberProgressBar, CyberCheckbox } from './components/ui/CyberUI';
import { BrainCircuit, FileUp, Sparkles, PenTool, ArrowLeft, Terminal, Bot, FileText, Globe, Upload, Sun, Moon, ChevronRight, AlertTriangle, Link as LinkIcon, UploadCloud, FilePlus, ClipboardPaste, Info, FileType, Save } from 'lucide-react';
import { generateQuizQuestions, parseRawTextToQuiz, enhanceQuestionsWithOptions } from './services/geminiService';
import { detectAndParseStructure } from './services/importService';
import { extractTextFromPDF } from './services/pdfService';
import { fetchUrlContent, analyzeUrl } from './services/urlService';
import { getRandomMessage, getDetectionMessage } from './services/messageService';
import { auth, onAuthStateChanged, saveQuizToFirestore } from './services/firebaseService'; // FIREBASE IMPORTS
import * as XLSX from 'xlsx';

// Types
type ViewState = 'home' | 'create_menu' | 'create_ai' | 'create_manual' | 'convert_upload' | 'convert_analysis' | 'convert_result' | 'help' | 'privacy' | 'terms' | 'my_quizzes';

const initialQuiz: Quiz = {
  title: '',
  description: '',
  questions: []
};

// Platforms that natively support feedback/explanation fields
const PLATFORMS_WITH_FEEDBACK = [
    ExportFormat.KAHOOT, // Has some limited support via newer features, but useful generally
    ExportFormat.GOOGLE_FORMS,
    ExportFormat.SOCRATIVE,
    ExportFormat.QUIZALIZE,
    ExportFormat.IDOCEO,
    ExportFormat.GENIALLY,
    ExportFormat.WAYGROUND,
    ExportFormat.UNIVERSAL_CSV
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [isClassroomMode, setIsClassroomMode] = useState(false);
  const [language, setLanguage] = useState<Language>('es');
  
  // USER STATE
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Translation Helper
  const t = translations[language];

  // AI Generation State
  const [targetPlatform, setTargetPlatform] = useState('UNIVERSAL');
  const [genParams, setGenParams] = useState<{
    topic: string;
    count: number | string;
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
  const [generationStatus, setGenerationStatus] = useState(''); // New status message for create mode
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

  // MISSING ANSWERS STATE
  const [showMissingAnswersModal, setShowMissingAnswersModal] = useState(false);
  const [tempQuestions, setTempQuestions] = useState<Question[]>([]);
  const [tempQuizInfo, setTempQuizInfo] = useState<{ title: string; desc: string }>({ title: '', desc: '' });
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);

  // Helper for ID generation
  const uuid = () => Math.random().toString(36).substring(2, 9);

  // --- Effects: Persistence & Theme & Auth ---

  useEffect(() => {
    // Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
        setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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

  // --- SAVE / LOAD HANDLERS ---

  const handleSaveQuiz = async (asCopy: boolean = false) => {
      if (!user) {
          alert("Debes iniciar sesión para guardar en la nube.");
          return;
      }
      if (!quiz.title.trim()) {
          alert("El quiz necesita un título para ser guardado.");
          return;
      }

      setIsSaving(true);
      try {
          const docId = await saveQuizToFirestore(quiz, user.uid, asCopy);
          
          // If we saved as copy or new, update the local quiz with the new ID
          if (!quiz.id || asCopy) {
              setQuiz(prev => ({ ...prev, id: docId }));
          }
          
          alert(asCopy ? "Copia guardada con éxito." : "Quiz guardado con éxito.");
      } catch (e) {
          alert("Error al guardar el quiz. Revisa la consola.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleLoadQuiz = (loadedQuiz: Quiz) => {
      setQuiz(loadedQuiz);
      setView('create_manual');
  };

  const handleSafeExit = (targetView: ViewState) => {
      // Warn if leaving editor with unsaved changes (roughly) or content
      if (view === 'create_manual' && quiz.questions.length > 0) {
          if (!confirm("Si sales del editor sin guardar, podrías perder cambios recientes. ¿Continuar?")) {
              return;
          }
      }
      setView(targetView);
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
             alert(`${t.alert_read_error} ${file.name}: ${e.message}`);
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

  // ... (rest of AI and Conversion logic remains same) ...
  const handleCreateAI = async () => {
    if (!genParams.topic.trim() && !genParams.context.trim() && !genParams.urls.trim()) {
      alert(t.alert_topic);
      return;
    }
    
    setIsGenerating(true);
    setGenerationStatus(getRandomMessage('start'));

    // Message rotation
    const genInterval = setInterval(() => {
        setGenerationStatus(getRandomMessage('generate_ai'));
    }, 4000);

    try {
      const langMap: Record<string, string> = {
          'es': 'Spanish', 'en': 'English', 'fr': 'French', 'it': 'Italian', 'de': 'German'
      };
      const selectedLang = langMap[language] || 'Spanish';
      const urlList = genParams.urls.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);

      // TIMEOUT PROMISE: Force fail after 45s
      const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: AI took too long. Try requesting fewer questions or simpler types.")), 45000)
      );

      // Check if platform supports feedback
      const includeFeedback = PLATFORMS_WITH_FEEDBACK.includes(targetPlatform as ExportFormat);

      const apiPromise = generateQuizQuestions({
        topic: genParams.topic,
        count: Number(genParams.count) || 5,
        types: genParams.types,
        age: genParams.age,
        context: genParams.context,
        urls: urlList,
        language: selectedLang,
        includeFeedback
      });

      // Race against timeout
      const generatedQs = await Promise.race([apiPromise, timeoutPromise]) as any[];
      
      const newQuestions: Question[] = generatedQs.map(gq => {
        const qId = uuid();
        const options: Option[] = gq.rawOptions.map((optText: string) => ({ id: uuid(), text: optText }));
        // Handle indices safely
        const indices = gq.correctIndices || [gq.correctIndex || 0];
        const correctIds = indices.map((i: number) => options[i]?.id).filter((id: string) => !!id);
        
        return {
          id: qId,
          text: gq.text,
          options: options,
          correctOptionId: correctIds[0] || "",
          correctOptionIds: correctIds,
          timeLimit: 30,
          feedback: gq.feedback,
          questionType: gq.questionType || QUESTION_TYPES.MULTIPLE_CHOICE
        };
      });

      setQuiz({
        title: genParams.topic || 'AI Generated Quiz',
        description: `Generated for ${genParams.age} - ${targetPlatform}`,
        questions: newQuestions,
        tags: ['AI Generated', targetPlatform] // Auto-tag
      });
      
      setView('create_manual'); 
    } catch (e: any) {
      console.error(e);
      alert(`${t.alert_fail} (${e.message})`);
    } finally {
      setIsGenerating(false);
      clearInterval(genInterval);
    }
  };

  // Centralized cleanup for timers
  const clearAnalysisInterval = () => {
      if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
      }
  };

  interface ImageInput { data: string; mimeType: string; }

  const performAnalysis = async (content: string, sourceName: string, isAlreadyStructured: boolean = false, preParsedQuestions: Question[] = [], imageInput?: ImageInput) => {
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
                
                // Pass image if available
                const generatedQs = await parseRawTextToQuiz(content, selectedLang, imageInput);
                
                return generatedQs.map(gq => {
                  const qId = uuid();
                  const options: Option[] = gq.rawOptions.map(optText => ({ id: uuid(), text: optText }));
                  // Handle indices safely
                  const indices = gq.correctIndices || [gq.correctIndex || 0];
                  const correctIds = indices.map((i: number) => options[i]?.id).filter((id: string) => !!id);

                  return {
                    id: qId,
                    text: gq.text,
                    options: options,
                    correctOptionId: correctIds[0] || "",
                    correctOptionIds: correctIds,
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
            throw new Error(t.alert_no_questions);
        }

        const elapsedNow = Date.now() - startTime;
        if (elapsedNow < MIN_DURATION) {
            await new Promise(r => setTimeout(r, MIN_DURATION - elapsedNow));
        }

        clearAnalysisInterval();
        setAnalysisProgress(100);
        setAnalysisStatus(getRandomMessage('success'));
        
        // --- MISSING ANSWERS CHECK ---
        const missingAnswers = questions.some(q => 
            (q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT) && 
            q.options.filter(o => o.text.trim() !== "").length < 2
        );

        if (missingAnswers) {
             setTempQuestions(questions);
             setTempQuizInfo({
                 title: sourceName,
                 desc: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI'
             });
             // Delay slightly so the user sees "Success" before the modal
             setTimeout(() => setShowMissingAnswersModal(true), 1000);
        } else {
             // Normal flow
             setQuiz({
                title: sourceName,
                description: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI',
                questions: questions,
                tags: ['Imported', isAlreadyStructured ? 'Template' : 'AI']
            });
            setTimeout(() => {
                setView('create_manual');
            }, 1500); 
        }

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

  const handleGenerateMissingAnswers = async () => {
      setIsGeneratingAnswers(true);
      try {
          const langMap: Record<string, string> = { 'es': 'Spanish', 'en': 'English', 'fr': 'French' };
          const enhancedQuestionsRaw = await enhanceQuestionsWithOptions(tempQuestions, langMap[language] || 'Spanish');
          
          const finalQuestions = enhancedQuestionsRaw.map(gq => {
            const qId = gq.id || uuid(); 
            const options: Option[] = gq.rawOptions.map((optText: string) => ({ id: uuid(), text: optText }));
            const indices = gq.correctIndices || [gq.correctIndex || 0];
            const correctIds = indices.map((i: number) => options[i]?.id).filter((id: string) => !!id);
            
            return {
              id: qId,
              text: gq.text,
              options: options,
              correctOptionId: correctIds[0] || "",
              correctOptionIds: correctIds,
              timeLimit: 30,
              feedback: gq.feedback,
              questionType: gq.questionType
            };
          });

          setQuiz({
              ...initialQuiz,
              title: tempQuizInfo.title,
              description: tempQuizInfo.desc,
              questions: finalQuestions,
              tags: ['AI Repair']
          });
          
          setShowMissingAnswersModal(false);
          setView('create_manual');

      } catch (e) {
          alert("Error generating answers.");
      } finally {
          setIsGeneratingAnswers(false);
      }
  };

  const handleSkipMissingAnswers = () => {
      // Load questions as they are (empty options)
      setQuiz({
          ...initialQuiz,
          title: tempQuizInfo.title,
          description: tempQuizInfo.desc,
          questions: tempQuestions
      });
      setShowMissingAnswersModal(false);
      setView('create_manual');
  };

  const processFileForConversion = async (file: File) => {
    // Reset view
    setAnalysisProgress(0);
    
    try {
      // HANDLE IMAGES (OCR)
      if (file.type.startsWith('image/')) {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = async () => {
             const base64String = (reader.result as string).split(',')[1];
             const imageInput: ImageInput = {
                 data: base64String,
                 mimeType: file.type
             };
             // Pass empty content string, relies on image
             await performAnalysis("Image Content", file.name, false, [], imageInput);
         };
         reader.onerror = (error) => {
             throw new Error("Failed to read image file.");
         }
         return; // Logic continues in onload
      }

      // HANDLE EXCEL AND CSV
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
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
      } 
      // HANDLE PDF
      else if (file.name.toLowerCase().endsWith('.pdf')) {
         const pdfText = await extractTextFromPDF(file);
         await performAnalysis(pdfText, file.name);
      } 
      // HANDLE TEXT
      else {
         const content = await file.text();
         await performAnalysis(content, file.name.split('.')[0]);
      }

    } catch (e: any) {
      alert(`${t.alert_read_error}: ${e.message}`);
      clearAnalysisInterval();
    } finally {
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFileForConversion(file);
  };

  const handleConvertDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
          setDragActive(true);
      } else if (e.type === 'dragleave') {
          setDragActive(false);
      }
  };

  const handleConvertDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFileForConversion(file);
  };

  const handlePasteAnalysis = async () => {
      if (!textToConvert.trim()) {
          alert(t.alert_paste_first);
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
        alert(t.alert_valid_url);
        return;
    }
    
    // --- START URL ANALYSIS ---
    setView('convert_analysis');
    setAnalysisStatus("Iniciando escaneo de red neural...");
    setAnalysisProgress(5);

    try {
        // Use the Orchestrator
        const structuredResult = await analyzeUrl(urlToConvert);
        
        if (structuredResult) {
            // SPECIALIZED ADAPTER HIT
            const { quiz: quizData, report } = structuredResult;
            
            setAnalysisProgress(80);
            
            if (report.blockedByBot) {
                setAnalysisStatus("ERROR: Bloqueo Anti-Bot detectado.");
            }

            // Quality Check for Missing Answers
            const missingAnswers = quizData.questions.some(q => q.needsEnhanceAI);
            
            if (missingAnswers) {
                setTempQuestions(quizData.questions);
                setTempQuizInfo({ 
                    title: quizData.title, 
                    desc: `Imported from ${report.platform} (Restricted/Private)` 
                });
                setAnalysisStatus(getRandomMessage('error')); 
                setTimeout(() => setShowMissingAnswersModal(true), 1000);
            } else {
                setAnalysisProgress(100);
                setAnalysisStatus(getRandomMessage('success'));
                setQuiz({ ...quizData, tags: [report.platform, 'Imported'] });
                setTimeout(() => setView('create_manual'), 1000);
            }
        } else {
            // FALLBACK TO GENERIC AI SCRAPING
            setAnalysisStatus("Estructura desconocida. Intentando IA...");
            const content = await fetchUrlContent(urlToConvert);
            await performAnalysis(content, urlToConvert);
        }

    } catch (e: any) {
        console.error(e);
        setAnalysisStatus(getRandomMessage('error'));
        setTimeout(() => {
            setView('convert_upload');
        }, 4000);
    }
  };

  // --- Components ---

  const Stepper = () => {
    let step = 1;
    if (['home', 'create_menu', 'convert_upload', 'help', 'privacy', 'terms', 'my_quizzes'].includes(view)) step = 1;
    if (view === 'create_ai' || view === 'convert_analysis') step = 2;
    if (view === 'create_manual') step = 3;
    if (view === 'convert_result') step = 4;

    const steps = [
        { num: 1, label: 'SETUP' },
        { num: 2, label: 'GENERATE' },
        { num: 3, label: 'EDIT' },
        { num: 4, label: 'EXPORT' }
    ];

    if (['home', 'help', 'privacy', 'terms'].includes(view)) return null;

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

  // --- MISSING ANSWERS MODAL ---
  const renderMissingAnswersModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <CyberCard className="max-w-md w-full border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
              <div className="flex flex-col items-center text-center space-y-6">
                  <div className="p-4 bg-yellow-900/30 rounded-full border border-yellow-500 animate-pulse">
                      <AlertTriangle className="w-12 h-12 text-yellow-400" />
                  </div>
                  <div>
                      <h3 className="text-xl font-cyber text-yellow-400 mb-2">{t.missing_answers_title}</h3>
                      <p className="text-gray-300 font-mono text-sm">{t.missing_answers_desc}</p>
                      <p className="text-white font-bold mt-4 font-mono">{t.missing_answers_ask}</p>
                  </div>
                  <div className="w-full space-y-3">
                      <CyberButton 
                        variant="neural" 
                        className="w-full" 
                        onClick={handleGenerateMissingAnswers}
                        isLoading={isGeneratingAnswers}
                      >
                         {isGeneratingAnswers ? t.generating_answers : t.btn_generate_answers}
                      </CyberButton>
                      <CyberButton 
                        variant="ghost" 
                        className="w-full text-xs" 
                        onClick={handleSkipMissingAnswers}
                        disabled={isGeneratingAnswers}
                      >
                         {t.btn_keep_empty}
                      </CyberButton>
                  </div>
              </div>
          </CyberCard>
      </div>
  );

  // --- Views ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in zoom-in-95 duration-500">
       <div className="text-center space-y-4 mb-8 flex flex-col items-center max-w-2xl">
         <h1 className="text-4xl md:text-7xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-500 tracking-tight drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
           NEURAL QUIZ
         </h1>
         <p className="text-base md:text-xl font-mono-cyber text-gray-400 tracking-widest">
           {t.app_subtitle}
         </p>
         
         <div className="mt-6 p-6 bg-cyan-950/20 border border-cyan-500/30 rounded-lg backdrop-blur-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-20">
                 <BrainCircuit className="w-16 h-16 text-cyan-400" />
             </div>
             <p className="text-gray-300 font-mono text-sm md:text-base leading-relaxed relative z-10">
                 {t.home_description}
             </p>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
         
         {/* Create Column */}
         <div className="flex flex-col gap-2">
            <button 
                onClick={() => setView('create_menu')}
                className="w-full group relative bg-black/40 border border-cyan-500/30 p-12 hover:bg-cyan-950/20 transition-all hover:scale-[1.02] hover:border-cyan-400 overflow-hidden"
            >
                <div className="absolute inset-0 bg-cyan-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="p-6 rounded-full bg-cyan-950/50 border border-cyan-500/50 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all">
                        <BrainCircuit className="w-16 h-16 text-cyan-400" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-cyber text-white mb-2 group-hover:text-cyan-300">{t.create_quiz}</h2>
                        <p className="font-mono text-gray-400 text-sm mb-2">{t.create_quiz_desc}</p>
                    </div>
                </div>
            </button>
            {user && (
                <CyberButton 
                    onClick={() => setView('my_quizzes')} 
                    variant="ghost" 
                    className="w-full text-cyan-400 border border-cyan-900/50 hover:border-cyan-500 hover:bg-cyan-950/30"
                >
                    <Save className="w-4 h-4 mr-2" /> MIS QUIZES GUARDADOS
                </CyberButton>
            )}
         </div>

         {/* Convert Column */}
         <div className="flex flex-col gap-2">
            <button 
                onClick={() => setView('convert_upload')}
                className="w-full group relative bg-black/40 border border-pink-500/30 p-12 hover:bg-pink-950/20 transition-all hover:scale-[1.02] hover:border-pink-400 overflow-hidden"
            >
                <div className="absolute inset-0 bg-pink-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="p-6 rounded-full bg-pink-950/50 border border-pink-500/50 group-hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all">
                        <FileUp className="w-16 h-16 text-pink-400" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-cyber text-white mb-2 group-hover:text-pink-300">{t.convert_quiz}</h2>
                        <p className="font-mono text-gray-400 text-sm mb-2">{t.convert_quiz_desc}</p>
                    </div>
                </div>
            </button>
         </div>
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
          onClick={() => { setQuiz(initialQuiz); setView('create_ai'); }}
          className="flex items-center gap-6 p-6 bg-black/40 border border-gray-700 hover:border-purple-500 hover:bg-purple-950/10 transition-all group text-left"
        >
          <Sparkles className="w-10 h-10 text-purple-400 group-hover:scale-110 transition-transform" />
          <div>
            <h3 className="text-xl font-bold font-cyber text-white">{t.ai_gen}</h3>
            <p className="text-sm font-mono text-gray-400">{t.ai_gen_desc}</p>
          </div>
        </button>

        <button 
          onClick={() => { setQuiz(initialQuiz); setView('create_manual'); }}
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

  // ... (renderCreateAI, renderConvertUpload, renderAnalysis remain largely same) ...
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
                label={`${t.count_label} (Max 100)`} 
                type="number"
                min={1}
                max={100}
                value={genParams.count}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setGenParams({...genParams, count: ''});
                  } else {
                    let num = parseInt(val);
                    if (num > 100) num = 100;
                    setGenParams({...genParams, count: num});
                  }
                }}
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
                placeholder={t.paste_placeholder}
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
           
           {isGenerating && (
                <div className="text-center font-mono text-xs text-purple-400 animate-pulse mt-2">
                    {generationStatus}
                </div>
           )}

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
        <p className="text-gray-400 font-mono">{t.upload_source_subtitle}</p>
      </div>

      <CyberCard className="border-pink-500/30">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
            <button 
                onClick={() => setConvertTab('upload')}
                className={`flex-1 py-3 font-mono font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${convertTab === 'upload' ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <FileUp className="w-4 h-4" /> {t.tab_upload}
            </button>
            <button 
                onClick={() => setConvertTab('paste')}
                className={`flex-1 py-3 font-mono font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${convertTab === 'paste' ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <ClipboardPaste className="w-4 h-4" /> {t.tab_paste}
            </button>
            <button 
                onClick={() => setConvertTab('url')}
                className={`flex-1 py-3 font-mono font-bold flex items-center justify-center gap-2 transition-colors min-w-[120px] ${convertTab === 'url' ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <LinkIcon className="w-4 h-4" /> {t.tab_url}
            </button>
        </div>

        {convertTab === 'upload' ? (
            <div className="space-y-6">
                <div className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${dragActive ? 'border-pink-400 bg-pink-950/20' : 'border-gray-700 hover:border-pink-500 hover:bg-pink-950/5'}`}
                    onDragEnter={handleConvertDrag}
                    onDragLeave={handleConvertDrag}
                    onDragOver={handleConvertDrag}
                    onDrop={handleConvertDrop}
                    onClick={() => fileInputRef.current?.click()}>
                    <Upload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-pink-400' : 'text-pink-500'}`} />
                    <h3 className="text-xl font-bold text-white mb-2">{t.drop_file}</h3>
                    <p className="text-sm text-gray-500 font-mono">{t.supports_fmt}</p>
                    <p className="text-xs text-gray-600 font-mono mt-2">{t.autodetect_fmt}</p>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv,.xlsx,.xls,.txt,.pdf,.png,.jpg,.jpeg,.webp"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>
        ) : convertTab === 'paste' ? (
            <div className="space-y-4">
                <div className="bg-pink-950/10 border border-pink-900/50 p-3 rounded flex items-start gap-3">
                    <Info className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-pink-200 font-mono">
                        {t.paste_instr}
                    </p>
                </div>
                <CyberTextArea 
                    placeholder={t.paste_placeholder}
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
                    <Bot className="w-4 h-4" /> {t.analyze_btn}
                </CyberButton>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="bg-pink-950/10 border border-pink-900/50 p-3 rounded flex items-start gap-3">
                    <Globe className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs text-pink-200 font-mono">
                            {t.url_instr}
                        </p>
                        <p className="text-[10px] text-pink-400 font-mono">
                            {t.url_hint}
                        </p>
                    </div>
                </div>
                <CyberInput 
                    placeholder={t.url_placeholder}
                    value={urlToConvert}
                    onChange={(e) => setUrlToConvert(e.target.value)}
                />
                <CyberButton 
                    variant="neural" 
                    className="w-full"
                    onClick={handleUrlAnalysis}
                    disabled={!urlToConvert.trim()}
                >
                    <Bot className="w-4 h-4" /> {t.scan_btn}
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
          onHelp={() => setView('help')} 
      />

      {/* MODAL */}
      {showMissingAnswersModal && renderMissingAnswersModal()}

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
        
        {view === 'help' && <HelpView onBack={() => handleSafeExit('home')} t={t} />}
        {view === 'privacy' && <PrivacyView onBack={() => handleSafeExit('home')} />}
        {view === 'terms' && <TermsView onBack={() => handleSafeExit('home')} />}
        {view === 'my_quizzes' && user && <MyQuizzes user={user} onBack={() => handleSafeExit('home')} onEdit={handleLoadQuiz} />}

        {view === 'home' && renderHome()}
        {view === 'create_menu' && renderCreateMenu()}
        {view === 'create_ai' && renderCreateAI()}
        {view === 'create_manual' && (
          <div className="animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-6">
                <CyberButton variant="ghost" onClick={() => handleSafeExit('create_menu')}><ArrowLeft className="w-4 h-4 mr-2"/> {t.back}</CyberButton>
                <h2 className="font-cyber text-2xl text-cyan-400">{t.manual_override}</h2>
             </div>
             
             <div className="space-y-12">
                <QuizEditor 
                  quiz={quiz} 
                  setQuiz={setQuiz} 
                  onExport={scrollToExport}
                  onSave={handleSaveQuiz}
                  isSaving={isSaving}
                  user={user}
                  showImportOptions={quiz.questions.length === 0}
                  t={t} 
                />
                
                {quiz.questions.length > 0 && (
                   <div ref={exportSectionRef} className="border-t border-gray-800 pt-12">
                      <h3 className="text-2xl font-cyber text-center mb-8 text-white">{t.export_data}</h3>
                      <ExportPanel quiz={quiz} setQuiz={setQuiz} t={t} initialTargetPlatform={targetPlatform} />
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
      <Footer onPrivacy={() => handleSafeExit('privacy')} onTerms={() => handleSafeExit('terms')} />

    </div>
  );
};

export default App;
