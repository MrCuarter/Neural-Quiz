
import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, Option, PLATFORM_SPECS, QUESTION_TYPES, ExportFormat } from '../types';
import { CyberButton, CyberInput, CyberCard, CyberSelect, CyberTextArea } from './ui/CyberUI';
import { Trash2, Plus, CheckCircle2, Circle, Upload, Link as LinkIcon, Download, ChevronDown, ChevronUp, AlertCircle, Bot, Zap, Globe, AlignLeft, CheckSquare, Type, Palette, ArrowDownUp, GripVertical, AlertTriangle, Image as ImageIcon, XCircle, Wand2, Eye, FileSearch, Check, Save, Copy, Tag, LayoutList, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { generateQuizQuestions, enhanceQuestion } from '../services/geminiService';
import { detectAndParseStructure } from '../services/importService';
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
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ quiz, setQuiz, onExport, onSave, isSaving, user, showImportOptions = true, t }) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<string>('UNIVERSAL');
  const [hasSelectedPlatform, setHasSelectedPlatform] = useState(false);
  
  // AI & Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  
  // Tags State
  const [newTag, setNewTag] = useState('');

  // --- NEW: PAGINATION & DND STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const cardRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  useEffect(() => {
      if (quiz.questions.length > 0) setHasSelectedPlatform(true);
  }, []);

  const uuid = () => Math.random().toString(36).substring(2, 9);

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(quiz.questions.length / ITEMS_PER_PAGE);
  
  // Ensure current page is valid
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
      
      // Scroll into view after a slight delay to allow render
      setTimeout(() => {
          const el = cardRefs.current[q.id];
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
  };

  // --- DRAG & DROP LOGIC (SIDEBAR) ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItemIndex(index);
      e.dataTransfer.effectAllowed = "move";
      // Transparent ghost
      const ghost = document.createElement('div');
      ghost.classList.add('opacity-0');
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedItemIndex === null || draggedItemIndex === index) return;

      const newQuestions = [...quiz.questions];
      const draggedItem = newQuestions[draggedItemIndex];
      
      // Remove and insert
      newQuestions.splice(draggedItemIndex, 1);
      newQuestions.splice(index, 0, draggedItem);
      
      setQuiz(prev => ({ ...prev, questions: newQuestions }));
      setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
      setDraggedItemIndex(null);
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
    // Initialize correct option
    newQ.correctOptionId = newQ.options[0].id; 
    newQ.correctOptionIds = [newQ.options[0].id];
    
    setQuiz(prev => {
        const newQs = [...prev.questions, newQ];
        // Jump to the new page if necessary
        setTimeout(() => setCurrentPage(Math.ceil(newQs.length / ITEMS_PER_PAGE)), 50);
        return { ...prev, questions: newQs };
    });
    setExpandedQuestionId(newQ.id);
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
              if (q.options.length >= 6) return q;
              return { ...q, options: [...q.options, { id: uuid(), text: '' }] };
          })
      }));
  };

  const removeOption = (qId: string, oId: string) => {
      setQuiz(prev => ({
          ...prev,
          questions: prev.questions.map(q => {
              if (q.id !== qId) return q;
              if (q.options.length <= 2) return q;
              return { ...q, options: q.options.filter(o => o.id !== oId) };
          })
      }));
  };

  const handleCorrectSelection = (q: Question, optionId: string) => {
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
          updates.correctOptionId = ""; 
          updates.correctOptionIds = [];
          while(question.options.length < 3) question.options.push({id: uuid(), text: ''});
     } else if (newType === QUESTION_TYPES.FILL_GAP) {
         updates.correctOptionId = ""; 
         updates.correctOptionIds = [];
     } else if (newType === QUESTION_TYPES.OPEN_ENDED) {
         updates.options = [{ id: uuid(), text: '' }];
         updates.correctOptionId = "";
         updates.correctOptionIds = [];
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
        const gapCount = (q.text.match(/__/g) || []).length;
        return hasText && gapCount > 0 && q.options.length === gapCount && q.options.every(o => o.text.trim().length > 0);
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
          const enhancedQ = await enhanceQuestion(q, quiz.description || "", "es");
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

  const fixFillGap = (qId: string) => {
      setQuiz(prev => ({
          ...prev,
          questions: prev.questions.map(q => {
              if (q.id !== qId) return q;
              const gapCount = (q.text.match(/__/g) || []).length;
              let newOptions = [...q.options];
              if (newOptions.length > gapCount) {
                  newOptions = newOptions.slice(0, gapCount);
              } else {
                  while (newOptions.length < gapCount) {
                      newOptions.push({ id: uuid(), text: '' });
                  }
              }
              return { ...q, options: newOptions };
          })
      }));
  };

  const ensureOptions = (q: Question) => {
      if ((q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT) && q.options.length === 0) {
          const newOpts = [
              { id: uuid(), text: '' }, { id: uuid(), text: '' },
              { id: uuid(), text: '' }, { id: uuid(), text: '' }
          ];
          updateQuestion(q.id, { options: newOpts });
      }
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setIsGenerating(true);
    try {
      const platformTypes = PLATFORM_SPECS[targetPlatform].types;
      const generatedQs = await generateQuizQuestions({
        topic: aiTopic, count: aiCount, types: platformTypes.filter(t => t !== QUESTION_TYPES.DRAW), age: 'Universal', language: 'Spanish'
      });
      const newQuestions: Question[] = generatedQs.map(gq => {
        const qId = uuid();
        const options: Option[] = gq.rawOptions.map(optText => ({ id: uuid(), text: optText }));
        const indices = gq.correctIndices || [gq.correctIndex || 0];
        const correctIds = indices.map(i => options[i]?.id).filter(id => !!id);
        
        return {
          id: qId, text: gq.text, options: options, 
          correctOptionId: correctIds[0] || "", 
          correctOptionIds: correctIds,
          timeLimit: 30, questionType: gq.questionType, feedback: gq.feedback
        };
      });
      setQuiz(prev => {
          const updatedQs = [...prev.questions, ...newQuestions];
          setTimeout(() => setCurrentPage(Math.ceil(updatedQs.length / ITEMS_PER_PAGE)), 50);
          return { ...prev, questions: updatedQs };
      });
      setAiTopic(''); setShowAiModal(false);
    } catch (e) { alert(t.alert_fail); } finally { setIsGenerating(false); }
  };

  // --- TAGS HANDLER ---
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
      return type;
  };

  const getTypeIcon = (type?: string) => {
      if (type === QUESTION_TYPES.TRUE_FALSE) return <CheckSquare className="w-4 h-4" />;
      if (type === QUESTION_TYPES.FILL_GAP) return <Type className="w-4 h-4" />;
      if (type === QUESTION_TYPES.OPEN_ENDED) return <AlignLeft className="w-4 h-4" />;
      if (type === QUESTION_TYPES.DRAW) return <Palette className="w-4 h-4" />;
      if (type === QUESTION_TYPES.ORDER) return <ArrowDownUp className="w-4 h-4" />;
      if (type === QUESTION_TYPES.MULTI_SELECT) return <CheckSquare className="w-4 h-4" />;
      return <Zap className="w-4 h-4" />; 
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
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

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  {user ? (
                      <>
                          {quiz.id ? (
                              <>
                                  <CyberButton onClick={() => onSave(false)} isLoading={isSaving} className="flex-1 md:flex-none text-xs h-10 px-4">
                                      <Save className="w-4 h-4 mr-1" /> ACTUALIZAR
                                  </CyberButton>
                                  <CyberButton variant="secondary" onClick={() => onSave(true)} isLoading={isSaving} className="flex-1 md:flex-none text-xs h-10 px-4">
                                      <Copy className="w-4 h-4 mr-1" /> COPIAR
                                  </CyberButton>
                              </>
                          ) : (
                              <CyberButton variant="neural" onClick={() => onSave(false)} isLoading={isSaving} className="flex-1 md:flex-none h-10">
                                  <Save className="w-4 h-4 mr-2" /> GUARDAR EN MIS QUIZES
                              </CyberButton>
                          )}
                      </>
                  ) : (
                      <div className="text-xs text-gray-500 font-mono italic px-2">
                          Inicia sesión para guardar
                      </div>
                  )}
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
             {quiz.questions.length > 0 && <CyberButton variant="ghost" onClick={onExport} className="flex-1 md:flex-none flex items-center gap-2 text-xs h-9 border border-gray-700 bg-black/40"><Download className="w-4 h-4" /> {t.go_export}</CyberButton>}
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
          
          {/* SIDEBAR (TOC) */}
          {quiz.questions.length > 0 && (
              <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-24 max-h-[600px] flex flex-col gap-2">
                  <div className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden flex flex-col max-h-full">
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
                                      onDragStart={(e) => handleDragStart(e, idx)}
                                      onDragOver={(e) => handleDragOver(e, idx)}
                                      onDragEnd={handleDragEnd}
                                      onClick={() => jumpToQuestion(idx)}
                                      className={`
                                          group flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-all border
                                          ${isActive ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-200' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'}
                                          ${isDragging ? 'opacity-50 dashed border-gray-500' : ''}
                                      `}
                                  >
                                      <div className="cursor-grab text-gray-700 hover:text-gray-400">
                                          <GripVertical className="w-3 h-3" />
                                      </div>
                                      <span className="font-mono font-bold w-5">{idx + 1}.</span>
                                      <span className="truncate flex-1">{q.text || "Empty..."}</span>
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
                        const needsEnhance = (!isValid && q.options.length < 2) || (q.options.length > 0 && !q.correctOptionId);
                        const isEnhancing = enhancingId === q.id;

                        // --- CORRECT ANSWER LOGIC ---
                        const correctIds = q.correctOptionIds && q.correctOptionIds.length > 0 
                                           ? q.correctOptionIds 
                                           : (q.correctOptionId ? [q.correctOptionId] : []);
                        
                        const correctTexts = q.options.filter(o => correctIds.includes(o.id)).map(o => o.text).join(", ");
                        const hasExposedCorrect = correctIds.length > 0;

                        return (
                          <div 
                            key={q.id} 
                            ref={el => { cardRefs.current[q.id] = el; }}
                            className={`transition-all duration-300 ${isExpanded ? 'scale-[1.01] z-10' : ''}`}
                          >
                            <CyberCard title={!isExpanded ? `Q-${index + 1}` : undefined} className={`group transition-colors cursor-pointer ${!isValid ? 'border-red-500/50' : isExpanded ? 'border-cyan-500/50' : 'hover:border-cyan-500/30'}`}>
                              <div className="flex items-center justify-between" onClick={() => toggleExpand(q.id)}>
                                  <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                      {!isExpanded && (
                                          <div className="flex-1 flex items-center gap-3">
                                              <div className="p-1.5 bg-gray-900 rounded border border-gray-700 text-cyan-500">{getTypeIcon(q.questionType)}</div>
                                              <span className={`font-bold font-mono truncate ${!q.text ? 'text-gray-600 italic' : 'text-gray-300'}`}>{q.text || t.enter_question}</span>
                                              {!isValid && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                              {q.qualityFlags?.needsHumanReview && <span title="Needs Human Review"><Eye className="w-4 h-4 text-yellow-500 shrink-0 animate-pulse" /></span>}
                                              {q.reconstructed && <span title="Reconstructed by AI"><FileSearch className="w-4 h-4 text-purple-400 shrink-0" /></span>}
                                          </div>
                                      )}
                                      {isExpanded && <div className="flex items-center gap-2 text-cyan-400"><span className="font-cyber text-lg">{t.editing} Q-{index+1}</span></div>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      {needsEnhance && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEnhanceQuestion(q); }} 
                                                disabled={isEnhancing}
                                                className="p-2 bg-purple-900/40 text-purple-300 hover:text-white border border-purple-500/50 hover:bg-purple-600 rounded transition-colors flex items-center gap-2 text-xs font-bold"
                                                title="Auto-Fix with AI"
                                            >
                                                <Wand2 className={`w-4 h-4 ${isEnhancing ? 'animate-spin' : ''}`} />
                                                {isEnhancing ? 'FIXING...' : 'ENHANCE'}
                                            </button>
                                      )}
                                      <button onClick={(e) => removeQuestion(q.id, e)} className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded hover:bg-red-950/20"><Trash2 className="w-5 h-5" /></button>
                                      <div className="p-2 text-cyan-500">{isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}</div>
                                  </div>
                              </div>

                              {isExpanded && (
                                  <div className="space-y-6 mt-6 border-t border-gray-800 pt-6 animate-in slide-in-from-top-2 cursor-default" onClick={e => e.stopPropagation()}>
                                      
                                      {/* QUALITY FLAGS BANNER */}
                                      {(q.reconstructed || q.qualityFlags?.needsHumanReview) && (
                                          <div className="flex items-center gap-4 p-2 bg-purple-950/20 border-l-4 border-purple-500 rounded text-xs font-mono text-purple-200">
                                              {q.reconstructed && <span className="flex items-center gap-1"><FileSearch className="w-3 h-3"/> Reconstructed by AI</span>}
                                              {q.qualityFlags?.needsHumanReview && <span className="flex items-center gap-1 text-yellow-300"><Eye className="w-3 h-3"/> Needs Review</span>}
                                              {q.sourceEvidence && <span className="text-gray-500 italic ml-auto truncate max-w-[200px]">Evidence: {q.sourceEvidence}</span>}
                                          </div>
                                      )}

                                      {/* TYPE & TIMER ROW */}
                                      <div className="flex flex-col md:flex-row gap-4">
                                          <div className="flex-1">
                                              <CyberSelect label={t.q_type_label} options={allowedTypes.map(type => ({ value: type, label: getTranslatedType(type) }))} value={q.questionType || QUESTION_TYPES.MULTIPLE_CHOICE} onChange={(e) => handleTypeChange(q.id, e.target.value)} />
                                          </div>
                                          <div className="w-full md:w-32">
                                              <label className="text-xs font-mono text-gray-500 block mb-1">{t.timer_sec}</label>
                                              <input type="number" value={q.timeLimit} onChange={(e) => updateQuestion(q.id, { timeLimit: parseInt(e.target.value) || 0 })} className="bg-black/50 border border-gray-700 w-full p-3 text-center font-mono text-cyan-400 focus:border-cyan-500 outline-none rounded-sm" />
                                          </div>
                                      </div>

                                      {/* QUESTION TEXT */}
                                      <div className="space-y-2">
                                          <CyberTextArea label={t.q_text_label} placeholder={t.enter_question} value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} className="text-lg font-bold min-h-[80px]" />
                                      </div>

                                      {/* IMAGE URL & PREVIEW */}
                                      <div className="bg-black/20 p-3 rounded border border-gray-800/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <LinkIcon className="w-4 h-4 text-gray-500" />
                                                <span className="text-xs font-mono text-gray-500 uppercase">{t.media_url}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="https://..." 
                                                    value={q.imageUrl || ''} 
                                                    onChange={(e) => updateQuestion(q.id, { imageUrl: e.target.value })} 
                                                    className="bg-black/40 border border-gray-700 p-2 rounded w-full text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500" 
                                                />
                                            </div>
                                            
                                            {q.imageUrl && (
                                                <div className="mt-3 relative w-full h-48 bg-black/50 rounded border border-gray-700 overflow-hidden flex items-center justify-center">
                                                    <img 
                                                        src={q.imageUrl} 
                                                        alt="Preview" 
                                                        className="max-h-full max-w-full object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.opacity = '0.3';
                                                        }}
                                                    />
                                                    <div className="absolute top-2 right-2">
                                                        <button 
                                                            onClick={() => updateQuestion(q.id, { imageUrl: '' })}
                                                            className="bg-red-900/80 text-white p-1 rounded hover:bg-red-600 transition-colors"
                                                            title="Remove Image"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                      </div>

                                      {/* OPTIONS AREA */}
                                      <div className="bg-black/20 p-4 rounded border border-gray-800/50">
                                          {(q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT || !q.questionType) && (
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
                                                      const isSelected = correctIds.includes(opt.id);

                                                      return (
                                                      <div key={opt.id} className={`flex items-center gap-3 bg-black/30 p-2 rounded border transition-colors group-focus-within:border-cyan-500 ${isSelected ? 'border-green-500/50 bg-green-950/10' : 'border-gray-800 hover:border-gray-600'}`}>
                                                          <button onClick={() => handleCorrectSelection(q, opt.id)} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`} title={t.mark_correct}>
                                                            {isMulti ? (
                                                                isSelected ? <CheckSquare className="w-6 h-6"/> : <div className="w-6 h-6 border-2 border-gray-600 rounded-sm hover:border-gray-400" />
                                                            ) : (
                                                                isSelected ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />
                                                            )}
                                                          </button>
                                                          <input type="text" value={opt.text} onChange={(e) => updateOption(q.id, opt.id, e.target.value)} className="bg-transparent w-full text-sm font-mono text-gray-300 focus:outline-none focus:text-cyan-300" placeholder={`${t.option_placeholder} ${i + 1}`} />
                                                          <button onClick={() => removeOption(q.id, opt.id)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                                      </div>
                                                      );
                                                  })}
                                                  {q.options.length > 0 && q.options.length < 6 && (
                                                      <button onClick={() => addOption(q.id)} className="flex items-center justify-center gap-2 bg-black/20 border border-dashed border-gray-700 p-2 rounded text-gray-500 hover:text-cyan-400 hover:border-cyan-500 transition-all">
                                                          <Plus className="w-4 h-4" /> {t.option_placeholder}
                                                      </button>
                                                  )}
                                              </div>
                                          )}

                                          {q.questionType === QUESTION_TYPES.TRUE_FALSE && (
                                              <div className="flex gap-4">
                                                  {q.options.slice(0, 2).map((opt) => (
                                                      <button key={opt.id} onClick={() => updateQuestion(q.id, { correctOptionId: opt.id, correctOptionIds: [opt.id] })} className={`flex-1 p-6 rounded border transition-all flex flex-col items-center gap-2 ${correctIds.includes(opt.id) ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-black/30 border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                                          {correctIds.includes(opt.id) ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                                                          <span className="text-xl font-bold">{opt.text}</span>
                                                      </button>
                                                  ))}
                                              </div>
                                          )}
                                          
                                          {q.questionType === QUESTION_TYPES.ORDER && (
                                              <div className="space-y-4">
                                                  <div className="bg-blue-900/20 border-l-4 border-blue-500 p-3 text-sm text-blue-200 font-mono flex items-start gap-2">
                                                      <ArrowDownUp className="w-5 h-5 shrink-0" />
                                                      <p>{t.q_order_desc}</p>
                                                  </div>
                                                  <div className="grid gap-2">
                                                      {q.options.map((opt, i) => (
                                                          <div key={opt.id} className="flex items-center gap-3 bg-black/40 p-3 rounded border border-gray-700">
                                                              <div className="flex flex-col items-center justify-center w-8 h-8 bg-gray-800 rounded font-bold text-cyan-400 font-mono border border-gray-600">
                                                                  {i + 1}
                                                              </div>
                                                              <input type="text" value={opt.text} onChange={(e) => updateOption(q.id, opt.id, e.target.value)} className="bg-transparent w-full text-base font-mono text-gray-200 focus:outline-none focus:text-white placeholder:text-gray-600" placeholder={`Step ${i + 1}`} />
                                                              {q.options.length > 2 && <button onClick={() => removeOption(q.id, opt.id)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-5 h-5"/></button>}
                                                          </div>
                                                      ))}
                                                  </div>
                                                  {q.options.length < 6 && <button onClick={() => addOption(q.id)} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 text-sm font-bold tracking-wider rounded border border-gray-700 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> ADD STEP</button>}
                                              </div>
                                          )}
                                          
                                          {q.questionType === QUESTION_TYPES.FILL_GAP && (
                                              <div className="space-y-4">
                                                  <div className="flex items-center justify-between">
                                                      <p className="text-xs text-yellow-500 font-mono flex items-center gap-2"><Type className="w-3 h-3"/> {t.q_fill_gap_desc}</p>
                                                      {((q.text.match(/__/g) || []).length !== q.options.length) && <button onClick={() => fixFillGap(q.id)} className="flex items-center gap-2 text-xs bg-red-900/50 border border-red-500 text-red-200 px-2 py-1 rounded hover:bg-red-900 transition-colors animate-pulse"><AlertTriangle className="w-3 h-3" /><span>FIX SYNC</span></button>}
                                                  </div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      {q.options.map((opt, i) => (
                                                          <div key={opt.id} className="bg-black/30 p-2 rounded border border-gray-800 flex items-center gap-2">
                                                              <span className="text-xs text-gray-500 font-mono whitespace-nowrap bg-gray-900 px-1 rounded">GAP {i+1}</span>
                                                              <input type="text" value={opt.text} onChange={(e) => updateOption(q.id, opt.id, e.target.value)} className="bg-transparent w-full text-sm font-mono text-cyan-100 focus:outline-none" placeholder="Answer..." />
                                                              <button onClick={() => removeOption(q.id, opt.id)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                                                          </div>
                                                      ))}
                                                  </div>
                                                  <button onClick={() => addOption(q.id)} className="text-xs text-cyan-500 hover:text-cyan-400 flex items-center gap-1"><Plus className="w-3 h-3"/> Add Gap Word</button>
                                              </div>
                                          )}

                                          {(q.questionType === QUESTION_TYPES.OPEN_ENDED || q.questionType === QUESTION_TYPES.POLL) && (
                                              <div className="text-center p-6 text-gray-500 italic font-mono border border-dashed border-gray-700 rounded">{t.q_open_desc}</div>
                                          )}
                                      </div>
                                      
                                      {/* VISUAL FOOTER FOR CORRECT ANSWER */}
                                      {(q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT || q.questionType === QUESTION_TYPES.TRUE_FALSE) && (
                                        <div className="mt-4 pt-4 border-t border-gray-800 flex items-start gap-2 text-xs font-mono">
                                            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${hasExposedCorrect ? 'text-green-500' : 'text-red-500'}`} />
                                            <div>
                                                <span className={`${hasExposedCorrect ? 'text-green-500' : 'text-red-500'} font-bold uppercase mr-2`}>{t.q_correct_answer}:</span>
                                                <span className="text-gray-300">
                                                    {hasExposedCorrect ? correctTexts : <span className="text-red-500 italic">Correct answer not exposed (Public View)</span>}
                                                </span>
                                            </div>
                                        </div>
                                      )}

                                      <CyberTextArea label={t.q_feedback_label} value={q.feedback || ''} onChange={(e) => updateQuestion(q.id, { feedback: e.target.value })} className="min-h-[60px] text-sm" placeholder="Explanation..." />
                                  </div>
                              )}
                              
                              {/* COLLAPSED VIEW: Correct Answer Hint */}
                              {!isExpanded && correctTexts && (
                                  <div className="mt-2 px-1 text-[10px] text-green-500/70 font-mono truncate flex items-center gap-1">
                                      <Check className="w-3 h-3" /> {correctTexts}
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
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
