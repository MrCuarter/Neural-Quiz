import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, Option, ExportFormat, QUESTION_TYPES, PLATFORM_SPECS, GameTeam, GameMode, JeopardyConfig } from './types';
import { QuizEditor } from './components/QuizEditor';
import { ExportPanel } from './components/ExportPanel';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HelpView } from './components/HelpView';
import { PrivacyView } from './components/PrivacyView'; 
import { TermsView } from './components/TermsView'; 
import { MyQuizzes } from './components/MyQuizzes'; 
import { GameLobby } from './components/game/GameLobby'; 
import { JeopardyBoard } from './components/game/JeopardyBoard'; 
import { HexConquestGame } from './components/game/HexConquestGame'; 
import { PublicQuizLanding } from './components/PublicQuizLanding'; 
import { translations, Language } from './utils/translations';
import { CyberButton, CyberInput, CyberTextArea, CyberSelect, CyberCard, CyberProgressBar, CyberCheckbox } from './components/ui/CyberUI';
import { BrainCircuit, FileUp, Sparkles, PenTool, ArrowLeft, Link as LinkIcon, UploadCloud, FilePlus, ClipboardPaste, AlertTriangle, Sun, Moon, Gamepad2, Check } from 'lucide-react';
import { generateQuizQuestions, parseRawTextToQuiz, enhanceQuestionsWithOptions } from './services/geminiService';
import { detectAndParseStructure } from './services/importService';
import { extractTextFromPDF } from './services/pdfService';
import { fetchUrlContent, analyzeUrl } from './services/urlService';
import { getRandomMessage, getDetectionMessage } from './services/messageService';
import { auth, onAuthStateChanged, saveQuizToFirestore, signInWithGoogle } from './services/firebaseService';
import * as XLSX from 'xlsx';
import { ToastProvider, useToast } from './components/ui/Toast';

// Types
type ViewState = 'home' | 'create_menu' | 'create_ai' | 'create_manual' | 'convert_upload' | 'convert_analysis' | 'convert_result' | 'help' | 'privacy' | 'terms' | 'my_quizzes' | 'game_lobby' | 'game_board' | 'game_hex' | 'public_view';

const initialQuiz: Quiz = {
  title: '',
  description: '',
  questions: []
};

const PLATFORMS_WITH_FEEDBACK = [
    ExportFormat.KAHOOT,
    ExportFormat.GOOGLE_FORMS,
    ExportFormat.SOCRATIVE,
    ExportFormat.QUIZALIZE,
    ExportFormat.IDOCEO,
    ExportFormat.GENIALLY,
    ExportFormat.WAYGROUND,
    ExportFormat.UNIVERSAL_CSV
];

const DEFAULT_GAME_CONFIG: JeopardyConfig = {
    timer: 20,
    allowNegativePoints: false,
    rows: 5,
    cols: 5,
    usePowerUps: true,
    randomEvents: true,
    catchUpLogic: true,
    distributionMode: 'STANDARD',
    selectedQuestionIds: []
};

