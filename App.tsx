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
import { CommunityPage } from './components/CommunityPage'; 
import { ArcadePlay } from './components/pages/ArcadePlay'; 
import { LandingV2 } from './components/pages/LandingV2'; // NEW IMPORT
import { translations, Language } from './utils/translations';
import { CyberButton, CyberInput, CyberTextArea, CyberSelect, CyberCard, CyberProgressBar, CyberCheckbox } from './components/ui/CyberUI';
import { BrainCircuit, FileUp, Sparkles, PenTool, ArrowLeft, Link as LinkIcon, UploadCloud, FilePlus, ClipboardPaste, AlertTriangle, Sun, Moon, Gamepad2, Check, Globe, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { generateQuizQuestions, parseRawTextToQuiz, enhanceQuestionsWithOptions } from './services/geminiService';
import { detectAndParseStructure } from './services/importService';
import { extractTextFromPDF } from './services/pdfService';
import { fetchUrlContent, analyzeUrl } from './services/urlService';
import { getRandomMessage, getDetectionMessage } from './services/messageService';
import { auth, onAuthStateChanged, saveQuizToFirestore, signInWithGoogle } from './services/firebaseService';
import { searchImage } from './services/imageService'; 
import * as XLSX from 'xlsx';
import { ToastProvider, useToast } from './components/ui/Toast';

// Types - Added 'landing_v2'
type ViewState = 'home' | 'landing_v2' | 'create_menu' | 'create_ai' | 'create_manual' | 'convert_upload' | 'convert_analysis' | 'convert_result' | 'help' | 'privacy' | 'terms' | 'my_quizzes' | 'game_lobby' | 'game_board' | 'game_hex' | 'public_view' | 'community' | 'arcade_play';

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
    selectedQuestionIds: [],
    categories: []
};

