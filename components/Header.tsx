
import React, { useEffect, useState } from 'react';
import { Globe, FlaskConical, Sprout, Map, HelpCircle, LogIn, LogOut, User } from 'lucide-react';
import { Language, translations } from '../utils/translations';
// IMPORTANTE: Importamos todo desde nuestro servicio local, no desde 'firebase/auth'
import { auth, signInWithGoogle, logoutFirebase, onAuthStateChanged } from '../services/firebaseService';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ language, setLanguage, onHelp }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Escuchar cambios en la autenticación (Login/Logout)
  useEffect(() => {
    // PROTECCIÓN CONTRA PANTALLA NEGRA
    // Si Firebase falló al cargar, auth o onAuthStateChanged serán undefined.
    if (!auth || !onAuthStateChanged) {
        console.warn("Firebase Auth not initialized correctly. Auth features disabled.");
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
        console.error("Error setting up auth listener:", e);
        setIsLoadingAuth(false);
    }
  }, []);

  const handleLogin = async () => {
      try {
          await signInWithGoogle();
      } catch (e) {
          alert("Error al iniciar sesión. Verifica tu conexión.");
      }
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
    <header className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-md border-b border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-2 sm:py-0 gap-3 sm:gap-0">
        
        {/* SECCIÓN IZQUIERDA: LOGO + NAVEGACIÓN GLOBAL */}
        <div className="flex items-center gap-6">
            
            {/* 1. LOGO DE LA APP */}
            <a href="https://neuralquiz.mistercuarter.es" className="flex items-center gap-3 cursor-pointer group decoration-0">
                 <img 
                    src="https://i.postimg.cc/dV3L6xkG/Neural-Quiz.png" 
                    alt="Neural Quiz Logo" 
                    className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" 
                 />
                 <h1 className="text-lg font-bold text-white font-mono tracking-tighter hidden sm:block">
                    NEURAL<span className="text-cyan-400">_QUIZ</span>
                 </h1>
            </a>
            
            {/* 2. NAVEGACIÓN DEL ECOSISTEMA (Fija) */}
            <nav className="flex gap-2 items-center sm:border-l sm:border-gray-800 sm:pl-6">
                 <a href="https://mistercuarter.es" target="_blank" rel="noopener noreferrer" className="hidden md:flex group relative items-center gap-2 px-3 py-1.5 rounded-sm bg-gray-900 border border-gray-800 transition-all overflow-hidden border-cyan-900/30 hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                    <Globe className="w-3 h-3 text-cyan-500" />
                    <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 group-hover:text-cyan-400 transition-colors uppercase">WEB</span>
                 </a>
            </nav>
        </div>
        
        {/* SECCIÓN DERECHA: ACCIONES */}
        <div className="flex items-center gap-3">
             
             {/* LOGIN/USER BUTTON */}
             {!isLoadingAuth && (
                 user ? (
                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-900 border border-cyan-900/50 rounded hover:border-cyan-500/50 transition-all group">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-6 h-6 rounded-full border border-gray-700" />
                        ) : (
                            <User className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className="text-[10px] font-mono font-bold text-cyan-200 hidden md:inline truncate max-w-[80px]">
                            {user.displayName?.split(' ')[0] || 'User'}
                        </span>
                        <button onClick={handleLogout} className="ml-1 p-1 text-gray-500 hover:text-red-400 transition-colors" title="Logout">
                            <LogOut className="w-3 h-3" />
                        </button>
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

             {/* Help Button */}
             <button 
                onClick={onHelp}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded hover:bg-gray-800 text-gray-300 hover:text-white transition-all group"
             >
                <HelpCircle className="w-4 h-4 text-pink-500 group-hover:animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase">{t.help_btn_short}</span>
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
