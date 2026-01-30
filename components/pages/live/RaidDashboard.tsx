
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
    const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]); // New for Lobby
    const [bossState, setBossState] = useState<'idle' | 'damage' | 'attack' | 'dead'>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'victory' | 'defeat'>('waiting');
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
                
                // Sync Local Status with DB Status
                if (data.status) {
                    // Map DB status to local gameStatus type if needed, or use directly
                    // 'waiting' | 'active' | 'finished' -> 'waiting' | 'active' | 'victory'/'defeat'
                    if (data.status === 'active' && gameStatus === 'waiting') {
                        setGameStatus('active');
                        playSound('battlelevel3', isMuted);
                    }
                }

                // Initialize timer logic
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
            const uniqueUsers = new Set<string>();
            snap.forEach(doc => {
                const att = doc.data() as EvaluationAttempt;
                dmg += att.score; // Score = Damage in Raid Mode
                if (att.nickname) uniqueUsers.add(att.nickname);
            });
            setTotalDamage(dmg);
            setParticipants(uniqueUsers.size);
            setLobbyPlayers(Array.from(uniqueUsers));
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

        // Check Damage Event (Only if active)
        if (gameStatus === 'active' && totalDamage > prevDamageRef.current) {
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
        if (gameStatus === 'active') {
            if (currentHP <= 0) {
                setGameStatus('victory');
                setBossState('dead');
                playSound('win', isMuted);
                finishRaid('victory');
            } else if (timeLeft <= 0 && evaluation.status === 'active') { // Ensure we rely on synced status too
                // Allow a small buffer for timer sync issues
                if (timeLeft === 0) {
                    setGameStatus('defeat');
                    playSound('gameover', isMuted);
                    finishRaid('defeat');
                }
            }
        }

    }, [totalDamage, timeLeft, evaluation, gameStatus]);

    // --- TIMER ---
    useEffect(() => {
        let interval: any;
        if (gameStatus === 'active' && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameStatus, timeLeft]);

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
        
        // Local state update happens via snapshot listener for consistency
    };

    const copyLink = () => {
        const url = `${window.location.origin}/play/${evaluationId}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    if (!evaluation) return <div className="bg-black min-h-screen text-white flex items-center justify-center"><Loader2 className="animate-spin mr-2"/> Conectando a Neural Link...</div>;

    const bossSettings = evaluation.config.bossSettings;
    const maxHP = evaluation.config.raidConfig?.totalBossHP || 1000;
    const currentHP = Math.max(0, maxHP - totalDamage);
    const hpPercent = (currentHP / maxHP) * 100;

    // --- VIEW: PODIUM ---
    if (gameStatus === 'victory' || gameStatus === 'defeat' || (evaluation.status === 'finished')) {
        return <RaidPodium evaluationId={evaluationId} result={gameStatus === 'victory' ? 'victory' : 'defeat'} bossName={bossSettings?.bossName || "Boss"} />;
    }

    // --- VIEW: LOBBY (WAITING ROOM) ---
    if (evaluation.status === 'waiting' || gameStatus === 'waiting') {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-cyber">
                {/* Background Boss Preview */}
                <div className="absolute inset-0 z-0 opacity-20 flex items-center justify-center">
                    <img src={bossSettings?.images.idle} className="h-full object-cover grayscale" alt="Boss BG" />
                </div>

                <div className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* LEFT: BOSS INFO & START */}
                    <div className="space-y-6">
                        <CyberCard className="border-red-500/50 p-8 text-center bg-black/80 backdrop-blur-md">
                            <Skull className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-3xl font-black mb-1 uppercase text-red-100">{bossSettings?.bossName}</h2>
                            <p className="text-red-400 font-mono text-sm mb-6">NIVEL DE AMENAZA: {bossSettings?.difficulty}</p>
                            
                            <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-lg mb-6">
                                <div className="text-4xl font-mono font-bold text-white mb-2">{participants}</div>
                                <div className="text-xs text-red-300 uppercase tracking-widest">JUGADORES LISTOS</div>
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
                                <span className="text-cyan-400 font-mono text-sm truncate max-w-[200px]">{window.location.origin}/play/{evaluationId}</span>
                            </div>
                            <div className="p-2 bg-gray-800 rounded text-white">
                                {copiedLink ? <CheckCircle2 className="w-5 h-5 text-green-400"/> : <Copy className="w-5 h-5"/>}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: PLAYER LIST */}
                    <CyberCard className="border-cyan-500/30 bg-black/80 backdrop-blur-md flex flex-col h-[500px]">
                        <div className="flex items-center gap-2 border-b border-gray-800 pb-4 mb-4">
                            <Users className="w-5 h-5 text-cyan-400" />
                            <h3 className="font-bold text-white">SALA DE ESPERA</h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {lobbyPlayers.length === 0 ? (
                                <div className="text-center text-gray-500 py-20 animate-pulse">Esperando conexiones...</div>
                            ) : (
                                lobbyPlayers.map((player, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded border border-gray-800 animate-in slide-in-from-left-4 fade-in">
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_lime]"></div>
                                        <span className="font-mono text-cyan-100 font-bold">{player}</span>
                                    </div>
                                ))
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
