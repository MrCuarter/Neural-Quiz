
import React, { useEffect, useState } from 'react';
import { Globe, HelpCircle, LogIn, LogOut, User, LayoutGrid } from 'lucide-react';
import { Language, translations } from '../utils/translations';
import { auth, signInWithGoogle, logoutFirebase, onAuthStateChanged } from '../services/firebaseService';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onHelp: () => void;
  onMyQuizzes: () => void;
}

export const Header: React.FC<HeaderProps> = ({ language, setLanguage, onHelp, onMyQuizzes }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

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

  const handleLogin = async () => {
      try { await signInWithGoogle(); } catch (e) { alert("Error al iniciar sesión."); }
  };

  const handleLogout = async () => {
      await logoutFirebase();
  };

  const languages: { code: Language; flag: string; label: string }[] = [
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
    { code: 'it', flag: '🇮🇹', label: 'IT' },
    { code: 'de', flag: '🇩🇪', label: 'DE' },
  ];

  const t = translations[language];

  return (
    <header className="sticky top-0 z-40 bg-[#020617]/90 backdrop-blur-md border-b border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-3 sm:py-0 gap-3 sm:gap-0">
        
        {/* SECCIÓN IZQUIERDA: LOGO GRÁFICO + TEXTO */}
        <div className="flex items-center gap-6">
            <a href="/" onClick={(e) => { e.preventDefault(); window.location.reload(); }} className="flex items-center gap-3 cursor-pointer group decoration-0">
                 <img 
                    src="https://i.postimg.cc/dV3L6xkG/Neural-Quiz.png" 
                    alt="Neural Quiz Logo" 
                    className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-transform group-hover:scale-110" 
                 />
                 <h1 className="text-xl font-bold text-white font-cyber tracking-tight">
                    NEURAL<span className="text-cyan-400">_QUIZ</span>
                 </h1>
            </a>
        </div>
        
        {/* SECCIÓN DERECHA: ACCIONES */}
        <div className="flex items-center gap-3">
             
             {/* LOGIN/USER BUTTON */}
             {!isLoadingAuth && (
                 user ? (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onMyQuizzes}
                            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/30 border border-cyan-500/30 rounded hover:bg-cyan-900/50 text-cyan-300 transition-all group"
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline">MIS QUIZES</span>
                        </button>

                        <div className="flex items-center gap-2 px-2 py-1 bg-gray-900 border border-gray-800 rounded">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full border border-gray-700" />
                            ) : (
                                <User className="w-4 h-4 text-cyan-400" />
                            )}
                            <button onClick={handleLogout} className="ml-1 p-1 text-gray-500 hover:text-red-400 transition-colors" title="Logout">
                                <LogOut className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                 ) : (
                    <button 
                        onClick={handleLogin}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 border border-blue-500/50 rounded hover:bg-blue-900/40 text-blue-200 transition-all group"
                    >
                        <LogIn className="w-3 h-3" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">LOGIN</span>
                    </button>
                 )
             )}

             {/* Separator */}
             <div className="h-4 w-px bg-gray-800 mx-1 hidden sm:block"></div>

             {/* Help Button */}
             <button 
                onClick={onHelp}
                className="p-2 text-gray-400 hover:text-pink-400 transition-colors"
                title={t.help_btn_short}
             >
                <HelpCircle className="w-5 h-5" />
             </button>

             {/* Language Selector */}
             <div className="flex bg-gray-900 border border-gray-800 rounded-sm p-0.5">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`px-2 py-1 rounded-sm text-[10px] font-mono font-bold transition-all ${
                            language === lang.code 
                            ? 'bg-gray-800 text-white shadow-sm' 
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
  );
};
