
import React, { useEffect, useState, useRef } from 'react';
import { 
    HelpCircle, 
    LogIn, 
    LogOut, 
    User, 
    LayoutGrid, 
    MonitorPlay, 
    ChevronDown, 
    Plus, 
    Globe, 
    Gamepad2, 
    BarChart2, 
    Sparkles 
} from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { auth, logoutFirebase, onAuthStateChanged } from '../services/firebaseService';
import { AuthModal } from './auth/AuthModal';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onHelp: () => void;
  onNavigate: (view: string) => void; // Generic navigation handler
}

export const Header: React.FC<HeaderProps> = ({ language, setLanguage, onHelp, onNavigate }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth || !onAuthStateChanged) {
        setIsLoadingAuth(false);
        return;
    }
    try {
        const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
          setUser(currentUser);
          setIsLoadingAuth(false);
        });
        return () => unsubscribe();
    } catch (e) {
        setIsLoadingAuth(false);
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setIsMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
      await logoutFirebase();
      setIsMenuOpen(false);
      onNavigate('home');
  };

  const handleNav = (view: string) => {
      onNavigate(view);
      setIsMenuOpen(false);
  };

  const languages: { code: Language; flag: string; label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
  ];

  const t = translations[language] || translations['en'] || translations['es'] || {};

  return (
    <>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <header className="sticky top-0 z-40 bg-[#020617]/90 backdrop-blur-md border-b border-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-3 sm:py-0 gap-3 sm:gap-0">
            
            {/* SECCIÓN IZQUIERDA: LOGO + MENÚ USUARIO */}
            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
                <button onClick={() => onNavigate('home')} className="flex items-center gap-3 cursor-pointer group decoration-0 bg-transparent border-none p-0 outline-none">
                    <img 
                        src="https://i.postimg.cc/dV3L6xkG/Neural-Quiz.png" 
                        alt="Neural Quiz Logo" 
                        className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-transform group-hover:scale-110" 
                    />
                    <h1 className="text-xl font-bold text-white font-cyber tracking-tight hidden md:block">
                        NEURAL<span className="text-cyan-400">_QUIZ</span>
                    </h1>
                </button>

                {/* USER DROPDOWN (ONLY IF LOGGED IN) */}
                {!isLoadingAuth && user && (
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`flex items-center gap-3 pl-1 pr-3 py-1 rounded-full border transition-all ${isMenuOpen ? 'bg-gray-800 border-cyan-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                        >
                            <div className="w-8 h-8 rounded-full border border-gray-600 overflow-hidden bg-black">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                                        <User className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-bold text-white leading-none">{user.displayName?.split(' ')[0] || "Usuario"}</p>
                                <p className="text-[9px] text-cyan-400 font-mono leading-none mt-0.5">ONLINE</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* DROPDOWN MENU */}
                        {isMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-[#0a0a0a] border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in z-50">
                                <div className="p-2 space-y-1">
                                    <div className="px-3 py-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest border-b border-gray-800 mb-1">
                                        Menú de Comando
                                    </div>
                                    
                                    <button onClick={() => handleNav('teacher_hub')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group">
                                        <MonitorPlay className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                                        Hub Docente
                                    </button>
                                    
                                    <button onClick={() => handleNav('new_creator')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group">
                                        <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                                        Crear Quiz (Creator)
                                    </button>

                                    <button onClick={() => handleNav('my_quizzes')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group">
                                        <LayoutGrid className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                        Mis Quizzes
                                    </button>

                                    {/* Mapeado a My Quizzes pero podríamos abrir el dashboard directamente si hubiera ruta */}
                                    <button onClick={() => handleNav('my_quizzes')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group">
                                        <BarChart2 className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
                                        Evaluaciones
                                    </button>

                                    <button onClick={() => handleNav('community')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group">
                                        <Globe className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                                        Comunidad
                                    </button>

                                    <button onClick={() => handleNav('game_lobby')} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group">
                                        <Gamepad2 className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                                        Arcade Config
                                    </button>
                                </div>

                                <div className="p-2 border-t border-gray-800 bg-gray-900/50">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                                        <LogOut className="w-3 h-3" /> CERRAR SESIÓN
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* SECCIÓN DERECHA: ACCIONES GLOBALES */}
            <div className="flex items-center gap-3">
                
                {/* LOGIN BUTTON (IF NOT LOGGED IN) */}
                {!isLoadingAuth && !user && (
                    <button 
                        onClick={() => setShowAuthModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-xs shadow-lg transition-all"
                    >
                        <LogIn className="w-3 h-3" />
                        LOGIN
                    </button>
                )}

                <div className="h-4 w-px bg-gray-800 mx-1 hidden sm:block"></div>

                <button 
                    onClick={onHelp}
                    className="p-2 text-gray-400 hover:text-pink-400 transition-colors"
                    title={t.help_btn_short}
                >
                    <HelpCircle className="w-5 h-5" />
                </button>

                <div className="flex bg-gray-900 border border-gray-800 rounded-sm p-0.5">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={`px-2 py-1 rounded-sm text-[10px] font-mono font-bold transition-all ${
                                language === lang.code 
                                ? 'bg-cyan-600 text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </div>

        </div>
        </header>
    </>
  );
};
