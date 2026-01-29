
import React, { useState } from 'react';
import { CyberButton } from '../ui/CyberUI';
import { 
    Sparkles, 
    MonitorPlay,
    LayoutGrid,
    FolderOpen,
    Radio,
    ShieldCheck,
    Skull,
    Trophy,
    Timer,
    ArrowRight,
    LogIn,
    Car,
    Bot,
    PenTool,
    Upload,
    Globe
} from 'lucide-react';
import { ASSETS_BASE } from '../../data/bossPresets';
import { AuthModal } from '../auth/AuthModal';

interface LandingV2Props {
    onNavigate: (view: string, params?: { autoAi?: boolean }) => void;
    user: any;
    onLoginReq: () => void;
}

export const LandingV2: React.FC<LandingV2Props> = ({ onNavigate, user, onLoginReq }) => {
    // Estado para controlar la visibilidad del modal de autenticación
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // Wrapper for restricted actions
    const handleRestrictedAction = (targetView: string) => {
        if (user) {
            onNavigate(targetView);
        } else {
            setIsAuthModalOpen(true);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-cyan-500/30">
            
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* --- HERO SECTION: THE PROMISE (GENIALLY) --- */}
            <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 px-6 overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto flex flex-wrap lg:flex-nowrap gap-12 items-center relative z-10">
                    
                    {/* LEFT: COPYWRITING */}
                    <div className="flex-1 min-w-[300px] w-full space-y-8 text-center lg:text-left animate-in slide-in-from-left-8 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-4">
                            <Sparkles className="w-3 h-3" /> V 2.0 :: Universal System
                        </div>
                        
                        <h1 className="text-6xl md:text-7xl font-black font-cyber tracking-tight leading-tight">
                            NEURAL <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-500">QUIZ</span>
                        </h1>
                        
                        <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0">
                            El <span className="text-cyan-200 font-bold">Hub Universal</span> que convierte tu clase en un videojuego. Crea con IA en segundos y gestiona tu biblioteca global. Pero no te limites a evaluar: desafía a tus alumnos con Raids cooperativas en vivo y Campañas RPG de largo recorrido. Exporta si quieres, pero la verdadera aventura empieza aquí.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            {user ? (
                                <>
                                    <CyberButton 
                                        onClick={() => onNavigate('teacher_hub')} 
                                        className="h-14 text-lg px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                                    >
                                        <MonitorPlay className="w-5 h-5 mr-2" /> 💻 IR AL HUB DOCENTE
                                    </CyberButton>
                                    <CyberButton 
                                        variant="secondary" 
                                        onClick={() => onNavigate('my_quizzes')}
                                        className="h-14 text-lg px-8"
                                    >
                                        <LayoutGrid className="w-5 h-5 mr-2" /> 📂 MIS QUIZZES
                                    </CyberButton>
                                </>
                            ) : (
                                <CyberButton 
                                    onClick={() => setIsAuthModalOpen(true)} 
                                    className="h-14 text-lg px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse"
                                >
                                    <LogIn className="w-5 h-5 mr-2" /> ACCESO DOCENTE
                                </CyberButton>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: GENIALLY EMBED WITHOUT OVERLAY */}
                    <div className="flex-1 min-w-[300px] w-full flex justify-center animate-in zoom-in-95 duration-1000 delay-200">
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                          <div style={{ position: 'relative', paddingBottom: '100%', paddingTop: 0, height: 0, width: '100%', maxWidth: '800px' }}>
                            <iframe 
                              title="Neural Quiz Header" 
                              frameBorder="0" 
                              width="800" 
                              height="800" 
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, background: 'transparent' }} 
                              src="https://view.genially.com/697b237b344f20a411a68fc6" 
                              allowFullScreen={true} 
                              scrolling="no"
                              // @ts-ignore
                              allowTransparency="true"
                            />
                          </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SECTION 0.5: GESTOR DE QUIZZES (QUICK TOOLS) --- */}
            <section className="py-16 px-6 bg-[#0a0a0a] border-b border-gray-900">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl md:text-3xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500 mb-2">
                            GESTOR DE QUIZZES
                        </h2>
                        <p className="text-gray-500 font-mono text-xs md:text-sm">Creación, importación y comunidad. Sin barreras.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. CREAR CON IA */}
                        <button onClick={() => onNavigate('create_menu', { autoAi: true })} className="group relative p-6 bg-purple-950/20 border border-purple-500/30 hover:bg-purple-900/40 hover:border-purple-500 rounded-xl transition-all text-left overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 bg-purple-500/10 rounded-full blur-xl -mr-4 -mt-4"></div>
                            <div className="relative z-10 flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/50 group-hover:scale-110 transition-transform">
                                    <Bot className="w-6 h-6 text-purple-300" />
                                </div>
                                <div>
                                    <h3 className="font-bold font-cyber text-white">GENERAR CON IA</h3>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1">De texto a Quiz en segundos</p>
                                </div>
                            </div>
                        </button>

                        {/* 2. MANUAL */}
                        <button onClick={() => onNavigate('create_menu')} className="group relative p-6 bg-cyan-950/20 border border-cyan-500/30 hover:bg-cyan-900/40 hover:border-cyan-500 rounded-xl transition-all text-left overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 bg-cyan-500/10 rounded-full blur-xl -mr-4 -mt-4"></div>
                            <div className="relative z-10 flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 group-hover:scale-110 transition-transform">
                                    <PenTool className="w-6 h-6 text-cyan-300" />
                                </div>
                                <div>
                                    <h3 className="font-bold font-cyber text-white">EDITOR MANUAL</h3>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1">Control total pregunta a pregunta</p>
                                </div>
                            </div>
                        </button>

                        {/* 3. IMPORTAR */}
                        <button onClick={() => onNavigate('create_menu')} className="group relative p-6 bg-green-950/20 border border-green-500/30 hover:bg-green-900/40 hover:border-green-500 rounded-xl transition-all text-left overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 bg-green-500/10 rounded-full blur-xl -mr-4 -mt-4"></div>
                            <div className="relative z-10 flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/50 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-green-300" />
                                </div>
                                <div>
                                    <h3 className="font-bold font-cyber text-white">IMPORTAR</h3>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1">Desde PDF, Excel o Texto</p>
                                </div>
                            </div>
                        </button>

                        {/* 4. COMUNIDAD */}
                        <button onClick={() => onNavigate('community')} className="group relative p-6 bg-yellow-950/20 border border-yellow-500/30 hover:bg-yellow-900/40 hover:border-yellow-500 rounded-xl transition-all text-left overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 bg-yellow-500/10 rounded-full blur-xl -mr-4 -mt-4"></div>
                            <div className="relative z-10 flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50 group-hover:scale-110 transition-transform">
                                    <Globe className="w-6 h-6 text-yellow-300" />
                                </div>
                                <div>
                                    <h3 className="font-bold font-cyber text-white">COMUNIDAD</h3>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1">Explora y descarga quizzes</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </section>

            {/* --- SECTION 1: TEACHER HUB (CENTRO DE MANDO) --- */}
            <section className="py-24 px-6 bg-[#030508] relative">
                <div className="max-w-7xl mx-auto space-y-12 relative z-10">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            TU CENTRO DE MANDO
                        </h2>
                        <p className="text-gray-400 font-mono max-w-2xl mx-auto">
                            Gestiona todo tu ecosistema educativo desde una única interfaz unificada.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* CARD 1: QUIZ MANAGEMENT */}
                        <div 
                            onClick={() => handleRestrictedAction('my_quizzes')}
                            className="group relative bg-gray-900/40 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-400 p-8 rounded-2xl transition-all cursor-pointer hover:bg-gray-900/60 hover:-translate-y-2 shadow-lg"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-cyan-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-cyan-950/50 rounded-xl border border-cyan-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <FolderOpen className="w-7 h-7 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-bold font-cyber text-white mb-3 group-hover:text-cyan-300">
                                GESTIÓN DE QUIZZES
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Organiza tu biblioteca, edita con IA y mantén el control total de tus contenidos. Importa, fusiona y exporta en segundos.
                            </p>
                        </div>

                        {/* CARD 2: LIVE ACTIVITIES */}
                        <div 
                            onClick={() => handleRestrictedAction('teacher_hub')}
                            className="group relative bg-gray-900/40 backdrop-blur-sm border border-purple-500/20 hover:border-purple-400 p-8 rounded-2xl transition-all cursor-pointer hover:bg-gray-900/60 hover:-translate-y-2 shadow-lg"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-purple-950/50 rounded-xl border border-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Radio className="w-7 h-7 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold font-cyber text-white mb-3 group-hover:text-purple-300">
                                ACTIVIDADES & DIRECTO
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Lanza modos en vivo como Raids o asigna Quests para casa. Sincronización en tiempo real y dashboards de control.
                            </p>
                        </div>

                        {/* CARD 3: CLASS MANAGEMENT */}
                        <div 
                            onClick={() => handleRestrictedAction('classes_manager')}
                            className="group relative bg-gray-900/40 backdrop-blur-sm border border-green-500/20 hover:border-green-400 p-8 rounded-2xl transition-all cursor-pointer hover:bg-gray-900/60 hover:-translate-y-2 shadow-lg"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-green-500/10 transition-colors"></div>
                            <div className="w-14 h-14 bg-green-950/50 rounded-xl border border-green-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-7 h-7 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold font-cyber text-white mb-3 group-hover:text-green-300">
                                GESTIÓN DE CLASES
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Crea listas de alumnos, asigna alias de combate y sigue su evolución con métricas detalladas y persistencia de datos.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- SECTION 2: NEURAL ARCADE (No Auth Required for Lobby but recommended) --- */}
            <section className="py-24 px-6 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                
                <div className="max-w-7xl mx-auto space-y-16 relative z-10">
                    <div className="text-center space-y-4">
                        <div className="inline-block px-4 py-1 rounded-full border border-pink-500/50 bg-pink-900/20 text-pink-400 text-xs font-mono tracking-widest mb-2">
                            GAME ENGINE V3.0
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black font-cyber text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            MODOS ARCADE
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* CARD A: FINAL BOSS */}
                        <div 
                            onClick={() => onNavigate('game_lobby')}
                            className="group relative h-96 rounded-2xl overflow-hidden border border-red-900/50 cursor-pointer transition-all hover:scale-[1.02] hover:border-red-500"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-gray-900/80 to-transparent z-10"></div>
                            <img 
                                src={`${ASSETS_BASE}/finalboss/kryonbadge.png`} 
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity group-hover:scale-110 duration-700"
                                alt="Boss"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-8 z-20 space-y-3">
                                <div className="flex items-center gap-2 text-red-400 font-cyber font-bold text-2xl">
                                    <Skull className="w-6 h-6" /> FINAL BOSS
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-red-500 pl-3">
                                    Cooperativo en Vivo. Toda la clase une fuerzas para derrotar a enemigos colosales proyectados en la pizarra.
                                </p>
                                <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    <span className="text-xs font-mono text-red-300 flex items-center gap-1">
                                        LANZAR AHORA <ArrowRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* CARD B: JEOPARDY */}
                        <div 
                            onClick={() => onNavigate('game_lobby')}
                            className="group relative h-96 rounded-2xl overflow-hidden border border-purple-900/50 cursor-pointer transition-all hover:scale-[1.02] hover:border-purple-500"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-gray-900/80 to-transparent z-10"></div>
                            <img 
                                src="https://raw.githubusercontent.com/MrCuarter/neuralquiz-assets/main/elements/jeopardy.png"
                                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity group-hover:scale-110 duration-700"
                                alt="Jeopardy"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-8 z-20 space-y-3">
                                <div className="flex items-center gap-2 text-purple-400 font-cyber font-bold text-2xl">
                                    <Trophy className="w-6 h-6" /> JEOPARDY
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-purple-500 pl-3">
                                    El clásico concurso de TV reimaginado. Tableros interactivos para repasar por categorías y dificultad.
                                </p>
                                <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    <span className="text-xs font-mono text-purple-300 flex items-center gap-1">
                                        LANZAR AHORA <ArrowRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* CARD C: NEURAL RACE (NEW) */}
                        <div 
                            onClick={() => onNavigate('race_lobby')} // Assumes route mapping exists or will be handled
                            className="group relative h-96 rounded-2xl overflow-hidden border border-cyan-900/50 cursor-pointer transition-all hover:scale-[1.02] hover:border-cyan-500"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-cyan-950 via-gray-900/80 to-transparent z-10"></div>
                            {/* Placeholder Image for Race */}
                            <div className="absolute inset-0 w-full h-full bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z0ZnZ0ZnZ0ZnZ0ZnZ0ZnZ0ZnZ0ZnZ0ZnZ0ZnZ0ZnZ0ZnZ0/3o7aD2saalBwwftBIY/giphy.gif')] bg-cover opacity-30 group-hover:opacity-50 transition-opacity duration-700 mix-blend-overlay"></div>
                            
                            <div className="absolute bottom-0 left-0 right-0 p-8 z-20 space-y-3">
                                <div className="flex items-center gap-2 text-cyan-400 font-cyber font-bold text-2xl italic">
                                    <Car className="w-6 h-6" /> NEURAL RACE
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed border-l-2 border-cyan-500 pl-3">
                                    Carrera de velocidad por equipos. Acierta para avanzar, usa turbos y congela a tus rivales en tiempo real.
                                </p>
                                <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    <span className="text-xs font-mono text-cyan-300 flex items-center gap-1">
                                        START ENGINE <ArrowRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER CTA --- */}
            <section className="py-16 text-center border-t border-gray-900 bg-gray-950/50">
                <h3 className="text-2xl font-cyber text-white mb-6">¿LISTO PARA TOMAR EL CONTROL?</h3>
                <div className="flex justify-center">
                    {user ? (
                        <CyberButton onClick={() => onNavigate('teacher_hub')} className="h-16 px-10 text-xl shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                            <MonitorPlay className="w-6 h-6 mr-3" /> IR AL CENTRO DE MANDO
                        </CyberButton>
                    ) : (
                        <CyberButton onClick={() => setIsAuthModalOpen(true)} className="h-16 px-10 text-xl shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                            <LogIn className="w-6 h-6 mr-3" /> INICIAR SESIÓN
                        </CyberButton>
                    )}
                </div>
            </section>

        </div>
    );
};
