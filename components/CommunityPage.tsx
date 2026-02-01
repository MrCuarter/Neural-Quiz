
import React, { useState, useEffect } from 'react';
import { searchQuizzes } from '../services/communityService';
import { Quiz } from '../types';
import { CyberButton, CyberInput, CyberCard } from './ui/CyberUI';
import { Search, Globe, Gamepad2, User, Calendar, Download, Hash, Loader2, Filter, GraduationCap } from 'lucide-react';
import { getTagLabel, Language } from '../utils/translations';

interface CommunityPageProps {
    onBack: () => void;
    onPlay: (quiz: Quiz) => void;
    onImport: (quiz: Quiz) => void;
    currentLanguage?: string; // App interface language ('es' | 'en')
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ onBack, onPlay, onImport, currentLanguage = 'es' }) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [langFilter, setLangFilter] = useState("ALL");
    const [ageFilter, setAgeFilter] = useState("ALL");

    useEffect(() => {
        loadQuizzes();
    }, [langFilter, ageFilter]); // Reload when filters change

    const loadQuizzes = async (term: string = searchTerm) => {
        setLoading(true);
        try {
            const results = await searchQuizzes(term, langFilter, ageFilter);
            setQuizzes(results);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            loadQuizzes(searchTerm);
        }
    };

    // Flag mapping
    const getLangFlag = (code: string) => {
        if (code === 'es') return '🇪🇸';
        if (code === 'en') return '🇬🇧';
        if (code === 'fr') return '🇫🇷';
        if (code === 'de') return '🇩🇪';
        if (code === 'it') return '🇮🇹';
        if (code === 'pt') return '🇵🇹';
        if (code === 'ca') return '🏴';
        if (code === 'eu') return '🏴';
        if (code === 'gl') return '🏴';
        return '🌐';
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 pt-20">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                            NEURAL COMMUNITY
                        </h1>
                        <p className="text-gray-400 font-mono text-sm mt-1">Explora quizzes creados por la red.</p>
                    </div>
                    <CyberButton variant="ghost" onClick={onBack}>VOLVER AL HUB</CyberButton>
                </div>

                {/* Search Bar & Filters */}
                <div className="flex flex-col lg:flex-row gap-4 max-w-5xl mx-auto w-full">
                    {/* Search */}
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-cyan-500" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-12 pr-4 py-4 bg-black/50 border-2 border-cyan-900 rounded-lg lg:rounded-l-full lg:rounded-r-none text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all font-mono text-lg"
                            placeholder="Buscar por tema..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                    
                    {/* Filter Group */}
                    <div className="flex gap-2 flex-col sm:flex-row">
                        {/* Lang Filter */}
                        <div className="flex items-center bg-black/50 border-2 border-cyan-900 rounded-lg px-4 relative min-w-[160px]">
                            <Filter className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                            <select 
                                value={langFilter} 
                                onChange={(e) => setLangFilter(e.target.value)}
                                className="w-full bg-transparent text-white font-mono text-sm pl-6 py-4 focus:outline-none appearance-none cursor-pointer"
                            >
                                <option value="ALL">Idioma: Todos</option>
                                <option value="es">🇪🇸 Español</option>
                                <option value="en">🇬🇧 English</option>
                                <option value="fr">🇫🇷 Français</option>
                                <option value="de">🇩🇪 Deutsch</option>
                                <option value="it">🇮🇹 Italiano</option>
                                <option value="pt">🇵🇹 Português</option>
                            </select>
                        </div>

                        {/* Age Filter */}
                        <div className="flex items-center bg-black/50 border-2 border-cyan-900 rounded-lg px-4 relative min-w-[160px]">
                            <GraduationCap className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
                            <select 
                                value={ageFilter} 
                                onChange={(e) => setAgeFilter(e.target.value)}
                                className="w-full bg-transparent text-white font-mono text-sm pl-6 py-4 focus:outline-none appearance-none cursor-pointer"
                            >
                                <option value="ALL">Nivel: Todos</option>
                                <option value="Primary">Primaria (6-12)</option>
                                <option value="Secondary">Secundaria (12-16)</option>
                                <option value="High School">Bachillerato</option>
                                <option value="University">Universidad</option>
                                <option value="Professional">Profesional</option>
                            </select>
                        </div>

                        <button 
                            onClick={() => loadQuizzes(searchTerm)}
                            className="px-8 py-4 bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 rounded-lg lg:rounded-r-full lg:rounded-l-none font-bold text-sm transition-colors whitespace-nowrap"
                        >
                            BUSCAR
                        </button>
                    </div>
                </div>

                {/* Results Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-gray-500 font-mono border-2 border-dashed border-gray-800 rounded-lg">
                                NO SE ENCONTRARON QUIZZES EN EL NODO.
                            </div>
                        ) : (
                            quizzes.map((quiz) => (
                                <CyberCard key={quiz.id} className="flex flex-col h-full hover:border-cyan-500/50 transition-colors group relative overflow-hidden">
                                    {/* Language Badge */}
                                    <div className="absolute top-2 right-2 text-xl" title={`Idioma: ${quiz.language}`}>
                                        {getLangFlag(quiz.language || 'es')}
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="flex justify-between items-start pr-8">
                                            <h3 className="text-xl font-bold font-cyber text-white group-hover:text-cyan-300 line-clamp-2">
                                                {quiz.title}
                                            </h3>
                                        </div>
                                        
                                        <p className="text-sm text-gray-400 font-mono line-clamp-2 min-h-[40px]">
                                            {quiz.description || "Sin descripción."}
                                        </p>

                                        <div className="flex flex-wrap gap-2">
                                            {quiz.tags?.slice(0, 4).map(tag => (
                                                <span key={tag} className="text-[10px] bg-gray-900 border border-gray-700 px-2 py-1 rounded text-cyan-200 flex items-center gap-1">
                                                    <Hash className="w-3 h-3" /> 
                                                    {/* Translate Tag Here */}
                                                    {getTagLabel(tag, currentLanguage as Language)}
                                                </span>
                                            ))}
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-800 pt-3">
                                            <span className="flex items-center gap-1"><User className="w-3 h-3"/> {quiz.authorName}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(quiz.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-6 pt-4 border-t border-gray-800">
                                        <CyberButton onClick={() => onPlay(quiz)} className="flex-1 text-xs">
                                            <Gamepad2 className="w-4 h-4 mr-2" /> JUGAR
                                        </CyberButton>
                                        <CyberButton variant="secondary" onClick={() => onImport(quiz)} className="flex-1 text-xs">
                                            <Download className="w-4 h-4 mr-2" /> COPIAR
                                        </CyberButton>
                                    </div>
                                </CyberCard>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
