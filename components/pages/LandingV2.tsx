
import React from 'react';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { 
    BrainCircuit, 
    ArrowRight, 
    Upload, 
    Zap, 
    Globe, 
    Gamepad2, 
    FileText, 
    Sparkles, 
    Users,
    MonitorPlay,
    LayoutGrid,
    Lock,
    PenTool,
    FolderOpen,
    Star,
    Award,
    TrendingUp,
    Wand2
} from 'lucide-react';
import { ASSETS_BASE } from '../../data/bossPresets';

interface LandingV2Props {
    onNavigate: (view: string) => void;
    user: any;
    onLoginReq: () => void;
}

export const LandingV2: React.FC<LandingV2Props> = ({ onNavigate, user, onLoginReq }) => {
    
    const handleProtectedNav = (view: string) => {
        if (!user) {
            onLoginReq();
        } else {
            onNavigate(view);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-cyan-500/30">
            
            {/* --- SECCIÓN 1: HERO --- */}
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
                                onClick={() => onNavigate('create_menu')} 
                                className="h-14 text-lg px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                            >
                                <BrainCircuit className="w-5 h-5 mr-2" /> CREAR AHORA
                            </CyberButton>
                            {!user && (
                                <CyberButton 
                                    variant="secondary" 
                                    onClick={onLoginReq}
                                    className="h-14 text-lg px-8 border-yellow-500 text-yellow-400 hover:bg-yellow-900/20"
                                >
                                    <Lock className="w-5 h-5 mr-2" /> LOGIN
                                </CyberButton>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: GENIALLY EMBED */}
                    <div className="flex-1 w-full flex justify-center lg:justify-end animate-in zoom-in-95 duration-1000 delay-200 relative">
                        {/* Decorative Back Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-blue-500/10 blur-[80px] rounded-full -z-10"></div>
                        
                        {/* Requested Iframe Code (Fixed for Transparency) */}
                        <div style={{ width: '100%', maxWidth: '600px' }}>
                            <div style={{ position: 'relative', paddingBottom: '100%', paddingTop: 0, height: 0 }}>
                                <iframe 
                                    title="Neural Quiz Header" 
                                    frameBorder="0" 
                                    width="800" 
                                    height="800" 
                                    style={{ 
                                        position: 'absolute', 
                                        top: 0, 
                                        left: 0, 
                                        width: '100%', 
                                        height: '100%',
                                        backgroundColor: 'transparent' // CRITICAL: Force CSS transparency
                                    }} 
                                    src="https://view.genially.com/697b237b344f20a411a68fc6" 
                                    allowFullScreen={true} 
                                    scrolling="yes"
                                    // @ts-ignore
                                    allowTransparency="true" // CRITICAL: Force HTML attribute
                                /> 
                            </div> 
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SECCIÓN 2: QUIZ OPERATIONS HUB --- */}
            <section className="py-12 px-4 md:px-8 bg-black/40 border-t border-gray-900">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="flex items-center gap-4 mb-8">
                        <LayoutGrid className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-2xl md:text-3xl font-cyber text-white tracking-wide">OPERATIONS HUB</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
                        
                        {/* CARD 1: GENERADOR NEURAL (IA) - Large */}
                        <div 
                            onClick={() => onNavigate('create_menu')}
                            className="md:col-span-2 lg:col-span-2 row-span-2 group relative bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/50 hover:border-cyan-400 rounded-2xl p-8 cursor-pointer overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                <BrainCircuit className="w-48 h-48 text-cyan-400" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-400/50 mb-6 group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-8 h-8 text-cyan-300" />
                                </div>
                                <h3 className="text-3xl font-black font-cyber text-white mb-2 group-hover:text-cyan-200">GENERADOR NEURAL</h3>
                                <p className="text-gray-300 text-sm md:text-base max-w-sm leading-relaxed">
                                    El núcleo del sistema. Utiliza IA Gemini 2.0 para generar quizzes completos a partir de un tema, texto o URL en segundos.
                                </p>
                            </div>
                            <div className="mt-6 flex items-center gap-2 text-cyan-400 text-sm font-bold tracking-widest uppercase group-hover:translate-x-2 transition-transform">
                                Iniciar Protocolo <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>

                        {/* CARD 2: EDITOR MANUAL */}
                        <div 
                            onClick={() => onNavigate('create_manual')}
                            className="group bg-gray-900/50 border border-gray-700 hover:border-white/50 rounded-2xl p-6 cursor-pointer transition-all hover:bg-gray-800 flex flex-col justify-between"
                        >
                            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-black transition-colors">
                                <PenTool className="w-6 h-6 text-gray-300 group-hover:text-black" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-cyber text-white mb-1">EDITOR MANUAL</h3>
                                <p className="text-xs text-gray-500">Control total. Crea preguntas desde cero o edita las existentes.</p>
                            </div>
                        </div>

                        {/* CARD 3: CONVERSOR UNIVERSAL */}
                        <div 
                            onClick={() => onNavigate('convert_upload')}
                            className="group bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 hover:border-pink-400 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.2)] flex flex-col justify-between"
                        >
                            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Wand2 className="w-6 h-6 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-cyber text-white mb-1 group-hover:text-pink-200">CONVERSOR</h3>
                                <p className="text-xs text-pink-200/60">Importa PDFs, Textos o Webs y extrae preguntas automáticamente.</p>
                            </div>
                        </div>

                        {/* CARD 4: BIBLIOTECA (MIS QUIZZES) */}
                        <div 
                            onClick={() => handleProtectedNav('my_quizzes')}
                            className="group bg-gray-900/50 border border-gray-700 hover:border-purple-500 rounded-2xl p-6 cursor-pointer transition-all hover:bg-gray-800 flex flex-col justify-between relative overflow-hidden"
                        >
                            {!user && <div className="absolute top-2 right-2"><Lock className="w-4 h-4 text-yellow-500" /></div>}
                            <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <FolderOpen className="w-6 h-6 text-purple-400 group-hover:text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-cyber text-white mb-1">MI BIBLIOTECA</h3>
                                <p className="text-xs text-gray-500">Tus creaciones guardadas. {user ? '' : '(Requiere Login)'}</p>
                            </div>
                        </div>

                        {/* CARD 5: COMUNIDAD */}
                        <div 
                            onClick={() => onNavigate('community')}
                            className="md:col-span-2 lg:col-span-1 group bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 hover:border-green-400 rounded-2xl p-6 cursor-pointer transition-all hover:bg-green-900/30 flex flex-col justify-between"
                        >
                            <div className="flex justify-between items-start">
                                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                                    <Globe className="w-6 h-6 text-green-400" />
                                </div>
                                <Users className="w-5 h-5 text-green-700 group-hover:text-green-400 transition-colors" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-cyber text-white mb-1">COMUNIDAD</h3>
                                <p className="text-xs text-green-200/60">Explora y clona quizzes de otros profesores.</p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- SECCIÓN 3: TEACHER STATS (Gamification) --- */}
            <section className="mt-auto bg-[#0a0a0a] border-t border-gray-800 py-6 px-6">
                <div className="max-w-7xl mx-auto">
                    {user ? (
                        <div className="flex flex-col md:flex-row items-center gap-6 justify-between animate-in slide-in-from-bottom-4">
                            
                            {/* Profile Info */}
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

                            {/* Stats Bar */}
                            <div className="flex-1 w-full md:mx-12">
                                <div className="flex justify-between text-xs font-mono text-gray-500 mb-1">
                                    <span>XP PROGRESS</span>
                                    <span>2450 / 5000</span>
                                </div>
                                <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                                    <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 w-[45%] relative">
                                        <div className="absolute top-0 right-0 h-full w-2 bg-white/50 blur-[2px]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="flex gap-3">
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
                                    <p className="text-xs text-yellow-500/70 font-mono">Inicia sesión para ganar XP, subir de nivel y desbloquear insignias.</p>
                                </div>
                            </div>
                            <CyberButton onClick={onLoginReq} className="bg-yellow-600 hover:bg-yellow-500 border-none text-black font-bold text-sm px-6">
                                DESBLOQUEAR PERFIL
                            </CyberButton>
                        </div>
                    )}
                </div>
            </section>

        </div>
    );
};
