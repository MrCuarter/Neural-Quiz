
import React, { useState } from 'react';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { 
    BrainCircuit, 
    ArrowRight, 
    Sparkles, 
    LayoutGrid,
    Lock,
    PenTool,
    FolderOpen,
    Star,
    Award,
    TrendingUp,
    Wand2,
    Globe,
    Gamepad2,
    Skull,
    Trophy,
    Users,
    Play,
    Copy,
    Car
} from 'lucide-react';
import { AuthModal } from '../auth/AuthModal';

interface LandingV2Props {
    onNavigate: (view: string) => void;
    user: any;
    onLoginReq: () => void;
}

export const LandingV2: React.FC<LandingV2Props> = ({ onNavigate, user }) => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    // Función wrapper para proteger navegación (SOLO para áreas privadas)
    const handleProtectedNav = (view: string) => {
        if (!user) {
            setIsAuthModalOpen(true);
        } else {
            onNavigate(view);
        }
    };

    const handleLoginClick = () => {
        setIsAuthModalOpen(true);
    };

    const COMMUNITY_MOCKS = [
        { title: "Imperio Romano", author: "ProfeHistoria", q: 15, tags: ["Historia", "Secundaria"] },
        { title: "Tabla Periódica", author: "Dr. Science", q: 20, tags: ["Química", "Bachillerato"] },
        { title: "Literatura Siglo de Oro", author: "Ms. Letters", q: 12, tags: ["Lengua", "Literatura"] },
        { title: "Capitales de Europa", author: "GeoMaster", q: 25, tags: ["Geografía", "Primaria"] }
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-cyan-500/30">
            
            {/* AUTH MODAL */}
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

            {/* --- SECCIÓN 1: HERO (GENIALLY INTACTO) --- */}
            <section className="relative pt-10 pb-10 md:pt-20 md:pb-20 px-6 overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                    
                    {/* LEFT: COPYWRITING */}
                    <div className="space-y-8 text-center lg:text-left animate-in slide-in-from-left-8 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-4">
                            <Sparkles className="w-3 h-3" /> V 2.0 :: Universal Dashboard
                        </div>
                        
                        <h1 className="text-6xl md:text-7xl font-black font-cyber tracking-tight leading-tight">
                            NEURAL <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-500">QUIZ</span>
                        </h1>
                        
                        <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0">
                            El <span className="text-cyan-200 font-bold">Centro de Operaciones</span> para tu aula. Crea con IA, convierte documentos, gestiona tu biblioteca y conecta con la comunidad global.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <CyberButton 
                                onClick={() => onNavigate('create_ai')} 
                                className="h-14 text-lg px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                            >
                                <BrainCircuit className="w-5 h-5 mr-2" /> CREAR AHORA
                            </CyberButton>
                            {/* BOTÓN EXPLORAR COMUNIDAD (PÚBLICO) */}
                            <CyberButton 
                                variant="secondary" 
                                onClick={() => onNavigate('community')}
                                className="h-14 text-lg px-8 border-purple-500 text-purple-400 hover:bg-purple-900/20"
                            >
                                <Globe className="w-5 h-5 mr-2" /> EXPLORAR
                            </CyberButton>
                        </div>
                    </div>

                    {/* RIGHT: GENIALLY EMBED (PRESERVED EXACTLY AS REQUESTED) */}
                    <div className="w-full flex justify-center animate-in zoom-in-95 duration-1000 delay-200 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-blue-500/10 blur-[80px] rounded-full -z-10"></div>
                        
                        <div 
                            className="w-full max-w-[800px] relative z-10"
                            dangerouslySetInnerHTML={{
                                __html: `
                                <div style="width: 100%;">
                                    <div style="position: relative; padding-bottom: 100%; padding-top: 0; height: 0;">
                                        <iframe 
                                            title="Neural Quiz Header" 
                                            frameborder="0" 
                                            width="800" 
                                            height="800" 
                                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: transparent;" 
                                            src="https://view.genially.com/697b237b344f20a411a68fc6" 
                                            type="text/html" 
                                            allowscriptaccess="always" 
                                            allowfullscreen="true" 
                                            scrolling="yes" 
                                            allownetworking="all"
                                            allowtransparency="true"
                                        ></iframe>
                                    </div>
                                </div>
                                `
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* --- SECCIÓN 2: OPERATIONS HUB (SIMPLIFICADO) --- */}
            <section className="py-12 px-4 md:px-8 bg-black/40 border-t border-gray-900">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex items-center gap-4 mb-4">
                        <LayoutGrid className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-2xl md:text-3xl font-cyber text-white tracking-wide">OPERATIONS HUB</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* 1. GENERADOR IA (DESTACADO) */}
                        <div 
                            onClick={() => onNavigate('create_ai')}
                            className="group relative bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/80 hover:border-cyan-400 rounded-2xl p-8 cursor-pointer overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] flex flex-col justify-between h-64"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                <Sparkles className="w-32 h-32 text-cyan-400" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-400/50 mb-4 group-hover:scale-110 transition-transform">
                                    <BrainCircuit className="w-6 h-6 text-cyan-300" />
                                </div>
                                <h3 className="text-2xl font-black font-cyber text-white mb-2">GENERADOR IA</h3>
                                <p className="text-cyan-100/70 text-sm leading-relaxed max-w-xs">
                                    Crea quizzes completos en segundos desde texto, PDF o URL.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-cyan-400 text-xs font-bold tracking-widest uppercase group-hover:translate-x-2 transition-transform">
                                Iniciar Protocolo <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>

                        {/* 2. EDITOR MANUAL */}
                        <div 
                            onClick={() => onNavigate('create_manual')}
                            className="group bg-gray-900/30 border border-gray-700 hover:border-white/30 rounded-2xl p-8 cursor-pointer transition-all hover:bg-gray-800 flex flex-col justify-between h-64"
                        >
                            <div>
                                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-black transition-colors">
                                    <PenTool className="w-6 h-6 text-gray-400 group-hover:text-black" />
                                </div>
                                <h3 className="text-xl font-bold font-cyber text-white mb-2">EDITOR MANUAL</h3>
                                <p className="text-gray-400 text-sm">
                                    Control total. Crea preguntas desde cero o edita las existentes.
                                </p>
                            </div>
                        </div>

                        {/* 3. CONVERSOR */}
                        <div 
                            onClick={() => onNavigate('convert_upload')}
                            className="group bg-gray-900/30 border border-gray-700 hover:border-pink-500/50 rounded-2xl p-8 cursor-pointer transition-all hover:bg-gray-800 flex flex-col justify-between h-64"
                        >
                            <div>
                                <div className="w-12 h-12 bg-pink-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Wand2 className="w-6 h-6 text-pink-400" />
                                </div>
                                <h3 className="text-xl font-bold font-cyber text-white mb-2 group-hover:text-pink-200">IMPORTAR / CONVERTIR</h3>
                                <p className="text-gray-400 text-sm">
                                    Transforma documentos y exámenes antiguos automáticamente.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- SECCIÓN 3: COMUNIDAD (PÚBLICA) --- */}
            <section className="py-12 px-4 md:px-8 border-t border-gray-900 bg-gradient-to-b from-[#020617] to-[#0a0a0a]">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Globe className="w-6 h-6 text-green-400" />
                            <h2 className="text-2xl font-cyber text-white tracking-wide">ÚLTIMAS CREACIONES DE LA COMUNIDAD</h2>
                        </div>
                        {/* VER TODO AHORA ES PÚBLICO */}
                        <CyberButton variant="ghost" onClick={() => onNavigate('community')} className="text-xs">
                            VER TODO <ArrowRight className="w-4 h-4 ml-2" />
                        </CyberButton>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {COMMUNITY_MOCKS.map((item, idx) => (
                            <CyberCard key={idx} className="group border-gray-800 hover:border-green-500/50 transition-all cursor-pointer">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-green-900/20 text-green-400 text-[10px] px-2 py-1 rounded border border-green-500/30">
                                            {item.q} Preguntas
                                        </div>
                                        <Globe className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" />
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-bold text-white font-cyber truncate">{item.title}</h3>
                                        <p className="text-xs text-gray-500 font-mono">Por @{item.author}</p>
                                    </div>

                                    <div className="flex gap-1 flex-wrap">
                                        {item.tags.map(t => (
                                            <span key={t} className="text-[9px] bg-black border border-gray-800 px-1.5 py-0.5 rounded text-gray-400">#{t}</span>
                                        ))}
                                    </div>

                                    <div className="pt-3 border-t border-gray-800 flex gap-2">
                                        {/* ACCIONES DIRECTAS A COMUNIDAD (PÚBLICO) */}
                                        <button 
                                            onClick={() => onNavigate('community')}
                                            className="flex-1 bg-green-900/20 hover:bg-green-600 text-green-400 hover:text-white py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-3 h-3" /> JUGAR
                                        </button>
                                        <button 
                                            onClick={() => onNavigate('community')}
                                            className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-all"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </CyberCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- SECCIÓN 4: NEURAL ARCADE (MODOS DE JUEGO) --- */}
            <section className="py-16 px-4 md:px-8 border-t border-gray-800 relative overflow-hidden">
                {/* Background FX */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="max-w-7xl mx-auto space-y-10 relative z-10">
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 text-xs font-mono tracking-widest uppercase">
                            <Gamepad2 className="w-4 h-4" /> GAMIFICACIÓN EN TIEMPO REAL
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black font-cyber text-white">NEURAL ARCADE</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Transforma cualquier examen en una experiencia multijugador inolvidable.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* 1. FINAL BOSS (RAID) */}
                        <div className="group relative bg-red-950/30 border border-red-500/30 rounded-2xl overflow-hidden hover:border-red-500 transition-all hover:scale-[1.02]">
                            <div className="h-48 bg-gradient-to-t from-black to-red-900/50 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/MrCuarter/neuralquiz-assets/main/finalboss/kryonbadge.png')] bg-cover bg-center opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-700"></div>
                                <Skull className="w-20 h-20 text-red-500 relative z-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <h3 className="text-2xl font-black font-cyber text-white">FINAL BOSS (RAID)</h3>
                                    <p className="text-red-200/60 text-sm mt-1">Cooperativo Masivo</p>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Toda la clase une fuerzas para derrotar a un enemigo común. Barra de vida global y eventos en vivo.
                                </p>
                                <CyberButton 
                                    onClick={() => handleProtectedNav('game_lobby')} 
                                    className="w-full bg-red-600 hover:bg-red-500 border-none shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                >
                                    LANZAR RAID
                                </CyberButton>
                            </div>
                        </div>

                        {/* 2. JEOPARDY */}
                        <div className="group relative bg-purple-950/30 border border-purple-500/30 rounded-2xl overflow-hidden hover:border-purple-500 transition-all hover:scale-[1.02]">
                            <div className="h-48 bg-gradient-to-t from-black to-purple-900/50 flex items-center justify-center relative">
                                <Trophy className="w-20 h-20 text-purple-500 relative z-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <h3 className="text-2xl font-black font-cyber text-white">JEOPARDY</h3>
                                    <p className="text-purple-200/60 text-sm mt-1">Concurso TV Clásico</p>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Competición por equipos con tablero de categorías. Arriesga puntos, usa comodines y gana.
                                </p>
                                <CyberButton 
                                    onClick={() => handleProtectedNav('game_lobby')} 
                                    className="w-full bg-purple-600 hover:bg-purple-500 border-none shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                >
                                    ABRIR ESTUDIO
                                </CyberButton>
                            </div>
                        </div>

                        {/* 3. NEURAL RACE */}
                        <div className="group relative bg-blue-950/30 border border-blue-500/30 rounded-2xl overflow-hidden hover:border-blue-500 transition-all hover:scale-[1.02]">
                            <div className="h-48 bg-gradient-to-t from-black to-blue-900/50 flex items-center justify-center relative">
                                <Car className="w-20 h-20 text-blue-500 relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <h3 className="text-2xl font-black font-cyber text-white">NEURAL RACE</h3>
                                    <p className="text-blue-200/60 text-sm mt-1">Velocidad Competitiva</p>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Carrera de coches impulsada por respuestas correctas. ¿Quién cruzará la meta primero?
                                </p>
                                <CyberButton 
                                    onClick={() => handleProtectedNav('game_lobby')} 
                                    className="w-full bg-blue-600 hover:bg-blue-500 border-none shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                                >
                                    INICIAR MOTORES
                                </CyberButton>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- SECCIÓN 5: TEACHER STATS & LIBRARY (FOOTER) --- */}
            <section className="mt-auto bg-[#0a0a0a] border-t border-gray-800 py-6 px-6">
                <div className="max-w-7xl mx-auto">
                    {user ? (
                        <div className="flex flex-col md:flex-row items-center gap-6 justify-between animate-in slide-in-from-bottom-4">
                            
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-2 border-yellow-500 p-1 bg-black">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} className="w-full h-full rounded-full object-cover" alt="Avatar" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">IMG</div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-yellow-600 text-black text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-400">
                                        LVL 5
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-white font-cyber font-bold text-lg uppercase">{user.displayName || "DOCENTE"}</h4>
                                    <p className="text-cyan-400 text-xs font-mono">NEURAL ARCHITECT</p>
                                </div>
                            </div>

                            <div className="flex-1 w-full md:px-8 flex justify-center md:justify-start">
                                <CyberButton 
                                    onClick={() => handleProtectedNav('my_quizzes')}
                                    className="h-12 w-full md:w-auto text-sm px-6 bg-purple-900/30 border-purple-500 hover:bg-purple-800/50"
                                    variant="secondary"
                                >
                                    <FolderOpen className="w-4 h-4 mr-2" /> MI BIBLIOTECA & GESTIÓN
                                </CyberButton>
                            </div>

                            <div className="flex gap-3 hidden md:flex">
                                <div className="flex flex-col items-center gap-1 group cursor-help">
                                    <div className="w-10 h-10 bg-purple-900/30 border border-purple-500 rounded-lg flex items-center justify-center text-purple-400">
                                        <Star className="w-5 h-5 fill-current" />
                                    </div>
                                    <span className="text-[9px] text-gray-500 font-mono group-hover:text-purple-400">PIONEER</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-help">
                                    <div className="w-10 h-10 bg-blue-900/30 border border-blue-500 rounded-lg flex items-center justify-center text-blue-400">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <span className="text-[9px] text-gray-500 font-mono group-hover:text-blue-400">CREATOR</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-help">
                                    <div className="w-10 h-10 bg-green-900/30 border border-green-500 rounded-lg flex items-center justify-center text-green-400">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <span className="text-[9px] text-gray-500 font-mono group-hover:text-green-400">ACTIVE</span>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-yellow-900/10 border border-yellow-500/20 p-4 rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-900/30 rounded-full border border-yellow-500/30">
                                    <Lock className="w-6 h-6 text-yellow-500" />
                                </div>
                                <div>
                                    <h4 className="text-yellow-200 font-bold font-cyber">PERFIL DE DOCENTE BLOQUEADO</h4>
                                    <p className="text-xs text-yellow-500/70 font-mono">Inicia sesión para gestionar tu biblioteca y acceder a herramientas avanzadas.</p>
                                </div>
                            </div>
                            <CyberButton onClick={handleLoginClick} className="bg-yellow-600 hover:bg-yellow-500 border-none text-black font-bold text-sm px-6">
                                DESBLOQUEAR PERFIL
                            </CyberButton>
                        </div>
                    )}
                </div>
            </section>

        </div>
    );
};
