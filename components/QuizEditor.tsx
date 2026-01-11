
import React, { useState, useRef, useEffect } from 'react';
import { Quiz, Question, Option, PLATFORM_SPECS, QUESTION_TYPES, ExportFormat } from '../types';
import { CyberButton, CyberInput, CyberCard, CyberSelect, CyberTextArea } from './ui/CyberUI';
import { Trash2, Plus, CheckCircle2, Circle, Upload, Link as LinkIcon, Download, ChevronDown, ChevronUp, AlertCircle, Bot, Zap, Globe, AlignLeft, CheckSquare, Type, Palette } from 'lucide-react';
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
  
  // Platform Setup State
  const [targetPlatform, setTargetPlatform] = useState<string>('UNIVERSAL');
  const [hasSelectedPlatform, setHasSelectedPlatform] = useState(false);

  // In-Editor AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize: If quiz has questions, skip setup. If not, show setup.
  useEffect(() => {
      if (quiz.questions.length > 0) {
          setHasSelectedPlatform(true);
      }
  }, []);

  // Helper to generate IDs
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
      timeLimit: 20,
      questionType: QUESTION_TYPES.MULTIPLE_CHOICE
    };
    newQ.correctOptionId = newQ.options[0].id; // Default correct

    setQuiz(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    setExpandedQuestionId(newQ.id); // Auto expand new
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

  const handleTypeChange = (qId: string, newType: string) => {
     const question = quiz.questions.find(q => q.id === qId);
     if (!question) return;

     let updates: Partial<Question> = { questionType: newType };

     // Reset structure based on type to avoid data corruption visual glitches
     if (newType === QUESTION_TYPES.TRUE_FALSE) {
         const trueId = uuid();
         const falseId = uuid();
         updates.options = [
             { id: trueId, text: t.q_tf_true },
             { id: falseId, text: t.q_tf_false }
         ];
         updates.correctOptionId = trueId;
     } else if (newType === QUESTION_TYPES.FILL_GAP || newType === QUESTION_TYPES.OPEN_ENDED) {
         // Single "option" acts as the correct answer text storage
         const ansId = uuid();
         updates.options = [{ id: ansId, text: '' }];
         updates.correctOptionId = ansId;
     } else {
         // Restore 4 options if coming back to MC
         if (question.options.length < 2) {
             const opt1Id = uuid();
             updates.options = [
                 { id: opt1Id, text: '' },
                 { id: uuid(), text: '' },
                 { id: uuid(), text: '' },
                 { id: uuid(), text: '' },
             ];
             updates.correctOptionId = opt1Id;
         }
     }
     
     updateQuestion(qId, updates);
  };

  const toggleExpand = (id: string) => {
    setExpandedQuestionId(prev => prev === id ? null : id);
  };

  // Validation Check
  const validateQuestion = (q: Question) => {
    const hasText = q.text.trim().length > 0;
    
    if (q.questionType === QUESTION_TYPES.OPEN_ENDED || q.questionType === QUESTION_TYPES.POLL) {
        return hasText;
    }

    if (q.questionType === QUESTION_TYPES.FILL_GAP) {
        return hasText && q.options.length > 0 && q.options[0].text.trim().length > 0;
    }

    const hasCorrect = q.correctOptionId !== '' && q.options.some(o => o.id === q.correctOptionId);
    const hasOptions = q.options.filter(o => o.text.trim().length > 0).length >= 2;
    return hasText && hasCorrect && hasOptions;
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setIsGenerating(true);
    try {
      // Filter compatible types
      const platformTypes = PLATFORM_SPECS[targetPlatform].types;
      
      const generatedQs = await generateQuizQuestions({
        topic: aiTopic,
        count: aiCount,
        types: platformTypes.filter(t => t !== QUESTION_TYPES.DRAW), // Exclude draw for AI
        age: 'Universal',
        language: 'Spanish' // Infer from app language in real app
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
          questionType: gq.questionType,
          feedback: gq.feedback
        };
      });

      setQuiz(prev => ({
        ...prev,
        questions: [...prev.questions, ...newQuestions]
      }));
      setAiTopic('');
      setShowAiModal(false);
    } catch (e) {
      alert(t.alert_fail);
    } finally {
      setIsGenerating(false);
    }
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
        
        if (!newQuestions || newQuestions.length === 0) {
          alert(t.alert_no_valid_csv);
          return;
        }
        setQuiz(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions] }));
        if (fileInputRef.current) fileInputRef.current.value = "";
        setHasSelectedPlatform(true); // Auto-advance
      } catch (err: any) {
        alert(`${t.alert_import_error}: ${err.message}`);
      }
    };
  };

  // RENDER: SETUP SCREEN
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
                         <CyberButton onClick={() => setHasSelectedPlatform(true)} className="w-full justify-center">
                             {t.editor_start_btn}
                         </CyberButton>
                         <div className="relative">
                            <input type="file" accept=".csv,.xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            <CyberButton variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full justify-center">
                                <Upload className="w-4 h-4" /> {t.upload_csv}
                            </CyberButton>
                         </div>
                     </div>
                 </div>
             </CyberCard>
          </div>
      );
  }

  // RENDER: MAIN EDITOR
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 gap-4">
          <div>
            <h2 className="text-2xl font-cyber text-cyan-400">{t.questions_db} [{quiz.questions.length}]</h2>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mt-1">
                <span className="text-cyan-600 font-bold">{t.editor_targeting}</span>
                <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{PLATFORM_SPECS[targetPlatform].name}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <CyberButton onClick={addQuestion} className="flex-1 md:flex-none flex items-center gap-2">
               <Plus className="w-4 h-4" /> {t.add_manual}
             </CyberButton>

             <CyberButton onClick={() => setShowAiModal(!showAiModal)} variant="neural" className="flex-1 md:flex-none flex items-center gap-2">
               <Bot className="w-4 h-4" /> {t.add_gen_ai}
             </CyberButton>
             
             {quiz.questions.length > 0 && (
                <CyberButton variant="secondary" onClick={onExport} className="flex-1 md:flex-none flex items-center gap-2">
                  <Download className="w-4 h-4" /> {t.go_export}
                </CyberButton>
             )}
          </div>
      </div>

      {/* IN-CONTEXT AI GENERATOR */}
      {showAiModal && (
          <div className="border border-purple-500/50 bg-purple-950/10 p-6 rounded-lg animate-in slide-in-from-top-4">
              <div className="flex items-center gap-2 mb-4 text-purple-400 font-cyber">
                  <SparklesIcon className="w-5 h-5" />
                  <h3>{t.ai_modal_title}</h3>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                      <CyberInput 
                        label={t.topic_label} 
                        placeholder={t.gen_placeholder} 
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                      />
                  </div>
                  <div className="w-24">
                      <CyberInput 
                        type="number" 
                        label="#" 
                        value={aiCount}
                        onChange={(e) => setAiCount(parseInt(e.target.value))}
                        min={1} max={10}
                      />
                  </div>
                  <CyberButton onClick={handleAiGenerate} isLoading={isGenerating} disabled={!aiTopic}>
                      {t.ai_modal_add}
                  </CyberButton>
                  <CyberButton variant="ghost" onClick={() => setShowAiModal(false)}>
                      {t.ai_modal_close}
                  </CyberButton>
              </div>
              <p className="text-xs text-purple-300/60 mt-2 font-mono">
                  * {t.editor_types_desc}
              </p>
          </div>
      )}

      {/* QUESTIONS LIST */}
      {quiz.questions.length === 0 ? (
        <div className="text-center py-20 text-gray-600 font-mono-cyber border-2 border-dashed border-gray-800 rounded-lg">
          {t.no_data}
        </div>
      ) : (
        <div className="grid gap-4">
          {quiz.questions.map((q, index) => {
            const isValid = validateQuestion(q);
            const isExpanded = expandedQuestionId === q.id;
            const allowedTypes = PLATFORM_SPECS[targetPlatform].types;
            
            // Icon helper
            const getTypeIcon = (type?: string) => {
                if (type === QUESTION_TYPES.TRUE_FALSE) return <CheckSquare className="w-4 h-4" />;
                if (type === QUESTION_TYPES.FILL_GAP) return <Type className="w-4 h-4" />;
                if (type === QUESTION_TYPES.OPEN_ENDED) return <AlignLeft className="w-4 h-4" />;
                if (type === QUESTION_TYPES.DRAW) return <Palette className="w-4 h-4" />;
                return <Zap className="w-4 h-4" />;
            };

            return (
              <div key={q.id} className={`transition-all duration-300 ${isExpanded ? 'scale-[1.01] z-10' : ''}`}>
                <CyberCard 
                   title={!isExpanded ? `Q-${index + 1}` : undefined} 
                   className={`group transition-colors cursor-pointer ${
                       !isValid ? 'border-red-500/50' : isExpanded ? 'border-cyan-500/50' : 'hover:border-cyan-500/30'
                   }`}
                >
                  {/* CARD HEADER */}
                  <div className="flex items-center justify-between" onClick={() => toggleExpand(q.id)}>
                      <div className="flex items-center gap-4 flex-1 overflow-hidden">
                          {!isExpanded && (
                              <div className="flex-1 flex items-center gap-3">
                                  <div className="p-1.5 bg-gray-900 rounded border border-gray-700 text-cyan-500">
                                      {getTypeIcon(q.questionType)}
                                  </div>
                                  <span className={`font-bold font-mono truncate ${!q.text ? 'text-gray-600 italic' : 'text-gray-300'}`}>
                                      {q.text || t.enter_question}
                                  </span>
                                  {!isValid && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                              </div>
                          )}
                          {isExpanded && (
                              <div className="flex items-center gap-2 text-cyan-400">
                                  <span className="font-cyber text-lg">{t.editing} Q-{index+1}</span>
                              </div>
                          )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                          <button 
                              onClick={(e) => removeQuestion(q.id, e)} 
                              className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded hover:bg-red-950/20"
                          >
                              <Trash2 className="w-5 h-5" />
                          </button>
                          <div className="p-2 text-cyan-500">
                              {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                          </div>
                      </div>
                  </div>

                  {/* EXPANDED EDITOR */}
                  {isExpanded && (
                      <div className="space-y-6 mt-6 border-t border-gray-800 pt-6 animate-in slide-in-from-top-2 cursor-default" onClick={e => e.stopPropagation()}>
                          
                          {/* Top Controls: Type & Timer */}
                          <div className="flex flex-col md:flex-row gap-4">
                              <div className="flex-1">
                                  <CyberSelect 
                                    label={t.q_type_label}
                                    options={allowedTypes.map(type => ({ value: type, label: type }))}
                                    value={q.questionType || QUESTION_TYPES.MULTIPLE_CHOICE}
                                    onChange={(e) => handleTypeChange(q.id, e.target.value)}
                                  />
                              </div>
                              <div className="w-full md:w-32">
                                  <label className="text-xs font-mono text-gray-500 block mb-1">{t.timer_sec}</label>
                                  <input 
                                    type="number" 
                                    value={q.timeLimit} 
                                    onChange={(e) => updateQuestion(q.id, { timeLimit: parseInt(e.target.value) || 0 })}
                                    className="bg-black/50 border border-gray-700 w-full p-3 text-center font-mono text-cyan-400 focus:border-cyan-500 outline-none rounded-sm"
                                  />
                              </div>
                          </div>

                          {/* Question Text & Media */}
                          <div className="space-y-2">
                              <CyberTextArea 
                                  label={t.q_text_label}
                                  placeholder={t.enter_question}
                                  value={q.text}
                                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                  className="text-lg font-bold min-h-[80px]"
                              />
                              <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded border border-gray-800 focus-within:border-cyan-500/50 transition-colors">
                                  <LinkIcon className="w-4 h-4 text-gray-500" />
                                  <input 
                                    type="text" 
                                    placeholder={t.media_url}
                                    value={q.imageUrl || ''}
                                    onChange={(e) => updateQuestion(q.id, { imageUrl: e.target.value })}
                                    className="bg-transparent w-full text-xs font-mono text-gray-400 focus:outline-none focus:text-cyan-300"
                                  />
                              </div>
                          </div>

                          {/* DYNAMIC ANSWER EDITOR */}
                          <div className="bg-black/20 p-4 rounded border border-gray-800/50">
                              
                              {/* --- MULTIPLE CHOICE / MULTI-SELECT --- */}
                              {(q.questionType === QUESTION_TYPES.MULTIPLE_CHOICE || q.questionType === QUESTION_TYPES.MULTI_SELECT || !q.questionType) && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {q.options.map((opt, i) => (
                                      <div key={opt.id} className="flex items-center gap-3 bg-black/30 p-2 rounded border border-gray-800 hover:border-gray-600 transition-colors group-focus-within:border-cyan-500">
                                          <button 
                                            onClick={() => updateQuestion(q.id, { correctOptionId: opt.id })}
                                            className={`flex-shrink-0 transition-colors ${opt.id === q.correctOptionId ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`}
                                            title={t.mark_correct}
                                          >
                                            {opt.id === q.correctOptionId ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                          </button>
                                          <input 
                                            type="text"
                                            value={opt.text}
                                            onChange={(e) => updateOption(q.id, opt.id, e.target.value)}
                                            className="bg-transparent w-full text-sm font-mono text-gray-300 focus:outline-none focus:text-cyan-300"
                                            placeholder={`${t.option_placeholder} ${i + 1}`}
                                          />
                                      </div>
                                      ))}
                                  </div>
                              )}

                              {/* --- TRUE / FALSE --- */}
                              {q.questionType === QUESTION_TYPES.TRUE_FALSE && (
                                  <div className="flex gap-4">
                                      {q.options.slice(0, 2).map((opt) => (
                                          <button
                                            key={opt.id}
                                            onClick={() => updateQuestion(q.id, { correctOptionId: opt.id })}
                                            className={`flex-1 p-6 rounded border transition-all flex flex-col items-center gap-2 ${
                                                opt.id === q.correctOptionId 
                                                ? 'bg-green-900/30 border-green-500 text-green-400' 
                                                : 'bg-black/30 border-gray-700 text-gray-500 hover:border-gray-500'
                                            }`}
                                          >
                                              {opt.id === q.correctOptionId ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                                              <span className="text-xl font-bold">{opt.text}</span>
                                          </button>
                                      ))}
                                  </div>
                              )}

                              {/* --- FILL IN THE BLANK / SHORT ANSWER --- */}
                              {q.questionType === QUESTION_TYPES.FILL_GAP && (
                                  <div className="space-y-2">
                                      <label className="text-xs text-cyan-400 font-mono">{t.q_correct_answer}</label>
                                      <CyberInput 
                                          value={q.options[0]?.text || ''}
                                          onChange={(e) => updateOption(q.id, q.options[0].id, e.target.value)}
                                          placeholder="Type the exact answer..."
                                      />
                                      <p className="text-xs text-gray-500 font-mono italic">{t.q_short_desc}</p>
                                  </div>
                              )}

                              {/* --- OPEN ENDED / POLL / DRAW --- */}
                              {(q.questionType === QUESTION_TYPES.OPEN_ENDED || q.questionType === QUESTION_TYPES.POLL || q.questionType === QUESTION_TYPES.DRAW) && (
                                  <div className="text-center p-6 text-gray-500 italic font-mono border border-dashed border-gray-700 rounded">
                                      {t.q_open_desc}
                                  </div>
                              )}
                              
                          </div>

                          {/* Feedback */}
                          <CyberTextArea 
                             label={t.q_feedback_label}
                             value={q.feedback || ''}
                             onChange={(e) => updateQuestion(q.id, { feedback: e.target.value })}
                             className="min-h-[60px] text-sm"
                             placeholder="Explanation displayed after answering..."
                          />

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

// Simple Icon Component for the AI modal
function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M9 17v4" />
      <path d="M3 15h4" />
      <path d="M17 9h4" />
    </svg>
  )
}
