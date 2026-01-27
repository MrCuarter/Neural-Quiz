import React from 'react';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { 
    BrainCircuit, 
    ArrowRight, 
    Upload, 
    Zap, 
    Globe, 
    Gamepad2, 
    Layers, 
    Repeat, 
    FileText, 
    Sparkles, 
    Users,
    Swords
} from 'lucide-react';
import { ASSETS_BASE } from '../../data/bossPresets';

interface LandingV2Props {
    onNavigate: (view: string) => void;
}

export const LandingV2: React.FC<LandingV2Props> = ({ onNavigate }) => {
    
    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-cyan-500/30">
            
            {/* --- HERO SECTION: THE PROMISE --- */}
            <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 px-6 overflow-hidden">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                    
                    {/* LEFT: COPYWRITING */}
                    <div className="space-y-8 text-center lg:text-left animate-in slide-in-from-left-8 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-4">
                            <Sparkles className="w-3 h-3" /> V 2.0 :: Universal System
                        </div>
                        
                        <h1 className="text-6xl md:text-7xl font-black font-cyber tracking-tight leading-tight">
                            NEURAL <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-500">QUIZ</span>
                        </h1>
                        
                        <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0">
                            El <span className="text-cyan-200 font-bold">Hub Universal</span> para tus evaluaciones. Crea con IA en segundos, gestiona tu biblioteca global y exporta a Kahoot, Gimkit o juega aquí mismo.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <CyberButton 
                                onClick={() => onNavigate('create_menu')} 
                                className="h-14 text-lg px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                            >
                                <RocketIcon className="w-5 h-5 mr-2" /> CREAR & CONVERTIR
                            </CyberButton>
                            <CyberButton 
                                variant="secondary" 
                                onClick={() => onNavigate('community')}
                                className="h-14 text-lg px-8"
                            >
                                <Globe className="w-5 h-5 mr-2" /> EXPLORAR BIBLIOTECA
                            </CyberButton>
                        </div>
                        
                        <p className="text-xs text-gray-500 font-mono pt-2">
                            * Sin registro obligatorio para empezar. Compatible con Kahoot, PDF y Excel.
                        </p>
                    </div>

                    {/* RIGHT: THE HUB VISUALIZATION */}
                    <div className="relative h-[400px] md:h-[500px] w-full flex items-center justify-center animate-in zoom-in-95 duration-1000 delay-200">
                        {/* Central Brain */}
                        <div className="relative z-20 w-32 h-32 md:w-40 md:h-40 bg-black border-2 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.4)] animate-pulse-slow">
                            <BrainCircuit className="w-16 h-16 text-cyan-400" />
                            <div className="absolute -bottom-8 text-center w-full font-cyber text-cyan-400 text-sm tracking-widest">CORE</div>
                        </div>

                        {/* Orbiting Satellites (Positions defined manually for diagram look) */}
                        
                        {/* Kahoot Node (Top Left) */}
                        <div className="absolute top-10 left-10 md:top-20 md:left-20 flex flex-col items-center gap-2 z-10 animate-float-1">
                            <div className="w-16 h-16 bg-purple-900/40 border border-purple-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <span className="font-bold text-purple-300 text-xs">K!</span>
                            </div>
                            <span className="text-[10px] font-mono text-purple-400">KAHOOT</span>
                        </div>
                        {/* Connection Line */}
                        <svg className="absolute inset-0 z-0 pointer-events-none opacity-30">
                            <line x1="30%" y1="25%" x2="50%" y2="50%" stroke="#a855f7" strokeWidth="2" strokeDasharray="5,5" />
                        </svg>

                        {/* Gimkit/Platform Node (Top Right) */}
                        <div className="absolute top-10 right-10 md:top-20 md:right-20 flex flex-col items-center gap-2 z-10 animate-float-2">
                            <div className="w-16 h-16 bg-blue-900/40 border border-blue-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Gamepad2 className="w-8 h-8 text-blue-400" />
                            </div>
                            <span className="text-[10px] font-mono text-blue-400">GIMKIT</span>
                        </div>
                        <svg className="absolute inset-0 z-0 pointer-events-none opacity-30">
                            <line x1="70%" y1="25%" x2="50%" y2="50%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
                        </svg>

                        {/* PDF/File Node (Bottom Right) */}
                        <div className="absolute bottom-10 right-10 md:bottom-20 md:right-20 flex flex-col items-center gap-2 z-10 animate-float-3">
                            <div className="w-16 h-16 bg-red-900/40 border border-red-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <FileText className="w-8 h-8 text-red-400" />
                            </div>
                            <span className="text-[10px] font-mono text-red-400">PDF / IMG</span>
                        </div>
                        <svg className="absolute inset-0 z-0 pointer-events-none opacity-30">
                            <line x1="70%" y1="75%" x2="50%" y2="50%" stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" />
                        </svg>

                        {/* Arcade Node (Bottom Left) */}
                        <div className="absolute bottom-10 left-10 md:bottom-20 md:left-20 flex flex-col items-center gap-2 z-10 animate-float-4">
                            <div className="w-16 h-16 bg-yellow-900/40 border border-yellow-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Swords className="w-8 h-8 text-yellow-400" />
                            </div>
                            <span className="text-[10px] font-mono text-yellow-400">ARCADE</span>
                        </div>
                        <svg className="absolute inset-0 z-0 pointer-events-none opacity-30">
                            <line x1="30%" y1="75%" x2="50%" y2="50%" stroke="#eab308" strokeWidth="2" strokeDasharray="5,5" />
                        </svg>

                    </div>
                </div>
            </section>

            {/* --- FEATURES SECTION: BENTO GRID --- */}
            <section className="py-20 px-6 bg-black/40 border-y border-gray-900">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="text-center">
                        <h2 className="text-3xl md:text-4xl font-cyber text-white mb-4">TU NAVAJA SUIZA EDUCATIVA</h2>
                        <p className="text-gray-400 font-mono">Cuatro motores, una sola plataforma. Control total sobre tus datos.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 h-auto md:h-[600px]">
                        
                        {/* CARD 1: CONVERSION (Large Left) */}
                        <div 
                            onClick={() => onNavigate('convert_upload')}
                            className="md:col-span-2 md:row-span-1 group relative bg-gradient-to-br from-gray-900 to-black border border-gray-800 hover:border-pink-500/50 rounded-2xl p-8 transition-all cursor-pointer overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                <Repeat className="w-32 h-32 text-pink-500" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-pink-900/30 rounded-lg flex items-center justify-center border border-pink-500/30 mb-4">
                                    <Upload className="w-6 h-6 text-pink-400" />
                                </div>
                                <h3 className="text-2xl font-bold font-cyber text-white mb-2 group-hover:text-pink-300">CONVERSIÓN TOTAL</h3>
                                <p className="text-gray-400 text-sm max-w-md">
                                    Importa desde cualquier fuente: Kahoots públicos, PDFs de editoriales o Excel. La IA estructura los datos y te permite exportar a más de 15 plataformas (Google Forms, Wooclap, Socrative...).
                                </p>
                            </div>
                        </div>

                        {/* CARD 2: GENERATOR (Right Top) */}
                        <div 
                            onClick={() => onNavigate('create_menu')}
                            className="md:col-span-1 md:row-span-1 group relative bg-gray-900/50 border border-gray-800 hover:border-cyan-500/50 rounded-2xl p-8 transition-all cursor-pointer overflow-hidden"
                        >
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/10 blur-2xl rounded-full"></div>
                            <div className="w-12 h-12 bg-cyan-900/30 rounded-lg flex items-center justify-center border border-cyan-500/30 mb-4">
                                <Sparkles className="w-6 h-6 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-bold font-cyber text-white mb-2">GENERADOR HÍBRIDO</h3>
                            <p className="text-gray-400 text-xs">
                                IA + Edición Manual. Crea quizzes en segundos desde un tema o pule cada detalle a mano.
                            </p>
                        </div>

                        {/* CARD 3: ARCADE (Large Bottom Right) */}
                        <div 
                            onClick={() => onNavigate('game_lobby')}
                            className="md:col-span-2 md:row-span-1 group relative bg-gray-900/50 border border-gray-800 hover:border-yellow-500/50 rounded-2xl p-0 transition-all cursor-pointer overflow-hidden flex flex-col md:flex-row"
                        >
                            <div className="p-8 flex-1 relative z-10">
                                <div className="w-12 h-12 bg-yellow-900/30 rounded-lg flex items-center justify-center border border-yellow-500/30 mb-4">
                                    <Swords className="w-6 h-6 text-yellow-400" />
                                </div>
                                <h3 className="text-2xl font-bold font-cyber text-white mb-2 group-hover:text-yellow-300">NEURAL ARCADE</h3>
                                <p className="text-gray-400 text-sm">
                                    Gamificación Nativa. Lanza una <strong>Boss Battle</strong> épica o un <strong>Jeopardy</strong> directamente desde tu panel. Sin exportar.
                                </p>
                            </div>
                            {/* Visual Representation of Boss */}
                            <div className="w-full md:w-1/3 h-48 md:h-full bg-gradient-to-t from-red-900/20 to-transparent relative">
                                <img 
                                    src={`${ASSETS_BASE}/finalboss/kryon.png`} 
                                    alt="Kryon Boss" 
                                    className="absolute bottom-0 right-0 md:right-4 h-[110%] w-auto object-contain drop-shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-transform group-hover:scale-105"
                                />
                            </div>
                        </div>

                        {/* CARD 4: COMMUNITY (Left Bottom) */}
                        <div 
                            onClick={() => onNavigate('community')}
                            className="md:col-span-1 md:row-span-1 group relative bg-gray-900/50 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-8 transition-all cursor-pointer overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                <Users className="w-20 h-20 text-purple-500" />
                            </div>
                            <div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center border border-purple-500/30 mb-4">
                                <Globe className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold font-cyber text-white mb-2">COMUNIDAD VIVA</h3>
                            <p className="text-gray-400 text-xs">
                                Accede a miles de quizzes creados por otros docentes, adáptalos y compártelos.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- GAME MODES SHOWCASE --- */}
            <section className="py-20 px-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-red-900/10 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="max-w-5xl mx-auto relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 mb-8">
                        JUEGA EN NEURAL QUIZ
                    </h2>
                    
                    <div className="bg-gradient-to-br from-red-950/80 to-black border border-red-500/30 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                        {/* Animated Background Grid */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>

                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
                            <div className="text-left flex-1 space-y-6">
                                <div className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold font-mono rounded uppercase">
                                    NUEVO MODO
                                </div>
                                <h3 className="text-4xl font-black font-cyber text-red-500 tracking-wide drop-shadow-md">
                                    BOSS BATTLE RPG
                                </h3>
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    Transforma el examen en una batalla cooperativa. Toda la clase contra un Jefe Final controlado por IA. Barra de vida compartida, items, críticos y narrativa inmersiva.
                                </p>
                                <div className="flex gap-4 pt-4">
                                    <CyberButton 
                                        onClick={() => onNavigate('game_lobby')} 
                                        className="h-12 bg-red-600 hover:bg-red-500 border-none shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                                    >
                                        <Gamepad2 className="w-5 h-5 mr-2" /> LANZAR PARTIDA
                                    </CyberButton>
                                </div>
                            </div>
                            
                            {/* Boss Visual */}
                            <div className="w-64 h-64 md:w-80 md:h-80 relative shrink-0">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
                                <img 
                                    src={`${ASSETS_BASE}/finalboss/kryon.png`} 
                                    className="relative w-full h-full object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                                    alt="Boss Preview"
                                />
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 border border-red-500 text-red-500 text-xs px-3 py-1 rounded font-mono">
                                    HP: 10000 / 10000
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER CTA --- */}
            <section className="py-16 text-center border-t border-gray-900 bg-gray-950/50">
                <h3 className="text-2xl font-cyber text-white mb-6">¿LISTO PARA TOMAR EL CONTROL?</h3>
                <CyberButton onClick={() => onNavigate('create_menu')} className="h-16 px-10 text-xl">
                    EMPEZAR AHORA
                </CyberButton>
            </section>

        </div>
    );
};

// Helper Icon
const RocketIcon = (props: any) => (
    <svg 
        {...props}
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
);