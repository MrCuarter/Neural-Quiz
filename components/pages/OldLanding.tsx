
import React from 'react';
import { CyberCard } from '../ui/CyberUI';
import { BrainCircuit, FileUp, Gamepad2, Globe, LayoutTemplate } from 'lucide-react';

interface OldLandingProps {
    t: any;
    onNavigate: (view: string) => void;
    onResetGame: () => void;
}

export const OldLanding: React.FC<OldLandingProps> = ({ t, onNavigate, onResetGame }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-700 py-12 relative">
            
            <div className="absolute top-0 right-0 md:top-4 md:right-4 z-50">
                <button onClick={() => onNavigate('home')} className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform">
                    <LayoutTemplate className="w-4 h-4" /> 🏠 IR A LA NUEVA WEB
                </button>
            </div>

            <div className="text-center space-y-6 max-w-4xl relative">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <h2 className="text-sm md:text-base font-mono text-cyan-400 tracking-[0.3em] uppercase">{t.app_subtitle}</h2>
                <h1 className="text-6xl md:text-8xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">{t.home_title_main}</h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl font-light">{t.home_subtitle_main}</p>
                <div className="pt-4 flex justify-center">
                    <button onClick={() => onNavigate('community')} className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/40 border border-gray-700 hover:border-cyan-500 hover:text-cyan-400 transition-all group">
                        <Globe className="w-5 h-5 group-hover:animate-spin-slow" /> <span className="font-mono text-sm tracking-widest">EXPLORAR COMUNIDAD</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl">
                <CyberCard className="group hover:border-cyan-500/50 hover:bg-cyan-950/10 transition-all duration-300 cursor-pointer h-full" onClick={() => onNavigate('create_menu')}>
                    <div className="flex flex-col h-full space-y-4">
                        <div className="p-4 bg-cyan-950/30 rounded-full w-fit group-hover:scale-110 transition-transform duration-300 border border-cyan-500/30"><BrainCircuit className="w-8 h-8 text-cyan-400" /></div>
                        <div><h3 className="text-2xl font-bold font-cyber text-white group-hover:text-cyan-300 mb-2">NEURAL QUIZ</h3><p className="text-cyan-400/80 font-mono text-xs uppercase tracking-wider mb-3">{t.create_quiz_desc}</p><p className="text-gray-400 text-sm leading-relaxed">{t.create_quiz_help}</p></div>
                    </div>
                </CyberCard>
                <CyberCard className="group hover:border-pink-500/50 hover:bg-pink-950/10 transition-all duration-300 cursor-pointer h-full" onClick={() => onNavigate('convert_upload')}>
                    <div className="flex flex-col h-full space-y-4">
                        <div className="p-4 bg-pink-950/30 rounded-full w-fit group-hover:scale-110 transition-transform duration-300 border border-pink-500/30"><FileUp className="w-8 h-8 text-pink-400" /></div>
                        <div><h3 className="text-2xl font-bold font-cyber text-white group-hover:text-pink-300 mb-2">{t.convert_quiz}</h3><p className="text-pink-400/80 font-mono text-xs uppercase tracking-wider mb-3">{t.convert_quiz_desc}</p><p className="text-gray-400 text-sm leading-relaxed">{t.convert_quiz_help}</p></div>
                    </div>
                </CyberCard>
                <CyberCard className="group hover:border-yellow-500/50 hover:bg-yellow-950/10 transition-all duration-300 cursor-pointer h-full" onClick={() => { onResetGame(); onNavigate('game_lobby'); }}>
                    <div className="flex flex-col h-full space-y-4">
                        <div className="p-4 bg-yellow-950/30 rounded-full w-fit group-hover:scale-110 transition-transform duration-300 border border-yellow-500/30"><Gamepad2 className="w-8 h-8 text-yellow-400" /></div>
                        <div><h3 className="text-2xl font-bold font-cyber text-white group-hover:text-yellow-300 mb-2">NEURAL ARCADE</h3><p className="text-yellow-400/80 font-mono text-xs uppercase tracking-wider mb-3">JEOPARDY // HEX // BOSS BATTLE</p><p className="text-gray-400 text-sm leading-relaxed">Lanza juegos en vivo (Teams) o crea retos individuales arcade (Boss/Time Attack).</p></div>
                    </div>
                </CyberCard>
            </div>
        </div>
    );
};
