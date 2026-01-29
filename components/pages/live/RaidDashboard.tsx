
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../../services/firebaseService';
import { doc, onSnapshot, collection, query, where, updateDoc } from 'firebase/firestore';
import { Evaluation, EvaluationAttempt } from '../../../types';
import { CyberCard, CyberButton } from '../../ui/CyberUI';
import { Skull, Clock, Trophy, Users, AlertTriangle, Swords, Volume2, VolumeX } from 'lucide-react';
import { ASSETS_BASE } from '../../../data/bossPresets';
import { RaidPodium } from './RaidPodium';

interface RaidDashboardProps {
    evaluationId: string;
}

// Sound Utility
const playSound = (sound: string, isMuted: boolean) => {
    if (isMuted) return;
    try {
        const audio = new Audio(`${ASSETS_BASE}/sounds/${sound}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch(e) {}
};

export const RaidDashboard: React.FC<RaidDashboardProps> = ({ evaluationId }) => {
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [totalDamage, setTotalDamage] = useState(0);
    const [participants, setParticipants] = useState(0);
    const [bossState, setBossState] = useState<'idle' | 'damage' | 'attack' | 'dead'>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'victory' | 'defeat'>('waiting');
    const [isMuted, setIsMuted] = useState(false);
    
    // FX States
    const [shake, setShake] = useState(false);
    const [flash, setFlash] = useState(false);
    const prevDamageRef = useRef(0);

    useEffect(() => {
        // 1. Listen to Evaluation Document (Timer & Status)
        const evalRef = doc(db, 'evaluations', evaluationId);
        const unsubEval = onSnapshot(evalRef, (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() } as Evaluation;
                setEvaluation(data);
                
                // Initialize timer if just loaded
                if (data.status === 'active' && timeLeft === 0 && data.config.raidConfig) {
                    // Simple calc: EndDate - Now. 
                    // Better: Assuming 'raidConfig.timeLimitMinutes' was set, calculate remaining.
                    // For MVP simplicity, let's assume teacher starts timer manually or it runs from creation?
                    // Actually, let's rely on a local timer that syncs.
                    // Or purely rely on 'endDate' in config? 
                    // Let's use endDate in config.
                    if (data.config.endDate) {
                        const end = new Date(data.config.endDate).getTime();
                        const now = Date.now();
                        setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));
                    }
                }
                
                if (data.status === 'finished') {
                    // Check win condition
                    // We need totalDamage here, which comes from the other listener.
                    // Logic handled in effect below.
                }
            }
        });

        // 2. Listen to Attempts (Damage Stream)
        const qAttempts = query(collection(db, 'attempts'), where('evaluationId', '==', evaluationId));
        const unsubAttempts = onSnapshot(qAttempts, (snap) => {
            let dmg = 0;
            const uniqueUsers = new Set();
            snap.forEach(doc => {
                const att = doc.data() as EvaluationAttempt;
                dmg += att.score; // Score = Damage in Raid Mode
                uniqueUsers.add(att.nickname);
            });
            setTotalDamage(dmg);
            setParticipants(uniqueUsers.size);
        });

        return () => {
            unsubEval();
            unsubAttempts();
        };
    }, [evaluationId]);

    // --- GAME LOOP & FX ---
    useEffect(() => {
        if (!evaluation?.config.raidConfig) return;

        const maxHP = evaluation.config.raidConfig.totalBossHP;
        const currentHP = maxHP - totalDamage;

        // Check Damage Event
        if (totalDamage > prevDamageRef.current) {
            const diff = totalDamage - prevDamageRef.current;
            // Trigger FX
            setBossState('damage');
            setShake(true);
            setFlash(true);
            playSound('hit', isMuted);
            
            setTimeout(() => {
                setShake(false);
                setFlash(false);
                setBossState('idle');
            }, 500);
        }
        prevDamageRef.current = totalDamage;

        // Check Win/Loss
        if (currentHP <= 0 && gameStatus !== 'victory') {
            setGameStatus('victory');
            setBossState('dead');
            playSound('win', isMuted);
            finishRaid('victory');
        } else if (timeLeft <= 0 && gameStatus === 'active' && currentHP > 0) {
            setGameStatus('defeat');
            playSound('gameover', isMuted);
            finishRaid('defeat');
        }

    }, [totalDamage, timeLeft, evaluation, gameStatus]);

    // --- TIMER ---
    useEffect(() => {
        let interval: any;
        if (gameStatus === 'active' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameStatus, timeLeft]);

    const finishRaid = async (result: 'victory' | 'defeat') => {
        const evalRef = doc(db, 'evaluations', evaluationId);
        await updateDoc(evalRef, { 
            status: 'finished',
            isActive: false,
            // Store result in config or root? Let's assume just status finished is enough
        });
    };

    const startGame = async () => {
        if (!evaluation) return;
        const durationMin = evaluation.config.raidConfig?.timeLimitMinutes || 10;
        const endDate = new Date(Date.now() + durationMin * 60000).toISOString();
        
        const evalRef = doc(db, 'evaluations', evaluationId);
        await updateDoc(evalRef, { 
            status: 'active',
            'config.endDate': endDate
        });
        
        setGameStatus('active');
        setTimeLeft(durationMin * 60);
        playSound('battlelevel3', isMuted); // Start BGM
    };

    if (!evaluation) return <div className="bg-black min-h-screen text-white flex items-center justify-center"><p>Conectando a Neural Link...</p></div>;

    const bossSettings = evaluation.config.bossSettings;
    const maxHP = evaluation.config.raidConfig?.totalBossHP || 1000;
    const currentHP = Math.max(0, maxHP - totalDamage);
    const hpPercent = (currentHP / maxHP) * 100;

    // --- VIEW: PODIUM ---
    if (gameStatus === 'victory' || gameStatus === 'defeat') {
        return <RaidPodium evaluationId={evaluationId} result={gameStatus} bossName={bossSettings?.bossName || "Boss"} />;
    }

    // --- VIEW: DASHBOARD ---
    return (
        <div className={`min-h-screen bg-[#050505] text-white relative overflow-hidden font-cyber ${shake ? 'animate-shake' : ''}`}>
            
            {/* FLASH FX */}
            <div className={`absolute inset-0 bg-red-500/30 z-50 pointer-events-none transition-opacity duration-100 ${flash ? 'opacity-100' : 'opacity-0'}`}></div>

            {/* HEADER HUD */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-40">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] uppercase">{bossSettings?.bossName}</h1>
                        <span className="bg-red-900/50 text-red-200 px-3 py-1 rounded border border-red-500 text-sm font-bold animate-pulse">RAID EN CURSO</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
                        <Users className="w-4 h-4" /> {participants} Raiders conectados
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`text-6xl font-mono font-black ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-black/50 rounded-full border border-gray-700 hover:bg-gray-800">
                        {isMuted ? <VolumeX className="w-6 h-6 text-gray-500" /> : <Volume2 className="w-6 h-6 text-cyan-400" />}
                    </button>
                </div>
            </div>

            {/* BOSS VISUAL CENTER */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="relative w-[50vh] h-[50vh] md:w-[70vh] md:h-[70vh]">
                    <img 
                        src={bossState === 'damage' ? bossSettings?.images.damage : bossSettings?.images.idle} 
                        alt="Boss"
                        className={`w-full h-full object-contain drop-shadow-[0_0_50px_rgba(255,0,0,0.4)] transition-transform duration-200 ${bossState === 'damage' ? 'scale-110 brightness-150' : 'scale-100'}`}
                    />
                    
                    {/* Floating Damage Text (Simulated) */}
                    {bossState === 'damage' && (
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-6xl font-black text-yellow-400 animate-bounce drop-shadow-lg">
                            CRITICAL!
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER HP BAR */}
            <div className="absolute bottom-0 left-0 right-0 p-8 z-40 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="max-w-5xl mx-auto space-y-2">
                    <div className="flex justify-between text-red-400 font-mono font-bold text-xl uppercase tracking-widest">
                        <span>Integridad del Enemigo</span>
                        <span>{currentHP} / {maxHP} HP</span>
                    </div>
                    <div className="h-12 w-full bg-red-950/50 border-2 border-red-900 rounded-lg overflow-hidden relative shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                        {/* Background Stripes */}
                        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)'}}></div>
                        
                        {/* Bar */}
                        <div 
                            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-orange-500 transition-all duration-300 ease-out"
                            style={{ width: `${hpPercent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* START OVERLAY */}
            {gameStatus === 'waiting' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <CyberCard className="w-full max-w-lg text-center p-12 border-red-500/50 shadow-[0_0_100px_rgba(220,38,38,0.4)] animate-in zoom-in">
                        <Skull className="w-24 h-24 text-red-500 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-4xl font-black font-cyber text-white mb-2">SISTEMA RAID LISTO</h2>
                        <p className="text-gray-400 font-mono mb-8">Esperando a que los estudiantes se unan. Inicia cuando estés listo.</p>
                        <div className="text-2xl font-mono text-cyan-400 mb-8">{participants} Conectados</div>
                        <CyberButton onClick={startGame} className="w-full h-16 text-2xl font-black tracking-widest bg-red-600 hover:bg-red-500 border-none shadow-[0_0_30px_red]">
                            <Swords className="w-8 h-8 mr-3" /> INICIAR BATALLA
                        </CyberButton>
                    </CyberCard>
                </div>
            )}

        </div>
    );
};
