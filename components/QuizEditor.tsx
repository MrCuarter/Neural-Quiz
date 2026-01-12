
import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, Option, PLATFORM_SPECS, QUESTION_TYPES, ExportFormat } from '../types';
import { CyberButton, CyberInput, CyberCard, CyberSelect, CyberTextArea } from './ui/CyberUI';
import { Trash2, Plus, CheckCircle2, Circle, Upload, Link as LinkIcon, Download, ChevronDown, ChevronUp, AlertCircle, Bot, Zap, Globe, AlignLeft, CheckSquare, Type, Palette, ArrowDownUp, GripVertical, AlertTriangle } from 'lucide-react';
import { generateQuizQuestions } from '../services/geminiService';
import { detectAndParseStructure } from '../services/importService';
import * as XLSX from 'xlsx';

interface QuizEditorProps {
  quiz: Quiz;
  setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
  onExport: () => void;
  showImportOptions?: boolean;
  t: any; // Translation object
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ quiz, setQuiz, onExport, showImportOptions = true, t }) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [targetPlatform, setTargetPlatform] = useState<string>('UNIVERSAL');
  const [hasSelectedPlatform, setHasSelectedPlatform] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (quiz.questions.length > 0) setHasSelectedPlatform(true);
  }, []);

  const uuid = () => Math.random().toString(36).substring(2, 9);

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
    setQuiz(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    setExpandedQuestionId(newQ.id);
  };

  const removeQuestion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // STRICT SEPARATION: Single Choice vs Multi-Select
  const handleCorrectSelection = (q: Question, optionId: string) => {
      if (q.questionType === QUESTION_TYPES.MULTI_SELECT) {
          // TOGGLE LOGIC (Checkbox)
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
          // RADIO LOGIC (Single)
          // Unselect everything else, select only this one.
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

  // Safe Option Initialization
  const ensureOptions = (q: Question) => {
      if ((q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT) && q.options.length === 0) {
          // Immediately inject empty options if missing to prevent "Empty UI" bug
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
      setQuiz(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
      setAiTopic(''); setShowAiModal(false);
    } catch (e) { alert(t.alert_fail); } finally { setIsGenerating(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const newQuestions = detectAndParseStructure(workbook);
        if (!newQuestions || newQuestions.length === 0) { alert(t.alert_no_valid_csv); return; }
        setQuiz(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
        if (fileInputRef.current) fileInputRef.current.value = "";
        setHasSelectedPlatform(true);
      } catch (err: any) { alert(`${t.alert_import_error}: ${err.message}`); }
    };
  };

  // Helper for translated types in dropdown
  const getTranslatedType = (type: string) => {
      if (type === QUESTION_TYPES.MULTIPLE_CHOICE) return t.type_mc;
      if (type === QUESTION_TYPES.MULTI_SELECT) return t.type_ms;
      if (type === QUESTION_TYPES.TRUE_FALSE) return t.type_tf;
      if (type === QUESTION_TYPES.FILL_GAP) return t.type_short;
      if (type === QUESTION_TYPES.ORDER) return t.type_order;
      return type;
  };

  // --- RENDER ---

  if (!hasSelectedPlatform && showImportOptions) {
      return (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
             <CyberCard title={t.editor_setup_title} className="max-w-2xl mx-auto border-cyan-500/50">
                 <div className="space-y-6 text-center p-6">
                     <Globe className="w-16 h-16 text-cyan-400 mx-auto animate-pulse" />
                     <p className="text-gray-300 font-mono text-lg">{t.editor_setup_desc}</p>
                     <div className="text-left">
                         <CyberSelect 
                            label={t.editor_platform_label}
                            options={Object.keys(PLATFORM_SPECS).map(key => ({ value: key, label: PLATFORM_SPECS[key].name }))}
                            value={targetPlatform}
                            onChange={(e) => setTargetPlatform(e.target.value)}
                         />
                     </div>
                     <div className="grid grid-cols-2 gap-4 mt-6">
                         <CyberButton onClick={() => setHasSelectedPlatform(true)} className="w-full justify-center">{t.editor_start_btn}</CyberButton>
                         <div className="relative">
                            <input type="file" accept=".csv,.xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            <CyberButton variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full justify-center"><Upload className="w-4 h-4" /> {t.upload_csv}</CyberButton>
                         </div>
                     </div>
                 </div>
             </CyberCard>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 gap-4">
          <div>
            <h2 className="text-2xl font-cyber text-cyan-400">{t.questions_db} [{quiz.questions.length}]</h2>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mt-1">
                <span className="text-cyan-600 font-bold">{t.editor_targeting}</span>
                <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{PLATFORM_SPECS[targetPlatform].name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
             <CyberButton onClick={addQuestion} className="flex-1 md:flex-none flex items-center gap-2"><Plus className="w-4 h-4" /> {t.add_manual}</CyberButton>
             <CyberButton onClick={() => setShowAiModal(!showAiModal)} variant="neural" className="flex-1 md:flex-none flex items-center gap-2"><Bot className="w-4 h-4" /> {t.add_gen_ai}</CyberButton>
             {quiz.questions.length > 0 && <CyberButton variant="secondary" onClick={onExport} className="flex-1 md:flex-none flex items-center gap-2"><Download className="w-4 h-4" /> {t.go_export}</CyberButton>}
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

      {quiz.questions.length === 0 ? (
        <div className="text-center py-20 text-gray-600 font-mono-cyber border-2 border-dashed border-gray-800 rounded-lg">{t.no_data}</div>
      ) : (
        <div className="grid gap-4">
          {quiz.questions.map((q, index) => {
            const isValid = validateQuestion(q);
            const isExpanded = expandedQuestionId === q.id;
            const allowedTypes = PLATFORM_SPECS[targetPlatform].types;
            const getTypeIcon = (type?: string) => {
                if (type === QUESTION_TYPES.TRUE_FALSE) return <CheckSquare className="w-4 h-4" />;
                if (type === QUESTION_TYPES.FILL_GAP) return <Type className="w-4 h-4" />;
                if (type === QUESTION_TYPES.OPEN_ENDED) return <AlignLeft className="w-4 h-4" />;
                if (type === QUESTION_TYPES.DRAW) return <Palette className="w-4 h-4" />;
                if (type === QUESTION_TYPES.ORDER) return <ArrowDownUp className="w-4 h-4" />;
                if (type === QUESTION_TYPES.MULTI_SELECT) return <CheckSquare className="w-4 h-4" />;
                return <Zap className="w-4 h-4" />; // Single Choice
            };

            return (
              <div key={q.id} className={`transition-all duration-300 ${isExpanded ? 'scale-[1.01] z-10' : ''}`}>
                <CyberCard title={!isExpanded ? `Q-${index + 1}` : undefined} className={`group transition-colors cursor-pointer ${!isValid ? 'border-red-500/50' : isExpanded ? 'border-cyan-500/50' : 'hover:border-cyan-500/30'}`}>
                  <div className="flex items-center justify-between" onClick={() => toggleExpand(q.id)}>
                      <div className="flex items-center gap-4 flex-1 overflow-hidden">
                          {!isExpanded && (
                              <div className="flex-1 flex items-center gap-3">
                                  <div className="p-1.5 bg-gray-900 rounded border border-gray-700 text-cyan-500">{getTypeIcon(q.questionType)}</div>
                                  <span className={`font-bold font-mono truncate ${!q.text ? 'text-gray-600 italic' : 'text-gray-300'}`}>{q.text || t.enter_question}</span>
                                  {!isValid && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                              </div>
                          )}
                          {isExpanded && <div className="flex items-center gap-2 text-cyan-400"><span className="font-cyber text-lg">{t.editing} Q-{index+1}</span></div>}
                      </div>
                      <div className="flex items-center gap-2">
                          <button onClick={(e) => removeQuestion(q.id, e)} className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded hover:bg-red-950/20"><Trash2 className="w-5 h-5" /></button>
                          <div className="p-2 text-cyan-500">{isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}</div>
                      </div>
                  </div>

                  {isExpanded && (
                      <div className="space-y-6 mt-6 border-t border-gray-800 pt-6 animate-in slide-in-from-top-2 cursor-default" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col md:flex-row gap-4">
                              <div className="flex-1">
                                  <CyberSelect label={t.q_type_label} options={allowedTypes.map(type => ({ value: type, label: getTranslatedType(type) }))} value={q.questionType || QUESTION_TYPES.MULTIPLE_CHOICE} onChange={(e) => handleTypeChange(q.id, e.target.value)} />
                              </div>
                              <div className="w-full md:w-32">
                                  <label className="text-xs font-mono text-gray-500 block mb-1">{t.timer_sec}</label>
                                  <input type="number" value={q.timeLimit} onChange={(e) => updateQuestion(q.id, { timeLimit: parseInt(e.target.value) || 0 })} className="bg-black/50 border border-gray-700 w-full p-3 text-center font-mono text-cyan-400 focus:border-cyan-500 outline-none rounded-sm" />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <CyberTextArea label={t.q_text_label} placeholder={t.enter_question} value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} className="text-lg font-bold min-h-[80px]" />
                              <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded border border-gray-800 focus-within:border-cyan-500/50 transition-colors">
                                  <LinkIcon className="w-4 h-4 text-gray-500" />
                                  <input type="text" placeholder={t.media_url} value={q.imageUrl || ''} onChange={(e) => updateQuestion(q.id, { imageUrl: e.target.value })} className="bg-transparent w-full text-xs font-mono text-gray-400 focus:outline-none focus:text-cyan-300" />
                              </div>
                          </div>

                          {/* --- DYNAMIC ANSWER EDITOR: ENHANCED --- */}
                          <div className="bg-black/20 p-4 rounded border border-gray-800/50">
                              
                              {/* 1. STANDARD CHOICE (Single & Multi) */}
                              {(q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT || !q.questionType) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Defensive check for empty options */}
                                      {q.options.length === 0 && (
                                          <div className="col-span-2 text-center py-4">
                                              <p className="text-yellow-500 font-mono text-sm mb-2">No options detected.</p>
                                              <CyberButton variant="secondary" onClick={() => ensureOptions(q)} className="text-xs py-1">Initialize Options</CyberButton>
                                          </div>
                                      )}
                                      
                                      {q.options.map((opt, i) => {
                                          const isMulti = q.questionType === QUESTION_TYPES.MULTI_SELECT;
                                          const isSelected = isMulti 
                                              ? (q.correctOptionIds || []).includes(opt.id)
                                              : opt.id === q.correctOptionId;

                                          return (
                                          <div key={opt.id} className="flex items-center gap-3 bg-black/30 p-2 rounded border border-gray-800 hover:border-gray-600 transition-colors group-focus-within:border-cyan-500">
                                              <button onClick={() => handleCorrectSelection(q, opt.id)} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`} title={t.mark_correct}>
                                                {isMulti ? (
                                                    // VISUAL FIX: Checkbox vs Radio
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

                              {/* 2. TRUE / FALSE (Strict Mode) */}
                              {q.questionType === QUESTION_TYPES.TRUE_FALSE && (
                                  <div className="flex gap-4">
                                      {q.options.slice(0, 2).map((opt) => (
                                          <button key={opt.id} onClick={() => updateQuestion(q.id, { correctOptionId: opt.id, correctOptionIds: [opt.id] })} className={`flex-1 p-6 rounded border transition-all flex flex-col items-center gap-2 ${opt.id === q.correctOptionId ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-black/30 border-gray-700 text-gray-500 hover:border-gray-500'}`}>
                                              {opt.id === q.correctOptionId ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                                              <span className="text-xl font-bold">{opt.text}</span>
                                          </button>
                                      ))}
                                  </div>
                              )}

                              {/* 3. ORDER / SORT (Enhanced UI) */}
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
                                                  <input 
                                                    type="text" 
                                                    value={opt.text} 
                                                    onChange={(e) => updateOption(q.id, opt.id, e.target.value)} 
                                                    className="bg-transparent w-full text-base font-mono text-gray-200 focus:outline-none focus:text-white placeholder:text-gray-600" 
                                                    placeholder={`Step ${i + 1}`} 
                                                  />
                                                  {q.options.length > 2 && (
                                                      <button onClick={() => removeOption(q.id, opt.id)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-5 h-5"/></button>
                                                  )}
                                              </div>
                                          ))}
                                      </div>
                                      {q.options.length < 6 && (
                                          <button onClick={() => addOption(q.id)} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 text-sm font-bold tracking-wider rounded border border-gray-700 flex items-center justify-center gap-2">
                                              <Plus className="w-4 h-4" /> ADD STEP
                                          </button>
                                      )}
                                  </div>
                              )}

                              {/* 4. FILL IN THE BLANK (Enhanced Validator) */}
                              {q.questionType === QUESTION_TYPES.FILL_GAP && (
                                  <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                          <p className="text-xs text-yellow-500 font-mono flex items-center gap-2"><Type className="w-3 h-3"/> {t.q_fill_gap_desc}</p>
                                          
                                          {/* Visual Validator */}
                                          {(() => {
                                              const gapCount = (q.text.match(/__/g) || []).length;
                                              const ansCount = q.options.length;
                                              if (gapCount !== ansCount) {
                                                  return (
                                                      <button 
                                                        onClick={() => fixFillGap(q.id)}
                                                        className="flex items-center gap-2 text-xs bg-red-900/50 border border-red-500 text-red-200 px-2 py-1 rounded hover:bg-red-900 transition-colors animate-pulse"
                                                      >
                                                          <AlertTriangle className="w-3 h-3" />
                                                          <span>FIX SYNC: {gapCount} gaps vs {ansCount} answers</span>
                                                      </button>
                                                  );
                                              }
                                              return <span className="text-xs text-green-500 font-mono flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> SYNC OK</span>;
                                          })()}
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

                              {/* 5. OPEN ENDED */}
                              {(q.questionType === QUESTION_TYPES.OPEN_ENDED || q.questionType === QUESTION_TYPES.POLL) && (
                                  <div className="text-center p-6 text-gray-500 italic font-mono border border-dashed border-gray-700 rounded">{t.q_open_desc}</div>
                              )}
                          </div>

                          <CyberTextArea label={t.q_feedback_label} value={q.feedback || ''} onChange={(e) => updateQuestion(q.id, { feedback: e.target.value })} className="min-h-[60px] text-sm" placeholder="Explanation..." />
                      </div>
                  )}
                </CyberCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
