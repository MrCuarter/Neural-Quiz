
import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../../services/firebaseService';
import { doc, onSnapshot, collection, query, where, updateDoc } from 'firebase/firestore';
import { Evaluation, EvaluationAttempt } from '../../../types';
import { CyberCard, CyberButton } from '../../ui/CyberUI';
import { Skull, Clock, Trophy, Users, AlertTriangle, Swords, Volume2, VolumeX, Play, Copy, CheckCircle2, Loader2 } from 'lucide-react';
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
    const [lobbyPlayers, setLobbyPlayers] = useState<{name: string, avatar: string}[]>([]); // Improved Type
    const [bossState, setBossState] = useState<'idle' | 'damage' | 'attack' | 'dead'>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    
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
                
                // Play Start Sound if switching to active
                if (data.status === 'active' && (!evaluation || evaluation.status === 'waiting')) {
                    playSound('battlelevel3', isMuted);
                }

                // Sync timer
                if (data.status === 'active' && data.config.endDate) {
                    const end = new Date(data.config.endDate).getTime();
                    const now = Date.now();
                    const remaining = Math.max(0, Math.floor((end - now) / 1000));
                    setTimeLeft(remaining);
                }
            }
        });

        // 2. Listen to Attempts (Damage Stream & Players)
        const qAttempts = query(collection(db, 'attempts'), where('evaluationId', '==', evaluationId));
        const unsubAttempts = onSnapshot(qAttempts, (snap) => {
            let dmg = 0;
            const playersMap = new Map<string, {name: string, avatar: string}>();
            
            snap.forEach(doc => {
                const att = doc.data() as EvaluationAttempt;
                dmg += att.score; // Score = Damage in Raid Mode
                if (att.nickname) {
                    playersMap.set(att.nickname, { 
                        name: att.nickname, 
                        avatar: att.avatarId || '🤖' 
                    });
                }
            });
            
            setTotalDamage(dmg);
            setParticipants(playersMap.size);
            setLobbyPlayers(Array.from(playersMap.values()));
        });

        return () => {
            unsubEval();
            unsubAttempts();
        };
    }, [evaluationId]);

    // --- GAME LOOP & FX ---
    useEffect(() => {
        // SAFETY CHECK: Do not run logic if not loaded or not active
        if (!evaluation || !evaluation.config.raidConfig) return;
        
        // IMPORTANT: If status is waiting, ignore damage calculations to prevent early game over
        if (evaluation.status === 'waiting') {
            return; 
        }

        const maxHP = evaluation.config.raidConfig.totalBossHP;
        const currentHP = maxHP - totalDamage;

        // Check Damage Event (Only if active)
        if (evaluation.status === 'active' && totalDamage > prevDamageRef.current) {
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
        if (evaluation.status === 'active') {
            if (currentHP <= 0) {
                // VICTORY CONDITION MET
                playSound('win', isMuted);
                finishRaid('victory');
            } else if (timeLeft <= 0 && evaluation.config.endDate) { // Ensure endDate is set
                // TIME UP
                playSound('gameover', isMuted);
                finishRaid('defeat');
            }
        }

    }, [totalDamage, timeLeft, evaluation]);

    // --- TIMER TICK ---
    useEffect(() => {
        let interval: any;
        if (evaluation?.status === 'active' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [evaluation?.status, timeLeft]);

    const finishRaid = async (result: 'victory' | 'defeat') => {
        const evalRef = doc(db, 'evaluations', evaluationId);
        // Only update if not already finished to avoid loops
        if (evaluation?.status !== 'finished') {
            await updateDoc(evalRef, { 
                status: 'finished',
                isActive: false
            });
        }
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
    };

    const copyLink = () => {
        const url = `${window.location.origin}/play/${evaluationId}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    // --- RENDER PROTECTION: LOADING ---
    if (!evaluation) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-red-500 mb-4"/> 
                <span className="font-cyber text-red-400 animate-pulse">ESTABLECIENDO ENLACE NEURAL...</span>
            </div>
        );
    }

    const bossSettings = evaluation.config.bossSettings;
    const maxHP = evaluation.config.raidConfig?.totalBossHP || 1000;
    const currentHP = Math.max(0, maxHP - totalDamage);
    const hpPercent = (currentHP / maxHP) * 100;

    // --- VIEW: PODIUM (ONLY IF FINISHED) ---
    if (evaluation.status === 'finished') {
        // Determine result based on damage. If HP > 0, it was a defeat (timeout).
        const result = currentHP <= 0 ? 'victory' : 'defeat';
        return <RaidPodium evaluationId={evaluationId} result={result} bossName={bossSettings?.bossName || "Boss"} />;
    }

    // --- VIEW: LOBBY (WAITING ROOM) ---
    if (evaluation.status === 'waiting') {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-cyber">
                {/* Background Boss Preview */}
                <div className="absolute inset-0 z-0 opacity-20 flex items-center justify-center">
                    <img src={bossSettings?.images.idle} className="h-full object-cover grayscale" alt="Boss BG" />
                </div>

                <div className="z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    
                    {/* LEFT: BOSS INFO & START */}
                    <div className="space-y-6 flex flex-col justify-center">
                        <CyberCard className="border-red-500/50 p-8 text-center bg-black/80 backdrop-blur-md">
                            <Skull className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-4xl font-black mb-2 uppercase text-red-100">{bossSettings?.bossName}</h2>
                            <div className="inline-block bg-red-950/50 border border-red-500/30 px-3 py-1 rounded text-red-300 text-xs font-mono mb-6">
                                NIVEL DE AMENAZA: {bossSettings?.difficulty.toUpperCase()}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/40 p-3 rounded border border-gray-800">
                                    <div className="text-gray-500 text-[10px] uppercase">VIDA BOSS</div>
                                    <div className="text-xl font-mono text-red-400">{maxHP} HP</div>
                                </div>
                                <div className="bg-black/40 p-3 rounded border border-gray-800">
                                    <div className="text-gray-500 text-[10px] uppercase">TIEMPO LÍMITE</div>
                                    <div className="text-xl font-mono text-blue-400">{evaluation.config.raidConfig?.timeLimitMinutes} MIN</div>
                                </div>
                            </div>

                            <CyberButton 
                                onClick={startGame} 
                                className="w-full h-16 text-xl font-black tracking-widest bg-red-600 hover:bg-red-500 border-none shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse"
                            >
                                <Swords className="w-6 h-6 mr-3" /> COMENZAR RAID
                            </CyberButton>
                        </CyberCard>

                        <div 
                            className="bg-black/60 border border-gray-700 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:border-cyan-500 transition-colors"
                            onClick={copyLink}
                        >
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">ENLACE DE ACCESO</span>
                                <span className="text-cyan-400 font-mono text-sm truncate max-w-[200px] md:max-w-[300px]">{window.location.origin}/play/{evaluationId}</span>
                            </div>
                            <div className="p-2 bg-gray-800 rounded text-white">
                                {copiedLink ? <CheckCircle2 className="w-5 h-5 text-green-400"/> : <Copy className="w-5 h-5"/>}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: PLAYER LIST */}
                    <CyberCard className="border-cyan-500/30 bg-black/80 backdrop-blur-md flex flex-col h-[500px]">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-cyan-400" />
                                <h3 className="font-bold text-white">SALA DE ESPERA</h3>
                            </div>
                            <span className="bg-cyan-900/30 text-cyan-300 px-2 py-1 rounded text-xs font-mono">
                                {participants} LISTOS
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {lobbyPlayers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 opacity-50">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span className="text-xs font-mono">ESPERANDO SEÑAL...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {lobbyPlayers.map((player, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-900/50 rounded border border-gray-800 animate-in zoom-in-95">
                                            <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-xl border border-gray-700">
                                                {player.avatar}
                                            </div>
                                            <span className="font-mono text-cyan-100 text-sm truncate">{player.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CyberCard>

                </div>
            </div>
        );
    }

    // --- VIEW: ACTIVE DASHBOARD ---
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
                        <Users className="w-4 h-4" /> {participants} Raiders luchando
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

        </div>
    );
};