// --- MAIN APP COMPONENT (Inner) ---
const NeuralApp: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [isClassroomMode, setIsClassroomMode] = useState(false);
  const [language, setLanguage] = useState<Language>('es');
  
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const t = translations[language] || translations['en'] || translations['es'];
  const toast = useToast();

  // URL Parsing State
  const [sharedQuizId, setSharedQuizId] = useState<string | null>(null);

  // AI Generation State
  const [targetPlatform, setTargetPlatform] = useState('UNIVERSAL');
  const [genParams, setGenParams] = useState<{
    topic: string;
    count: number | string;
    types: string[];
    age: string;
    context: string;
    urls: string; 
  }>({
    topic: '',
    count: 5,
    types: [QUESTION_TYPES.MULTIPLE_CHOICE], 
    age: 'Universal',
    context: '',
    urls: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(''); 
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

  const [showMissingAnswersModal, setShowMissingAnswersModal] = useState(false);
  const [tempQuestions, setTempQuestions] = useState<Question[]>([]);
  const [tempQuizInfo, setTempQuizInfo] = useState<{ title: string; desc: string }>({ title: '', desc: '' });
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);

  // GAME STATE
  const [gameQuiz, setGameQuiz] = useState<Quiz | null>(null);
  const [gameTeams, setGameTeams] = useState<GameTeam[]>([]);
  const [gameConfig, setGameConfig] = useState<JeopardyConfig>(DEFAULT_GAME_CONFIG);

  const uuid = () => Math.random().toString(36).substring(2, 9);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
        setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- URL HANDLER (SHARE LINK) ---
  useEffect(() => {
      // Check for shareId in URL query params
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('shareId');
      if (shareId) {
          setSharedQuizId(shareId);
          setView('public_view');
          // Clean URL without refresh
          window.history.replaceState({}, '', window.location.pathname);
      }
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

  const scrollToExport = () => {
    exportSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePlatformChange = (platformKey: string) => {
      setTargetPlatform(platformKey);
      const validTypes = PLATFORM_SPECS[platformKey].types;
      setGenParams(prev => ({ ...prev, types: validTypes }));
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

  const handleSaveQuiz = async (asCopy: boolean = false) => {
      if (!user) {
          toast.error("Debes iniciar sesión para guardar en la nube.");
          return;
      }
      if (!quiz.title.trim()) {
          toast.warning("El quiz necesita un título para ser guardado.");
          return;
      }

      setIsSaving(true);
      try {
          // Augment with author name for metadata
          const enrichedQuiz = { ...quiz, authorName: user.displayName || "Usuario" };
          const docId = await saveQuizToFirestore(enrichedQuiz, user.uid, asCopy);
          if (!quiz.id || asCopy) {
              setQuiz(prev => ({ ...prev, id: docId }));
          }
          toast.success(asCopy ? "Copia guardada con éxito." : "Quiz guardado con éxito.");
      } catch (e) {
          toast.error("Error al guardar en Firestore. Intenta de nuevo.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleLoadQuiz = (loadedQuiz: Quiz) => {
      setQuiz(loadedQuiz);
      setView('create_manual');
      toast.info("Quiz cargado.");
  };

  const handleSafeExit = (targetView: ViewState) => {
      if (view === 'create_manual' && quiz.questions.length > 0) {
          if (!confirm("Si sales del editor sin guardar, podrías perder cambios recientes. ¿Continuar?")) {
              return;
          }
      }
      setView(targetView);
  };

  // --- GAME LAUNCHERS ---
  const launchPublicGame = (q: Quiz, mode: GameMode) => {
      // Default setup for public launch (quick play)
      const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
      const defaultTeams: GameTeam[] = [
          { id: 't1', name: 'Equipo Rojo', score: 0, inventory: [], usedInventory: [], shielded: false, multiplier: 1, avatarColor: colors[0] },
          { id: 't2', name: 'Equipo Azul', score: 0, inventory: [], usedInventory: [], shielded: false, multiplier: 1, avatarColor: colors[1] }
      ];
      
      setGameQuiz(q);
      setGameTeams(defaultTeams);
      setGameConfig(DEFAULT_GAME_CONFIG);
      
      if (mode === 'HEX_CONQUEST') setView('game_hex');
      else setView('game_board');
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
                 toast.warning(`Skipped ${file.name}: Binary files need manual OCR or copy-paste.`);
             }
          } catch (e: any) {
             console.error("Error reading file", file.name, e);
             toast.error(`${t.alert_read_error} ${file.name}: ${e.message}`);
          }
      }

      if (combinedText) {
          setGenParams(prev => ({
              ...prev,
              context: (prev.context + combinedText).trim()
          }));
          toast.success(`${count} document(s) added to context!`);
      }
  };

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processContextFiles(e.dataTransfer.files); };
  const handleContextFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { processContextFiles(e.target.files); };

  const handleCreateAI = async () => {
    if (!genParams.topic.trim() && !genParams.context.trim() && !genParams.urls.trim()) {
      toast.warning(t.alert_topic);
      return;
    }
    setIsGenerating(true);
    setGenerationStatus(getRandomMessage('start'));
    const genInterval = setInterval(() => {
        setGenerationStatus(getRandomMessage('generate_ai'));
    }, 4000);

    try {
      const langMap: Record<string, string> = { 'es': 'Spanish', 'en': 'English' };
      const selectedLang = langMap[language] || 'Spanish';
      const urlList = genParams.urls.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
      const includeFeedback = PLATFORMS_WITH_FEEDBACK.includes(targetPlatform as ExportFormat);
      
      const generatedQs = await generateQuizQuestions({
        topic: genParams.topic, count: Number(genParams.count) || 5, types: genParams.types, age: genParams.age, context: genParams.context, urls: urlList, language: selectedLang, includeFeedback
      });
      
      const newQuestions = generatedQs.map(gq => ({
          ...gq,
          id: uuid(),
          correctOptionIds: gq.correctOptionIds || (gq.correctOptionId ? [gq.correctOptionId] : []),
      }));

      setQuiz({
        title: genParams.topic || 'AI Generated Quiz', description: `Generated for ${genParams.age} - ${targetPlatform}`, questions: newQuestions, tags: ['AI Generated', targetPlatform] 
      });
      toast.success("Quiz Generated Successfully!");
      setView('create_manual'); 
    } catch (e: any) {
      console.error(e);
      toast.error(`${t.alert_fail} (${e.message})`);
    } finally {
      setIsGenerating(false);
      clearInterval(genInterval);
    }
  };

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
    const MIN_DURATION = 8000; 
    const startTime = Date.now();
    let currentVirtualProgress = 0;
    clearAnalysisInterval();
    
    const processingPromise = (async () => {
        try {
            if (isAlreadyStructured && preParsedQuestions.length > 0) {
                 return preParsedQuestions;
            } else {
                const langMap: Record<string, string> = { 'es': 'Spanish', 'en': 'English' };
                const selectedLang = langMap[language] || 'Spanish';
                const generatedQs = await parseRawTextToQuiz(content, selectedLang, imageInput);
                return generatedQs;
            }
        } catch (e) {
            throw e;
        }
    })();

    progressIntervalRef.current = window.setInterval(() => {
       const elapsed = Date.now() - startTime;
       let targetP = 0;
       if (elapsed < MIN_DURATION) { targetP = (elapsed / MIN_DURATION) * 80; } else { const extraTime = elapsed - MIN_DURATION; const creep = 19 * (1 - Math.exp(-extraTime / 10000)); targetP = 80 + creep; }
       if (targetP > currentVirtualProgress) { currentVirtualProgress = targetP; }
       setAnalysisProgress(currentVirtualProgress);
       if (elapsed > 1000 && elapsed < 1200) { setAnalysisStatus(getDetectionMessage(sourceName, content)); } else if (elapsed > 4000 && elapsed < 4200) { setAnalysisStatus(getRandomMessage('detect_generic')); } else if (elapsed > 6000 && elapsed < 6200) { setAnalysisStatus(getRandomMessage('progress')); }
    }, 100);

    try {
        const questions = await processingPromise;
        if (questions.length === 0) throw new Error(t.alert_no_questions);
        
        const elapsedNow = Date.now() - startTime;
        if (elapsedNow < MIN_DURATION) { await new Promise(r => setTimeout(r, MIN_DURATION - elapsedNow)); }
        
        clearAnalysisInterval();
        setAnalysisProgress(100);
        setAnalysisStatus(getRandomMessage('success'));
        
        const missingAnswers = questions.some(q => (q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT) && q.options.filter(o => o.text.trim() !== "").length < 2);
        
        if (missingAnswers) {
             setTempQuestions(questions);
             setTempQuizInfo({ title: sourceName, desc: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI' });
             setTimeout(() => setShowMissingAnswersModal(true), 1000);
        } else {
             setQuiz({ title: sourceName, description: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI', questions: questions, tags: ['Imported', isAlreadyStructured ? 'Template' : 'AI'] });
             toast.success("Analysis Complete!");
             setTimeout(() => { setView('create_manual'); }, 1500); 
        }
    } catch (error: any) {
        clearAnalysisInterval();
        setAnalysisProgress(0);
        setAnalysisStatus(getRandomMessage('error'));
        console.error(error);
        toast.error(`Analysis Failed: ${error.message}`);
        setTimeout(() => { setView('convert_upload'); }, 4000);
    }
  };

  const handleGenerateMissingAnswers = async () => {
      setIsGeneratingAnswers(true);
      try {
          const langMap: Record<string, string> = { 'es': 'Spanish', 'en': 'English' };
          const enhancedQuestions = await enhanceQuestionsWithOptions(tempQuestions, langMap[language] || 'Spanish');
          setQuiz({ ...initialQuiz, title: tempQuizInfo.title, description: tempQuizInfo.desc, questions: enhancedQuestions, tags: ['AI Repair'] });
          setShowMissingAnswersModal(false);
          setView('create_manual');
          toast.success("Answers generated successfully!");
      } catch (e) {
          toast.error("Error generating answers. Please check quota.");
      } finally {
          setIsGeneratingAnswers(false);
      }
  };

  const handleSkipMissingAnswers = () => {
      setQuiz({ ...initialQuiz, title: tempQuizInfo.title, description: tempQuizInfo.desc, questions: tempQuestions });
      setShowMissingAnswersModal(false);
      setView('create_manual');
  };

  const processFileForConversion = async (file: File) => {
    setAnalysisProgress(0);
    try {
      if (file.type.startsWith('image/')) {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = async () => {
             const base64String = (reader.result as string).split(',')[1];
             const imageInput: ImageInput = { data: base64String, mimeType: file.type };
             await performAnalysis("Image Content", file.name, false, [], imageInput);
         };
         reader.onerror = (error) => { throw new Error("Failed to read image file."); }
         return; 
      }
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const strictQuestions = detectAndParseStructure(workbook);
        if (strictQuestions && strictQuestions.length > 0) {
            await performAnalysis("", file.name.split('.')[0], true, strictQuestions);
        } else {
             let contentToAnalyze = "";
             workbook.SheetNames.forEach(name => { contentToAnalyze += `\n--- SHEET: ${name} ---\n`; contentToAnalyze += XLSX.utils.sheet_to_csv(workbook.Sheets[name]); });
             await performAnalysis(contentToAnalyze, file.name.split('.')[0]);
        }
      } 
      else if (file.name.toLowerCase().endsWith('.pdf')) {
         const pdfText = await extractTextFromPDF(file);
         await performAnalysis(pdfText, file.name);
      } 
      else {
         const content = await file.text();
         await performAnalysis(content, file.name.split('.')[0]);
      }
    } catch (e: any) {
      toast.error(`${t.alert_read_error}: ${e.message}`);
      clearAnalysisInterval();
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFileForConversion(file);
  };

  const handleConvertDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') { setDragActive(true); } else if (e.type === 'dragleave') { setDragActive(false); } };
  const handleConvertDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) processFileForConversion(file); };

  const handlePasteAnalysis = async () => {
      if (!textToConvert.trim()) { toast.warning(t.alert_paste_first); return; }
      const cleaned = textToConvert.replace(/Page \d+ of \d+/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, " "); 
      await performAnalysis(cleaned, "Pasted Content");
  };

  const handleUrlAnalysis = async () => {
    if (!urlToConvert.trim()) { toast.warning(t.alert_valid_url); return; }
    setView('convert_analysis');
    setAnalysisStatus("Iniciando escaneo de red neural...");
    setAnalysisProgress(5);
    try {
        const structuredResult = await analyzeUrl(urlToConvert);
        if (structuredResult) {
            const { quiz: quizData, report } = structuredResult;
            setAnalysisProgress(80);
            if (report.blockedByBot) { 
                setAnalysisStatus("ERROR: Bloqueo Anti-Bot detectado.");
                toast.error("WAF Block: The website blocked the scanner."); 
            }
            const missingAnswers = quizData.questions.some(q => q.needsEnhanceAI);
            if (missingAnswers) {
                setTempQuestions(quizData.questions);
                setTempQuizInfo({ title: quizData.title, desc: `Imported from ${report.platform} (Restricted/Private)` });
                setAnalysisStatus(getRandomMessage('error')); 
                setTimeout(() => setShowMissingAnswersModal(true), 1000);
            } else {
                setAnalysisProgress(100);
                setAnalysisStatus(getRandomMessage('success'));
                setQuiz({ ...quizData, tags: [report.platform, 'Imported'] });
                setTimeout(() => setView('create_manual'), 1000);
            }
        } else {
            setAnalysisStatus("Estructura desconocida. Intentando IA...");
            const content = await fetchUrlContent(urlToConvert);
            await performAnalysis(content, urlToConvert);
        }
    } catch (e: any) {
        console.error(e);
        setAnalysisStatus(getRandomMessage('error'));
        toast.error("URL Analysis Failed. Is the link public?");
        setTimeout(() => { setView('convert_upload'); }, 4000);
    }
  };

  // Stepper
  const Stepper = () => {
    let step = 1;
    if (['home', 'create_menu', 'convert_upload', 'help', 'privacy', 'terms', 'my_quizzes', 'game_lobby', 'game_board', 'game_hex'].includes(view)) step = 1;
    if (view === 'create_ai' || view === 'convert_analysis') step = 2;
    if (view === 'create_manual') step = 3;
    if (view === 'convert_result') step = 4;
    
    // Hide stepper during game or aux views
    if (['home', 'help', 'privacy', 'terms', 'game_board', 'game_hex', 'public_view'].includes(view)) return null;
    
    // Custom label if in game flow
    const isGameFlow = view === 'game_lobby';
    
    const steps = [ { num: 1, label: isGameFlow ? 'LOBBY' : 'SETUP' }, { num: 2, label: isGameFlow ? 'PLAY' : 'GENERATE' }, { num: 3, label: 'EDIT' }, { num: 4, label: 'EXPORT' } ];
    
    return (
        <div className="flex justify-center mb-8 font-mono text-xs tracking-wider">
            <div className="flex items-center gap-2">
                {steps.map((s, idx) => (
                    <div key={s.num} className="flex items-center">
                        <div className={`flex flex-col items-center gap-1 ${step >= s.num ? 'text-cyan-400' : 'text-gray-600'}`}>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${step >= s.num ? 'border-cyan-400 bg-cyan-950/30' : 'border-gray-700'}`}> {s.num} </div>
                            <span>{s.label}</span>
                        </div>
                        {idx < steps.length - 1 && ( <div className={`w-12 h-[1px] mx-2 ${step > s.num ? 'bg-cyan-500' : 'bg-gray-800'}`} /> )}
                    </div>
                ))}
            </div>
        </div>
    );
  };

  const renderMissingAnswersModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <CyberCard className="max-w-md w-full border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
              <div className="flex flex-col items-center text-center space-y-6">
                  <div className="p-4 bg-yellow-900/30 rounded-full border border-yellow-500 animate-pulse"> <AlertTriangle className="w-12 h-12 text-yellow-400" /> </div>
                  <div> <h3 className="text-xl font-cyber text-yellow-400 mb-2">{t.missing_answers_title}</h3> <p className="text-gray-300 font-mono text-sm">{t.missing_answers_desc}</p> <p className="text-white font-bold mt-4 font-mono">{t.missing_answers_ask}</p> </div>
                  <div className="w-full space-y-3">
                      <CyberButton variant="neural" className="w-full" onClick={handleGenerateMissingAnswers} isLoading={isGeneratingAnswers}> {isGeneratingAnswers ? t.generating_answers : t.btn_generate_answers} </CyberButton>
                      <CyberButton variant="ghost" className="w-full text-xs" onClick={handleSkipMissingAnswers} disabled={isGeneratingAnswers}> {t.btn_keep_empty} </CyberButton>
                  </div>
              </div>
          </CyberCard>
      </div>
  );

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-12 animate-in zoom-in-95 duration-500 py-12">
       <div className="text-center space-y-6 max-w-4xl px-4 flex flex-col items-center">
         <h1 className="text-6xl md:text-8xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-500 tracking-tight drop-shadow-[0_0_25px_rgba(6,182,212,0.3)] leading-tight mb-2"> {t.home_title_main} </h1>
         <h3 className="text-xl md:text-2xl font-cyber text-cyan-400 tracking-wider"> {t.home_subtitle_main} </h3>
         <p className="text-base md:text-lg font-mono text-gray-400 font-light max-w-2xl"> {t.home_description} </p>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-6">
         
         <button onClick={() => setView('create_menu')} className="group relative bg-black/40 border border-cyan-900/50 p-8 hover:bg-cyan-950/20 transition-all hover:scale-[1.02] hover:border-cyan-400 overflow-hidden rounded-lg flex flex-col items-center text-center gap-6 h-full"> 
            <div className="absolute inset-0 bg-cyan-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" /> 
            <div className="p-5 rounded-full bg-cyan-950/30 border border-cyan-500/30 group-hover:border-cyan-400 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all"> <BrainCircuit className="w-10 h-10 text-cyan-400" /> </div> 
            <div> <h2 className="text-xl font-cyber text-white mb-2 group-hover:text-cyan-300 tracking-wide">{t.create_quiz}</h2> <p className="font-mono text-gray-500 text-xs">{t.create_quiz_desc}</p> </div> 
         </button>
         
         <button onClick={() => setView('convert_upload')} className="group relative bg-black/40 border border-pink-900/50 p-8 hover:bg-pink-950/20 transition-all hover:scale-[1.02] hover:border-pink-400 overflow-hidden rounded-lg flex flex-col items-center text-center gap-6 h-full"> 
            <div className="absolute inset-0 bg-pink-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" /> 
            <div className="p-5 rounded-full bg-pink-950/30 border border-pink-500/30 group-hover:border-pink-400 group-hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all"> <FileUp className="w-10 h-10 text-pink-400" /> </div> 
            <div> <h2 className="text-xl font-cyber text-white mb-2 group-hover:text-pink-300 tracking-wide">{t.convert_quiz}</h2> <p className="font-mono text-gray-500 text-xs">{t.convert_quiz_desc}</p> </div> 
         </button>

         {/* GAME BUTTON - UNLOCKED FOR ALL */}
         <button onClick={() => setView('game_lobby')} className="group relative bg-black/40 border border-yellow-900/50 p-8 hover:bg-yellow-950/20 transition-all hover:scale-[1.02] hover:border-yellow-400 overflow-hidden rounded-lg flex flex-col items-center text-center gap-6 h-full"> 
            <div className="absolute inset-0 bg-yellow-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" /> 
            <div className="p-5 rounded-full bg-yellow-950/30 border border-yellow-500/30 group-hover:border-yellow-400 group-hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all"> <Gamepad2 className="w-10 h-10 text-yellow-400" /> </div> 
            <div> <h2 className="text-xl font-cyber text-white mb-2 group-hover:text-yellow-300 tracking-wide">JUGAR</h2> <p className="font-mono text-gray-500 text-xs">MODO AULA // JEOPARDY</p> </div> 
         </button>

       </div>
    </div>
  );

  const renderConvertUpload = () => (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500">
       <div className="flex justify-between items-center">
          <CyberButton variant="ghost" onClick={() => setView('home')} className="pl-0 gap-2"><ArrowLeft className="w-4 h-4" /> {t.back_hub}</CyberButton>
          <div className="flex bg-black/40 rounded border border-gray-800 p-1">
              <button onClick={() => setConvertTab('upload')} className={`px-4 py-2 text-xs font-mono font-bold rounded transition-colors flex items-center gap-2 ${convertTab === 'upload' ? 'bg-pink-950 text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}><FileUp className="w-4 h-4" /> {t.tab_upload}</button>
              <button onClick={() => setConvertTab('paste')} className={`px-4 py-2 text-xs font-mono font-bold rounded transition-colors flex items-center gap-2 ${convertTab === 'paste' ? 'bg-pink-950 text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}><ClipboardPaste className="w-4 h-4" /> {t.tab_paste}</button>
              <button onClick={() => setConvertTab('url')} className={`px-4 py-2 text-xs font-mono font-bold rounded transition-colors flex items-center gap-2 ${convertTab === 'url' ? 'bg-pink-950 text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}><LinkIcon className="w-4 h-4" /> {t.tab_url}</button>
          </div>
       </div>

       <CyberCard title={t.upload_source}>
          {convertTab === 'upload' && (
              <div className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer flex flex-col items-center gap-4 ${dragActive ? 'border-pink-400 bg-pink-950/20' : 'border-gray-700 bg-black/20 hover:border-pink-500/50'}`} 
                   onDragEnter={handleConvertDrag} onDragLeave={handleConvertDrag} onDragOver={handleConvertDrag} onDrop={handleConvertDrop} 
                   onClick={() => fileInputRef.current?.click()}>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls,.pdf,image/*,.txt,.md,.json" onChange={handleFileUpload} />
                  <div className="p-4 bg-gray-900 rounded-full border border-gray-700"><UploadCloud className={`w-12 h-12 ${dragActive ? 'text-pink-400' : 'text-gray-500'}`} /></div>
                  <div><h3 className="text-xl font-cyber text-white mb-2">{t.drop_file}</h3><p className="text-sm font-mono text-gray-400">{t.supports_fmt}</p><p className="text-xs text-gray-600 mt-2">{t.autodetect_fmt}</p></div>
              </div>
          )}

          {convertTab === 'paste' && (
              <div className="space-y-4">
                  <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 text-sm text-blue-200 font-mono"><p>{t.paste_instr}</p></div>
                  <CyberTextArea placeholder={t.paste_placeholder} value={textToConvert} onChange={(e) => setTextToConvert(e.target.value)} className="h-64 font-mono text-xs" />
                  <CyberButton variant="neural" onClick={handlePasteAnalysis} disabled={!textToConvert.trim()} className="w-full">{t.analyze_btn}</CyberButton>
              </div>
          )}

          {convertTab === 'url' && (
              <div className="space-y-4">
                  <div className="bg-purple-900/20 border-l-4 border-purple-500 p-4 text-sm text-purple-200 font-mono"><p>{t.url_instr}</p><p className="mt-2 opacity-70 text-xs">{t.url_hint}</p></div>
                  <CyberInput placeholder={t.url_placeholder} value={urlToConvert} onChange={(e) => setUrlToConvert(e.target.value)} />
                  <CyberButton variant="neural" onClick={handleUrlAnalysis} disabled={!urlToConvert.trim()} className="w-full">{t.scan_btn}</CyberButton>
              </div>
          )}
       </CyberCard>
    </div>
  );

  const renderAnalysis = () => (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 rounded-full border-t-2 border-pink-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin reverse duration-1000"></div>
              <div className="absolute inset-0 flex items-center justify-center"><BrainCircuit className="w-12 h-12 text-pink-400 animate-pulse" /></div>
          </div>
          <div>
              <h2 className="text-3xl font-cyber text-white mb-2">{t.processing}</h2>
              <p className="text-pink-400 font-mono text-sm h-6">{analysisStatus}</p>
          </div>
          <div className="w-full max-w-md mx-auto">
              <CyberProgressBar progress={analysisProgress} />
          </div>
      </div>
  );

  const renderConvertResult = () => (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-green-900/30 rounded-full flex items-center justify-center mx-auto border border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
              <Check className="w-12 h-12 text-green-400" />
          </div>
          <div>
              <h2 className="text-3xl font-cyber text-white mb-2">{t.completed}</h2>
              <p className="text-gray-400 font-mono">Los datos han sido extraídos y estructurados con éxito.</p>
          </div>
          <CyberButton onClick={() => setView('create_manual')} variant="neural" className="w-full max-w-sm mx-auto">
              {t.proceed_editor}
          </CyberButton>
      </div>
  );

  const renderCreateMenu = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-300 w-full py-10">
      <CyberButton variant="ghost" onClick={() => setView('home')} className="pl-0 gap-2 mb-4"><ArrowLeft className="w-4 h-4" /> {t.back_hub}</CyberButton>
      <h2 className="text-3xl font-cyber text-cyan-400 border-b border-gray-800 pb-4">{t.select_protocol}</h2>
      <div className="grid gap-4">
        <button onClick={() => { setQuiz(initialQuiz); setView('create_ai'); }} className="flex items-center gap-6 p-6 bg-black/40 border border-gray-700 hover:border-purple-500 hover:bg-purple-950/10 transition-all group text-left rounded"> <Sparkles className="w-10 h-10 text-purple-400 group-hover:scale-110 transition-transform" /> <div><h3 className="text-xl font-bold font-cyber text-white">{t.ai_gen}</h3><p className="text-sm font-mono text-gray-400">{t.ai_gen_desc}</p></div> </button>
        <button onClick={() => { setQuiz(initialQuiz); setView('create_manual'); }} className="flex items-center gap-6 p-6 bg-black/40 border border-gray-700 hover:border-cyan-500 hover:bg-cyan-950/10 transition-all group text-left rounded"> <PenTool className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" /> <div><h3 className="text-xl font-bold font-cyber text-white">{t.manual_editor}</h3><p className="text-sm font-mono text-gray-400">{t.manual_editor_desc}</p></div> </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative text-gray-200 selection:bg-cyan-500/30 transition-colors duration-300 flex flex-col overflow-x-hidden">
      
      <Header language={language} setLanguage={setLanguage} onHelp={() => setView('help')} onMyQuizzes={() => setView('my_quizzes')} />

      {showMissingAnswersModal && renderMissingAnswersModal()}

      <main className="container mx-auto px-4 pb-20 relative z-10 pt-8 flex-1 w-full max-w-7xl">
        <div className="flex justify-end mb-4">
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/10 transition-colors text-cyan-400 border border-transparent hover:border-cyan-500/30" title={isClassroomMode ? "Switch to Cyber Mode" : "Switch to Classroom Mode"}>
                {isClassroomMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
             </button>
        </div>

        <Stepper />
        
        {view === 'help' && <HelpView onBack={() => handleSafeExit('home')} t={t} />}
        {view === 'privacy' && <PrivacyView onBack={() => handleSafeExit('home')} />}
        {view === 'terms' && <TermsView onBack={() => handleSafeExit('home')} />}
        {view === 'my_quizzes' && user && <MyQuizzes user={user} onBack={() => handleSafeExit('home')} onEdit={handleLoadQuiz} />}

        {/* PUBLIC VIEW */}
        {view === 'public_view' && sharedQuizId && (
            <PublicQuizLanding 
                quizId={sharedQuizId}
                currentUser={user}
                onBack={() => {
                    setSharedQuizId(null);
                    window.history.replaceState({}, '', window.location.pathname); // Clear URL
                    setView('home');
                }}
                onPlay={(q, mode) => launchPublicGame(q, mode)}
                onLoginReq={() => {
                    signInWithGoogle().then(u => setUser(u.user)).catch(console.error);
                }}
            />
        )}

        {/* GAME MODULE ROUTES */}
        {view === 'game_lobby' && (
            <GameLobby 
                user={user} 
                onBack={() => setView('home')} 
                onStartGame={(q, teams, mode, config) => {
                    setGameQuiz(q);
                    setGameTeams(teams);
                    setGameConfig(config);
                    // Route based on mode
                    if (mode === 'HEX_CONQUEST') setView('game_hex');
                    else setView('game_board');
                }}
                t={t}
            />
        )}
        
        {view === 'game_board' && gameQuiz && (
            <JeopardyBoard 
                quiz={gameQuiz} 
                initialTeams={gameTeams}
                onExit={() => {
                    if (confirm("¿Seguro que quieres salir de la partida?")) {
                        setView('home');
                        setGameQuiz(null);
                        setGameTeams([]);
                    }
                }}
                gameConfig={gameConfig} // Pass Full Config
            />
        )}

        {view === 'game_hex' && gameQuiz && (
            <HexConquestGame 
                quiz={gameQuiz}
                initialTeams={gameTeams}
                onExit={() => {
                    if (confirm("¿Seguro que quieres salir de Hex Conquest?")) {
                        setView('home');
                        setGameQuiz(null);
                        setGameTeams([]);
                    }
                }}
            />
        )}

        {view === 'home' && renderHome()}
        {view === 'create_menu' && renderCreateMenu()}
        
        {view === 'create_ai' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500 w-full">
                <CyberButton variant="ghost" onClick={() => setView('create_menu')} className="pl-0 gap-2"><ArrowLeft className="w-4 h-4" /> {t.back}</CyberButton>
                <CyberCard title={t.neural_config}>
                    <div className="space-y-6">
                    <div className="border-b border-gray-800 pb-6"><div className="flex flex-col gap-2 mb-4"><label className="text-sm font-mono-cyber text-cyan-400/80 uppercase tracking-widest flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> {t.select_platform}</label><p className="text-xs text-gray-500 font-mono">{t.select_platform_desc}</p></div><CyberSelect options={Object.keys(PLATFORM_SPECS).map(key => ({ value: key, label: PLATFORM_SPECS[key].name }))} value={targetPlatform} onChange={(e) => handlePlatformChange(e.target.value)}/></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><CyberInput label={t.topic_label} placeholder={t.gen_placeholder} value={genParams.topic} onChange={e => setGenParams({...genParams, topic: e.target.value})}/><CyberInput label={`${t.count_label} (Max 100)`} type="number" min={1} max={100} value={genParams.count} onChange={e => { const val = e.target.value; if (val === '') { setGenParams({...genParams, count: ''}); } else { let num = parseInt(val); if (num > 100) num = 100; setGenParams({...genParams, count: num}); } }}/> <CyberInput label={t.age_label} placeholder="e.g. 10 years, University" value={genParams.age} onChange={e => setGenParams({...genParams, age: e.target.value})}/></div>
                    <div className="space-y-3 bg-black/30 p-4 rounded border border-gray-800"><label className="text-sm font-mono-cyber text-cyan-400/80 uppercase tracking-widest block mb-2">{t.select_types}</label><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{Object.values(QUESTION_TYPES).map((type) => { const isCompatible = PLATFORM_SPECS[targetPlatform].types.includes(type); const isSelected = genParams.types.includes(type); const showWarning = isSelected && !isCompatible; return ( <CyberCheckbox key={type} label={type} checked={isSelected} onChange={() => toggleQuestionType(type)} warning={showWarning} /> ); })}</div>{genParams.types.some(t => !PLATFORM_SPECS[targetPlatform].types.includes(t)) && ( <div className="flex items-center gap-2 text-yellow-500 text-xs font-mono mt-2 animate-pulse"><AlertTriangle className="w-4 h-4" /><span>{t.incompatible_desc}</span></div> )}</div>
                    <div className="space-y-4"><div className="flex items-center gap-2 border-b border-gray-800 pb-2"><ArrowLeft className="w-4 h-4 text-pink-400" /><span className="text-sm font-mono-cyber text-pink-400">{t.context_label}</span></div><div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${dragActive ? 'border-pink-400 bg-pink-950/20' : 'border-gray-700 bg-black/20 hover:border-pink-500/50'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => contextFileInputRef.current?.click()}> <input type="file" multiple ref={contextFileInputRef} onChange={handleContextFileInput} className="hidden" /> <UploadCloud className={`w-10 h-10 ${dragActive ? 'text-pink-400' : 'text-gray-500'}`} /> <div><p className="text-sm text-gray-300 font-bold">{t.drop_file}</p><p className="text-xs text-gray-500 font-mono">(.txt, .md, .csv, .json, .pdf)</p></div></div><CyberTextArea placeholder={t.paste_placeholder} value={genParams.context} onChange={e => setGenParams({...genParams, context: e.target.value})} className="h-32"/></div>
                    <div className="space-y-2"><div className="flex items-center gap-2 mb-2"><LinkIcon className="w-4 h-4 text-cyan-400" /><span className="text-sm font-mono-cyber text-cyan-400 uppercase tracking-widest">REFERENCE URLS</span></div><CyberTextArea placeholder="Paste URLs here (one per line or comma separated). The AI will use these as references." value={genParams.urls} onChange={e => setGenParams({...genParams, urls: e.target.value})} className="h-24"/></div>
                    <CyberButton variant="neural" onClick={handleCreateAI} isLoading={isGenerating} className="w-full h-16 text-lg">{t.initiate_gen}</CyberButton>
                    {isGenerating && ( <div className="text-center font-mono text-xs text-purple-400 animate-pulse mt-2">{generationStatus}</div> )}
                    </div>
                </CyberCard>
            </div>
        )}

        {view === 'create_manual' && (
          <div className="animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-6">
                <CyberButton variant="ghost" onClick={() => handleSafeExit('create_menu')}><ArrowLeft className="w-4 h-4 mr-2"/> {t.back}</CyberButton>
                <h2 className="font-cyber text-2xl text-cyan-400">{t.manual_override}</h2>
             </div>
             
             <div className="space-y-12">
                <QuizEditor quiz={quiz} setQuiz={setQuiz} onExport={scrollToExport} onSave={handleSaveQuiz} isSaving={isSaving} user={user} showImportOptions={quiz.questions.length === 0} t={t} />
                {quiz.questions.length > 0 && ( <div ref={exportSectionRef} className="border-t border-gray-800 pt-12"><h3 className="text-2xl font-cyber text-center mb-8 text-white">{t.export_data}</h3><ExportPanel quiz={quiz} setQuiz={setQuiz} t={t} initialTargetPlatform={targetPlatform} /></div> )}
             </div>
          </div>
        )}
        {view === 'convert_upload' && renderConvertUpload()}
        {view === 'convert_analysis' && renderAnalysis()}
        {view === 'convert_result' && renderConvertResult()}
      </main>

      <Footer onPrivacy={() => handleSafeExit('privacy')} onTerms={() => handleSafeExit('terms')} />

    </div>
  );
};

// --- DEFAULT EXPORT WRAPPER ---
const App: React.FC = () => {
    return (
        <ToastProvider>
            <NeuralApp />
        </ToastProvider>
    );
};

export default App;