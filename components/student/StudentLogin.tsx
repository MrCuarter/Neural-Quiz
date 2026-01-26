import React, { useState } from 'react';
import { BossSettings } from '../../types';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { Rocket, Skull } from 'lucide-react';
import { ASSETS_BASE } from '../../data/bossPresets';

interface StudentLoginProps {
    bossConfig: BossSettings;
    quizTitle: string;
    onJoin: (nickname: string) => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ bossConfig, quizTitle, onJoin }) => {
    const [nickname, setNickname] = useState("");

    // Construct Badge URL: /finalboss/[imageId]badge.png
    const imgId = bossConfig.imageId || "kryon"; 
    const badgeUrl = `${ASSETS_BASE}/finalboss/${imgId}badge.png`;

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white bg-[url('/bg-grid.png')]">
            <CyberCard className="max-w-md w-full border-cyan-500/50 p-8 text-center bg-black/80 backdrop-blur relative overflow-hidden">
                {/* Boss Badge Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 blur-[50px] rounded-full pointer-events-none"></div>

                <h1 className="text-3xl md:text-4xl font-cyber text-cyan-400 mb-6 leading-tight relative z-10 text-shadow-cyan">
                    {quizTitle}
                </h1>

                <div className="flex justify-center mb-8 relative z-10 group">
                    <div className="w-40 h-40 rounded-full border-4 border-red-500/50 p-1 bg-black/50 relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.4)] group-hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] transition-all">
                        <img 
                            src={badgeUrl} 
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110"
                            alt="Boss Badge"
                            onError={(e) => {
                                // Fallback if badge fails
                                (e.target as HTMLImageElement).src = bossConfig.images.idle;
                            }}
                        />
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                    </div>
                    <div className="absolute -bottom-3 bg-red-900/90 text-red-100 text-xs font-mono font-bold px-3 py-1 rounded border border-red-500 shadow-lg flex items-center gap-2">
                        <Skull className="w-3 h-3" /> {bossConfig.bossName}
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="relative">
                        <input 
                            value={nickname} 
                            onChange={(e) => setNickname(e.target.value)} 
                            placeholder="TU NOMBRE DE GUERRERO"
                            className="w-full bg-black/50 border-2 border-gray-700 p-4 text-center text-xl font-bold rounded focus:border-cyan-500 outline-none uppercase text-white transition-all placeholder:text-gray-600 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                            maxLength={15}
                        />
                    </div>
                    
                    <CyberButton 
                        onClick={() => onJoin(nickname)} 
                        disabled={!nickname.trim()} 
                        className="w-full h-14 text-lg font-cyber tracking-widest"
                    >
                        <Rocket className="w-5 h-5 mr-2" /> INICIAR MISIÓN
                    </CyberButton>
                </div>
                
                <div className="mt-6 text-[10px] text-gray-500 font-mono">
                    SISTEMA ARCADE V2.0 // CONEXIÓN SEGURA
                </div>
            </CyberCard>
        </div>
    );
};