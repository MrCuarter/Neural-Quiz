import React, { useEffect, useState } from 'react';
import { getEvaluationLeaderboard } from '../../services/firebaseService';
import { EvaluationAttempt } from '../../types';
import { Trophy, Medal, User, Clock, Target, Crown } from 'lucide-react';
import { CyberCard } from '../ui/CyberUI';

interface LeaderboardProps {
    evaluationId: string;
    currentAttemptId?: string | null;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ evaluationId, currentAttemptId }) => {
    const [attempts, setAttempts] = useState<EvaluationAttempt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBoard = async () => {
            setLoading(true);
            try {
                const data = await getEvaluationLeaderboard(evaluationId);
                setAttempts(data);
            } catch (e) {
                console.error("Failed to load leaderboard", e);
            } finally {
                setLoading(false);
            }
        };
        fetchBoard();
    }, [evaluationId]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getRankIcon = (index: number) => {
        if (index === 0) return <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)] animate-bounce" />;
        if (index === 1) return <Medal className="w-5 h-5 text-gray-300 drop-shadow-[0_0_5px_rgba(209,213,219,0.5)]" />;
        if (index === 2) return <Medal className="w-5 h-5 text-orange-400 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]" />;
        return <span className="text-gray-500 font-mono font-bold w-6 text-center">{index + 1}</span>;
    };

    const getRowStyle = (index: number, isCurrentUser: boolean) => {
        let base = "flex items-center justify-between p-3 md:p-4 rounded-lg border transition-all duration-300 ";
        
        if (isCurrentUser) {
            return base + "bg-cyan-900/30 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)] scale-[1.02] z-10";
        }
        
        if (index === 0) return base + "bg-yellow-900/20 border-yellow-500/50 hover:bg-yellow-900/30";
        if (index === 1) return base + "bg-gray-800/40 border-gray-600/50 hover:bg-gray-800/60";
        if (index === 2) return base + "bg-orange-900/10 border-orange-500/30 hover:bg-orange-900/20";
        
        return base + "bg-black/20 border-gray-800 hover:bg-gray-900";
    };

    if (loading) {
        return (
            <div className="w-full max-w-2xl bg-black/40 border border-gray-800 rounded-xl p-8 text-center animate-pulse">
                <div className="h-8 w-48 bg-gray-800 rounded mx-auto mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 w-full bg-gray-900/50 rounded"></div>)}
                </div>
            </div>
        );
    }

    return (
        <CyberCard className="w-full max-w-2xl border-cyan-500/30 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-cyan-500 to-purple-500"></div>
            
            <div className="flex items-center justify-center gap-3 mb-6 pt-4">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <h2 className="text-3xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 to-yellow-500 uppercase tracking-widest">
                    HALL OF FAME
                </h2>
            </div>

            {attempts.length === 0 ? (
                <div className="text-center py-10 text-gray-500 font-mono">
                    <p>Aún no hay registros en este sector.</p>
                    <p className="text-xs mt-2">¡Sé el primero en dominar el ranking!</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar px-1">
                    {attempts.map((attempt, index) => {
                        const isCurrentUser = attempt.id === currentAttemptId;
                        return (
                            <div 
                                key={attempt.id} 
                                className={getRowStyle(index, isCurrentUser)}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="flex items-center justify-center w-8 shrink-0">
                                        {getRankIcon(index)}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold font-cyber text-sm md:text-base uppercase ${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>
                                                {attempt.nickname}
                                            </span>
                                            {isCurrentUser && <span className="text-[10px] bg-cyan-500 text-black px-1 rounded font-bold">YOU</span>}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(attempt.totalTime)}</span>
                                            <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {Math.round(attempt.accuracy)}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl md:text-2xl font-black font-mono ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                                        {attempt.score}
                                    </div>
                                    <div className="text-[10px] text-gray-600 uppercase tracking-widest">PUNTOS</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </CyberCard>
    );
};