import React, { useState } from 'react';
import { Quiz, Question, Option, QUESTION_TYPES, PLATFORM_SPECS } from '../types';
import { CyberButton, CyberCard, CyberInput, CyberSelect } from './ui/CyberUI';
import { generateQuizQuestions } from '../services/geminiService';
import { Plus, Trash2, Save, Play, Download, Wand2, ArrowLeft, ArrowRight, X } from 'lucide-react';

interface QuizEditorProps {
    quiz: Quiz;
    setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
    onExport: () => void;
    onSave: (asCopy?: boolean) => Promise<string | void>;
    isSaving: boolean;
    user: any;
    t: any;
    onPlay: (quiz: Quiz) => void;
    currentLanguage?: string;
    onNavigate: (view: string) => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({ 
    quiz, setQuiz, onExport, onSave, isSaving, user, t, onPlay, currentLanguage, onNavigate 
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;
    
    // AI Modal State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiCount, setAiCount] = useState(5);
    const [aiLanguage, setAiLanguage] = useState('Spanish');
    const [targetPlatform, setTargetPlatform] = useState('UNIVERSAL');
    const [isGenerating, setIsGenerating] = useState(false);

    const uuid = () => Math.random().toString(36).substring(2, 9);

    const handleAiGenerate = async () => { 
      if (!aiTopic.trim()) return; 
      setIsGenerating(true); 
      try { 
          const platformTypes = PLATFORM_SPECS[targetPlatform].types; 
          const aiResult = await generateQuizQuestions({ topic: aiTopic, count: aiCount, types: platformTypes, age: 'Universal', language: aiLanguage }); 
          
          const newQuestions: Question[] = aiResult.questions.map((gq: any) => { 
              const qId = uuid(); 
              const options: Option[] = gq.options.map((opt: any) => ({ id: opt.id || uuid(), text: opt.text })); 
              
              // FIX: Auto-detect Multi-Select based on correct answer count
              const correctIds = gq.correctOptionIds || (gq.correctOptionId ? [gq.correctOptionId] : []);
              let determinedType = gq.questionType || QUESTION_TYPES.MULTIPLE_CHOICE;
              
              if (correctIds.length > 1) {
                  determinedType = QUESTION_TYPES.MULTI_SELECT;
              }

              return { 
                  id: qId, 
                  text: gq.text, 
                  options: options, 
                  correctOptionId: correctIds[0] || "", 
                  correctOptionIds: correctIds, 
                  timeLimit: 30, 
                  questionType: determinedType, 
                  feedback: gq.feedback, 
                  imageUrl: gq.imageUrl, 
                  imageSearchQuery: gq.imageSearchQuery, 
                  fallback_category: gq.fallback_category 
              }; 
          }); 
          
          // MAP LANGUAGE TO CODE
          const langMap: Record<string, string> = { 
              'Spanish': 'es', 'English': 'en', 'French': 'fr', 'German': 'de', 'Italian': 'it', 
              'Portuguese': 'pt', 'Catalan': 'ca', 'Basque': 'eu', 'Galician': 'gl' 
          };
          const langCode = langMap[aiLanguage] || 'en';

          setQuiz(prev => { 
              const updatedQs = [...prev.questions, ...newQuestions]; 
              const newTags = Array.from(new Set([...(prev.tags || []), ...(aiResult.tags || [])])); 
              setTimeout(() => setCurrentPage(Math.ceil(updatedQs.length / ITEMS_PER_PAGE)), 50); 
              return { 
                  ...prev, 
                  questions: updatedQs, 
                  tags: newTags,
                  language: langCode // SAVE LANGUAGE HERE
              }; 
          }); 
          setAiTopic(''); 
          setShowAiModal(false); 
      } catch (e: any) { 
          alert(t.alert_fail + ": " + e.message); 
      } finally { 
          setIsGenerating(false); 
      } 
    };

    const handleUpdateQuestion = (qId: string, field: keyof Question, value: any) => {
        setQuiz(prev => ({
            ...prev,
            questions: prev.questions.map(q => q.id === qId ? { ...q, [field]: value } : q)
        }));
    };

    const handleDeleteQuestion = (qId: string) => {
        if (confirm(t.delete_confirm)) {
            setQuiz(prev => ({
                ...prev,
                questions: prev.questions.filter(q => q.id !== qId)
            }));
        }
    };

    const handleAddManual = () => {
        const newQ: Question = {
            id: uuid(),
            text: "Nueva pregunta",
            options: [
                { id: uuid(), text: "Opción 1" },
                { id: uuid(), text: "Opción 2" }
            ],
            correctOptionId: "",
            correctOptionIds: [],
            questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
            timeLimit: 20
        };
        // Set first option as correct by default for convenience
        newQ.correctOptionId = newQ.options[0].id;
        newQ.correctOptionIds = [newQ.options[0].id];

        setQuiz(prev => {
            const updated = [...prev.questions, newQ];
            setTimeout(() => setCurrentPage(Math.ceil(updated.length / ITEMS_PER_PAGE)), 50);
            return { ...prev, questions: updated };
        });
    };

    // Pagination
    const totalPages = Math.ceil(quiz.questions.length / ITEMS_PER_PAGE);
    const displayedQuestions = quiz.questions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-8 pb-20">
            {/* Header / Quiz Info */}
            <CyberCard className="border-cyan-500/30 p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-cyber text-white">DETALLES DEL QUIZ</h2>
                    <div className="flex gap-2">
                        <CyberButton onClick={() => onSave(false)} isLoading={isSaving} className="text-xs h-8">
                            <Save className="w-3 h-3 mr-2" /> GUARDAR
                        </CyberButton>
                        <CyberButton variant="secondary" onClick={onExport} className="text-xs h-8">
                            <Download className="w-3 h-3 mr-2" /> EXPORTAR
                        </CyberButton>
                        <CyberButton variant="neural" onClick={() => onPlay(quiz)} className="text-xs h-8">
                            <Play className="w-3 h-3 mr-2" /> JUGAR
                        </CyberButton>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CyberInput 
                        label="TÍTULO" 
                        value={quiz.title} 
                        onChange={(e) => setQuiz({...quiz, title: e.target.value})} 
                    />
                    <CyberInput 
                        label="DESCRIPCIÓN" 
                        value={quiz.description} 
                        onChange={(e) => setQuiz({...quiz, description: e.target.value})} 
                    />
                </div>
            </CyberCard>

            {/* Questions Toolbar */}
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-lg border border-gray-800">
                <h3 className="font-cyber text-lg text-cyan-400">PREGUNTAS ({quiz.questions.length})</h3>
                <div className="flex gap-2">
                    <CyberButton onClick={() => setShowAiModal(true)} variant="secondary" className="text-xs h-9">
                        <Wand2 className="w-3 h-3 mr-2" /> {t.add_gen_ai}
                    </CyberButton>
                    <CyberButton onClick={handleAddManual} className="text-xs h-9">
                        <Plus className="w-3 h-3 mr-2" /> {t.add_manual}
                    </CyberButton>
                </div>
            </div>

            {/* Question List */}
            <div className="space-y-4">
                {displayedQuestions.map((q, i) => (
                    <CyberCard key={q.id} className="border-gray-800 hover:border-gray-600 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-mono text-gray-500 text-xs">#{((currentPage - 1) * ITEMS_PER_PAGE) + i + 1}</span>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <CyberInput 
                                value={q.text} 
                                onChange={(e) => handleUpdateQuestion(q.id, 'text', e.target.value)} 
                                placeholder={t.enter_question}
                            />
                            {/* Simplified Option View for brevity in manual editor */}
                            <div className="pl-4 border-l-2 border-gray-800 space-y-2">
                                {q.options.map((opt, idx) => (
                                    <div key={opt.id} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${q.correctOptionIds?.includes(opt.id) ? 'bg-green-500' : 'bg-gray-600'}`} />
                                        <input 
                                            className="bg-transparent text-sm text-gray-300 w-full outline-none border-b border-transparent focus:border-cyan-500"
                                            value={opt.text}
                                            onChange={(e) => {
                                                const newOpts = [...q.options];
                                                newOpts[idx].text = e.target.value;
                                                handleUpdateQuestion(q.id, 'options', newOpts);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CyberCard>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-gray-800 rounded disabled:opacity-50 text-white"><ArrowLeft className="w-4 h-4" /></button>
                    <span className="px-4 py-2 bg-black rounded text-white font-mono text-sm">Página {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-gray-800 rounded disabled:opacity-50 text-white"><ArrowRight className="w-4 h-4" /></button>
                </div>
            )}

            {/* AI Modal */}
            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <CyberCard className="w-full max-w-lg border-purple-500/50">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-cyber text-lg text-purple-400">{t.ai_modal_title}</h3>
                            <button onClick={() => setShowAiModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="space-y-4">
                            <CyberInput label={t.topic_label} value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} />
                            <div className="grid grid-cols-2 gap-4">
                                <CyberInput type="number" label={t.count_label} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} />
                                <CyberSelect 
                                    label="IDIOMA" 
                                    options={[{value: 'Spanish', label: 'Español'}, {value: 'English', label: 'English'}]} 
                                    value={aiLanguage} 
                                    onChange={(e) => setAiLanguage(e.target.value)} 
                                />
                            </div>
                            <CyberButton onClick={handleAiGenerate} isLoading={isGenerating} className="w-full bg-purple-600 hover:bg-purple-500 border-none">
                                {t.ai_modal_add}
                            </CyberButton>
                        </div>
                    </CyberCard>
                </div>
            )}
        </div>
    );
};