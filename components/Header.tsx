
import React from 'react';
import { Globe, FlaskConical, Sprout, Map, BrainCircuit, HelpCircle } from 'lucide-react';
import { Language } from '../utils/translations';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onHelp: () => void; // New Prop
}

export const Header: React.FC<HeaderProps> = ({ language, setLanguage, onHelp }) => {
  const languages: { code: Language; flag: string; label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
    { code: 'it', flag: '🇮🇹', label: 'IT' },
    { code: 'de', flag: '🇩🇪', label: 'DE' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-md border-b border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-2 sm:py-0 gap-3 sm:gap-0">
        
        {/* SECCIÓN IZQUIERDA: LOGO + NAVEGACIÓN GLOBAL */}
        <div className="flex items-center gap-6">
            
            {/* 1. LOGO DE LA APP */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.reload()}>
                 <BrainCircuit className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                 <h1 className="text-lg font-bold text-white font-mono tracking-tighter hidden sm:block">
                    NEURAL<span className="text-cyan-400">_QUIZ</span>
                 </h1>
            </div>
            
            {/* 2. NAVEGACIÓN DEL ECOSISTEMA (Fija) */}
            <nav className="flex gap-2 items-center sm:border-l sm:border-gray-800 sm:pl-6">
                 <a href="https://mistercuarter.es" target="_blank" rel="noopener noreferrer" className="hidden md:flex group relative items-center gap-2 px-3 py-1.5 rounded-sm bg-gray-900 border border-gray-800 transition-all overflow-hidden border-cyan-900/30 hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                    <Globe className="w-3 h-3 text-cyan-500" />
                    <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 group-hover:text-cyan-400 transition-colors uppercase">WEB</span>
                 </a>
                 {/* ... other links same as before ... */}
            </nav>
        </div>
        
        {/* SECCIÓN DERECHA: ACCIONES */}
        <div className="flex items-center gap-3">
             {/* Help Button */}
             <button 
                onClick={onHelp}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded hover:bg-gray-800 text-gray-300 hover:text-white transition-all group"
             >
                <HelpCircle className="w-4 h-4 text-pink-500 group-hover:animate-pulse" />
                <span className="text-xs font-mono font-bold">HELP?</span>
             </button>

             {/* Language Selector */}
             <div className="flex bg-gray-900 border border-gray-800 rounded-sm p-0.5">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-mono font-bold transition-all ${
                            language === lang.code 
                            ? 'bg-gray-800 text-white shadow-sm' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                        title={lang.label}
                    >
                        <span>{lang.flag}</span>
                        <span className="hidden lg:inline">{lang.label}</span>
                    </button>
                ))}
             </div>
        </div>

      </div>
    </header>
  );
};
