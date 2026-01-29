
import React from 'react';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { 
    ArrowRight, 
    Upload, 
    Zap, 
    Globe, 
    Gamepad2, 
    Layers, 
    Repeat, 
    Sparkles, 
    Users,
    Swords,
    MonitorPlay,
    LayoutGrid,
    Lock,
    Trophy
} from 'lucide-react';
import { ASSETS_BASE } from '../../data/bossPresets';

interface LandingV2Props {
    onNavigate: (view: string) => void;
    user: any;
    onLoginReq: () => void;
}

export const LandingV2: React.FC<LandingV2Props> = ({ onNavigate, user, onLoginReq }) => {
    
    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-cyan-500/30">
            
            {/* --- HERO SECTION: THE PROMISE --- */}
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
                            El <span className="text-cyan-200 font-bold">Hub Universal</span> para tus evaluaciones. Crea con IA en segundos, gestiona tu biblioteca global y exporta a Kahoot, Gimkit o juega aquí mismo.
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
                                    onClick={onLoginReq} 
                                    className="h-14 text-lg px-8 bg-yellow-600 hover:bg-yellow-500 border-none shadow-[0_0_20px_rgba(234,179,8,0.4)] text-black font-bold"
                                >
                                    <Lock className="w-5 h-5 mr-2" /> INICIAR SESIÓN PARA GUARDAR TU PROGRESO
                                </CyberButton>
                            )}
                        </div>
                        
                        {!user && (
                            <p className="text-xs text-gray-500 font-mono pt-2">
                                * Puedes explorar sin cuenta, pero no podrás guardar ni gestionar clases.
                            </p>
                        )}
                    </div>

                    {/* RIGHT: GENIALLY EMBED */}
                    <div className="flex-1 min-w-[300px] w-full flex justify-center animate-in zoom-in-95 duration-1000 delay-200">
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                          <div style={{ position: 'relative', paddingBottom: '100%', paddingTop: 0, height: 0, width: '100%', maxWidth: '800px' }}>
                            <iframe 
                              title="Neural Quiz Header" 
                              frameBorder="0" 
                              width="800" 
                              height="800" 
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} 
                              src="https://view.genially.com/697b237b344f20a411a68fc6" 
                              allowFullScreen={true} 
                              scrolling="yes" 
                            />
                          </div>
                        </div>
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
                                    Importa desde cualquier fuente: Kahoots públicos, PDFs de editoriales o Excel. La IA estructura los datos y te permite exportar a más de 15 plataformas.
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
                            <h3 className="text-xl font-bold font-cyber text-white mb-2">NEURAL QUIZ</h3>
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

            {/* --- GAME MODES SHOWCASE (BOSS BATTLE) --- */}
            <section className="py-20 px-6 relative overflow-hidden bg-gradient-to-b from-black to-red-950/20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-red-900/10 blur-[100px] rounded-full pointer-events-none" />
                
                <div className="max-w-5xl mx-auto relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 mb-8">
                        ARCADE: MODO JEFE FINAL
                    </h2>
                    
                    <div className="bg-gradient-to-br from-red-950/80 to-black border border-red-500/30 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                        {/* Animated Background Grid */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>

                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
                            <div className="text-left flex-1 space-y-6">
                                <div className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold font-mono rounded uppercase">
                                    SOLO / ASÍNCRONO
                                </div>
                                <h3 className="text-4xl font-black font-cyber text-red-500 tracking-wide drop-shadow-md">
                                    BOSS BATTLE RPG
                                </h3>
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    Transforma el examen en una batalla épica. El alumno debe responder correctamente para bajar la vida a Lythara y sus esbirros. ¡Sistema de loot y niveles!
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
                            
                            {/* Boss Visual (Lythara) */}
                            <div className="w-64 h-64 md:w-80 md:h-80 relative shrink-0">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
                                <img 
                                    src={`${ASSETS_BASE}/finalboss/lythara.png`} 
                                    className="relative w-full h-full object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                                    alt="Lythara Boss"
                                />
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 border border-red-500 text-red-500 text-xs px-3 py-1 rounded font-mono">
                                    HP: 10000 / 10000
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- GAME MODES SHOWCASE (JEOPARDY) --- */}
            <section className="py-20 px-6 relative overflow-hidden bg-gradient-to-b from-black to-purple-950/20 border-t border-gray-900">
                
                <div className="max-w-5xl mx-auto relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 mb-8">
                        ARCADE: MODO TV
                    </h2>
                    
                    <div className="bg-gradient-to-br from-purple-950/80 to-black border border-purple-500/30 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                        
                        {/* Fake Grid Background */}
                        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>

                        <div className="flex flex-col-reverse md:flex-row items-center gap-8 md:gap-12 relative z-10">
                            
                            {/* Visual Board Mockup */}
                            <div className="w-full md:w-1/2 relative">
                                <div className="bg-black/80 border-4 border-purple-500 rounded-lg p-2 shadow-[0_0_30px_rgba(168,85,247,0.4)] aspect-video flex flex-col gap-1">
                                    {/* Mock Categories */}
                                    <div className="grid grid-cols-4 gap-1 text-[8px] font-mono text-center text-purple-300 font-bold mb-1">
                                        <div className="bg-purple-900/50 p-1">HISTORIA</div>
                                        <div className="bg-purple-900/50 p-1">CIENCIA</div>
                                        <div className="bg-purple-900/50 p-1">ARTE</div>
                                        <div className="bg-purple-900/50 p-1">CINE</div>
                                    </div>
                                    {/* Mock Cells */}
                                    <div className="grid grid-cols-4 gap-1 flex-1">
                                        {[...Array(12)].map((_, i) => (
                                            <div key={i} className="bg-purple-900/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-cyber text-xs">
                                                {Math.floor(i / 4 + 1) * 100}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="text-left flex-1 space-y-6">
                                <div className="inline-block px-3 py-1 bg-purple-600 text-white text-xs font-bold font-mono rounded uppercase">
                                    GRUPAL / CLASE
                                </div>
                                <h3 className="text-4xl font-black font-cyber text-purple-400 tracking-wide drop-shadow-md">
                                    JEOPARDY NEURAL
                                </h3>
                                <p className="text-gray-300 text-lg leading-relaxed">
                                    El clásico concurso de televisión llevado al aula. Equipos, rebotes, apuestas y "Chaos Mode" con poderes especiales. Ideal para repasar en la pizarra digital.
                                </p>
                                <div className="flex gap-4 pt-4">
                                    <CyberButton 
                                        onClick={() => onNavigate('game_lobby')} 
                                        variant="secondary"
                                        className="h-12 border-purple-500 text-purple-400 hover:bg-purple-900/30"
                                    >
                                        <Trophy className="w-5 h-5 mr-2" /> JUGAR DEMO
                                    </CyberButton>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER CTA --- */}
            <section className="py-16 text-center border-t border-gray-900 bg-gray-950/50">
                <h3 className="text-2xl font-cyber text-white mb-6">¿LISTO PARA TOMAR EL CONTROL?</h3>
                <CyberButton onClick={() => onNavigate(user ? 'teacher_hub' : 'create_menu')} className="h-16 px-10 text-xl">
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
