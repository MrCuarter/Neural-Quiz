
import React from 'react';
import { CyberButton, CyberCard } from '../ui/CyberUI';
import { 
    Plus, 
    LayoutGrid, 
    Globe, 
    Swords, 
    Clock, 
    Trophy, 
    Map, 
    Users, 
    Gamepad2,
    Lock,
    BrainCircuit,
    GraduationCap
} from 'lucide-react';

interface TeacherHubProps {
    user: any;
    onNavigate: (view: string) => void;
}

export const TeacherHub: React.FC<TeacherHubProps> = ({ user, onNavigate }) => {

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
                <CyberCard className="border-red-500/50 text-center p-8">
                    <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-cyber mb-2">ACCESO DENEGADO</h2>
                    <p className="text-gray-400 mb-4">Debes iniciar sesión como docente para acceder al Hub.</p>
                    <CyberButton onClick={() => onNavigate('home')}>VOLVER</CyberButton>
                </CyberCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 pt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono uppercase tracking-widest">
                                TEACHER OS v2.0
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-cyber text-white">
                            HOLA, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">{user.displayName?.split(' ')[0] || 'DOCENTE'}</span>
                        </h1>
                        <p className="text-gray-400 font-mono mt-2">Panel de Control Centralizado. Gestiona y Gamifica.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* --- COLUMNA IZQUIERDA: GESTIÓN DE QUIZZES (LA BIBLIOTECA) --- */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="flex items-center gap-2 text-cyan-400 font-cyber text-lg border-b border-cyan-900/30 pb-2">
                            <BrainCircuit className="w-5 h-5" /> 
                            <h2>LA BIBLIOTECA</h2>
                        </div>

                        <div className="grid gap-4">
                            {/* CREAR NUEVO (Primary Action) */}
                            <button 
                                onClick={() => onNavigate('create_menu')}
                                className="group relative w-full bg-gradient-to-r from-cyan-950/50 to-blue-950/50 border border-cyan-500/30 hover:border-cyan-400 rounded-xl p-6 text-left transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Plus className="w-24 h-24 text-cyan-400" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <Plus className="w-6 h-6 text-cyan-400" />
                                    </div>
                                    <h3 className="text-xl font-bold font-cyber text-white mb-1">CREAR NUEVO</h3>
                                    <p className="text-xs text-gray-400 font-mono">Generador IA o Editor Manual. Empieza aquí.</p>
                                </div>
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                                {/* MIS QUIZZES */}
                                <button 
                                    onClick={() => onNavigate('my_quizzes')}
                                    className="group bg-black/40 border border-gray-800 hover:border-purple-500/50 rounded-xl p-4 text-left transition-all hover:bg-purple-900/10"
                                >
                                    <div className="w-8 h-8 bg-purple-900/30 rounded flex items-center justify-center mb-2 group-hover:text-purple-300">
                                        <LayoutGrid className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <h3 className="font-bold font-mono text-gray-200">MIS QUIZZES</h3>
                                    <p className="text-[10px] text-gray-500 mt-1">Gestionar colección</p>
                                </button>

                                {/* GESTIÓN DE CLASES (NUEVO) */}
                                <button 
                                    onClick={() => onNavigate('classes_manager')}
                                    className="group bg-black/40 border border-gray-800 hover:border-green-500/50 rounded-xl p-4 text-left transition-all hover:bg-green-900/10"
                                >
                                    <div className="w-8 h-8 bg-green-900/30 rounded flex items-center justify-center mb-2 group-hover:text-green-300">
                                        <GraduationCap className="w-4 h-4 text-green-400" />
                                    </div>
                                    <h3 className="font-bold font-mono text-gray-200">MIS CLASES</h3>
                                    <p className="text-[10px] text-gray-500 mt-1">Listas de alumnos</p>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA: ACTIVIDADES (SALA DE JUEGOS) --- */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center gap-2 text-yellow-400 font-cyber text-lg border-b border-yellow-900/30 pb-2">
                            <Gamepad2 className="w-5 h-5" /> 
                            <h2>SALA DE JUEGOS</h2>
                        </div>

                        {/* SUBSECCIÓN INDIVIDUAL */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-3 h-3" /> MODO INDIVIDUAL (Asíncrono/Tarea)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button 
                                    onClick={() => onNavigate('game_lobby')} 
                                    className="flex items-center gap-4 bg-red-950/20 border border-red-900/50 hover:border-red-500 hover:bg-red-900/30 p-4 rounded-lg transition-all group"
                                >
                                    <div className="p-3 bg-red-900/30 rounded-full border border-red-500/30 group-hover:scale-110 transition-transform">
                                        <Swords className="w-6 h-6 text-red-500" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-red-200 font-cyber">BOSS BATTLE</h4>
                                        <p className="text-[10px] text-red-400/70 font-mono">RPG vs IA. Barra de vida y Loot.</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => onNavigate('game_lobby')} 
                                    className="flex items-center gap-4 bg-blue-950/20 border border-blue-900/50 hover:border-blue-500 hover:bg-blue-900/30 p-4 rounded-lg transition-all group"
                                >
                                    <div className="p-3 bg-blue-900/30 rounded-full border border-blue-500/30 group-hover:scale-110 transition-transform">
                                        <Clock className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-blue-200 font-cyber">TIME ATTACK</h4>
                                        <p className="text-[10px] text-blue-400/70 font-mono">Carrera contra el reloj. Speedrun.</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* SUBSECCIÓN GRUPAL */}
                        <div className="space-y-3 pt-4">
                            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-3 h-3" /> MODO GRUPAL (En Vivo/Proyector)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button 
                                    onClick={() => onNavigate('game_lobby')} 
                                    className="flex items-center gap-4 bg-purple-950/20 border border-purple-900/50 hover:border-purple-500 hover:bg-purple-900/30 p-4 rounded-lg transition-all group"
                                >
                                    <div className="p-3 bg-purple-900/30 rounded-full border border-purple-500/30 group-hover:scale-110 transition-transform">
                                        <Trophy className="w-6 h-6 text-purple-500" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-purple-200 font-cyber">JEOPARDY</h4>
                                        <p className="text-[10px] text-purple-400/70 font-mono">Concurso por equipos. Apuestas y Riesgo.</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => onNavigate('game_lobby')} 
                                    className="flex items-center gap-4 bg-yellow-950/20 border border-yellow-900/50 hover:border-yellow-500 hover:bg-yellow-900/30 p-4 rounded-lg transition-all group"
                                >
                                    <div className="p-3 bg-yellow-900/30 rounded-full border border-yellow-500/30 group-hover:scale-110 transition-transform">
                                        <Map className="w-6 h-6 text-yellow-500" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-yellow-200 font-cyber">HEX CONQUEST</h4>
                                        <p className="text-[10px] text-yellow-400/70 font-mono">Estrategia territorial. Conquista el tablero.</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