// --- STEPPER COMPONENT ---
const Stepper: React.FC = () => {
    return null; // Placeholder as per requirements
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
  const [arcadeEvalId, setArcadeEvalId] = useState<string | null>(null); // NEW

  // AI Generation State
  const [targetPlatform, setTargetPlatform] = useState('UNIVERSAL');
  const [genParams, setGenParams] = useState<{
    topic: string;
    count: number | string;
    types: string[];
    age: string;
    context: string;
    urls: string; 
    tone: string;
    language: string; // NEW PARAMETER
  }>({
    topic: '',
    count: 5,
    types: [QUESTION_TYPES.MULTIPLE_CHOICE], 
    age: 'Universal',
    context: '',
    urls: '',
    tone: 'Neutral',
    language: 'Spanish' // Default
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(''); 
  const [dragActive, setDragActive] = useState(false);
  const contextFileInputRef = useRef<HTMLInputElement>(null);
  
  // Progress Bar State
  const [genProgress, setGenProgress] = useState(0);
  const [isGenSuccess, setIsGenSuccess] = useState(false);

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

  // --- URL HANDLER (SHARE LINK & ARCADE) ---
  useEffect(() => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      
      // 1. ARCADE PLAY ROUTE (/play/:id)
      if (path.startsWith('/play/')) {
          const evalId = path.split('/play/')[1];
          if (evalId && evalId.length > 0) {
              setArcadeEvalId(evalId);
              setView('arcade_play');
              return; // Stop further checks
          }
      }
      
      // 2. NEW HOME ROUTE (/new-home)
      if (path.startsWith('/new-home')) {
          setView('landing_v2');
          return;
      }

      // 3. SHARE ID QUERY PARAM (?shareId=...)
      const shareId = params.get('shareId');
      if (shareId) {
          setSharedQuizId(shareId);
          setView('public_view');
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

  const handleImportCommunityQuiz = (loadedQuiz: Quiz) => {
      setQuiz({
          ...loadedQuiz,
          id: undefined, // Reset ID so it's a new copy
          title: `Copy of ${loadedQuiz.title}`,
          isPublic: false,
          allowCloning: false
      });
      setView('create_manual');
      toast.success("Quiz copiado al editor.");
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

  const handlePlayFromEditor = (q: Quiz) => {
      if (q.questions.length < 4) {
          toast.warning("Necesitas al menos 4 preguntas para jugar.");
          return;
      }
      setGameQuiz(q); // Prepare it for Lobby
      setView('game_lobby');
  };

  // ... (processContextFiles, handleDrag, handleDrop, handleContextFileInput remain unchanged) ...
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
             toast.error(`${t.alert_read_error} ${file.name}: ${e.message}`);
          }
      }
      if (combinedText) {
          setGenParams(prev => ({ ...prev, context: (prev.context + combinedText).trim() }));
          toast.success(`${count} document(s) added to context!`);
      }
  };
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processContextFiles(e.dataTransfer.files); };
  const handleContextFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { processContextFiles(e.target.files); };

  // ... (handleCreateAI, performAnalysis, etc. remain unchanged) ...
  const handleCreateAI = async () => {
    if (!genParams.topic.trim() && !genParams.context.trim() && !genParams.urls.trim()) { toast.warning(t.alert_topic); return; }
    setIsGenerating(true); setGenProgress(0); setIsGenSuccess(false);
    setGenerationStatus(getRandomMessage('start', language)); 
    const funnyMessageInterval = setInterval(() => { setGenerationStatus(getRandomMessage('generate_ai', language)); }, 3000);
    const qCount = parseInt(String(genParams.count)) || 5;
    const progressTimer = setInterval(() => { setGenProgress(prev => { if (prev >= 90) return prev + 0.05 < 99 ? prev + 0.05 : 99; return prev + (90 / (qCount * 20)); }); }, 100);
    try {
      const selectedLang = genParams.language || 'Spanish'; 
      const urlList = genParams.urls.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
      const includeFeedback = PLATFORMS_WITH_FEEDBACK.includes(targetPlatform as ExportFormat);
      const aiResult = await generateQuizQuestions({ topic: genParams.topic, count: Number(genParams.count) || 5, types: genParams.types, age: genParams.age, context: genParams.context, urls: urlList, language: selectedLang, includeFeedback, tone: genParams.tone });
      const generatedQs = aiResult.questions;
      clearInterval(progressTimer); setGenProgress(100); clearInterval(funnyMessageInterval); setGenerationStatus("Buscando imágenes (Anti-Spoiler)...");
      const enhancedQuestions = await Promise.all(generatedQs.map(async (gq: any) => {
          const qObj = { ...gq, id: uuid(), correctOptionIds: gq.correctOptionIds || (gq.correctOptionId ? [gq.correctOptionId] : []) };
          if (!qObj.imageUrl) { const query = qObj.imageSearchQuery; const imageResult = await searchImage(query, qObj.fallback_category); if (imageResult) { qObj.imageUrl = imageResult.url; if (imageResult.attribution) { qObj.imageCredit = { name: imageResult.attribution.authorName, link: imageResult.attribution.authorUrl, source: imageResult.attribution.sourceName as 'Unsplash' | 'Pexels' | 'Pixabay' }; } } }
          if (qObj.options && Array.isArray(qObj.options)) { for (const opt of qObj.options) { if (opt.imageSearchQuery && !opt.imageUrl) { const optImgResult = await searchImage(opt.imageSearchQuery, 'default'); if (optImgResult) { opt.imageUrl = optImgResult.url; } delete opt.imageSearchQuery; } } }
          return qObj;
      }));
      setQuiz({ title: genParams.topic || 'AI Generated Quiz', description: `Generated for ${genParams.age} - ${targetPlatform}`, questions: enhancedQuestions, tags: aiResult.tags || ['AI Generated', targetPlatform] });
      setIsGenSuccess(true);
      setTimeout(() => { toast.success("Quiz Generated Successfully!"); setView('create_manual'); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsGenSuccess(false); setGenProgress(0); }, 1000);
    } catch (e: any) { console.error(e); toast.error(`${t.alert_fail} (${e.message})`); clearInterval(progressTimer); setGenProgress(0); } finally { clearInterval(funnyMessageInterval); setIsGenerating(false); }
  };

  const clearAnalysisInterval = () => { if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; } };
  interface ImageInput { data: string; mimeType: string; }
  const performAnalysis = async (content: string, sourceName: string, isAlreadyStructured: boolean = false, preParsedQuestions: Question[] = [], imageInput?: ImageInput) => {
    setView('convert_analysis'); setAnalysisProgress(0); setAnalysisStatus(getRandomMessage('start', language)); const MIN_DURATION = 8000; const startTime = Date.now(); let currentVirtualProgress = 0; clearAnalysisInterval();
    const processingPromise = (async () => { try { if (isAlreadyStructured && preParsedQuestions.length > 0) { return preParsedQuestions; } else { const langMap: Record<string, string> = { 'es': 'Spanish', 'en': 'English' }; const selectedLang = langMap[language] || 'Spanish'; const generatedQs = await parseRawTextToQuiz(content, selectedLang, imageInput); return generatedQs; } } catch (e) { throw e; } })();
    progressIntervalRef.current = window.setInterval(() => { const elapsed = Date.now() - startTime; let targetP = 0; if (elapsed < MIN_DURATION) { targetP = (elapsed / MIN_DURATION) * 80; } else { const extraTime = elapsed - MIN_DURATION; const creep = 19 * (1 - Math.exp(-extraTime / 10000)); targetP = 80 + creep; } if (targetP > currentVirtualProgress) { currentVirtualProgress = targetP; } setAnalysisProgress(currentVirtualProgress); if (elapsed > 1000 && elapsed < 1200) { setAnalysisStatus(getDetectionMessage(sourceName, content, language)); } else if (elapsed > 4000 && elapsed < 4200) { setAnalysisStatus(getRandomMessage('detect_generic', language)); } else if (elapsed > 6000 && elapsed < 6200) { setAnalysisStatus(getRandomMessage('progress', language)); } }, 100);
    try { const questions = await processingPromise; if (questions.length === 0) throw new Error(t.alert_no_questions); const elapsedNow = Date.now() - startTime; if (elapsedNow < MIN_DURATION) { await new Promise(r => setTimeout(r, MIN_DURATION - elapsedNow)); } clearAnalysisInterval(); setAnalysisProgress(100); setAnalysisStatus(getRandomMessage('success', language)); const missingAnswers = questions.some(q => (q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT) && q.options.filter(o => o.text.trim() !== "").length < 2); if (missingAnswers) { setTempQuestions(questions); setTempQuizInfo({ title: sourceName, desc: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI' }); setTimeout(() => setShowMissingAnswersModal(true), 1000); } else { setQuiz({ title: sourceName, description: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI', questions: questions, tags: ['Imported', isAlreadyStructured ? 'Template' : 'AI'] }); toast.success("Analysis Complete!"); setTimeout(() => { setView('create_manual'); }, 1500); } } catch (error: any) { clearAnalysisInterval(); setAnalysisProgress(0); setAnalysisStatus(getRandomMessage('error', language)); console.error(error); toast.error(`Analysis Failed: ${error.message}`); setTimeout(() => { setView('convert_upload'); }, 4000); }
  };
  const handleGenerateMissingAnswers = async () => { setIsGeneratingAnswers(true); try { const langMap: Record<string, string> = { 'es': 'Spanish', 'en': 'English' }; const enhancedQuestions = await enhanceQuestionsWithOptions(tempQuestions, langMap[language] || 'Spanish'); setQuiz({ ...initialQuiz, title: tempQuizInfo.title, description: tempQuizInfo.desc, questions: enhancedQuestions, tags: ['AI Repair'] }); setShowMissingAnswersModal(false); setView('create_manual'); toast.success("Answers generated successfully!"); } catch (e) { toast.error("Error generating answers. Please check quota."); } finally { setIsGeneratingAnswers(false); } };
  const handleSkipMissingAnswers = () => { setQuiz({ ...initialQuiz, title: tempQuizInfo.title, description: tempQuizInfo.desc, questions: tempQuestions }); setShowMissingAnswersModal(false); setView('create_manual'); };
  
  // ... (handleFileProcessing, handleConvertDrag, etc. remain unchanged) ...
  const handleFileProcessing = async (file: File) => { if (!file) return; const fileName = file.name; const fileType = file.type; try { if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) { const reader = new FileReader(); reader.onload = (e) => { const data = e.target?.result; if (fileName.endsWith('.csv')) { const wb = XLSX.read(data, { type: 'binary' }); const detectedQuestions = detectAndParseStructure(wb); if (detectedQuestions && detectedQuestions.length > 0) { performAnalysis("", fileName, true, detectedQuestions); } else { performAnalysis(data as string, fileName); } } else { const wb = XLSX.read(data, { type: 'binary' }); const detectedQuestions = detectAndParseStructure(wb); if (detectedQuestions && detectedQuestions.length > 0) { performAnalysis("", fileName, true, detectedQuestions); } else { toast.error(t.alert_no_valid_csv); } } }; if (fileName.endsWith('.csv')) reader.readAsText(file); else reader.readAsBinaryString(file); return; } if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) { const text = await extractTextFromPDF(file); performAnalysis(text, fileName); return; } if (fileType.startsWith('image/')) { const reader = new FileReader(); reader.onload = (e) => { const base64 = e.target?.result as string; const base64Data = base64.split(',')[1]; performAnalysis("Extract questions from this image", fileName, false, [], { data: base64Data, mimeType: fileType }); }; reader.readAsDataURL(file); return; } if (fileType.startsWith('text/') || fileName.endsWith('.json') || fileName.endsWith('.md') || fileName.endsWith('.txt')) { const text = await file.text(); performAnalysis(text, fileName); return; } toast.error(t.alert_read_error || "Unsupported file type"); } catch (e: any) { console.error(e); toast.error(`${t.alert_read_error}: ${e.message}`); } };
  const handleConvertDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') { setDragActive(true); } else if (e.type === 'dragleave') { setDragActive(false); } };
  const handleConvertDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { handleFileProcessing(e.dataTransfer.files[0]); } };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) { handleFileProcessing(e.target.files[0]); } };
  const handlePasteAnalysis = () => { if (!textToConvert.trim()) { toast.warning(t.alert_paste_first); return; } performAnalysis(textToConvert, "Pasted Text"); };
  const handleUrlAnalysis = async () => { if (!urlToConvert.trim()) { toast.warning(t.alert_valid_url); return; } const url = urlToConvert.trim(); setView('convert_analysis'); setAnalysisProgress(10); setAnalysisStatus("Analyzing URL..."); try { const structuredResult = await analyzeUrl(url); if (structuredResult) { setAnalysisProgress(100); setQuiz(structuredResult.quiz); if (structuredResult.report.missing.options || structuredResult.report.missing.correct) { setTempQuestions(structuredResult.quiz.questions); setTempQuizInfo({ title: structuredResult.quiz.title, desc: structuredResult.quiz.description }); setTimeout(() => setShowMissingAnswersModal(true), 1000); } else { toast.success("Quiz imported successfully!"); setTimeout(() => setView('create_manual'), 1000); } return; } setAnalysisStatus("Fetching content for AI analysis..."); const content = await fetchUrlContent(url); await performAnalysis(content, "URL Import"); } catch (e: any) { console.error(e); toast.error(`URL Analysis failed: ${e.message}`); setView('convert_upload'); } };

  const renderMissingAnswersModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <CyberCard className="max-w-md w-full border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
              <div className="flex flex-col items-center text-center space-y-6">
                  <div className="p-4 bg-yellow-900/30 rounded-full border border-yellow-500 animate-pulse"> <AlertTriangle className="w-12 h-12 text-yellow-400" /> </div>
                  <div> <h3 className="text-xl font-bold text-white mb-2">{t.missing_answers_title}</h3> <p className="text-sm text-gray-400 font-mono">{t.missing_answers_desc}</p> </div>
                  <div className="bg-black/40 p-4 rounded border border-gray-700 text-left w-full"> <p className="text-xs text-cyan-400 mb-2 font-bold font-mono">AI DIAGNOSTIC:</p> <ul className="list-disc list-inside text-xs text-gray-300 space-y-1"> <li>Platform: Protected Source</li> <li>Question Text: Recovered</li> <li>Answers: Hidden/Obfuscated</li> </ul> </div>
                  <p className="text-sm font-bold text-white">{t.missing_answers_ask}</p>
                  <div className="flex flex-col gap-3 w-full">
                      <CyberButton onClick={handleGenerateMissingAnswers} isLoading={isGeneratingAnswers} className="w-full justify-center"> <BrainCircuit className="w-4 h-4 mr-2" /> {t.btn_generate_answers} </CyberButton>
                      <CyberButton variant="ghost" onClick={handleSkipMissingAnswers} disabled={isGeneratingAnswers} className="w-full justify-center text-gray-500 hover:text-white"> {t.btn_keep_empty} </CyberButton>
                  </div>
              </div>
          </CyberCard>
      </div>
  );

  if (view === 'arcade_play' && arcadeEvalId) {
      return (
          <ArcadePlay evaluationId={arcadeEvalId} />
      );
  }

  // --- NEW: LANDING V2 RENDER ---
  if (view === 'landing_v2') {
      return (
          <div className="flex flex-col bg-[#020617] text-white overflow-x-hidden min-h-screen">
              <Header 
                language={language} 
                setLanguage={setLanguage} 
                onHelp={() => handleSafeExit('help')} 
                onMyQuizzes={() => handleSafeExit('my_quizzes')}
                onHome={() => handleSafeExit('home')}
              />
              <LandingV2 onNavigate={(targetView: string) => setView(targetView as ViewState)} />
              <Footer onPrivacy={() => setView('privacy')} onTerms={() => setView('terms')} />
          </div>
      );
  }

  return (
    <div className="flex flex-col bg-[#020617] text-white overflow-x-hidden">
      <Header 
        language={language} 
        setLanguage={setLanguage} 
        onHelp={() => handleSafeExit('help')} 
        onMyQuizzes={() => handleSafeExit('my_quizzes')}
        onHome={() => handleSafeExit('home')}
      />
      
      {showMissingAnswersModal && renderMissingAnswersModal()}

      <main className="min-h-screen flex flex-col p-4 md:p-8 relative z-10 w-full max-w-[1920px] mx-auto">
        <Stepper />

        {/* HOME VIEW (CLASSIC) */}
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700 py-12 relative">
            
            {/* TEMPORARY BUTTON TO SWITCH TO V2 */}
            <div className="absolute top-0 right-0 md:top-4 md:right-4 z-50">
                <button 
                    onClick={() => setView('landing_v2')}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform"
                >
                    <LayoutTemplate className="w-4 h-4" /> 🛠️ VER NUEVA LANDING
                </button>
            </div>

            <div className="text-center space-y-6 max-w-4xl relative">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
              <h2 className="text-sm md:text-base font-mono text-cyan-400 tracking-[0.3em] uppercase">{t.app_subtitle}</h2>
              <h1 className="text-6xl md:text-8xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                {t.home_title_main}
              </h1>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl font-light">{t.home_subtitle_main}</p>
              
              <div className="pt-4 flex justify-center">
                  <button 
                      onClick={() => setView('community')}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 border border-gray-700 hover:border-cyan-500 hover:text-cyan-400 transition-all group"
                  >
                      <Globe className="w-5 h-5 group-hover:animate-spin-slow" />
                      <span className="font-mono text-sm tracking-widest">EXPLORAR COMUNIDAD</span>
                  </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl">
              <CyberCard className="group hover:border-cyan-500/50 hover:bg-cyan-950/10 transition-all duration-300 cursor-pointer h-full" onClick={() => setView('create_menu')}>
                <div className="flex flex-col h-full space-y-4">
                  <div className="p-4 bg-cyan-950/30 rounded-full w-fit group-hover:scale-110 transition-transform duration-300 border border-cyan-500/30">
                    <BrainCircuit className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-cyber text-white group-hover:text-cyan-300 mb-2">{t.create_quiz}</h3>
                    <p className="text-cyan-400/80 font-mono text-xs uppercase tracking-wider mb-3">{t.create_quiz_desc}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{t.create_quiz_help}</p>
                  </div>
                </div>
              </CyberCard>

              <CyberCard className="group hover:border-pink-500/50 hover:bg-pink-950/10 transition-all duration-300 cursor-pointer h-full" onClick={() => setView('convert_upload')}>
                <div className="flex flex-col h-full space-y-4">
                  <div className="p-4 bg-pink-950/30 rounded-full w-fit group-hover:scale-110 transition-transform duration-300 border border-pink-500/30">
                    <FileUp className="w-8 h-8 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-cyber text-white group-hover:text-pink-300 mb-2">{t.convert_quiz}</h3>
                    <p className="text-pink-400/80 font-mono text-xs uppercase tracking-wider mb-3">{t.convert_quiz_desc}</p>
                    <p className="text-gray-400 text-sm leading-relaxed">{t.convert_quiz_help}</p>
                  </div>
                </div>
              </CyberCard>

              <CyberCard className="group hover:border-yellow-500/50 hover:bg-yellow-950/10 transition-all duration-300 cursor-pointer h-full" onClick={() => { setGameQuiz(null); setView('game_lobby'); }}>
                <div className="flex flex-col h-full space-y-4">
                  <div className="p-4 bg-yellow-950/30 rounded-full w-fit group-hover:scale-110 transition-transform duration-300 border border-yellow-500/30">
                    <Gamepad2 className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-cyber text-white group-hover:text-yellow-300 mb-2">NEURAL ARCADE</h3>
                    <p className="text-yellow-400/80 font-mono text-xs uppercase tracking-wider mb-3">JEOPARDY // HEX // BOSS BATTLE</p>
                    <p className="text-gray-400 text-sm leading-relaxed">Lanza juegos en vivo (Teams) o crea retos individuales arcade (Boss/Time Attack).</p>
                  </div>
                </div>
              </CyberCard>
            </div>
          </div>
        )}

        {/* ... rest of the app ... */}
        {/* --- AUXILIARY VIEWS --- */}
        {view === 'community' && <CommunityPage onBack={() => setView('home')} onPlay={(q) => handlePlayFromEditor(q)} onImport={handleImportCommunityQuiz} />}
        {view === 'help' && <HelpView onBack={() => setView('home')} t={t} />}
        {view === 'privacy' && <PrivacyView onBack={() => setView('home')} />}
        {view === 'terms' && <TermsView onBack={() => setView('home')} />}
        {view === 'my_quizzes' && <MyQuizzes user={user} onBack={() => setView('home')} onEdit={handleLoadQuiz} />}
        {view === 'public_view' && sharedQuizId && <PublicQuizLanding quizId={sharedQuizId} currentUser={user} onPlay={launchPublicGame} onBack={() => setView('home')} onLoginReq={signInWithGoogle} />}

        {/* --- CREATION FLOW --- */}
        {view === 'create_menu' && (
            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-right-10 duration-500">
                <CyberButton variant="ghost" onClick={() => setView('home')} className="pl-0 gap-2"><ArrowLeft className="w-4 h-4" /> {t.back_hub}</CyberButton>
                <h2 className="text-3xl font-cyber text-center mb-8">{t.select_protocol}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => setView('create_ai')} className="group relative overflow-hidden bg-black/40 border border-gray-800 hover:border-purple-500 rounded-xl p-8 text-left transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity"><Sparkles className="w-24 h-24 text-purple-500" /></div>
                        <h3 className="text-2xl font-bold font-cyber text-purple-400 mb-2 group-hover:text-purple-300">{t.ai_gen}</h3>
                        <p className="text-gray-400 font-mono text-sm">{t.ai_gen_desc}</p>
                    </button>
                    <button onClick={() => { setQuiz(initialQuiz); setView('create_manual'); }} className="group relative overflow-hidden bg-black/40 border border-gray-800 hover:border-cyan-500 rounded-xl p-8 text-left transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity"><PenTool className="w-24 h-24 text-cyan-500" /></div>
                        <h3 className="text-2xl font-bold font-cyber text-cyan-400 mb-2 group-hover:text-cyan-300">{t.manual_editor}</h3>
                        <p className="text-gray-400 font-mono text-sm">{t.manual_editor_desc}</p>
                    </button>
                </div>
            </div>
        )}

        {/* ... (Existing views logic: create_ai, create_manual, convert_upload, etc.) ... */}
        {view === 'create_ai' && (
            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
                {/* ... existing create_ai content ... */}
                <div className="flex items-center gap-4">
                     <button onClick={() => setView('create_menu')} className="group flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors uppercase font-mono font-bold tracking-widest text-sm">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        ATRÁS
                    </button>
                </div>

                <div className="inline-block border border-cyan-500/30 bg-cyan-900/10 px-4 py-1">
                    <span className="text-cyan-400 font-mono text-sm tracking-widest uppercase">CONFIGURACIÓN NEURAL</span>
                </div>

                <CyberCard className="border-cyan-500/20 p-8 space-y-8">
                    {/* ... (Create AI Card Content) ... */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                            <h3 className="font-mono font-bold text-lg">1. SELECCIONA PLATAFORMA DESTINO</h3>
                        </div>
                        <p className="text-gray-500 text-xs font-mono">No te preocupes, podrás exportar a otras plataformas después.</p>
                        
                        <CyberSelect 
                            options={Object.entries(PLATFORM_SPECS).map(([key, spec]) => ({ value: key, label: spec.name }))}
                            value={targetPlatform}
                            onChange={(e) => handlePlatformChange(e.target.value)}
                            className="h-14 text-lg"
                        />
                    </div>

                    <div className="h-px bg-gray-800 w-full" />

                    {/* TOPIC, COUNT & TONE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">TEMA / ASUNTO</label>
                            <CyberInput 
                                value={genParams.topic} 
                                onChange={(e) => setGenParams({...genParams, topic: e.target.value})} 
                                placeholder="Ej. 'Historia de Roma', 'Física Cuántica'"
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">NÚMERO DE PREGUNTAS (MAX 50)</label>
                            <CyberInput 
                                type="number"
                                value={genParams.count} 
                                onChange={(e) => setGenParams({...genParams, count: e.target.value})} 
                                className="h-12 font-mono text-lg"
                                min={1} max={50}
                            />
                        </div>
                    </div>

                    {/* AGE & TONE & LANGUAGE */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">EDAD / NIVEL</label>
                            <CyberSelect 
                                options={['Universal', 'Primary (6-12)', 'Secondary (12-16)', 'High School (16-18)', 'University', 'Professional'].map(v => ({ value: v, label: v }))}
                                value={genParams.age} 
                                onChange={(e) => setGenParams({...genParams, age: e.target.value})}
                                className="h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">IDIOMA</label>
                             <CyberSelect 
                                options={[
                                    { value: 'Spanish', label: '🇪🇸 Español' },
                                    { value: 'English', label: '🇬🇧 English' },
                                    { value: 'French', label: '🇫🇷 Français' },
                                    { value: 'German', label: '🇩🇪 Deutsch' },
                                    { value: 'Italian', label: '🇮🇹 Italiano' },
                                    { value: 'Portuguese', label: '🇵🇹 Português' },
                                    { value: 'Catalan', label: '🏴 Catalan' },
                                    { value: 'Basque', label: '🏴 Euskera' },
                                    { value: 'Galician', label: '🏴 Galego' }
                                ]}
                                value={genParams.language} 
                                onChange={(e) => setGenParams({...genParams, language: e.target.value})}
                                className="h-12"
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
                                    { value: 'Sarcástico', label: '😏 Sarcástico / Ingenioso' }
                                ]}
                                value={genParams.tone} 
                                onChange={(e) => setGenParams({...genParams, tone: e.target.value})}
                                className="h-12 border-purple-500/50 text-purple-200"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-gray-800 w-full" />

                    {/* 2. TYPES - SPLIT INTO GROUPS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <h3 className="font-mono font-bold text-lg">2. SELECCIONA TIPOS DE PREGUNTA</h3>
                        </div>
                        
                        <div className="space-y-6">
                            {/* GROUP 1: VALIDATED */}
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

                            {/* GROUP 2: NON-VALIDATED */}
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

                    <div className="h-px bg-gray-800 w-full" />

                    {/* CONTEXT */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-pink-400">
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                            <h3 className="font-mono font-bold text-lg">MATERIAL DE CONTEXTO (OPCIONAL)</h3>
                        </div>
                        
                        <div 
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:bg-white/5 ${dragActive ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700'}`}
                            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                            onClick={() => contextFileInputRef.current?.click()}
                        >
                            <UploadCloud className="w-12 h-12 mx-auto text-gray-600 mb-2" />
                            <p className="text-gray-300 font-bold">ARRASTRA O HAZ CLIC</p>
                            <p className="text-xs text-gray-500">(.txt, .md, .csv, .json, .pdf)</p>
                            <input type="file" ref={contextFileInputRef} className="hidden" accept=".pdf,.txt,.md,.json,.csv" onChange={handleContextFileInput} multiple />
                        </div>

                        <CyberTextArea 
                            value={genParams.context} 
                            onChange={(e) => setGenParams({...genParams, context: e.target.value})} 
                            placeholder="Pega tu texto sin formato, contenido de PDF o contenido web aquí..."
                            className="h-32 font-mono text-sm"
                        />
                        
                         <CyberInput 
                            placeholder="O pega URLs de referencia..." 
                            value={genParams.urls} 
                            onChange={(e) => setGenParams({...genParams, urls: e.target.value})} 
                        />
                    </div>

                    <CyberButton 
                        onClick={handleCreateAI} 
                        isLoading={isGenerating} 
                        className={`w-full h-16 text-xl font-cyber tracking-widest mt-8 transition-colors duration-500 ${isGenSuccess ? 'bg-green-600 hover:bg-green-500 border-green-400' : ''}`}
                    >
                        {isGenSuccess ? <><CheckCircle2 className="w-6 h-6 mr-2 animate-bounce" /> ¡PROCESO FINALIZADO!</> : t.initiate_gen}
                    </CyberButton>

                    {isGenerating && (
                        <div className="mt-4 space-y-3">
                            <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                                    style={{ width: `${genProgress}%` }}
                                />
                            </div>
                            
                            <div className="text-center">
                                <p className="font-mono text-sm md:text-base text-cyan-300 animate-pulse">
                                    <span className="opacity-50 mr-2">[{Math.floor(genProgress)}%]</span>
                                    {generationStatus}
                                </p>
                            </div>
                        </div>
                    )}

                </CyberCard>
            </div>
        )}

        {view === 'create_manual' && (
            <>
                <div className="max-w-6xl mx-auto w-full mb-6">
                    <CyberButton variant="ghost" onClick={() => handleSafeExit('home')} className="pl-0 gap-2"><ArrowLeft className="w-4 h-4" /> {t.back_hub}</CyberButton>
                </div>
                <div className="max-w-6xl mx-auto w-full">
                    <QuizEditor 
                        quiz={quiz} 
                        setQuiz={setQuiz} 
                        onExport={() => scrollToExport()} 
                        onSave={handleSaveQuiz} 
                        isSaving={isSaving} 
                        user={user} 
                        t={t}
                        onPlay={handlePlayFromEditor} 
                        currentLanguage={language} 
                    />
                    <div ref={exportSectionRef} className="mt-12 pt-12 border-t border-gray-800">
                        <ExportPanel quiz={quiz} setQuiz={setQuiz} t={t} initialTargetPlatform={targetPlatform} />
                    </div>
                </div>
            </>
        )}

        {/* ... (Existing views for convert_upload, convert_analysis, game_lobby, etc. are identical) ... */}
        {view === 'convert_upload' && (
            <div className="max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-right-10 duration-500">
                <CyberButton variant="ghost" onClick={() => setView('home')} className="pl-0 gap-2"><ArrowLeft className="w-4 h-4" /> {t.back_hub}</CyberButton>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-cyber text-pink-400">{t.upload_source}</h2>
                    <p className="text-gray-500 font-mono text-sm">{t.upload_source_subtitle}</p>
                </div>

                <CyberCard className="border-pink-500/30 min-h-[400px] flex flex-col">
                    <div className="flex border-b border-gray-800 mb-6">
                        <button onClick={() => setConvertTab('upload')} className={`flex-1 py-3 text-xs font-bold font-mono transition-colors ${convertTab === 'upload' ? 'text-pink-400 border-b-2 border-pink-500 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}>{t.tab_upload}</button>
                        <button onClick={() => setConvertTab('paste')} className={`flex-1 py-3 text-xs font-bold font-mono transition-colors ${convertTab === 'paste' ? 'text-pink-400 border-b-2 border-pink-500 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}>{t.tab_paste}</button>
                        <button onClick={() => setConvertTab('url')} className={`flex-1 py-3 text-xs font-bold font-mono transition-colors ${convertTab === 'url' ? 'text-pink-400 border-b-2 border-pink-500 bg-pink-950/20' : 'text-gray-500 hover:text-gray-300'}`}>{t.tab_url}</button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        {convertTab === 'upload' && (
                            <div 
                                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${dragActive ? 'border-pink-400 bg-pink-900/20' : 'border-gray-700 hover:border-gray-500'}`}
                                onDragEnter={handleConvertDrag} onDragLeave={handleConvertDrag} onDragOver={handleConvertDrag} onDrop={handleConvertDrop}
                            >
                                <FilePlus className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-pink-400' : 'text-gray-600'}`} />
                                <p className="text-gray-300 font-bold mb-2">{t.drop_file}</p>
                                <p className="text-xs text-gray-500 mb-6">{t.supports_fmt}</p>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv,.pdf,.txt,.md,.json,.png,.jpg,.jpeg,.webp" onChange={handleFileUpload} />
                                <CyberButton variant="secondary" onClick={() => fileInputRef.current?.click()}>{t.tab_upload}</CyberButton>
                                <p className="text-[10px] text-gray-600 mt-4">{t.autodetect_fmt}</p>
                            </div>
                        )}

                        {convertTab === 'paste' && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded text-xs text-blue-200">
                                    <p><strong>💡 Tip:</strong> {t.paste_instr}</p>
                                </div>
                                <textarea 
                                    value={textToConvert} 
                                    onChange={(e) => setTextToConvert(e.target.value)} 
                                    placeholder={t.paste_placeholder}
                                    className="flex-1 w-full bg-black/40 border border-gray-700 rounded p-4 text-sm font-mono text-gray-300 focus:border-pink-500 outline-none resize-none min-h-[300px]"
                                />
                                <CyberButton onClick={handlePasteAnalysis} className="w-full"><ClipboardPaste className="w-4 h-4 mr-2"/> {t.analyze_btn}</CyberButton>
                            </div>
                        )}

                        {convertTab === 'url' && (
                            <div className="space-y-6 text-center max-w-lg mx-auto">
                                <LinkIcon className="w-16 h-16 mx-auto text-gray-700" />
                                <div className="text-left space-y-2">
                                    <p className="text-sm text-gray-300">{t.url_instr}</p>
                                    <p className="text-xs text-gray-500 italic">{t.url_hint}</p>
                                </div>
                                <CyberInput value={urlToConvert} onChange={(e) => setUrlToConvert(e.target.value)} placeholder={t.url_placeholder} />
                                <CyberButton onClick={handleUrlAnalysis} className="w-full"><BrainCircuit className="w-4 h-4 mr-2"/> {t.scan_btn}</CyberButton>
                            </div>
                        )}
                    </div>
                </CyberCard>
            </div>
        )}

        {view === 'convert_analysis' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-800"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                    <BrainCircuit className="absolute inset-0 m-auto w-10 h-10 text-pink-500 animate-pulse" />
                </div>
                <div className="w-full max-w-md space-y-2 text-center">
                    <h2 className="text-2xl font-cyber text-white">{t.processing}</h2>
                    <p className="text-pink-400 font-mono text-sm animate-pulse">{analysisStatus}</p>
                    <CyberProgressBar progress={analysisProgress} />
                </div>
            </div>
        )}

        {view === 'game_lobby' && (
            <GameLobby 
                user={user} 
                onBack={() => setView('home')} 
                onStartGame={(q, teams, mode, config) => {
                    setGameQuiz(q);
                    setGameTeams(teams);
                    setGameConfig(config);
                    if (mode === 'HEX_CONQUEST') setView('game_hex');
                    else setView('game_board');
                }}
                t={t}
                preSelectedQuiz={gameQuiz}
                language={language} 
            />
        )}

        {view === 'game_board' && gameQuiz && (
            <JeopardyBoard 
                quiz={gameQuiz} 
                initialTeams={gameTeams} 
                onExit={() => setView('game_lobby')} 
                gameConfig={gameConfig}
            />
        )}

        {view === 'game_hex' && gameQuiz && (
            <HexConquestGame 
                quiz={gameQuiz} 
                initialTeams={gameTeams} 
                onExit={() => setView('game_lobby')} 
            />
        )}

      </main>
      <Footer onPrivacy={() => setView('privacy')} onTerms={() => setView('terms')} />
    </div>
  );
};

export default NeuralApp;