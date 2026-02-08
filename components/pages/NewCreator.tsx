import React, { useState } from 'react';
import { Quiz, QUESTION_TYPES, PLATFORM_SPECS } from '../../types';
import { CyberButton, CyberInput, CyberSelect, CyberCard, CyberTextArea } from '../ui/CyberUI';
import { generateQuizQuestions } from '../../services/geminiService';
import { searchImage } from '../../services/imageService';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';

interface NewCreatorProps {
    onNavigate: (view: string) => void;
    user: any;
    t: any;
    initialQuiz: Quiz;
    setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
    onSaveQuiz: () => Promise<string | void>;
    onExport: () => void;
    onPlay: (quiz: Quiz) => void;
    isSaving: boolean;
}

export const NewCreator: React.FC<NewCreatorProps> = ({ 
    onNavigate, user, t, initialQuiz, setQuiz, onSaveQuiz, onExport, onPlay, isSaving 
}) => {
    const [genParams, setGenParams] = useState({
        topic: '',
        count: 10,
        language: 'Spanish',
        targetPlatform: 'UNIVERSAL'
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const uuid = () => Math.random().toString(36).substring(2, 9);

    const handleAiGenerate = async () => {
        if (!genParams.topic.trim()) return;
        setIsGenerating(true);
        try {
            const platformTypes = PLATFORM_SPECS[genParams.targetPlatform].types;
            const aiResult = await generateQuizQuestions({ 
                topic: genParams.topic, 
                count: genParams.count, 
                types: platformTypes, 
                age: 'Universal', 
                language: genParams.language 
            });

            // Process questions including images
            const enhancedQuestions = await Promise.all(aiResult.questions.map(async (gq: any) => {
                const correctIds = gq.correctOptionIds || [gq.correctOptionId];
                
                // FIX: Auto-detect Multi-Select based on correct answer count
                let determinedType = gq.questionType || QUESTION_TYPES.MULTIPLE_CHOICE;
                if (correctIds.length > 1) {
                    determinedType = QUESTION_TYPES.MULTI_SELECT;
                }

                const qObj = { 
                    ...gq, 
                    id: uuid(), 
                    correctOptionIds: correctIds,
                    questionType: determinedType
                };
                
                if (!qObj.imageUrl && qObj.imageSearchQuery) {
                    const imgRes = await searchImage(qObj.imageSearchQuery, qObj.fallback_category);
                    if (imgRes) qObj.imageUrl = imgRes.url;
                }
                return qObj;
            }));

            setQuiz(prev => ({
                ...prev,
                questions: [...prev.questions, ...enhancedQuestions],
                tags: [...new Set([...(prev.tags || []), ...(aiResult.tags || [])])],
                title: (prev.title === '' || prev.title === 'Untitled Quiz') ? (genParams.topic || 'AI Quiz') : prev.title
            }));
            
            // Redirect to manual editor to review
            onNavigate('create_manual');

        } catch (e: any) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pt-8 pb-20">
            <div className="flex items-center gap-4 mb-4">
                <CyberButton variant="ghost" onClick={() => onNavigate('home')} className="pl-0 gap-2">
                    <ArrowLeft className="w-4 h-4" /> VOLVER
                </CyberButton>
                <h1 className="text-3xl font-black font-cyber text-white">NUEVO CREADOR (BETA)</h1>
            </div>

            <CyberCard className="border-yellow-500/50 p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-yellow-900/30 rounded-full border border-yellow-500/30">
                        <Sparkles className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-cyber text-yellow-100">GENERADOR RÁPIDO</h2>
                        <p className="text-sm text-gray-400 font-mono">Crea un quiz completo en segundos y revísalo después.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <CyberInput 
                        label="TEMA DEL QUIZ" 
                        placeholder="Ej: Historia de la Música, Capitales de Asia..." 
                        value={genParams.topic} 
                        onChange={(e) => setGenParams({...genParams, topic: e.target.value})}
                        className="text-lg"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CyberInput 
                            type="number" 
                            label="CANTIDAD" 
                            value={genParams.count} 
                            onChange={(e) => setGenParams({...genParams, count: Number(e.target.value)})} 
                            min={1} max={50}
                        />
                        <CyberSelect 
                            label="IDIOMA" 
                            options={[{value: 'Spanish', label: 'Español'}, {value: 'English', label: 'English'}]} 
                            value={genParams.language} 
                            onChange={(e) => setGenParams({...genParams, language: e.target.value})} 
                        />
                        <CyberSelect 
                            label="PLATAFORMA (OPCIONAL)" 
                            options={Object.entries(PLATFORM_SPECS).map(([k, v]) => ({value: k, label: v.name}))} 
                            value={genParams.targetPlatform} 
                            onChange={(e) => setGenParams({...genParams, targetPlatform: e.target.value})} 
                        />
                    </div>

                    <CyberButton 
                        onClick={handleAiGenerate} 
                        isLoading={isGenerating} 
                        className="w-full h-16 text-lg font-bold tracking-widest bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 border-none"
                    >
                        <Wand2 className="w-6 h-6 mr-2" /> GENERAR AHORA
                    </CyberButton>
                </div>
            </CyberCard>
        </div>
    );
};