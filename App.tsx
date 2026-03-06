
import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, Option, ExportFormat, QUESTION_TYPES, PLATFORM_SPECS, GameTeam, GameMode, JeopardyConfig } from './types';
import { ExportPanel } from './components/ExportPanel';
import { ExportHub } from './components/pages/ExportHub'; 
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
import { LandingV2 } from './components/pages/LandingV2'; 
import { NewCreator } from './components/pages/NewCreator'; // NEW IMPORT
import { OldLanding } from './components/pages/OldLanding'; 
import { TeacherHub } from './components/pages/TeacherHub'; 
import { ClassesManager } from './components/pages/ClassesManager'; 
import { RaidDashboard } from './components/pages/live/RaidDashboard'; 
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

// Types
type ViewState = 'home' | 'old_home' | 'teacher_hub' | 'classes_manager' | 'create_menu' | 'create_ai' | 'create_manual' | 'new_creator' | 'export_hub' | 'convert_upload' | 'convert_analysis' | 'convert_result' | 'help' | 'privacy' | 'terms' | 'my_quizzes' | 'game_lobby' | 'game_board' | 'game_hex' | 'public_view' | 'community' | 'arcade_play' | 'raid_dashboard';

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

const Stepper: React.FC = () => {
    return null; 
};

const NeuralApp: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [isClassroomMode, setIsClassroomMode] = useState(false);
  const [language, setLanguage] = useState<Language>('es');
  
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const t = translations[language] || translations['en'] || translations['es'];
  const toast = useToast();

  const [sharedQuizId, setSharedQuizId] = useState<string | null>(null);
  const [arcadeEvalId, setArcadeEvalId] = useState<string | null>(null); 
  const [raidDashboardId, setRaidDashboardId] = useState<string | null>(null);
  const [creatorMode, setCreatorMode] = useState<'MANUAL' | 'AI' | 'IMPORT'>('MANUAL');

  const [targetPlatform, setTargetPlatform] = useState('UNIVERSAL');
  const [genParams, setGenParams] = useState<{
    topic: string;
    count: number | string;
    types: string[];
    age: string;
    context: string;
    urls: string; 
    tone: string;
    language: string;
    customToneContext: string; 
  }>({
    topic: '',
    count: 5,
    types: [QUESTION_TYPES.MULTIPLE_CHOICE], 
    age: 'Universal',
    context: '',
    urls: '',
    tone: 'Neutral',
    language: 'Spanish',
    customToneContext: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(''); 
  const [dragActive, setDragActive] = useState(false);
  const contextFileInputRef = useRef<HTMLInputElement>(null);
  
  const [genProgress, setGenProgress] = useState(0);
  const [isGenSuccess, setIsGenSuccess] = useState(false);

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

  useEffect(() => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      
      if (path.startsWith('/play/')) {
          const evalId = path.split('/play/')[1];
          if (evalId && evalId.length > 0) {
              setArcadeEvalId(evalId);
              setView('arcade_play');
              return; 
          }
      }

      if (path.startsWith('/raid/')) {
          const raidId = path.split('/raid/')[1];
          if (raidId && raidId.length > 0) {
              setRaidDashboardId(raidId);
              setView('raid_dashboard');
              return;
          }
      }
      
      // Removed /new-home redirection as LandingV2 is now default

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
          throw new Error("Login required");
      }
      if (!quiz.title.trim()) {
          toast.warning("El quiz necesita un título para ser guardado.");
          throw new Error("Title missing");
      }

      setIsSaving(true);
      try {
          const enrichedQuiz = { ...quiz, authorName: user.displayName || "Usuario" };
          const docId = await saveQuizToFirestore(enrichedQuiz, user.uid, asCopy);
          if (!quiz.id || asCopy) {
              setQuiz(prev => ({ ...prev, id: docId }));
          }
          toast.success(asCopy ? "Copia guardada con éxito." : "Quiz guardado con éxito.");
      } catch (e) {
          toast.error("Error al guardar en Firestore. Intenta de nuevo.");
          throw e; 
      } finally {
          setIsSaving(false);
      }
  };

  const handleLoadQuiz = (loadedQuiz: Quiz) => {
      setQuiz(loadedQuiz);
      setCreatorMode('MANUAL');
      setView('new_creator');
      toast.info("Quiz cargado.");
  };

  const handleImportCommunityQuiz = (loadedQuiz: Quiz) => {
      setQuiz({
          ...loadedQuiz,
          id: undefined, 
          title: `Copy of ${loadedQuiz.title}`,
          isPublic: false,
          allowCloning: false
      });
      setCreatorMode('MANUAL');
      setView('new_creator');
      toast.success("Quiz copiado al editor.");
  };

  const handleSafeExit = (targetView: string) => {
      if (view === 'new_creator' && quiz.questions.length > 0) {
          if (!confirm("Si sales del editor sin guardar, podrías perder cambios recientes. ¿Continuar?")) {
              return;
          }
      }
      
      if (targetView.startsWith('new_creator:')) {
          const mode = targetView.split(':')[1] as 'MANUAL' | 'AI' | 'IMPORT';
          setCreatorMode(mode);
          setView('new_creator');
      } else {
          setView(targetView as ViewState);
      }
  };

  const handleLoginRequest = async () => {
      try {
          await signInWithGoogle();
      } catch (e) {
          toast.error("Login failed");
      }
  };

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
      setGameQuiz(q); 
      setView('game_lobby');
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
      const aiResult = await generateQuizQuestions({ topic: genParams.topic, count: Number(genParams.count) || 5, types: genParams.types, age: genParams.age, context: genParams.context, urls: urlList, language: selectedLang, includeFeedback, tone: genParams.tone, customToneContext: genParams.customToneContext });
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
      setTimeout(() => { toast.success("Quiz Generated Successfully!"); setCreatorMode('MANUAL'); setView('new_creator'); window.scrollTo({ top: 0, behavior: 'smooth' }); setIsGenSuccess(false); setGenProgress(0); }, 1000);
    } catch (e: any) { console.error(e); toast.error(`${t.alert_fail} (${e.message})`); clearInterval(progressTimer); setGenProgress(0); } finally { clearInterval(funnyMessageInterval); setIsGenerating(false); }
  };

  // ... (REST OF THE FILE: Analyzers, Render logic, etc. - Kept as is, just truncated for brevity as no changes needed there) ...
  
  const clearAnalysisInterval = () => { if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; } };
  interface ImageInput { data: string; mimeType: string; }
  const performAnalysis = async (content: string, sourceName: string, isAlreadyStructured: boolean = false, preParsedQuestions: Question[] = [], imageInput?: ImageInput) => {
    setView('convert_analysis'); setAnalysisProgress(0); setAnalysisStatus(getRandomMessage('start', language)); const MIN_DURATION = 8000; const startTime = Date.now(); let currentVirtualProgress = 0; clearAnalysisInterval();
    const processingPromise = (async () => { try { if (isAlreadyStructured && preParsedQuestions.length > 0) { return preParsedQuestions; } else { const langMap: Record<string, string> = { 'es': 'Spanish', 'en': 'English' }; const selectedLang = langMap[language] || 'Spanish'; const generatedQs = await parseRawTextToQuiz(content, selectedLang, imageInput); return generatedQs; } } catch (e) { throw e; } })();
    progressIntervalRef.current = window.setInterval(() => { const elapsed = Date.now() - startTime; let targetP = 0; if (elapsed < MIN_DURATION) { targetP = (elapsed / MIN_DURATION) * 80; } else { const extraTime = elapsed - MIN_DURATION; const creep = 19 * (1 - Math.exp(-extraTime / 10000)); targetP = 80 + creep; } if (targetP > currentVirtualProgress) { currentVirtualProgress = targetP; } setAnalysisProgress(currentVirtualProgress); if (elapsed > 1000 && elapsed < 1200) { setAnalysisStatus(getDetectionMessage(sourceName, content, language)); } else if (elapsed > 4000 && elapsed < 4200) { setAnalysisStatus(getRandomMessage('detect_generic', language)); } else if (elapsed > 6000 && elapsed < 6200) { setAnalysisStatus(getRandomMessage('progress', language)); } }, 100);
    try { const questions = await processingPromise; if (questions.length === 0) throw new Error(t.alert_no_questions); const elapsedNow = Date.now() - startTime; if (elapsedNow < MIN_DURATION) { await new Promise(r => setTimeout(r, MIN_DURATION - elapsedNow)); } clearAnalysisInterval(); setAnalysisProgress(100); setAnalysisStatus(getRandomMessage('success', language)); const missingAnswers = questions.some(q => (q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT) && q.options.filter((o: any) => o.text.trim() !== "").length < 2); if (missingAnswers) { setTempQuestions(questions); setTempQuizInfo({ title: sourceName, desc: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI' }); setTimeout(() => setShowMissingAnswersModal(true), 1000); } else { setQuiz({ title: sourceName, description: isAlreadyStructured ? 'Imported from Template' : 'Converted via AI', questions: questions, tags: ['Imported', isAlreadyStructured ? 'Template' : 'AI'] }); toast.success("Analysis Complete!"); setTimeout(() => { setCreatorMode('MANUAL'); setView('new_creator'); }, 1500); } } catch (error: any) { clearAnalysisInterval(); setAnalysisProgress(0); setAnalysisStatus(getRandomMessage('error', language)); console.error(error); toast.error(`Analysis Failed: ${error.message}`); setTimeout(() => { setCreatorMode('IMPORT'); setView('new_creator'); }, 4000); }
  };
  const handleGenerateMissingAnswers = async () => { setIsGeneratingAnswers(true); try { const langMap: Record<string, string> = { 'es': 'Spanish', 'en': 'English' }; const enhancedQuestions = await enhanceQuestionsWithOptions(tempQuestions, langMap[language] || 'Spanish'); setQuiz({ ...initialQuiz, title: tempQuizInfo.title, description: tempQuizInfo.desc, questions: enhancedQuestions, tags: ['AI Repair'] }); setShowMissingAnswersModal(false); setCreatorMode('MANUAL'); setView('new_creator'); toast.success("Answers generated successfully!"); } catch (e) { toast.error("Error generating answers. Please check quota."); } finally { setIsGeneratingAnswers(false); } };
  const handleSkipMissingAnswers = () => { setQuiz({ ...initialQuiz, title: tempQuizInfo.title, description: tempQuizInfo.desc, questions: tempQuestions }); setShowMissingAnswersModal(false); setCreatorMode('MANUAL'); setView('new_creator'); };
  
  const handleFileProcessing = async (file: File) => { if (!file) return; const fileName = file.name; const fileType = file.type; try { if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) { const reader = new FileReader(); reader.onload = (e: ProgressEvent<FileReader>) => { const data = e.target?.result; if (fileName.endsWith('.csv')) { const wb = XLSX.read(data, { type: 'binary' }); const detectedQuestions = detectAndParseStructure(wb); if (detectedQuestions && detectedQuestions.length > 0) { performAnalysis("", fileName, true, detectedQuestions); } else { performAnalysis(data as string, fileName); } } else { const wb = XLSX.read(data, { type: 'binary' }); const detectedQuestions = detectAndParseStructure(wb); if (detectedQuestions && detectedQuestions.length > 0) { performAnalysis("", fileName, true, detectedQuestions); } else { toast.error(t.alert_no_valid_csv); } } }; if (fileName.endsWith('.csv')) reader.readAsText(file); else reader.readAsBinaryString(file); return; } if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) { const text = await extractTextFromPDF(file); performAnalysis(text, fileName); return; } if (fileType.startsWith('image/')) { const reader = new FileReader(); reader.onload = (e: ProgressEvent<FileReader>) => { const base64 = e.target?.result as string; const base64Data = base64.split(',')[1]; performAnalysis("Extract questions from this image", fileName, false, [], { data: base64Data, mimeType: fileType }); }; reader.readAsDataURL(file); return; } if (fileType.startsWith('text/') || fileName.endsWith('.json') || fileName.endsWith('.md') || fileName.endsWith('.txt')) { const text = await file.text(); performAnalysis(text, fileName); return; } toast.error(t.alert_read_error || "Unsupported file type"); } catch (e: any) { console.error(e); toast.error(`${t.alert_read_error}: ${e.message}`); } };
  const handleConvertDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') { setDragActive(true); } else if (e.type === 'dragleave') { setDragActive(false); } };
  const handleConvertDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { handleFileProcessing(e.dataTransfer.files[0]); } };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) { handleFileProcessing(e.target.files[0]); } };
  const handlePasteAnalysis = () => { if (!textToConvert.trim()) { toast.warning(t.alert_paste_first); return; } performAnalysis(textToConvert, "Pasted Text"); };
  const handleUrlAnalysis = async () => { if (!urlToConvert.trim()) { toast.warning(t.alert_valid_url); return; } const url = urlToConvert.trim(); setView('convert_analysis'); setAnalysisProgress(10); setAnalysisStatus("Analyzing URL..."); try { const structuredResult = await analyzeUrl(url); if (structuredResult) { setAnalysisProgress(100); setQuiz(structuredResult.quiz); if (structuredResult.report.missing?.options || structuredResult.report.missing?.correct) { setTempQuestions(structuredResult.quiz.questions); setTempQuizInfo({ title: structuredResult.quiz.title, desc: structuredResult.quiz.description }); setTimeout(() => setShowMissingAnswersModal(true), 1000); } else { toast.success("Quiz imported successfully!"); setTimeout(() => { setCreatorMode('MANUAL'); setView('new_creator'); }, 1000); } return; } setAnalysisStatus("Fetching content for AI analysis..."); const content = await fetchUrlContent(url); await performAnalysis(content, "URL Import"); } catch (e: any) { console.error(e); toast.error(`URL Analysis failed: ${e.message}`); setCreatorMode('IMPORT'); setView('new_creator'); } };

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

  if (view === 'arcade_play' && arcadeEvalId) return <ArcadePlay evaluationId={arcadeEvalId} />;
  if (view === 'raid_dashboard' && raidDashboardId) return <RaidDashboard evaluationId={raidDashboardId} />;
  
  // --- NEW: LANDING V2 IS NOW DEFAULT HOME ---
  if (view === 'home') {
      return (
          <div className="flex flex-col bg-[#020617] text-white overflow-x-hidden min-h-screen">
              <Header 
                  language={language} 
                  setLanguage={setLanguage} 
                  onHelp={() => handleSafeExit('help')} 
                  onNavigate={(target) => handleSafeExit(target as ViewState)} // Use handleSafeExit for all nav
              />
              <LandingV2 onNavigate={(targetView: string) => handleSafeExit(targetView)} user={user} onLoginReq={handleLoginRequest} />
              <Footer onPrivacy={() => setView('privacy')} onTerms={() => setView('terms')} />
          </div>
      );
  }

  // --- NEW: Go to Export Logic ---
  const handleGoToExport = () => {
      if (quiz.questions.length === 0) {
          toast.warning("Añade preguntas antes de exportar.");
          return;
      }
      setView('export_hub');
  };

  return (
    <div className="flex flex-col bg-[#020617] text-white overflow-x-hidden">
      <Header 
          language={language} 
          setLanguage={setLanguage} 
          onHelp={() => handleSafeExit('help')} 
          onNavigate={(target) => handleSafeExit(target as ViewState)} // Unified navigation handler
      />
      {showMissingAnswersModal && renderMissingAnswersModal()}

      <main className="min-h-screen flex flex-col p-4 md:p-8 relative z-10 w-full max-w-[1920px] mx-auto">
        <Stepper />

        {/* --- ARCHIVED OLD HOME --- */}
        {view === 'old_home' && (
            <OldLanding t={t} onNavigate={(v) => setView(v as ViewState)} onResetGame={() => setGameQuiz(null)} />
        )}

        {view === 'teacher_hub' && <TeacherHub user={user} onNavigate={(targetView: string) => setView(targetView as ViewState)} />}
        {view === 'classes_manager' && <ClassesManager onBack={() => setView('teacher_hub')} />}
        {view === 'community' && <CommunityPage onBack={() => setView('home')} onPlay={(q) => handlePlayFromEditor(q)} onImport={handleImportCommunityQuiz} />}
        {view === 'help' && <HelpView onBack={() => setView('home')} t={t} />}
        {view === 'privacy' && <PrivacyView onBack={() => setView('home')} />}
        {view === 'terms' && <TermsView onBack={() => setView('home')} />}
        {view === 'my_quizzes' && <MyQuizzes user={user} onBack={() => setView('home')} onEdit={handleLoadQuiz} />}
        {view === 'public_view' && sharedQuizId && <PublicQuizLanding quizId={sharedQuizId} currentUser={user} onPlay={launchPublicGame} onBack={() => setView('home')} onLoginReq={signInWithGoogle} />}

        {/* --- NEW INTEGRATED CREATOR --- */}
        {view === 'new_creator' && (
            <NewCreator 
                onNavigate={(v) => handleSafeExit(v)}
                user={user}
                t={t}
                initialQuiz={quiz}
                setQuiz={setQuiz}
                onSaveQuiz={handleSaveQuiz}
                onExport={handleGoToExport}
                onPlay={handlePlayFromEditor}
                isSaving={isSaving}
                initialMode={creatorMode}
            />
        )}

        {/* --- REMOVED OLD VIEWS --- */}

        {/* NEW: EXPORT HUB VIEW */}
        {view === 'export_hub' && (
            <ExportHub 
                quiz={quiz}
                setQuiz={setQuiz}
                onBack={() => setView('new_creator')}
                t={t}
            />
        )}

        {view === 'game_lobby' && (<GameLobby user={user} onBack={() => setView('home')} onStartGame={(q, teams, mode, config) => { setGameQuiz(q); setGameTeams(teams); setGameConfig(config); if (mode === 'HEX_CONQUEST') setView('game_hex'); else setView('game_board'); }} t={t} preSelectedQuiz={gameQuiz} language={language} />)}
        {view === 'game_board' && gameQuiz && (<JeopardyBoard quiz={gameQuiz} initialTeams={gameTeams} onExit={() => setView('game_lobby')} gameConfig={gameConfig} />)}
        {view === 'game_hex' && gameQuiz && (<HexConquestGame quiz={gameQuiz} initialTeams={gameTeams} onExit={() => setView('game_lobby')} />)}

      </main>
      <Footer onPrivacy={() => setView('privacy')} onTerms={() => setView('terms')} />
    </div>
  );
};

export default NeuralApp;
