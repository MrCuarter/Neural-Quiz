
import React, { useState, useEffect } from 'react';
import { BossSettings } from '../../types';
import { CyberButton, CyberCard, CyberSelect, CyberInput } from '../ui/CyberUI';
import { Rocket, Skull, UserCheck, AlertTriangle } from 'lucide-react';
import { ASSETS_BASE } from '../../data/bossPresets';
import { getClassById } from '../../services/classService';

interface StudentLoginProps {
    bossConfig: BossSettings;
    quizTitle: string;
    classId?: string; // New Prop
    onJoin: (nickname: string, realName?: string) => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ bossConfig, quizTitle, classId, onJoin }) => {
    const [nickname, setNickname] = useState("");
    const [realName, setRealName] = useState("");
    const [studentList, setStudentList] = useState<string[]>([]);
    const [loadingClass, setLoadingClass] = useState(false);

    // Construct Badge URL
    const imgId = bossConfig.imageId || "kryon"; 
    const badgeUrl = `${ASSETS_BASE}/finalboss/${imgId}badge.png`;

    useEffect(() => {
        if (bossConfig.attackVoice) {
            try {
                const audio = new Audio(bossConfig.attackVoice);
                audio.volume = 0.5;
                audio.play().catch(e => console.log("Autoplay prevented:", e));
            } catch (e) {}
        }
    }, [bossConfig]);

    // Load class students if assigned
    useEffect(() => {
        if (classId) {
            setLoadingClass(true);
            getClassById(classId).then(cls => {
                if (cls) {
                    setStudentList(cls.students.sort());
                }
                setLoadingClass(false);
            });
        }
    }, [classId]);

    const handleJoin = () => {
        // Validation
        if (!nickname.trim()) return;
        if (classId && !realName) return;

        // Clean up inputs
        const finalAlias = nickname.trim().toUpperCase();
        const finalRealName = classId ? realName : undefined;

        onJoin(finalAlias, finalRealName);
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white bg-[url('/bg-grid.png')]">
            <CyberCard className="max-w-md w-full border-cyan-500/50 p-8 text-center bg-black/80 backdrop-blur relative overflow-hidden">
                {/* Boss Badge Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/20 blur-[60px] rounded-full pointer-events-none"></div>

                <h1 className="text-3xl md:text-4xl font-cyber text-cyan-400 mb-6 leading-tight relative z-10 text-shadow-cyan text-balance">
                    {quizTitle}
                </h1>

                <div className="flex justify-center mb-8 relative z-10 group">
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-red-500/50 p-1 bg-black/50 relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.4)] group-hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] transition-all">
                        <img 
                            src={badgeUrl} 
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110"
                            alt="Boss Badge"
                            onError={(e) => { (e.target as HTMLImageElement).src = bossConfig.images.idle; }}
                        />
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none"></div>
                    </div>
                    <div className="absolute -bottom-3 bg-red-900/90 text-red-100 text-xs font-mono font-bold px-3 py-1 rounded border border-red-500 shadow-lg flex items-center gap-2">
                        <Skull className="w-3 h-3" /> {bossConfig.bossName}
                    </div>
                </div>

                <div className="space-y-4 relative z-10 text-left">
                    
                    {/* SCENARIO B: CLASS MODE (Double Identity) */}
                    {classId && (
                        <div className="space-y-4 bg-cyan-950/20 p-4 rounded border border-cyan-500/30 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-center mb-2">
                                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                                    <UserCheck className="w-4 h-4" /> IDENTIFICACIÓN REQUERIDA
                                </span>
                            </div>
                            
                            {loadingClass ? (
                                <div className="text-center text-xs text-gray-500 animate-pulse">Cargando lista de clase...</div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-gray-400">1. ¿QUIÉN ERES? (NOMBRE REAL)</label>
                                    <select 
                                        value={realName}
                                        onChange={(e) => setRealName(e.target.value)}
                                        className="w-full bg-black/50 border border-gray-600 rounded p-3 text-white text-sm focus:border-cyan-500 outline-none appearance-none"
                                    >
                                        <option value="">-- Selecciona tu nombre --</option>
                                        {studentList.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-mono text-gray-400">2. ALIAS DE COMBATE (PÚBLICO)</label>
                                <input 
                                    value={nickname} 
                                    onChange={(e) => setNickname(e.target.value)} 
                                    placeholder="Ej: SUPER_PLAYER_99"
                                    className="w-full bg-black/50 border border-gray-600 p-3 text-center text-lg font-bold rounded focus:border-cyan-500 outline-none uppercase text-white placeholder:text-gray-600"
                                    maxLength={15}
                                />
                            </div>
                        </div>
                    )}

                    {/* SCENARIO A: OPEN MODE (Simple Nickname) */}
                    {!classId && (
                        <div className="relative">
                            <input 
                                value={nickname} 
                                onChange={(e) => setNickname(e.target.value)} 
                                placeholder="TU NOMBRE DE GUERRERO"
                                className="w-full bg-black/50 border-2 border-gray-700 p-4 text-center text-xl font-bold rounded focus:border-cyan-500 outline-none uppercase text-white transition-all placeholder:text-gray-600 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                maxLength={15}
                            />
                        </div>
                    )}
                    
                    <CyberButton 
                        onClick={handleJoin} 
                        disabled={!nickname.trim() || (!!classId && !realName)} 
                        className="w-full h-14 text-lg font-cyber tracking-widest bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none"
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
