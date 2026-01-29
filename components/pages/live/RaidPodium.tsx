
import React, { useEffect, useState } from 'react';
import { getEvaluationLeaderboard } from '../../../services/firebaseService';
import { EvaluationAttempt } from '../../../types';
import { CyberCard, CyberButton } from '../../ui/CyberUI';
import { Trophy, Target, Heart, ArrowLeft, Crown } from 'lucide-react';

interface RaidPodiumProps {
    evaluationId: string;
    result: 'victory' | 'defeat';
    bossName: string;
}

export const RaidPodium: React.FC<RaidPodiumProps> = ({ evaluationId, result, bossName }) => {
    const [attempts, setAttempts] = useState<EvaluationAttempt[]>([]);
    
    useEffect(() => {
        const loadStats = async () => {
            const data = await getEvaluationLeaderboard(evaluationId, 100);
            setAttempts(data);
        };
        loadStats();
    }, [evaluationId]);

    // COMPUTED STATS
    const damageTitans = [...attempts].sort((a,b) => b.score - a.score).slice(0, 3);
    
    const snipers = [...attempts]
        .filter(a => (a.answersSummary?.total || 0) >= 5) // Min 5 answers
        .sort((a,b) => b.accuracy - a.accuracy)
        .slice(0, 3);

    // Lionheart: Bottom 50% score but high activity (total answers)
    const bottomHalf = [...attempts].sort((a,b) => b.score - a.score).slice(Math.floor(attempts.length / 2));
    const lionheart = bottomHalf.sort((a,b) => (b.answersSummary?.total || 0) - (a.answersSummary?.total || 0))[0];

    const getMedalColor = (i: number) => i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : "text-orange-400";

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 flex flex-col items-center justify-center font-cyber">
            
            <div className="text-center mb-12 animate-in slide-in-from-top-10 duration-700">
                <h1 className={`text-6xl md:text-8xl font-black uppercase mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] ${result === 'victory' ? 'text-green-500' : 'text-red-500'}`}>
                    {result === 'victory' ? "VICTORIA" : "DERROTA"}
                </h1>
                <p className="text-xl md:text-2xl text-gray-400 font-mono tracking-widest">
                    {result === 'victory' ? `${bossName} HA CAÍDO` : `${bossName} ESCAPÓ`}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                
                {/* 1. TITANES DEL DAÑO (SCORE) */}
                <CyberCard className="bg-red-950/30 border-red-500/50 p-6 flex flex-col items-center animate-in zoom-in delay-100">
                    <div className="p-4 bg-red-900/50 rounded-full mb-4 border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                        <Trophy className="w-12 h-12 text-red-200" />
                    </div>
                    <h3 className="text-2xl font-bold text-red-400 mb-6 uppercase tracking-widest">TITANES DEL DAÑO</h3>
                    <div className="w-full space-y-4">
                        {damageTitans.map((p, i) => (
                            <div key={i} className="flex justify-between items-center bg-black/40 p-3 rounded border border-red-900/50">
                                <div className="flex items-center gap-3">
                                    <span className={`text-2xl font-black ${getMedalColor(i)}`}>#{i+1}</span>
                                    <span className="font-mono text-lg">{p.nickname}</span>
                                </div>
                                <span className="font-bold text-red-400">{p.score} DMG</span>
                            </div>
                        ))}
                    </div>
                </CyberCard>

                {/* 2. FRANCOTIRADORES (PRECISION) */}
                <CyberCard className="bg-blue-950/30 border-blue-500/50 p-6 flex flex-col items-center animate-in zoom-in delay-300">
                    <div className="p-4 bg-blue-900/50 rounded-full mb-4 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                        <Target className="w-12 h-12 text-blue-200" />
                    </div>
                    <h3 className="text-2xl font-bold text-blue-400 mb-6 uppercase tracking-widest">FRANCOTIRADORES</h3>
                    <div className="w-full space-y-4">
                        {snipers.map((p, i) => (
                            <div key={i} className="flex justify-between items-center bg-black/40 p-3 rounded border border-blue-900/50">
                                <div className="flex items-center gap-3">
                                    <span className={`text-2xl font-black ${getMedalColor(i)}`}>#{i+1}</span>
                                    <span className="font-mono text-lg">{p.nickname}</span>
                                </div>
                                <span className="font-bold text-blue-400">{Math.round(p.accuracy)}% ACC</span>
                            </div>
                        ))}
                    </div>
                </CyberCard>

                {/* 3. CORAZÓN DE LEÓN (EFFORT) */}
                <CyberCard className="bg-yellow-950/30 border-yellow-500/50 p-6 flex flex-col items-center animate-in zoom-in delay-500">
                    <div className="p-4 bg-yellow-900/50 rounded-full mb-4 border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                        <Heart className="w-12 h-12 text-yellow-200 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-6 uppercase tracking-widest">CORAZÓN DE LEÓN</h3>
                    {lionheart ? (
                        <div className="text-center w-full bg-black/40 p-6 rounded border border-yellow-900/50">
                            <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <div className="text-3xl font-black text-white mb-2">{lionheart.nickname}</div>
                            <p className="text-sm text-gray-400 font-mono">
                                A pesar de las dificultades, lanzó {lionheart.answersSummary?.total} ataques. ¡Honor!
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">Nadie calificó para este honor hoy.</p>
                    )}
                </CyberCard>

            </div>

            <div className="mt-12">
                <CyberButton onClick={() => window.close()} variant="secondary" className="px-8">
                    <ArrowLeft className="w-4 h-4 mr-2" /> CERRAR DASHBOARD
                </CyberButton>
            </div>
        </div>
    );
};
