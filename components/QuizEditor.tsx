
import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, Option, PLATFORM_SPECS, QUESTION_TYPES, ExportFormat, ImageCredit } from '../types';
import { CyberButton, CyberInput, CyberCard, CyberSelect, CyberTextArea, CyberCheckbox } from './ui/CyberUI';
import { Trash2, Plus, CheckCircle2, Circle, Upload, Link as LinkIcon, Download, ChevronDown, ChevronUp, AlertCircle, Bot, Zap, Globe, AlignLeft, CheckSquare, Type, Palette, ArrowDownUp, GripVertical, AlertTriangle, Image as ImageIcon, XCircle, Wand2, Eye, FileSearch, Check, Save, Copy, Tag, LayoutList, ChevronLeft, ChevronRight, Hash, Share2, Lock, Unlock, FolderOpen, Gamepad2, CopyPlus, ArrowRight, Merge, FilePlus, ListOrdered, MessageSquare } from 'lucide-react';
import { generateQuizQuestions, enhanceQuestion } from '../services/geminiService';
import { detectAndParseStructure } from '../services/importService';
import { getSafeImageUrl } from '../services/imageProxyService'; 
import { toggleQuizVisibility, updateCloningPermission } from '../services/shareService'; 
import { publishQuiz } from '../services/communityService'; 
import { uploadImageToCloudinary } from '../services/cloudinaryService'; 
import { useToast } from './ui/Toast';
import { PublishModal } from './PublishModal'; 
import { ImagePickerModal } from './ui/ImagePickerModal';
import { ImageResult } from '../services/imageService';
import { getUserQuizzes, saveQuizToFirestore } from '../services/firebaseService';
import * as XLSX from 'xlsx';

