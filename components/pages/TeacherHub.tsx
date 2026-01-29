
import React, { useRef, useState, useEffect } from 'react';
import { CyberButton, CyberCard, CyberInput, CyberTextArea } from '../ui/CyberUI';
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
    Camera,
    Save,
    Edit3,
    Twitter,
    Linkedin,
    Link as LinkIcon
} from 'lucide-react';
import { auth, storage, updateProfile, updateUserData, getUserData, deleteFile } from '../../services/firebaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '../ui/Toast';
import { AvatarCropper } from '../ui/AvatarCropper';
import { TeacherProfile } from '../../types';

interface TeacherHubProps {
    user: any;
    onNavigate: (view: string) => void;
}

export const TeacherHub: React.FC<TeacherHubProps> = ({ user, onNavigate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null); // For Cropper
    const [showCropper, setShowCropper] = useState(false);
    
    // Profile State
    const [profile, setProfile] = useState<TeacherProfile>({});
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const toast = useToast();

    // Load Profile Data on Mount
    useEffect(() => {
        if (user) {
            getUserData(user.uid).then(data => {
                if (data) setProfile(data);
            });
        }
    }, [user]);

    // --- AVATAR UPLOAD FLOW ---
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor selecciona un archivo de imagen.");
            return;
        }
        setSelectedFile(file);
        setShowCropper(true);
        // Reset input so same file can be selected again if cancelled
        e.target.value = '';
    };

    const handleCropSave = async (blob: Blob) => {
        setShowCropper(false);
        if (!auth.currentUser) return;

        setUploadingAvatar(true);
        try {
            // 1. Check & Delete Old Avatar ONLY if it is hosted on Firebase Storage
            // This prevents errors when trying to delete Google default avatars (lh3.googleusercontent.com)
            const oldPhotoURL = auth.currentUser.photoURL;
            if (oldPhotoURL && oldPhotoURL.includes("firebasestorage")) {
                try {
                    await deleteFile(oldPhotoURL);
                } catch (err) {
                    console.warn("Could not delete old avatar, proceeding anyway:", err);
                }
            }

            // 2. Upload New
            // Using timestamp in filename to prevent caching issues on CDN if we reuse names
            const filename = `profile_${Date.now()}.jpg`;
            const storageRef = ref(storage, `users/${auth.currentUser.uid}/${filename}`);
            await uploadBytes(storageRef, blob);
            
            // 3. Update Auth
            const downloadURL = await getDownloadURL(storageRef);
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
            
            toast.success("Foto de perfil actualizada.");
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast.error("Error al subir la imagen.");
        } finally {
            setUploadingAvatar(false);
            setSelectedFile(null);
        }
    };

    // --- PROFILE SAVE ---
    const handleSaveProfile = async () => {
        if (!auth.currentUser) return;
        setSavingProfile(true);
        try {
            await updateUserData(auth.currentUser.uid, profile);
            setIsEditingProfile(false);
            toast.success("Perfil actualizado.");
        } catch (e) {
            toast.error("Error al guardar perfil.");
        } finally {
            setSavingProfile(false);
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
            
            {showCropper && selectedFile && (
                <AvatarCropper 
                    file={selectedFile} 
                    onSave={handleCropSave} 
                    onCancel={() => setShowCropper(false)} 
                />
            )}

            <div className="max-w-7xl mx-auto space-y-12">
                
                {/* --- HEADER: PERFIL & SALUDO --- */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-gray-800 pb-8">
                    <div className="flex gap-6 w-full md:w-auto">
                        {/* AVATAR CLICKABLE */}
                        <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
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

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono uppercase tracking-widest">
                                    TEACHER OS v2.0
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black font-cyber text-white">
                                HOLA, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">{user.displayName?.split(' ')[0] || 'DOCENTE'}</span>
                            </h1>
                            
                            {/* PROFILE DISPLAY / EDIT */}
                            {!isEditingProfile ? (
                                <div className="mt-4 text-sm text-gray-400 space-y-1">
                                    {profile.role && <p className="font-bold text-white">{profile.role}</p>}
                                    {profile.school && <p>{profile.school}</p>}
                                    {profile.bio && <p className="italic text-gray-500 text-xs max-w-md">{profile.bio}</p>}
                                    
                                    <div className="flex gap-3 pt-2">
                                        {profile.socials?.twitter && <a href={profile.socials.twitter} target="_blank" className="text-gray-500 hover:text-cyan-400"><Twitter className="w-4 h-4"/></a>}
                                        {profile.socials?.linkedin && <a href={profile.socials.linkedin} target="_blank" className="text-gray-500 hover:text-blue-400"><Linkedin className="w-4 h-4"/></a>}
                                        {profile.socials?.website && <a href={profile.socials.website} target="_blank" className="text-gray-500 hover:text-purple-400"><LinkIcon className="w-4 h-4"/></a>}
                                        <button onClick={() => setIsEditingProfile(true)} className="text-xs text-cyan-600 hover:text-cyan-400 underline ml-2 flex items-center gap-1">
                                            <Edit3 className="w-3 h-3" /> Editar Perfil
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 bg-black/40 p-4 rounded border border-gray-700 w-full max-w-lg space-y-3 animate-in fade-in">
                                    <div className="grid grid-cols-2 gap-2">
                                        <CyberInput placeholder="Cargo (ej: Prof. Matemáticas)" value={profile.role || ''} onChange={(e) => setProfile({...profile, role: e.target.value})} className="text-xs"/>
                                        <CyberInput placeholder="Centro Educativo" value={profile.school || ''} onChange={(e) => setProfile({...profile, school: e.target.value})} className="text-xs"/>
                                    </div>
                                    <CyberTextArea placeholder="Breve biografía..." value={profile.bio || ''} onChange={(e) => setProfile({...profile, bio: e.target.value})} className="text-xs min-h-[60px]"/>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <CyberInput placeholder="URL Twitter/X" value={profile.socials?.twitter || ''} onChange={(e) => setProfile({...profile, socials: {...profile.socials, twitter: e.target.value}})} className="text-xs"/>
                                        <CyberInput placeholder="URL LinkedIn" value={profile.socials?.linkedin || ''} onChange={(e) => setProfile({...profile, socials: {...profile.socials, linkedin: e.target.value}})} className="text-xs"/>
                                        <CyberInput placeholder="URL Web" value={profile.socials?.website || ''} onChange={(e) => setProfile({...profile, socials: {...profile.socials, website: e.target.value}})} className="text-xs"/>
                                    </div>

                                    <div className="flex gap-2 justify-end pt-2">
                                        <CyberButton variant="ghost" onClick={() => setIsEditingProfile(false)} className="text-xs h-8">Cancelar</CyberButton>
                                        <CyberButton onClick={handleSaveProfile} isLoading={savingProfile} className="text-xs h-8"><Save className="w-3 h-3 mr-1"/> Guardar</CyberButton>
                                    </div>
                                </div>
                            )}
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

                        {/* 2. MIS QUIZZES (TYPO FIXED) */}
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
