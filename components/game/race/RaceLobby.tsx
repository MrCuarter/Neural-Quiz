
import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { RaceSession, RaceTeamColor } from '../../../types';
import { CyberCard, CyberButton } from '../../ui/CyberUI';
import { startRace } from '../../../services/gameService';
import { Car, Users, Play, Crown, Trophy, QrCode } from 'lucide-react';

interface RaceLobbyProps {
    sessionId: string;
    isHost: boolean;
    playerId?: string; // If student
    onStart?: () => void;
}

const TEAMS: Record<RaceTeamColor, { color: string, label: string, icon: string }> = {
    red: { color: 'bg-red-600', label: 'RED FURY', icon: '🔥' },
    blue: { color: 'bg-blue-600', label: 'BLUE VELOCITY', icon: '⚡' },
    green: { color: 'bg-green-600', label: 'GREEN TURBO', icon: '🐢' },
    yellow: { color: 'bg-yellow-500', label: 'YELLOW THUNDER', icon: '⭐' }
};

export const RaceLobby: React.FC<RaceLobbyProps> = ({ sessionId, isHost, playerId, onStart }) => {
    const [session, setSession] = useState<RaceSession | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'race_sessions', sessionId), (doc) => {
            if (doc.exists()) {
                const data = { id: doc.id, ...doc.data() } as RaceSession;
                setSession(data);
                if (data.status === 'racing' && onStart) {
                    onStart();
                }
            }
        });
        return () => unsub();
    }, [sessionId]);

    if (!session) return <div className="text-white text-center p-20 font-cyber">Conectando al Circuito...</div>;

    const myPlayer = playerId ? session.players[playerId] : null;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 font-cyber flex flex-col items-center">
            
            {/* HEADER */}
            <div className="w-full max-w-6xl flex justify-between items-start mb-8 border-b border-gray-800 pb-6">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500 italic uppercase tracking-tighter transform -skew-x-12">
                        NEURAL RACE
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-gray-400 font-mono">PIN DE ACCESO:</span>
                        <span className="text-4xl font-mono font-bold text-yellow-400 bg-gray-900 px-4 py-1 rounded border border-yellow-500/50 tracking-widest">{session.pin}</span>
                    </div>
                </div>
                {isHost && (
                    <CyberButton 
                        onClick={() => startRace(sessionId)}
                        className="h-20 px-8 text-2xl font-black bg-green-600 hover:bg-green-500 border-none shadow-[0_0_30px_rgba(34,197,94,0.5)] animate-pulse"
                    >
                        START ENGINE <Play className="w-8 h-8 ml-3 fill-current" />
                    </CyberButton>
                )}
            </div>

            {/* TEAMS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-7xl flex-1">
                {(Object.keys(TEAMS) as RaceTeamColor[]).map((color) => {
                    const teamInfo = TEAMS[color];
                    const members = session.teams[color].members;
                    const isMyTeam = myPlayer?.team === color;

                    return (
                        <div key={color} className={`relative rounded-xl border-4 overflow-hidden flex flex-col transition-all duration-500 ${isMyTeam ? 'border-white scale-105 shadow-[0_0_50px_rgba(255,255,255,0.3)] z-10' : `border-${color}-500/30 opacity-80 hover:opacity-100`}`}>
                            {/* Header */}
                            <div className={`${teamInfo.color} p-4 flex justify-between items-center`}>
                                <span className="text-3xl">{teamInfo.icon}</span>
                                <h3 className="font-black text-xl italic">{teamInfo.label}</h3>
                                <span className="font-mono bg-black/30 px-2 rounded text-sm">{members.length}</span>
                            </div>

                            {/* Body */}
                            <div className="flex-1 bg-gray-900/80 p-4 space-y-2 overflow-y-auto custom-scrollbar max-h-[50vh]">
                                {members.map((pid) => {
                                    const p = session.players[pid];
                                    return (
                                        <div key={pid} className={`flex items-center gap-2 p-2 rounded ${pid === playerId ? 'bg-white/20 border border-white' : 'bg-black/40'}`}>
                                            <Car className="w-4 h-4 text-gray-400" />
                                            <span className="font-mono text-sm truncate">{p?.name || 'Unknown'}</span>
                                            {pid === playerId && <span className="text-[10px] bg-cyan-500 text-black px-1 rounded font-bold ml-auto">YOU</span>}
                                        </div>
                                    );
                                })}
                                {members.length === 0 && <div className="text-center text-gray-600 text-xs italic py-10">Esperando corredores...</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Status */}
            <div className="mt-8 text-center">
                {!isHost && !myPlayer ? (
                    <div className="text-xl animate-pulse text-cyan-400">Uniéndose al servidor...</div>
                ) : !isHost && myPlayer ? (
                    <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg inline-flex items-center gap-4">
                        <Users className="w-6 h-6 text-gray-400" />
                        <span className="text-gray-300">Estás en el equipo <strong className="uppercase text-white">{TEAMS[myPlayer.team].label}</strong>. Espera al anfitrión.</span>
                    </div>
                ) : (
                    <p className="text-gray-500 font-mono text-xs">Esperando jugadores... El sistema balanceará los equipos automáticamente.</p>
                )}
            </div>

        </div>
    );
};
