
import React, { useRef, useState } from 'react';
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
    BarChart2,
    Camera
} from 'lucide-react';
import { auth, storage, updateProfile } from '../../services/firebaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../../utils/imageOptimizer';
import { useToast } from '../ui/Toast';

interface TeacherHubProps {
    user: any;
    onNavigate: (view: string) => void;
}

export const TeacherHub: React.FC<TeacherHubProps> = ({ user, onNavigate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const toast = useToast();

    // --- AVATAR UPLOAD LOGIC ---
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor selecciona un archivo de imagen.");
            return;
        }

        if (!auth.currentUser) {
            toast.error("Error de sesión. Recarga la página.");
            return;
        }

        setUploadingAvatar(true);
        try {
            // 1. Optimizar imagen (Max 500px, Calidad 0.7)
            const compressedBlob = await compressImage(file, 500, 0.7);

            // 2. Referencia fija para sobrescribir (ahorra espacio)
            // users/{uid}/profile.jpg
            const storageRef = ref(storage, `users/${auth.currentUser.uid}/profile.jpg`);
            
            // 3. Subir
            await uploadBytes(storageRef, compressedBlob);
            
            // 4. Obtener URL y actualizar perfil
            // Añadimos timestamp al query para evitar cache del navegador al sobrescribir
            const downloadURL = await getDownloadURL(storageRef);
            const urlWithCacheBust = `${downloadURL}?t=${Date.now()}`;
            
            await updateProfile(auth.currentUser, { photoURL: urlWithCacheBust });
            
            toast.success("Foto de perfil actualizada.");
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast.error("Error al subir la imagen.");
        } finally {
            setUploadingAvatar(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

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
            <div className="max-w-7xl mx-auto space-y-12">
                
                {/* --- HEADER: PERFIL & SALUDO --- */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-800 pb-8">
                    <div className="flex items-center gap-6">
                        {/* AVATAR CLICKABLE */}
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <div className={`w-24 h-24 rounded-full border-2 border-cyan-500 p-1 overflow-hidden bg-gray-900 ${uploadingAvatar ? 'animate-pulse' : ''}`}>
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-cyan-900/30">
                                        <Users className="w-10 h-10 text-cyan-400" />
                                    </div>
                                )}
                            </div>
                            {/* Overlay on Hover */}
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileChange} 
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono uppercase tracking-widest">
                                    TEACHER OS v2.0
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black font-cyber text-white">
                                HOLA, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">{user.displayName?.split(' ')[0] || 'DOCENTE'}</span>
                            </h1>
                            <p className="text-gray-400 font-mono mt-2">Panel de Control Centralizado.</p>
                        </div>
                    </div>
                </div>

                {/* --- FILA 1: GESTIÓN Y BIBLIOTECA --- */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-cyan-400 font-cyber text-lg border-b border-cyan-900/30 pb-2">
                        <LayoutGrid className="w-5 h-5" />
                        <h2>GESTIÓN Y BIBLIOTECA</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        {/* 1. CREAR NUEVO (Destacado) */}
                        <button 
                            onClick={() => onNavigate('create_menu')}
                            className="group relative bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500 hover:border-cyan-300 rounded-xl p-6 text-left transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Plus className="w-24 h-24 text-cyan-400" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-3">
                                    <Plus className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold font-cyber text-white mb-1">CREAR NUEVO</h3>
                                    <p className="text-xs text-gray-400 font-mono">IA o Manual</p>
                                </div>
                            </div>
                        </button>

                        {/* 2. MIS QUIZZES */}
                        <button 
                            onClick={() => onNavigate('my_quizzes')}
                            className="group bg-black/40 border border-gray-800 hover:border-purple-500/50 rounded-xl p-6 text-left transition-all hover:bg-purple-900/10 flex flex-col justify-between"
                        >
                            <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center mb-3 group-hover:text-purple-300">
                                <LayoutGrid className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-bold font-cyber text-gray-200 group-hover:text-white">MIS QUIZZES</h3>
                                <p className="text-xs text-gray-500 mt-1">Borradores y Plantillas</p>
                            </div>
                        </button>

                        {/* 3. MIS EVALUACIONES */}
                        <button 
                            onClick={() => onNavigate('my_quizzes')} 
                            className="group bg-black/40 border border-gray-800 hover:border-green-500/50 rounded-xl p-6 text-left transition-all hover:bg-green-900/10 flex flex-col justify-between"
                        >
                            <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center mb-3 group-hover:text-green-300">
                                <BarChart2 className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-bold font-cyber text-gray-200 group-hover:text-white">EVALUACIONES</h3>
                                <p className="text-xs text-gray-500 mt-1">Resultados y Partidas</p>
                            </div>
                        </button>

                        {/* 4. EXPLORAR COMUNIDAD */}
                        <button 
                            onClick={() => onNavigate('community')}
                            className="group bg-black/40 border border-gray-800 hover:border-pink-500/50 rounded-xl p-6 text-left transition-all hover:bg-pink-900/10 flex flex-col justify-between"
                        >
                            <div className="w-10 h-10 bg-pink-900/30 rounded-lg flex items-center justify-center mb-3 group-hover:text-pink-300">
                                <Globe className="w-6 h-6 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="font-bold font-cyber text-gray-200 group-hover:text-white">COMUNIDAD</h3>
                                <p className="text-xs text-gray-500 mt-1">Contenido Público</p>
                            </div>
                        </button>

                    </div>
                </div>

                {/* --- FILA 2: SALA DE JUEGOS --- */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-yellow-400 font-cyber text-lg border-b border-yellow-900/30 pb-2">
                        <Gamepad2 className="w-5 h-5" /> 
                        <h2>SALA DE JUEGOS (ARCADE)</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        {/* BOSS BATTLE */}
                        <button 
                            onClick={() => onNavigate('game_lobby')} 
                            className="flex flex-col gap-4 bg-red-950/20 border border-red-900/50 hover:border-red-500 hover:bg-red-900/30 p-6 rounded-xl transition-all group text-left h-full"
                        >
                            <div className="p-3 bg-red-900/30 rounded-full border border-red-500/30 w-fit group-hover:scale-110 transition-transform">
                                <Swords className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-red-200 font-cyber text-lg">BOSS BATTLE</h4>
                                <p className="text-xs text-red-400/70 font-mono mt-1">RPG vs IA. Barra de vida y Loot.</p>
                            </div>
                        </button>

                        {/* TIME ATTACK */}
                        <button 
                            onClick={() => onNavigate('game_lobby')} 
                            className="flex flex-col gap-4 bg-blue-950/20 border border-blue-900/50 hover:border-blue-500 hover:bg-blue-900/30 p-6 rounded-xl transition-all group text-left h-full"
                        >
                            <div className="p-3 bg-blue-900/30 rounded-full border border-blue-500/30 w-fit group-hover:scale-110 transition-transform">
                                <Clock className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-200 font-cyber text-lg">TIME ATTACK</h4>
                                <p className="text-xs text-blue-400/70 font-mono mt-1">Carrera contra el reloj.</p>
                            </div>
                        </button>

                        {/* JEOPARDY */}
                        <button 
                            onClick={() => onNavigate('game_lobby')} 
                            className="flex flex-col gap-4 bg-purple-950/20 border border-purple-900/50 hover:border-purple-500 hover:bg-purple-900/30 p-6 rounded-xl transition-all group text-left h-full"
                        >
                            <div className="p-3 bg-purple-900/30 rounded-full border border-purple-500/30 w-fit group-hover:scale-110 transition-transform">
                                <Trophy className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-purple-200 font-cyber text-lg">JEOPARDY</h4>
                                <p className="text-xs text-purple-400/70 font-mono mt-1">Concurso TV por equipos.</p>
                            </div>
                        </button>

                        {/* HEX CONQUEST */}
                        <button 
                            onClick={() => onNavigate('game_lobby')} 
                            className="flex flex-col gap-4 bg-yellow-950/20 border border-yellow-900/50 hover:border-yellow-500 hover:bg-yellow-900/30 p-6 rounded-xl transition-all group text-left h-full"
                        >
                            <div className="p-3 bg-yellow-900/30 rounded-full border border-yellow-500/30 w-fit group-hover:scale-110 transition-transform">
                                <Map className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-yellow-200 font-cyber text-lg">HEX CONQUEST</h4>
                                <p className="text-xs text-yellow-400/70 font-mono mt-1">Estrategia territorial.</p>
                            </div>
                        </button>

                    </div>
                </div>

                {/* --- EXTRA: GESTIÓN DE CLASES --- */}
                <div className="pt-4 border-t border-gray-800">
                    <button 
                        onClick={() => onNavigate('classes_manager')}
                        className="w-full flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-green-500/50 hover:bg-green-900/10 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-900/20 rounded-full flex items-center justify-center border border-green-500/20">
                                <Users className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-white group-hover:text-green-300">GESTIONAR LISTAS DE CLASE</h3>
                                <p className="text-xs text-gray-500">Configura alumnos para el seguimiento individual.</p>
                            </div>
                        </div>
                        <div className="text-gray-600 group-hover:text-green-400">
                            →
                        </div>
                    </button>
                </div>

            </div>
        </div>
    );
};
