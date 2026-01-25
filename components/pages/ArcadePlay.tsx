
import React, { useState, useEffect } from 'react';
import { getEvaluation } from '../../services/firebaseService';
import { Evaluation } from '../../types';
import { CyberButton, CyberCard, CyberInput } from '../ui/CyberUI';
import { Loader2, AlertTriangle, Gamepad2, User, Play, Rocket, Monitor, Zap } from 'lucide-react';

interface ArcadePlayProps {
    evaluationId: string;
    onExit?: () => void; // Optional if we want to allow going back home in some contexts
}

type GameState = 'LOBBY' | 'PLAYING' | 'FINISHED';

export const ArcadePlay: React.FC<ArcadePlayProps> = ({ evaluationId }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [gameState, setGameState] = useState<GameState>('LOBBY');
    
    // Player State
    const [nickname, setNickname] = useState("");

    useEffect(() => {
        const loadEvaluation = async () => {
            setLoading(true);
            try {
                const data = await getEvaluation(evaluationId);
                
                // Check if active
                if (!data.isActive) {
                    throw new Error("Esta evaluación ha sido cerrada por el profesor.");
                }
                
                // Check dates
                const now = new Date();
                const startDate = new Date(data.config.startDate);
                if (now < startDate) {
                    throw new Error(`La evaluación comienza el ${startDate.toLocaleString()}`);
                }
                if (data.config.endDate) {
                    const endDate = new Date(data.config.endDate);
                    if (now > endDate) {
                        throw new Error("El plazo para esta evaluación ha finalizado.");
                    }
                }

                setEvaluation(data);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "No se pudo cargar la evaluación.");
            } finally {
                setLoading(false);
            }
        };

        loadEvaluation();
    }, [evaluationId]);

    const handleJoin = () => {
        if (!nickname.trim()) return;
        // Here we could save the player to Firebase subcollection 'players' if needed later
        setGameState('PLAYING');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-cyan-500">
                <Loader2 className="w-16 h-16 animate-spin mb-6" />
                <span className="font-cyber text-xl animate-pulse tracking-widest">CONNECTING TO ARCADE SERVER...</span>
            </div>
        );
    }

    if (error || !evaluation) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
                <CyberCard className="max-w-md border-red-500/50 bg-red-950/10">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-3xl font-cyber text-red-400 mb-2">ACCESS DENIED</h2>
                    <p className="text-gray-300 font-mono text-sm leading-relaxed">{error || "Evaluación no encontrada."}</p>
                </CyberCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex flex-col">
            
            {/* ARCADE BACKGROUND FX */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.1),transparent_70%)] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_2px,transparent_2px),linear-gradient(90deg,rgba(18,18,18,0)_2px,transparent_2px)] bg-[size:40px_40px] [background-position:center] opacity-20 pointer-events-none"></div>
            
            {/* CONTENT */}
            <div className="relative z-10 flex-1 flex flex-col">
                
                {gameState === 'LOBBY' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-500">
                        
                        <div className="mb-8 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-purple-900/30 border border-purple-500/50 text-purple-300 text-xs font-mono font-bold mb-4 uppercase tracking-widest">
                                <Monitor className="w-3 h-3" /> ARCADE MODE ONLINE
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-2">
                                {evaluation.title.toUpperCase()}
                            </h1>
                            <p className="text-cyan-400 font-mono text-sm md:text-base tracking-wide">
                                {evaluation.questions.length} NIVELES (PREGUNTAS) • {evaluation.config.allowSpeedPoints ? 'SPEED BONUS ACTIVE' : 'STANDARD SCORE'}
                            </p>
                        </div>

                        <CyberCard className="w-full max-w-md border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-black/80 backdrop-blur-xl p-8">
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-cyan-900/20 rounded-full flex items-center justify-center border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-pulse">
                                    <User className="w-10 h-10 text-cyan-300" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono text-gray-500 uppercase tracking-widest text-center block">INSERT COIN / NAME</label>
                                    <input 
                                        type="text" 
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="TU NICKNAME..."
                                        className="w-full bg-black border-2 border-gray-700 focus:border-cyan-500 text-center text-2xl font-bold font-cyber py-4 text-white uppercase tracking-wider rounded-lg outline-none transition-all placeholder:text-gray-800"
                                        maxLength={15}
                                        autoFocus
                                    />
                                </div>

                                <button 
                                    onClick={handleJoin}
                                    disabled={!nickname.trim()}
                                    className={`w-full py-4 rounded-lg font-black font-cyber text-xl tracking-widest flex items-center justify-center gap-3 transition-all duration-300 ${nickname.trim() ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:scale-[1.02] shadow-[0_0_30px_rgba(6,182,212,0.4)] text-white cursor-pointer' : 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'}`}
                                >
                                    {nickname.trim() ? <><Rocket className="w-6 h-6 animate-bounce" /> PRESS START</> : "ENTER NAME"}
                                </button>
                            </div>
                        </CyberCard>

                        <div className="mt-8 flex gap-4 text-[10px] font-mono text-gray-600 uppercase">
                            <span className="flex items-center gap-1"><Gamepad2 className="w-3 h-3" /> POWERED BY NEURAL ENGINE</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> V 2.0</span>
                        </div>
                    </div>
                )}

                {gameState === 'PLAYING' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in slide-in-from-right duration-500">
                        <div className="max-w-2xl w-full">
                            <h2 className="text-3xl font-cyber text-yellow-400 mb-6 animate-pulse">¡PREPÁRATE, {nickname.toUpperCase()}!</h2>
                            <CyberCard className="border-yellow-500/30 h-64 flex items-center justify-center bg-yellow-900/10">
                                <div className="text-center space-y-4">
                                    <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto" />
                                    <p className="font-mono text-lg text-yellow-200">CARGANDO EL PRIMER NIVEL...</p>
                                    <p className="text-xs text-gray-500">(Aquí irá la mecánica de juego en la Fase 3)</p>
                                </div>
                            </CyberCard>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