interface QuizEditorProps {
  quiz: Quiz;
  setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
  onExport: () => void;
  onSave: (asCopy?: boolean) => void;
  isSaving?: boolean;
  user?: any;
  showImportOptions?: boolean;
  t: any;
  onPlay: (quiz: Quiz) => void;
  currentLanguage?: string;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ quiz, setQuiz, onExport, onSave, isSaving, user, showImportOptions = true, t, onPlay, currentLanguage = 'es' }) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<string>('UNIVERSAL');
  const [hasSelectedPlatform, setHasSelectedPlatform] = useState(false);
  const toast = useToast();
  
  // AI & Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  
  // Image Picker State
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pickingImageForId, setPickingImageForId] = useState<string | null>(null);
  const [pickingImageForOptionId, setPickingImageForOptionId] = useState<string | null>(null); 
  const [pickingImageCurrentUrl, setPickingImageCurrentUrl] = useState<string | null>(null);
  const [pickingImageCurrentCredit, setPickingImageCurrentCredit] = useState<ImageCredit | undefined>(undefined); // NEW
  
  // Share/Publish State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Add to Existing State
  const [showAddToExisting, setShowAddToExisting] = useState(false);
  const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([]);
  const [selectedTargetQuizId, setSelectedTargetQuizId] = useState<string>('');
  const [isAddingToExisting, setIsAddingToExisting] = useState(false);

  // Tags State
  const [newTag, setNewTag] = useState('');

  // --- NEW: PAGINATION & DND STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [draggedOption, setDraggedOption] = useState<{qId: string, idx: number} | null>(null);
  const cardRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  useEffect(() => {
      if (quiz.questions.length > 0) setHasSelectedPlatform(true);
  }, []);

  const uuid = () => Math.random().toString(36).substring(2, 9);

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(quiz.questions.length / ITEMS_PER_PAGE);
  
  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
      if (currentPage < 1) setCurrentPage(1);
  }, [quiz.questions.length, totalPages]);

  const getCurrentPageQuestions = () => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return quiz.questions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const jumpToQuestion = (index: number) => {
      const targetPage = Math.ceil((index + 1) / ITEMS_PER_PAGE);
      setCurrentPage(targetPage);
      const q = quiz.questions[index];
      setExpandedQuestionId(q.id);
      setTimeout(() => {
          const el = cardRefs.current[q.id];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
  };

  const changePage = (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setCurrentPage(newPage);
      
      // Auto-scroll to first item of the new page
      const firstIndexOnPage = (newPage - 1) * ITEMS_PER_PAGE;
      const q = quiz.questions[firstIndexOnPage];
      if (q) {
          // Optional: Auto-expand the first question of the new page for better UX
          setExpandedQuestionId(q.id);
          setTimeout(() => {
              const el = cardRefs.current[q.id];
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
          }, 100);
      }
  };

  // --- ADD TO EXISTING LOGIC ---
  const handleOpenAddToExisting = async () => {
      if (!user) {
          toast.warning("Inicia sesión para usar esta función.");
          return;
      }
      setShowAddToExisting(true);
      try {
          const q = await getUserQuizzes(user.uid);
          setUserQuizzes(q);
      } catch (e) {
          toast.error("Error cargando quizzes");
      }
  };

  const confirmAddToExisting = async () => {
      if (!selectedTargetQuizId) return;
      setIsAddingToExisting(true);
      try {
          const targetQuiz = userQuizzes.find(q => q.id === selectedTargetQuizId);
          if (!targetQuiz) throw new Error("Quiz not found");

          const newQuestions = quiz.questions.map(q => ({
              ...q,
              id: uuid(),
              options: q.options.map(o => ({...o, id: uuid()})),
              correctOptionId: "", 
          }));
          
          const updatedQuiz: Quiz = {
              ...targetQuiz,
              questions: [...targetQuiz.questions, ...quiz.questions],
              updatedAt: new Date()
          };

          await saveQuizToFirestore(updatedQuiz, user.uid);
          toast.success("Preguntas añadidas correctamente.");
          setShowAddToExisting(false);
      } catch (e) {
          toast.error("Error al guardar.");
      } finally {
          setIsAddingToExisting(false);
      }
  };

  // --- PUBLISH LOGIC ---
  const handleOpenPublish = () => {
      if (quiz.questions.length < 1) {
          toast.warning("Añade preguntas antes de publicar.");
          return;
      }
      setShowPublishModal(true);
  };

  const handleConfirmPublish = async (tags: string[]) => {
      setIsPublishing(true);
      try {
          setQuiz(prev => ({ ...prev, tags }));
          await publishQuiz(quiz, tags);
          toast.success("¡Quiz publicado en la Comunidad!");
          setShowPublishModal(false);
      } catch (e: any) {
          toast.error("Error al publicar: " + e.message);
      } finally {
          setIsPublishing(false);
      }
  };

  // --- IMAGE PICKER ---
  // Updated to receive credit object
  const openImagePicker = (qId: string, currentUrl?: string, optionId?: string, credit?: ImageCredit) => {
      setPickingImageForId(qId);
      setPickingImageForOptionId(optionId || null);
      setPickingImageCurrentUrl(currentUrl || null);
      setPickingImageCurrentCredit(credit);
      setShowImagePicker(true);
  };

  const handleImageSelected = (result: ImageResult) => {
      if (pickingImageForId) {
          if (pickingImageForOptionId) {
              // OPTION IMAGE UPDATE
              const q = quiz.questions.find(q => q.id === pickingImageForId);
              if (q) {
                  const updatedOptions = q.options.map(o => 
                      o.id === pickingImageForOptionId 
                          ? { ...o, imageUrl: result.url } 
                          : o
                  );
                  updateQuestion(pickingImageForId, { options: updatedOptions });
                  toast.success("Imagen de opción actualizada");
              }
          } else {
              // QUESTION IMAGE UPDATE
              const credit = result.attribution ? {
                  name: result.attribution.authorName,
                  link: result.attribution.authorUrl,
                  source: result.attribution.sourceName as 'Unsplash' | 'Pexels' | 'Pixabay'
              } : undefined;

              updateQuestion(pickingImageForId, { 
                  imageUrl: result.url,
                  imageCredit: credit
              });
              toast.success("Imagen actualizada");
          }
      }
      setPickingImageForId(null);
      setPickingImageForOptionId(null);
      setPickingImageCurrentUrl(null);
      setPickingImageCurrentCredit(undefined);
      setShowImagePicker(false);
  };

  const removeOptionImage = (qId: string, optId: string) => {
      const q = quiz.questions.find(q => q.id === qId);
      if (!q) return;
      const updatedOptions = q.options.map(o => o.id === optId ? { ...o, imageUrl: undefined } : o);
      updateQuestion(qId, { options: updatedOptions });
  };

  // --- CRUD OPERATIONS ---
  const addQuestion = () => {
    const newQ: Question = {
      id: uuid(),
      text: '',
      options: [
        { id: uuid(), text: '' },
        { id: uuid(), text: '' },
        { id: uuid(), text: '' },
        { id: uuid(), text: '' },
      ],
      correctOptionId: '',
      correctOptionIds: [],
      timeLimit: 20,
      questionType: QUESTION_TYPES.MULTIPLE_CHOICE
    };
    newQ.correctOptionId = newQ.options[0].id; 
    newQ.correctOptionIds = [newQ.options[0].id];
    
    setQuiz(prev => {
        const newQs = [...prev.questions, newQ];
        setTimeout(() => setCurrentPage(Math.ceil(newQs.length / ITEMS_PER_PAGE)), 50);
        return { ...prev, questions: newQs };
    });
    setExpandedQuestionId(newQ.id);
  };

  const duplicateQuestion = (qId: string) => {
      const original = quiz.questions.find(q => q.id === qId);
      if (!original) return;

      const newOptions = original.options.map(o => ({...o, id: uuid()}));
      const newCorrectIds = (original.correctOptionIds || []).map(oldId => {
          const idx = original.options.findIndex(o => o.id === oldId);
          return idx !== -1 ? newOptions[idx].id : null;
      }).filter(id => id !== null) as string[];

      const clone: Question = {
          ...original,
          id: uuid(),
          text: `${original.text} (Copia)`,
          options: newOptions,
          correctOptionIds: newCorrectIds,
          correctOptionId: newCorrectIds[0] || ""
      };

      setQuiz(prev => {
          const index = prev.questions.findIndex(q => q.id === qId);
          const newQs = [...prev.questions];
          newQs.splice(index + 1, 0, clone);
          return { ...prev, questions: newQs };
      });
      toast.info("Pregunta duplicada");
  };

  const removeQuestion = (id: string, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    if(confirm(t.delete_confirm)) {
        setQuiz(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
        if (expandedQuestionId === id) setExpandedQuestionId(null);
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    }));
  };

  const updateOption = (qId: string, oId: string, text: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options.map(o => o.id === oId ? { ...o, text } : o)
        };
      })
    }));
  };

  const addOption = (qId: string) => {
      setQuiz(prev => ({
          ...prev,
          questions: prev.questions.map(q => {
              if (q.id !== qId) return q;
              if (q.options.length >= 6 && q.questionType !== QUESTION_TYPES.FILL_GAP) return q; 
              return { ...q, options: [...q.options, { id: uuid(), text: '' }] };
          })
      }));
  };

  const removeOption = (qId: string, oId: string) => {
      setQuiz(prev => ({
          ...prev,
          questions: prev.questions.map(q => {
              if (q.id !== qId) return q;
              if (q.options.length <= 2 && q.questionType !== QUESTION_TYPES.FILL_GAP) return q; 
              if (q.questionType === QUESTION_TYPES.FILL_GAP && q.options.length <= 1) return q; 
              return { ...q, options: q.options.filter(o => o.id !== oId) };
          })
      }));
  };

  const handleCorrectSelection = (q: Question, optionId: string) => {
      if (q.questionType === QUESTION_TYPES.POLL) return; // No correct answer for poll

      if (q.questionType === QUESTION_TYPES.MULTI_SELECT) {
          let currentIds = q.correctOptionIds || [];
          if (currentIds.length === 0 && q.correctOptionId) currentIds = [q.correctOptionId];

          if (currentIds.includes(optionId)) {
              currentIds = currentIds.filter(id => id !== optionId);
          } else {
              currentIds = [...currentIds, optionId];
          }
          updateQuestion(q.id, { 
              correctOptionIds: currentIds,
              correctOptionId: currentIds.length > 0 ? currentIds[0] : ""
          });
      } else {
          updateQuestion(q.id, { correctOptionId: optionId, correctOptionIds: [optionId] });
      }
  };

  const handleTypeChange = (qId: string, newType: string) => {
     const question = quiz.questions.find(q => q.id === qId);
     if (!question) return;

     let updates: Partial<Question> = { questionType: newType };

     if (newType === QUESTION_TYPES.TRUE_FALSE) {
         const trueId = uuid();
         updates.options = [{ id: trueId, text: t.q_tf_true }, { id: uuid(), text: t.q_tf_false }];
         updates.correctOptionId = trueId;
         updates.correctOptionIds = [trueId];
     } else if (newType === QUESTION_TYPES.ORDER) {
          // Initialize with 4 empty options for Order
          updates.correctOptionId = ""; 
          updates.correctOptionIds = [];
          const newOpts = [];
          for(let i=0; i<4; i++) newOpts.push({id: uuid(), text: ''});
          updates.options = newOpts;
     } else if (newType === QUESTION_TYPES.FILL_GAP) {
         if (question.options.length === 0) {
             updates.options = [{ id: uuid(), text: '' }];
         }
         updates.correctOptionId = question.options[0]?.id || "";
         updates.correctOptionIds = [question.options[0]?.id || ""];
         updates.matchConfig = { ignoreAccents: true, caseSensitive: false };
     } else if (newType === QUESTION_TYPES.OPEN_ENDED) {
         updates.options = [{ id: uuid(), text: '' }];
         updates.correctOptionId = "";
         updates.correctOptionIds = [];
         updates.feedback = ""; // Clear feedback
     }
     
     updateQuestion(qId, updates);
  };

  const toggleExpand = (id: string) => {
    setExpandedQuestionId(prev => prev === id ? null : id);
  };

  const validateQuestion = (q: Question) => {
    const hasText = q.text.trim().length > 0;
    if (q.questionType === QUESTION_TYPES.OPEN_ENDED || q.questionType === QUESTION_TYPES.POLL) return hasText;
    
    if (q.questionType === QUESTION_TYPES.FILL_GAP) {
        return hasText && q.options.length > 0 && q.options[0].text.trim().length > 0;
    }
    
    if (q.questionType === QUESTION_TYPES.ORDER) {
        return hasText && q.options.length >= 2 && q.options.every(o => o.text.trim().length > 0);
    }
    
    const ids = q.correctOptionIds && q.correctOptionIds.length > 0 ? q.correctOptionIds : (q.correctOptionId ? [q.correctOptionId] : []);
    const hasCorrect = ids.length > 0 && q.options.some(o => ids.includes(o.id));
    const hasOptions = q.options.filter(o => o.text.trim().length > 0).length >= 2;
    return hasText && hasCorrect && hasOptions;
  };

  const handleEnhanceQuestion = async (q: Question) => {
      setEnhancingId(q.id);
      try {
          const enhancedQ = await enhanceQuestion(q, quiz.description || "", currentLanguage);
          setQuiz(prev => ({
              ...prev,
              questions: prev.questions.map(oldQ => oldQ.id === q.id ? { ...enhancedQ, id: oldQ.id } : oldQ)
          }));
      } catch (e) {
          alert("Could not enhance question.");
      } finally {
          setEnhancingId(null);
      }
  };

  const ensureOptions = (q: Question) => {
      if ((q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT || q.questionType === QUESTION_TYPES.POLL) && q.options.length === 0) {
          const newOpts = [
              { id: uuid(), text: '' }, { id: uuid(), text: '' },
              { id: uuid(), text: '' }, { id: uuid(), text: '' }
          ];
          updateQuestion(q.id, { options: newOpts });
      } else if (q.questionType === QUESTION_TYPES.FILL_GAP && q.options.length === 0) {
          updateQuestion(q.id, { options: [{ id: uuid(), text: '' }] });
      }
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setIsGenerating(true);
    try {
      const platformTypes = PLATFORM_SPECS[targetPlatform].types;
      
      const aiResult = await generateQuizQuestions({
        topic: aiTopic, count: aiCount, types: platformTypes, age: 'Universal', language: 'Spanish'
      });
      
      const newQuestions: Question[] = aiResult.questions.map((gq: any) => {
        const qId = uuid();
        const options: Option[] = gq.options.map((opt: any) => ({ 
            id: opt.id || uuid(), 
            text: opt.text 
        }));
        
        return {
          id: qId, 
          text: gq.text, 
          options: options, 
          correctOptionId: gq.correctOptionId || options[0]?.id || "", 
          correctOptionIds: gq.correctOptionIds || (gq.correctOptionId ? [gq.correctOptionId] : []),
          timeLimit: 30, 
          questionType: gq.questionType || QUESTION_TYPES.MULTIPLE_CHOICE, 
          feedback: gq.feedback,
          imageUrl: gq.imageUrl,
          imageSearchQuery: gq.imageSearchQuery,
          fallback_category: gq.fallback_category
        };
      });

      setQuiz(prev => {
          const updatedQs = [...prev.questions, ...newQuestions];
          const newTags = Array.from(new Set([...(prev.tags || []), ...(aiResult.tags || [])]));
          setTimeout(() => setCurrentPage(Math.ceil(updatedQs.length / ITEMS_PER_PAGE)), 50);
          return { ...prev, questions: updatedQs, tags: newTags };
      });
      setAiTopic(''); setShowAiModal(false);
    } catch (e: any) { alert(t.alert_fail + ": " + e.message); } finally { setIsGenerating(false); }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && newTag.trim()) {
          const currentTags = quiz.tags || [];
          if (!currentTags.includes(newTag.trim())) {
              setQuiz(prev => ({ ...prev, tags: [...currentTags, newTag.trim()] }));
          }
          setNewTag('');
      }
  };

  const removeTag = (tag: string) => {
      setQuiz(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
  };

  const getTranslatedType = (type: string) => {
      if (type === QUESTION_TYPES.MULTIPLE_CHOICE) return t.type_mc;
      if (type === QUESTION_TYPES.MULTI_SELECT) return t.type_ms;
      if (type === QUESTION_TYPES.TRUE_FALSE) return t.type_tf;
      if (type === QUESTION_TYPES.FILL_GAP) return t.type_short;
      if (type === QUESTION_TYPES.ORDER) return t.type_order;
      if (type === QUESTION_TYPES.POLL) return t.type_poll;
      if (type === QUESTION_TYPES.OPEN_ENDED) return t.type_open;
      return type;
  };

  const getTypeIcon = (type?: string) => {
      if (type === QUESTION_TYPES.TRUE_FALSE) return <CheckSquare className="w-4 h-4" />;
      if (type === QUESTION_TYPES.FILL_GAP) return <Type className="w-4 h-4" />;
      if (type === QUESTION_TYPES.OPEN_ENDED) return <MessageSquare className="w-4 h-4" />;
      if (type === QUESTION_TYPES.ORDER) return <ListOrdered className="w-4 h-4" />;
      if (type === QUESTION_TYPES.MULTI_SELECT) return <CheckSquare className="w-4 h-4" />;
      return <Zap className="w-4 h-4" />; 
  };

  const getTypeColor = (type?: string) => {
      if (type === QUESTION_TYPES.TRUE_FALSE) return "text-blue-400 bg-blue-900/30 border-blue-500/50";
      if (type === QUESTION_TYPES.FILL_GAP) return "text-yellow-400 bg-yellow-900/30 border-yellow-500/50";
      if (type === QUESTION_TYPES.OPEN_ENDED) return "text-pink-400 bg-pink-900/30 border-pink-500/50";
      if (type === QUESTION_TYPES.ORDER) return "text-purple-400 bg-purple-900/30 border-purple-500/50";
      if (type === QUESTION_TYPES.MULTI_SELECT) return "text-green-400 bg-green-900/30 border-green-500/50";
      return "text-cyan-400 bg-cyan-900/30 border-cyan-500/50"; 
  };

  // Helper to generate grouped options for the Select component
  const getGroupedTypeOptions = () => {
      const allowedTypes = PLATFORM_SPECS[targetPlatform].types;
      
      const validationGroup = [
          QUESTION_TYPES.MULTIPLE_CHOICE,
          QUESTION_TYPES.MULTI_SELECT,
          QUESTION_TYPES.TRUE_FALSE,
          QUESTION_TYPES.FILL_GAP,
          QUESTION_TYPES.ORDER
      ].filter(t => allowedTypes.includes(t))
       .map(t => ({ value: t, label: getTranslatedType(t) }));

      const noValidationGroup = [
          QUESTION_TYPES.OPEN_ENDED,
          QUESTION_TYPES.POLL
      ].filter(t => allowedTypes.includes(t))
       .map(t => ({ value: t, label: getTranslatedType(t) }));

      return [
          { label: "CON VALIDACIÓN DE RESPUESTA", options: validationGroup },
          { label: "SIN VALIDACIÓN DE RESPUESTA", options: noValidationGroup }
      ];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* GLOBAL MODALS */}
      <PublishModal 
          isOpen={showPublishModal} 
          onClose={() => setShowPublishModal(false)}
          onConfirm={handleConfirmPublish}
          initialTags={quiz.tags || []}
          isPublishing={isPublishing}
      />
      <ImagePickerModal
          isOpen={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSelect={handleImageSelected}
          initialUrl={pickingImageCurrentUrl || undefined} 
          initialCredit={pickingImageCurrentCredit} // PASS CREDIT
      />

      {/* --- ADD TO EXISTING MODAL --- */}
      {showAddToExisting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <CyberCard className="w-full max-w-lg border-purple-500/50">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-cyber font-bold text-white text-lg">AÑADIR A QUIZ EXISTENTE</h3>
                      <button onClick={() => setShowAddToExisting(false)}><XCircle className="w-5 h-5 text-gray-500"/></button>
                  </div>
                  <div className="space-y-4">
                      <p className="text-sm text-gray-400">Selecciona el quiz al que quieres añadir las preguntas actuales ({quiz.questions.length}):</p>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar border border-gray-800 rounded bg-black/40 p-2 space-y-2">
                          {userQuizzes.map(q => (
                              <button 
                                  key={q.id}
                                  onClick={() => setSelectedTargetQuizId(q.id!)}
                                  className={`w-full text-left p-3 rounded border transition-all ${selectedTargetQuizId === q.id ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                              >
                                  <div className="font-bold text-sm">{q.title}</div>
                                  <div className="text-xs opacity-70">{q.questions.length} preguntas existinges</div>
                              </button>
                          ))}
                      </div>
                      <CyberButton onClick={confirmAddToExisting} isLoading={isAddingToExisting} disabled={!selectedTargetQuizId} className="w-full">
                          CONFIRMAR Y FUSIONAR
                      </CyberButton>
                  </div>
              </CyberCard>
          </div>
      )}

      {/* --- POST-GENERATION ACTION BAR --- */}
      {quiz.questions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-black/40 border border-gray-800 rounded-xl">
              <CyberButton onClick={() => onPlay(quiz)} variant="neural" className="h-12 text-sm font-bold bg-yellow-600 hover:bg-yellow-500 border-yellow-400 text-black">
                  <Gamepad2 className="w-5 h-5 mr-2" /> ¡JUGAR!
              </CyberButton>
              <CyberButton onClick={() => onSave(false)} isLoading={isSaving} className="h-12 text-sm">
                  <Save className="w-5 h-5 mr-2" /> GUARDAR
              </CyberButton>
              <CyberButton onClick={handleOpenAddToExisting} variant="secondary" className="h-12 text-sm">
                  <FilePlus className="w-5 h-5 mr-2" /> AÑADIR A QUIZ
              </CyberButton>
              <CyberButton onClick={onExport} variant="secondary" className="h-12 text-sm">
                  <Download className="w-5 h-5 mr-2" /> EXPORTAR
              </CyberButton>
          </div>
      )}

      {/* --- HEADER ACTIONS --- */}
      <div className="flex flex-col gap-4 border-b border-gray-800 pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="w-full">
                  <input 
                      type="text" 
                      value={quiz.title} 
                      onChange={(e) => setQuiz(prev => ({...prev, title: e.target.value}))}
                      className="bg-transparent text-3xl font-cyber text-cyan-400 border-b border-transparent hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none w-full transition-all"
                      placeholder="Quiz Title..."
                  />
                  <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                          {(quiz.tags || []).map(tag => (
                              <span key={tag} className="flex items-center gap-1 bg-cyan-950/40 text-cyan-300 text-xs px-2 py-1 rounded border border-cyan-900/50">
                                  <Tag className="w-3 h-3" /> {tag}
                                  <button onClick={() => removeTag(tag)} className="hover:text-white"><XCircle className="w-3 h-3" /></button>
                              </span>
                          ))}
                          <div className="relative">
                              <input 
                                  type="text" 
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  onKeyDown={handleAddTag}
                                  placeholder="+ Tag"
                                  className="bg-black/20 text-xs text-gray-400 border border-gray-800 rounded px-2 py-1 w-20 focus:w-32 transition-all focus:border-cyan-500 focus:outline-none"
                              />
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
                  <CyberButton onClick={handleOpenPublish} variant="secondary" className="flex-1 md:flex-none text-xs h-10 px-4 bg-purple-900/20 border-purple-500/50 text-purple-200 hover:text-white hover:bg-purple-900/40">
                      <Globe className="w-4 h-4 mr-2" /> PUBLICAR
                  </CyberButton>
              </div>
          </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-cyber text-gray-300">{t.questions_db} [{quiz.questions.length}]</h2>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mt-1">
                <span className="text-cyan-600 font-bold">{t.editor_targeting}</span>
                <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{PLATFORM_SPECS[targetPlatform].name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
             <CyberButton onClick={addQuestion} className="flex-1 md:flex-none flex items-center gap-2 text-xs h-9"><Plus className="w-4 h-4" /> {t.add_manual}</CyberButton>
             <CyberButton onClick={() => setShowAiModal(!showAiModal)} variant="secondary" className="flex-1 md:flex-none flex items-center gap-2 text-xs h-9"><Bot className="w-4 h-4" /> {t.add_gen_ai}</CyberButton>
          </div>
      </div>

      {showAiModal && (
          <div className="border border-purple-500/50 bg-purple-950/10 p-6 rounded-lg animate-in slide-in-from-top-4">
              <div className="flex items-center gap-2 mb-4 text-purple-400 font-cyber"><Bot className="w-5 h-5" /><h3>{t.ai_modal_title}</h3></div>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full"><CyberInput label={t.topic_label} placeholder={t.gen_placeholder} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}/></div>
                  <div className="w-24"><CyberInput type="number" label="#" value={aiCount} onChange={(e) => setAiCount(parseInt(e.target.value))} min={1} max={10}/></div>
                  <CyberButton onClick={handleAiGenerate} isLoading={isGenerating} disabled={!aiTopic}>{t.ai_modal_add}</CyberButton>
                  <CyberButton variant="ghost" onClick={() => setShowAiModal(false)}>{t.ai_modal_close}</CyberButton>
              </div>
              <p className="text-xs text-purple-300/60 mt-2 font-mono">* {t.editor_types_desc}</p>
          </div>
      )}

      {/* --- TWO COLUMN LAYOUT --- */}
      <div className="flex flex-col lg:flex-row gap-6 items-start mt-6">
          
          {/* SIDEBAR (TOC + SHARING) */}
          {quiz.questions.length > 0 && (
              <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-24 max-h-[calc(100vh-100px)] flex flex-col gap-4">
                  
                  {/* TOC */}
                  <div className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden flex flex-col flex-1 max-h-[400px]">
                      <div className="p-3 border-b border-gray-800 bg-gray-900/50 font-mono text-xs font-bold text-gray-400 flex items-center justify-between">
                          <span className="flex items-center gap-2"><LayoutList className="w-3 h-3" /> INDEX</span>
                          <span className="text-[10px] text-gray-600">{quiz.questions.length} Items</span>
                      </div>
                      <div className="overflow-y-auto custom-scrollbar flex-1 p-1 space-y-1">
                          {quiz.questions.map((q, idx) => {
                              const isValid = validateQuestion(q);
                              const isActive = expandedQuestionId === q.id;
                              const isDragging = draggedItemIndex === idx;
                              
                              return (
                                  <div 
                                      key={q.id}
                                      draggable
                                      onDragStart={(e) => {
                                          setDraggedItemIndex(idx);
                                      }}
                                      onDragOver={(e) => {
                                          e.preventDefault();
                                          if (draggedItemIndex === null || draggedItemIndex === idx) return;
                                          const newQuestions = [...quiz.questions];
                                          const draggedItem = newQuestions[draggedItemIndex];
                                          newQuestions.splice(draggedItemIndex, 1);
                                          newQuestions.splice(idx, 0, draggedItem);
                                          setQuiz(prev => ({ ...prev, questions: newQuestions }));
                                          setDraggedItemIndex(idx);
                                      }}
                                      onDragEnd={() => setDraggedItemIndex(null)}
                                      onClick={() => jumpToQuestion(idx)}
                                      className={`
                                          group flex items-center gap-2 p-2 rounded cursor-pointer transition-all border
                                          ${isActive ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-200' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'}
                                          ${isDragging ? 'opacity-50 dashed border-gray-500' : ''}
                                      `}
                                  >
                                      <div className="cursor-grab text-gray-700 hover:text-gray-400">
                                          <GripVertical className="w-3 h-3" />
                                      </div>
                                      <span className="font-mono font-bold w-5 text-xs">{idx + 1}.</span>
                                      <span className="text-xs leading-tight line-clamp-2 flex-1 break-words">{q.text || "Empty..."}</span>
                                      {isValid ? <CheckCircle2 className="w-3 h-3 text-green-500/50" /> : <AlertTriangle className="w-3 h-3 text-red-500" />}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          )}

          {/* MAIN EDITOR AREA */}
          <div className="flex-1 w-full min-w-0">
              {quiz.questions.length === 0 ? (
                <div className="text-center py-20 text-gray-600 font-mono-cyber border-2 border-dashed border-gray-800 rounded-lg">{t.no_data}</div>
              ) : (
                <>
                    <div className="grid gap-4 mb-6">
                      {getCurrentPageQuestions().map((q) => {
                        const index = quiz.questions.findIndex(ql => ql.id === q.id); // Real index
                        const isValid = validateQuestion(q);
                        const isExpanded = expandedQuestionId === q.id;
                        const allowedTypes = PLATFORM_SPECS[targetPlatform].types;
                        const isEnhancing = enhancingId === q.id;

                        // --- CORRECT ANSWER LOGIC ---
                        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 
                                           ? q.correctOptionIds 
                                           : (q.correctOptionId ? [q.correctOptionId] : []);
                        
                        const correctTexts = q.options.filter(o => correctIds.includes(o.id)).map(o => o.text).join(", ");
                        
                        return (
                          <div 
                            key={q.id} 
                            ref={el => { cardRefs.current[q.id] = el; }}
                            className={`transition-all duration-300 ${isExpanded ? 'scale-[1.01] z-10' : ''}`}
                          >
                            <CyberCard title={!isExpanded ? `Q-${index + 1}` : undefined} className={`group transition-colors cursor-pointer ${!isValid ? 'border-red-500/50' : isExpanded ? 'border-cyan-500/50' : 'hover:border-cyan-500/30'}`}>
                              
                              {/* --- COLLAPSED VIEW --- */}
                              <div className="flex items-center justify-between" onClick={() => toggleExpand(q.id)}>
                                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                      {!isExpanded && (
                                          <div className="flex-1 flex flex-col gap-1 w-full">
                                              {/* Top Line: Icon | Text | Image Thumb */}
                                              <div className="flex items-center gap-3 w-full">
                                                  <div className={`p-1.5 rounded border ${getTypeColor(q.questionType)}`}>
                                                      {getTypeIcon(q.questionType)}
                                                  </div>
                                                  <span className={`font-bold font-mono text-sm md:text-base break-words flex-1 pr-4 ${!q.text ? 'text-gray-600 italic' : 'text-gray-300'}`}>
                                                      {q.text || t.enter_question}
                                                  </span>
                                                  {q.imageUrl && (
                                                      <div className="w-8 h-8 rounded border border-gray-700 bg-black overflow-hidden shrink-0">
                                                          <img src={q.imageUrl} alt="Q" className="w-full h-full object-cover" />
                                                      </div>
                                                  )}
                                                  {!isValid && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                              </div>
                                              
                                              {/* Bottom Line: Correct Answer */}
                                              {correctTexts && (
                                                  <div className="flex items-center gap-1 text-[10px] text-green-500/80 font-mono pl-10">
                                                      <Check className="w-3 h-3" /> {correctTexts}
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                      
                                      {/* Header Title when Expanded */}
                                      {isExpanded && <div className="flex items-center gap-2 text-cyan-400"><span className="font-cyber text-lg">{t.editing} Q-{index+1}</span></div>}
                                  </div>
                                  
                                  {/* Right Actions */}
                                  <div className="flex items-center gap-2">
                                      {!isExpanded && (
                                          <>
                                              <button onClick={(e) => { e.stopPropagation(); duplicateQuestion(q.id); }} className="p-2 text-gray-600 hover:text-cyan-400 transition-colors rounded hover:bg-cyan-950/20" title="Duplicar"><Copy className="w-4 h-4" /></button>
                                              <button onClick={(e) => removeQuestion(q.id, e)} className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded hover:bg-red-950/20" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                          </>
                                      )}
                                      <div className="p-2 text-cyan-500">{isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}</div>
                                  </div>
                              </div>

                              {/* --- EXPANDED VIEW --- */}
                              {isExpanded && (
                                  <div className="space-y-6 mt-6 border-t border-gray-800 pt-6 animate-in slide-in-from-top-2 cursor-default" onClick={e => e.stopPropagation()}>
                                      
                                      {/* QUALITY FLAGS BANNER */}
                                      {(q.reconstructed || q.qualityFlags?.needsHumanReview) && (
                                          <div className="flex items-center gap-4 p-2 bg-purple-950/20 border-l-4 border-purple-500 rounded text-xs font-mono text-purple-200">
                                              {q.reconstructed && <span className="flex items-center gap-1"><FileSearch className="w-3 h-3"/> Reconstructed by AI</span>}
                                              {q.qualityFlags?.needsHumanReview && <span className="flex items-center gap-1 text-yellow-300"><Eye className="w-3 h-3"/> Needs Review</span>}
                                          </div>
                                      )}

                                      {/* TYPE & TIMER ROW */}
                                      <div className="flex flex-col md:flex-row gap-4">
                                          <div className="flex-1">
                                              <CyberSelect 
                                                  label={t.q_type_label} 
                                                  options={getGroupedTypeOptions() as any} // Pass grouped options
                                                  value={q.questionType || QUESTION_TYPES.MULTIPLE_CHOICE} 
                                                  onChange={(e) => handleTypeChange(q.id, e.target.value)} 
                                              />
                                          </div>
                                          <div className="w-full md:w-32">
                                              <label className="text-xs font-mono text-gray-500 block mb-1">{t.timer_sec}</label>
                                              <input type="number" value={q.timeLimit} onChange={(e) => updateQuestion(q.id, { timeLimit: parseInt(e.target.value) || 0 })} className="bg-black/50 border border-gray-700 w-full p-3 text-center font-mono text-cyan-400 focus:border-cyan-500 outline-none rounded-sm" />
                                          </div>
                                      </div>

                                      {/* QUESTION TEXT + IMAGE BUTTON ROW */}
                                      <div className="flex gap-4">
                                          <div className="flex-1 space-y-2">
                                              <CyberTextArea label={t.q_text_label} placeholder={t.enter_question} value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} className="text-lg font-bold min-h-[80px]" />
                                          </div>
                                          
                                          {/* IMAGE TRIGGER BOX */}
                                          <div className="w-32 shrink-0 flex flex-col gap-1">
                                              <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest block opacity-0">IMG</label> 
                                              {q.imageUrl ? (
                                                  <div 
                                                      onClick={() => openImagePicker(q.id, q.imageUrl, undefined, q.imageCredit)} // PASS CURRENT URL & CREDIT
                                                      className="h-full min-h-[80px] w-full border border-gray-700 bg-black/40 rounded overflow-hidden relative group cursor-pointer hover:border-cyan-500 transition-all flex items-center justify-center"
                                                  >
                                                      <img src={q.imageUrl} className="w-full h-full object-contain max-h-[120px]" alt="Q" />
                                                      
                                                      {/* UNSPLASH ATTRIBUTION PREVIEW */}
                                                      {q.imageCredit && q.imageCredit.source === 'Unsplash' && (
                                                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-white p-1 truncate">
                                                              Photo by {q.imageCredit.name} on Unsplash
                                                          </div>
                                                      )}

                                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <ImageIcon className="w-6 h-6 text-white" />
                                                      </div>
                                                      <button 
                                                          onClick={(e) => { e.stopPropagation(); updateQuestion(q.id, { imageUrl: '' }); }}
                                                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                                      >
                                                          <XCircle className="w-3 h-3" />
                                                      </button>
                                                  </div>
                                              ) : (
                                                  <button 
                                                      onClick={() => openImagePicker(q.id)}
                                                      className="h-full min-h-[80px] w-full border border-dashed border-gray-700 bg-black/20 rounded flex flex-col items-center justify-center text-gray-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all gap-1"
                                                  >
                                                      <ImageIcon className="w-6 h-6" />
                                                      <span className="text-[9px] font-mono font-bold uppercase">AÑADIR IMG</span>
                                                  </button>
                                              )}
                                          </div>
                                      </div>

                                      {/* OPTIONS AREA */}
                                      <div className="bg-black/20 p-4 rounded border border-gray-800/50">
                                          {/* --- STANDARD OPTIONS (MC, MS, TF, POLL, ORDER) --- */}
                                          {(q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT || q.questionType === QUESTION_TYPES.TRUE_FALSE || q.questionType === QUESTION_TYPES.POLL || q.questionType === QUESTION_TYPES.ORDER || !q.questionType) && (
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  {q.options.length === 0 && (
                                                      <div className="col-span-2 text-center py-4">
                                                          <p className="text-yellow-500 font-mono text-sm mb-2">No options detected.</p>
                                                          <div className="flex justify-center gap-4">
                                                              <CyberButton variant="secondary" onClick={() => ensureOptions(q)} className="text-xs py-1">Initialize Options</CyberButton>
                                                              <CyberButton variant="neural" onClick={() => handleEnhanceQuestion(q)} isLoading={isEnhancing} className="text-xs py-1"><Wand2 className="w-3 h-3 mr-1"/> Auto-Fix (AI)</CyberButton>
                                                          </div>
                                                      </div>
                                                  )}
                                                  
                                                  {q.options.map((opt, i) => {
                                                      const isMulti = q.questionType === QUESTION_TYPES.MULTI_SELECT;
                                                      const isTF = q.questionType === QUESTION_TYPES.TRUE_FALSE;
                                                      const isPoll = q.questionType === QUESTION_TYPES.POLL;
                                                      const isOrder = q.questionType === QUESTION_TYPES.ORDER;
                                                      const isSelected = correctIds.includes(opt.id);
                                                      const isDragging = draggedOption?.qId === q.id && draggedOption?.idx === i;

                                                      return (
                                                      <div 
                                                          key={opt.id} 
                                                          draggable={isOrder}
                                                          onDragStart={(e) => isOrder && setDraggedOption({qId: q.id, idx: i})}
                                                          onDragOver={(e) => { e.preventDefault(); if(isOrder && draggedOption?.qId === q.id && draggedOption.idx !== i) {
                                                              const newOpts = [...q.options];
                                                              const [removed] = newOpts.splice(draggedOption.idx, 1);
                                                              newOpts.splice(i, 0, removed);
                                                              updateQuestion(q.id, { options: newOpts });
                                                              setDraggedOption({qId: q.id, idx: i});
                                                          }}}
                                                          onDragEnd={() => setDraggedOption(null)}
                                                          className={`flex items-center gap-3 bg-black/30 p-2 rounded border transition-colors group-focus-within:border-cyan-500 
                                                              ${isSelected ? 'border-green-500/50 bg-green-950/10' : 'border-gray-800 hover:border-gray-600'}
                                                              ${isDragging ? 'opacity-50 dashed border-purple-500' : ''}
                                                          `}
                                                      >
                                                          {isOrder && <div className="text-gray-600 cursor-grab"><GripVertical className="w-4 h-4"/></div>}
                                                          {isOrder && <span className="font-mono text-xs font-bold text-purple-400 w-4">{i + 1}º</span>}
                                                          
                                                          {!isPoll && !isOrder && (
                                                              <button onClick={() => handleCorrectSelection(q, opt.id)} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`} title={t.mark_correct}>
                                                                {isMulti ? (
                                                                    isSelected ? <CheckSquare className="w-6 h-6"/> : <div className="w-6 h-6 border-2 border-gray-600 rounded-sm hover:border-gray-400" />
                                                                ) : (
                                                                    isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />
                                                                )}
                                                              </button>
                                                          )}
                                                          
                                                          <div className="flex-1 flex gap-2 items-center">
                                                              {/* OPTION IMAGE PREVIEW OR ADD BUTTON */}
                                                              {opt.imageUrl ? (
                                                                  <div className="relative group/img w-8 h-8 shrink-0">
                                                                      <img src={opt.imageUrl} className="w-8 h-8 object-cover rounded border border-gray-600" />
                                                                      <button 
                                                                          onClick={() => removeOptionImage(q.id, opt.id)}
                                                                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                                                      >
                                                                          <XCircle className="w-2 h-2" />
                                                                      </button>
                                                                  </div>
                                                              ) : (
                                                                  <button 
                                                                      onClick={() => openImagePicker(q.id, undefined, opt.id)}
                                                                      className="text-gray-600 hover:text-cyan-400 shrink-0"
                                                                      title="Añadir imagen a opción"
                                                                  >
                                                                      <ImageIcon className="w-4 h-4" />
                                                                  </button>
                                                              )}
                                                              
                                                              <input type="text" value={opt.text} onChange={(e) => updateOption(q.id, opt.id, e.target.value)} className="bg-transparent w-full text-sm font-mono text-gray-300 focus:outline-none focus:text-cyan-300" placeholder={`${t.option_placeholder} ${i + 1}`} />
                                                          </div>

                                                          {!isTF && (
                                                              <button onClick={() => removeOption(q.id, opt.id)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                                          )}
                                                      </div>
                                                      );
                                                  })}
                                                  {q.questionType !== QUESTION_TYPES.TRUE_FALSE && q.options.length > 0 && q.options.length < 6 && (
                                                      <button onClick={() => addOption(q.id)} className="flex items-center justify-center gap-2 bg-black/20 border border-dashed border-gray-700 p-2 rounded text-gray-500 hover:text-cyan-400 hover:border-cyan-500 transition-all">
                                                          <Plus className="w-4 h-4" /> {t.option_placeholder}
                                                      </button>
                                                  )}
                                              </div>
                                          )}

                                          {/* --- SHORT ANSWER CONFIG (FILL_GAP) --- */}
                                          {q.questionType === QUESTION_TYPES.FILL_GAP && (
                                              <div className="space-y-4">
                                                  {/* 1. Primary Answer */}
                                                  <div className="space-y-2">
                                                      <label className="text-xs font-mono text-green-400 uppercase tracking-widest font-bold">RESPUESTA CORRECTA PRINCIPAL</label>
                                                      {q.options.length > 0 && (
                                                          <CyberInput 
                                                              value={q.options[0].text} 
                                                              onChange={(e) => updateOption(q.id, q.options[0].id, e.target.value)}
                                                              placeholder="Escribe la respuesta exacta..."
                                                              className="border-green-500/50 bg-green-950/10 focus:border-green-400"
                                                          />
                                                      )}
                                                      {q.options.length === 0 && (
                                                          <CyberButton onClick={() => ensureOptions(q)} className="text-xs">Inicializar Respuesta</CyberButton>
                                                      )}
                                                  </div>

                                                  {/* 2. Match Config */}
                                                  <div className="bg-black/30 p-3 rounded border border-gray-700">
                                                      <label className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-2">VALIDACIÓN DE RESPUESTA</label>
                                                      <CyberCheckbox 
                                                          label="Aceptar variaciones (Ignorar mayúsculas y tildes)" 
                                                          checked={q.matchConfig?.ignoreAccents ?? true} 
                                                          onChange={(c) => updateQuestion(q.id, { 
                                                              matchConfig: { 
                                                                  ...q.matchConfig, 
                                                                  ignoreAccents: c,
                                                                  caseSensitive: !c 
                                                              } 
                                                          })} 
                                                      />
                                                  </div>

                                                  {/* 3. Alternative Answers */}
                                                  <div className="space-y-2 pt-2 border-t border-gray-800">
                                                      <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">RESPUESTAS ALTERNATIVAS (SINÓNIMOS)</label>
                                                      <p className="text-[10px] text-gray-500 mb-2">Añade variaciones válidas (ej: "2ª GM", "II Guerra Mundial") para que el sistema las acepte automáticamente.</p>
                                                      
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                          {q.options.slice(1).map((opt, i) => (
                                                              <div key={opt.id} className="flex items-center gap-2">
                                                                  <input 
                                                                      type="text" 
                                                                      value={opt.text} 
                                                                      onChange={(e) => updateOption(q.id, opt.id, e.target.value)} 
                                                                      className="bg-black/40 border border-gray-700 text-sm p-2 rounded flex-1 focus:border-cyan-500 outline-none text-gray-300"
                                                                      placeholder="Alternativa..." 
                                                                  />
                                                                  <button onClick={() => removeOption(q.id, opt.id)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                                              </div>
                                                          ))}
                                                          <button onClick={() => addOption(q.id)} className="flex items-center justify-center gap-2 bg-black/20 border border-dashed border-gray-700 p-2 rounded text-gray-500 hover:text-cyan-400 hover:border-cyan-500 transition-all text-xs h-[38px]">
                                                              <Plus className="w-3 h-3" /> AÑADIR ALTERNATIVA
                                                          </button>
                                                      </div>
                                                  </div>
                                              </div>
                                          )}
                                      </div>

                                      {/* FEEDBACK & FOOTER ACTIONS */}
                                      {q.questionType !== QUESTION_TYPES.OPEN_ENDED && (
                                          <div className="space-y-2">
                                              <div className="flex items-center gap-4">
                                                  <CyberCheckbox 
                                                      label="Añadir Feedback / Curiosidad" 
                                                      checked={!!q.feedback} 
                                                      onChange={(checked) => updateQuestion(q.id, { feedback: checked ? " " : "" })} 
                                                  />
                                              </div>
                                              {q.feedback !== undefined && q.feedback !== "" && (
                                                  <CyberTextArea 
                                                      label={t.q_feedback_label} 
                                                      value={q.feedback} 
                                                      onChange={(e) => updateQuestion(q.id, { feedback: e.target.value })} 
                                                      className="min-h-[60px] text-sm animate-in slide-in-from-top-2" 
                                                      placeholder="Añade un dato curioso que aparezca al responder..." 
                                                  />
                                              )}
                                          </div>
                                      )}
                                      
                                      <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
                                          <CyberButton variant="secondary" onClick={() => duplicateQuestion(q.id)} className="text-xs h-9">
                                              <CopyPlus className="w-4 h-4 mr-2" /> DUPLICAR
                                          </CyberButton>
                                          <CyberButton onClick={addQuestion} className="text-xs h-9 bg-green-700 hover:bg-green-600 border-none">
                                              <Plus className="w-4 h-4 mr-2" /> AÑADIR NUEVA
                                          </CyberButton>
                                      </div>
                                  </div>
                              )}
                            </CyberCard>
                          </div>
                        );
                      })}
                    </div>

                    {/* PAGINATION CONTROLS */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-800 pt-6">
                            <CyberButton 
                                variant="ghost" 
                                onClick={() => changePage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-2 text-xs"
                            >
                                <ChevronLeft className="w-4 h-4" /> PREV
                            </CyberButton>
                            
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-500">
                                    PAGE {currentPage} OF {totalPages}
                                </span>
                            </div>

                            <CyberButton 
                                variant="ghost" 
                                onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-2 text-xs"
                            >
                                NEXT <ChevronRight className="w-4 h-4" />
                            </CyberButton>
                        </div>
                    )}
                </>
              )}
          </div>
      </div>
    </div>
  );
};
