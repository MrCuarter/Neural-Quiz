
import React, { useState, useRef } from 'react';
import { Quiz, Question, Option } from '../types';
import { CyberButton, CyberInput, CyberCard } from './ui/CyberUI';
import { Trash2, Plus, CheckCircle2, Circle, Upload, Link as LinkIcon, Download, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { generateQuizQuestions } from '../services/geminiService';
import { parseUniversalCSV } from '../services/importService';

interface QuizEditorProps {
  quiz: Quiz;
  setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
  onExport: () => void;
  showImportOptions?: boolean;
  t: any; // Translation object
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ quiz, setQuiz, onExport, showImportOptions = true, t }) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleExpand = (id: string) => {
    setExpandedQuestionId(prev => prev === id ? null : id);
  };

  // Validation Check
  const validateQuestion = (q: Question) => {
    const hasText = q.text.trim().length > 0;
    const hasCorrect = q.correctOptionId !== '' && q.options.some(o => o.id === q.correctOptionId);
    const hasOptions = q.options.filter(o => o.text.trim().length > 0).length >= 2;
    return hasText && hasCorrect && hasOptions;
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setIsGenerating(true);
    try {
      const generatedQs = await generateQuizQuestions({
        topic: aiTopic,
        count: 5,
        types: ['Multiple Choice'],
        age: 'Universal'
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
          timeLimit: 30
        };
      });

      setQuiz(prev => ({
        ...prev,
        questions: [...prev.questions, ...newQuestions]
      }));
      setAiTopic('');
    } catch (e) {
      alert("AI Generation failed. Check your API Key or try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const newQuestions = parseUniversalCSV(text);
        if (newQuestions.length === 0) {
          alert("No valid questions found in CSV.");
          return;
        }
        setQuiz(prev => ({
          ...prev,
          questions: [...prev.questions, ...newQuestions]
        }));
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: any) {
        alert("Import Error: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {showImportOptions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CyberCard title={t.ai_generator_core} className="border-pink-500/30 bg-pink-950/10">
            <div className="flex flex-col gap-4">
              <CyberInput 
                label={t.topic_label}
                placeholder={t.gen_placeholder}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="border-pink-500/50 focus:border-pink-500 text-pink-100 placeholder:text-pink-800"
              />
              <CyberButton 
                onClick={handleAiGenerate} 
                disabled={isGenerating || !aiTopic}
                isLoading={isGenerating}
                className="bg-pink-600 border-pink-500 text-white hover:bg-pink-500 w-full"
              >
                {t.generate_btn}
              </CyberButton>
            </div>
          </CyberCard>

          <CyberCard title={t.universal_import} className="border-purple-500/30 bg-purple-950/10">
            <div className="flex flex-col gap-4 h-full justify-end">
              <p className="text-xs font-mono text-purple-300">
                {t.import_desc}
              </p>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <CyberButton 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-purple-500 text-purple-300 hover:bg-purple-900/30 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> {t.upload_csv}
              </CyberButton>
            </div>
          </CyberCard>
        </div>
      )}

      {/* Manual Editor */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-800 pb-4 gap-4">
          <h2 className="text-2xl font-cyber text-cyan-400">{t.questions_db} [{quiz.questions.length}]</h2>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <CyberButton onClick={addQuestion} className="flex-1 md:flex-none flex items-center gap-2">
               <Plus className="w-4 h-4" /> {t.add_manual}
             </CyberButton>
             
             {quiz.questions.length > 0 && (
                <CyberButton variant="secondary" onClick={onExport} className="flex-1 md:flex-none flex items-center gap-2 animate-pulse-glow">
                  <Download className="w-4 h-4" /> {t.go_export}
                </CyberButton>
             )}
          </div>
        </div>

        {quiz.questions.length === 0 ? (
          <div className="text-center py-20 text-gray-600 font-mono-cyber border-2 border-dashed border-gray-800 rounded-lg">
            {t.no_data}
          </div>
        ) : (
          <div className="grid gap-4">
            {quiz.questions.map((q, index) => {
              const isValid = validateQuestion(q);
              const isExpanded = expandedQuestionId === q.id;

              return (
                <div key={q.id} className={`transition-all duration-300 ${isExpanded ? 'scale-[1.01]' : ''}`}>
                  <CyberCard 
                     title={!isExpanded ? `Q-${index + 1}` : undefined} 
                     className={`group transition-colors cursor-pointer ${
                         !isValid ? 'border-red-500/50' : 'hover:border-cyan-500/50'
                     }`}
                  >
                    {/* Header Row (Always Visible) */}
                    <div className="flex items-center justify-between" onClick={() => toggleExpand(q.id)}>
                        <div className="flex items-center gap-4 flex-1">
                            {!isExpanded && (
                                <div className="flex-1 flex items-center gap-2">
                                    <span className={`font-bold font-mono ${!q.text ? 'text-gray-600 italic' : 'text-gray-300'}`}>
                                        {q.text || "Empty Question..."}
                                    </span>
                                    {!isValid && <AlertCircle className="w-4 h-4 text-red-500" />}
                                </div>
                            )}
                            {isExpanded && <span className="font-cyber text-cyan-400 text-lg">{t.editing} Q-{index+1}</span>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => removeQuestion(q.id, e)} 
                                className="p-2 text-gray-600 hover:text-red-500 transition-colors rounded hover:bg-red-950/20"
                                title="Delete Question"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <div className="p-2 text-cyan-500">
                                {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                            </div>
                        </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                        <div className="space-y-4 mt-6 border-t border-gray-800 pt-6 animate-in slide-in-from-top-2 cursor-default" onClick={e => e.stopPropagation()}>
                            {!isValid && (
                                <div className="bg-red-950/20 border border-red-500/30 p-2 rounded text-red-400 text-xs font-mono flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {t.warning_incomplete}
                                </div>
                            )}

                            <CyberInput 
                                placeholder={t.enter_question}
                                value={q.text}
                                onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                className="text-lg font-bold"
                            />

                            {/* Media Link (Optional) */}
                            <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded border border-gray-800">
                                <LinkIcon className="w-4 h-4 text-gray-500" />
                                <input 
                                type="text" 
                                placeholder={t.media_url}
                                value={q.imageUrl || ''}
                                onChange={(e) => updateQuestion(q.id, { imageUrl: e.target.value })}
                                className="bg-transparent w-full text-xs font-mono text-gray-400 focus:outline-none focus:text-cyan-300"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((opt, i) => (
                                <div key={opt.id} className="flex items-center gap-3 bg-black/30 p-2 rounded border border-gray-800 hover:border-gray-600 transition-colors">
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

                            <div className="flex items-center justify-end gap-2 mt-2">
                                <label className="text-xs font-mono text-gray-500">{t.timer_sec}</label>
                                <input 
                                type="number" 
                                value={q.timeLimit} 
                                onChange={(e) => updateQuestion(q.id, { timeLimit: parseInt(e.target.value) || 0 })}
                                className="bg-black/50 border border-gray-700 w-20 p-1 text-center font-mono text-cyan-400 focus:border-cyan-500 outline-none rounded"
                                />
                            </div>
                        </div>
                    )}
                  </CyberCard>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
