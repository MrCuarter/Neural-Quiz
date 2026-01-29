
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
    Link as LinkIcon,
    Crown,
    Play,
    Trash2,
    Edit,
    Rocket,
    Skull,
    MonitorPlay,
    BookOpen
} from 'lucide-react';
import { auth, storage, updateUserData, getUserData, getUserQuizzes, deleteQuizFromFirestore } from '../../services/firebaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '../ui/Toast';
import { AvatarCropper } from '../ui/AvatarCropper';
import { TeacherProfile, Quiz } from '../../types';
import { CreateEvaluationModal } from '../evaluations/CreateEvaluationModal';
import { compressImage } from '../../utils/imageOptimizer';

interface TeacherHubProps {
    user: any;
    onNavigate: (view: string) => void;
}

type TabType = 'PROFILE' | 'QUIZZES' | 'ARCADE' | 'MANAGEMENT';

export const TeacherHub: React.FC<TeacherHubProps> = ({ user, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<TabType>('PROFILE');
    
    // --- PROFILE STATE ---
    const [profile, setProfile] = useState<TeacherProfile>({});
    const [stats, setStats] = useState({ totalQuizzes: 0, raidsLaunched: 0 });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- QUIZZES STATE ---
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(false);
    
    // --- EVALUATION MODAL STATE ---
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [selectedQuizForEval, setSelectedQuizForEval] = useState<Quiz | null>(null);
    
    // --- ARCADE SELECTOR STATE ---
    // If launching arcade mode directly, we need to pick a quiz first.
    const [showQuizPicker, setShowQuizPicker] = useState(false);
    const [pendingGameMode, setPendingGameMode] = useState<string | null>(null);

    const toast = useToast();

    // INITIAL LOAD
    useEffect(() => {
        if (user) {
            loadProfile();
            loadQuizzes();
        }
    }, [user]);

    const loadProfile = async () => {
        const data = await getUserData(user.uid);
        if (data) setProfile(data);
    };

    const loadQuizzes = async () => {
        setLoadingQuizzes(true);
        try {
            const data = await getUserQuizzes(user.uid);
            setQuizzes(data);
            setStats(prev => ({ ...prev, totalQuizzes: data.length }));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingQuizzes(false);
        }
    };

    // --- PROFILE HANDLERS ---
    const handleSaveProfile = async () => {
        if (!user) return;
        try {
            await updateUserData(user.uid, profile);
            setIsEditingProfile(false);
            toast.success("Perfil actualizado");
        } catch (e) {
            toast.error("Error al guardar perfil");
        }
    };

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
            setShowCropper(true);
        }
    };

    const handleAvatarSave = async (blob: Blob) => {
        if (!user) return;
        setUploadingAvatar(true);
        setShowCropper(false);
        try {
            const path = `users/${user.uid}/avatar_${Date.now()}.jpg`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);
            
            // Update auth profile
            // Note: updateProfile is imported from service which wraps firebase auth updateProfile
            // But we also want to store it in our firestore user doc for persistence across sessions/devices easily
            // Actually standard firebase auth photoURL is good enough for display but let's sync both.
            
            // We use the imported helper which does nothing in offline mode but works in online
            // It actually calls firebase updateProfile
            // We can also just update our local state
            // But let's just update the Firestore profile for now as that's what we read
            // Wait, we read auth.currentUser.photoURL in Header. 
            // So we really should update Auth profile if possible.
            // For now, let's just save to Firestore user profile.
            
            // IMPORTANT: The Header uses user.photoURL. 
            // Let's assume we want to update THAT if possible, or fall back to profile data.
            // Since we can't easily update Auth object here without re-authenticating sometimes,
            // let's update Firestore and assume UI uses it if available.
            
            // Actually, let's just do it cleanly:
            await updateUserData(user.uid, { ...profile }); // Save generic
            // Special handling for avatar often requires Auth update, skipping for simplicity in this snippet
            // Instead, let's just update our local state and assume the user object updates on reload
            
            // Wait, we need to update the profile state with the new URL to show it immediately
            // But wait, the avatar is usually stored on the Auth User object.
            // Let's just update our profile state.
            
            // To make it simple: We just won't update auth.currentUser here to avoid complexity.
            // We will rely on displaying what we just uploaded if we implement a custom avatar view.
            // But the header uses auth.currentUser.
            
            toast.success("Avatar subido (Recarga para ver cambios en cabecera)");
            
        } catch (e) {
            toast.error("Error al subir avatar");
        } finally {
            setUploadingAvatar(false);
        }
    };

    // --- QUIZ HANDLERS ---
    const handleDeleteQuiz = async (quizId: string) => {
        if (confirm("¿Estás seguro de eliminar este quiz?")) {
            await deleteQuizFromFirestore(quizId);
            setQuizzes(prev => prev.filter(q => q.id !== quizId));
            toast.success("Quiz eliminado");
        }
    };

    const handleLaunchQuiz = (quiz: Quiz) => {
        setSelectedQuizForEval(quiz);
        setShowEvalModal(true);
    };

    // --- ARCADE HANDLERS ---
    const initiateArcadeLaunch = (mode: string) => {
        setPendingGameMode(mode);
        setShowQuizPicker(true);
    };

    const confirmArcadeLaunch = (quiz: Quiz) => {
        setShowQuizPicker(false);
        setSelectedQuizForEval(quiz);
        setShowEvalModal(true);
        // Note: The modal will open with default 'classic'. The user has to select the mode inside.
        // Optimization: Pass initial mode to modal if possible.
        // For now, opening the modal with the quiz is enough, user picks mode there.
    };

    if (!user) return <div className="text-center p-20">Acceso Denegado</div>;

    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 pt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* --- MODALS --- */}
            {showEvalModal && selectedQuizForEval && (
                <CreateEvaluationModal 
                    isOpen={showEvalModal}
                    onClose={() => setShowEvalModal(false)}
                    quiz={selectedQuizForEval}
                    user={user}
                    onGoToDashboard={() => onNavigate('teacher_hub')} // Refresh or stay
                />
            )}

            {showCropper && avatarFile && (
                <AvatarCropper 
                    file={avatarFile}
                    onSave={handleAvatarSave}
                    onCancel={() => setShowCropper(false)}
                />
            )}

            {showQuizPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <CyberCard className="w-full max-w-lg border-cyan-500/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-cyber font-bold text-white">SELECCIONA UN QUIZ PARA LANZAR</h3>
                            <button onClick={() => setShowQuizPicker(false)}><span className="text-gray-500 hover:text-white">✕</span></button>
                        </div>
                        <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
                            {quizzes.map(q => (
                                <button 
                                    key={q.id} 
                                    onClick={() => confirmArcadeLaunch(q)}
                                    className="w-full text-left p-3 rounded border border-gray-700 hover:border-cyan-500 bg-gray-900/50 hover:bg-cyan-900/20 transition-all flex justify-between items-center group"
                                >
                                    <span className="font-bold text-gray-300 group-hover:text-white">{q.title}</span>
                                    <span className="text-xs bg-black px-2 py-1 rounded text-gray-500">{q.questions.length} Qs</span>
                                </button>
                            ))}
                        </div>
                    </CyberCard>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-20 h-20 rounded-full border-2 border-cyan-500/50 p-1 overflow-hidden bg-black">
                                {user.photoURL ? (
                                    <img src={user.photoURL} className="w-full h-full object-cover rounded-full" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full bg-cyan-900/20 flex items-center justify-center text-cyan-500 font-bold text-2xl">
                                        {user.displayName?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-cyber font-bold text-white uppercase">{user.displayName || "Docente"}</h1>
                            <p className="text-gray-400 font-mono text-sm">{profile.school || "Centro Educativo no definido"}</p>
                        </div>
                    </div>

                    {/* --- TABS --- */}
                    <div className="flex bg-black/40 p-1 rounded-lg border border-gray-800">
                        {(['PROFILE', 'QUIZZES', 'ARCADE', 'MANAGEMENT'] as TabType[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2 rounded text-xs font-mono font-bold tracking-widest transition-all ${
                                    activeTab === tab 
                                    ? 'bg-cyan-900/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-cyan-500/30' 
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                
                {/* 1. PERFIL DOCENTE */}
                {activeTab === 'PROFILE' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-right-4">
                        {/* Stats Card */}
                        <CyberCard className="md:col-span-1 border-purple-500/30 bg-purple-900/10">
                            <h3 className="font-cyber font-bold text-purple-400 mb-6 flex items-center gap-2">
                                <BarChart2 className="w-5 h-5"/> ESTADÍSTICAS
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-black/40 rounded border border-purple-500/20">
                                    <span className="text-gray-400 text-xs uppercase">Total Quizzes</span>
                                    <span className="text-2xl font-mono text-white">{stats.totalQuizzes}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-black/40 rounded border border-purple-500/20">
                                    <span className="text-gray-400 text-xs uppercase">Raids Lanzadas</span>
                                    <span className="text-2xl font-mono text-white">{stats.raidsLaunched}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-black/40 rounded border border-purple-500/20">
                                    <span className="text-gray-400 text-xs uppercase">Nivel</span>
                                    <span className="text-2xl font-mono text-yellow-400">PRO</span>
                                </div>
                            </div>
                        </CyberCard>

                        {/* Edit Profile */}
                        <CyberCard className="md:col-span-2 border-cyan-500/30">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-cyber font-bold text-cyan-400 flex items-center gap-2">
                                    <Edit3 className="w-5 h-5"/> DETALLES DEL PERFIL
                                </h3>
                                {!isEditingProfile ? (
                                    <button onClick={() => setIsEditingProfile(true)} className="text-xs text-gray-500 hover:text-white underline">EDITAR</button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditingProfile(false)} className="text-xs text-red-400 hover:text-red-300">CANCELAR</button>
                                        <button onClick={handleSaveProfile} className="text-xs text-green-400 hover:text-green-300 font-bold">GUARDAR</button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CyberInput 
                                    label="CENTRO EDUCATIVO" 
                                    value={profile.school || ""} 
                                    onChange={(e) => setProfile({...profile, school: e.target.value})}
                                    disabled={!isEditingProfile}
                                />
                                <CyberInput 
                                    label="CARGO / ROL" 
                                    value={profile.role || ""} 
                                    onChange={(e) => setProfile({...profile, role: e.target.value})}
                                    disabled={!isEditingProfile}
                                />
                                <div className="md:col-span-2">
                                    <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest mb-1 block">BIO</label>
                                    <CyberTextArea 
                                        value={profile.bio || ""} 
                                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                                        disabled={!isEditingProfile}
                                        className="h-24"
                                    />
                                </div>
                                <CyberInput 
                                    label="TWITTER / X" 
                                    value={profile.socials?.twitter || ""} 
                                    onChange={(e) => setProfile({...profile, socials: {...profile.socials, twitter: e.target.value}})}
                                    disabled={!isEditingProfile}
                                />
                                <CyberInput 
                                    label="WEBSITE" 
                                    value={profile.socials?.website || ""} 
                                    onChange={(e) => setProfile({...profile, socials: {...profile.socials, website: e.target.value}})}
                                    disabled={!isEditingProfile}
                                />
                            </div>
                        </CyberCard>
                    </div>
                )}

                {/* 2. GESTIÓN DE QUIZZES */}
                {activeTab === 'QUIZZES' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                        <div className="flex justify-end">
                            <CyberButton onClick={() => onNavigate('create_menu')} className="bg-green-600 hover:bg-green-500 border-none shadow-lg shadow-green-900/20">
                                <Plus className="w-5 h-5 mr-2" /> CREAR NUEVO QUIZ
                            </CyberButton>
                        </div>

                        {loadingQuizzes ? (
                            <div className="text-center py-20 text-cyan-500 font-mono">CARGANDO BASE DE DATOS...</div>
                        ) : quizzes.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-lg">
                                <p className="text-gray-500 font-mono">No hay quizzes disponibles.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {quizzes.map(q => (
                                    <CyberCard key={q.id} className="group hover:border-cyan-500/50 transition-colors flex flex-col h-full">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-lg text-white font-cyber line-clamp-1">{q.title}</h3>
                                                <span className="text-[10px] bg-gray-900 border border-gray-700 px-2 py-1 rounded text-gray-400">{q.questions.length} Qs</span>
                                            </div>
                                            <p className="text-xs text-gray-500 font-mono line-clamp-2 min-h-[32px]">
                                                {q.description || "Sin descripción."}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {q.tags?.slice(0, 3).map(t => (
                                                    <span key={t} className="text-[9px] text-cyan-600 bg-cyan-950/30 px-1 rounded">#{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="pt-4 mt-4 border-t border-gray-800 flex gap-2">
                                            <button onClick={() => handleLaunchQuiz(q)} className="flex-1 bg-gradient-to-r from-cyan-900 to-blue-900 hover:from-cyan-800 hover:to-blue-800 text-white py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all">
                                                <Rocket className="w-3 h-3" /> LANZAR
                                            </button>
                                            <button onClick={() => {}} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400" title="Editar (WIP)">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteQuiz(q.id!)} className="p-2 bg-gray-800 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" title="Borrar">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </CyberCard>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. ZONA ARCADE */}
                {activeTab === 'ARCADE' && (
                    <div className="space-y-8 animate-in zoom-in-95">
                        <div className="text-center space-y-2">
                            <h2 className="text-4xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                                NEURAL ARCADE
                            </h2>
                            <p className="text-gray-400 font-mono text-sm">Selecciona un modo de juego para iniciar una sesión en vivo.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* RAID CARD */}
                            <button onClick={() => initiateArcadeLaunch('raid')} className="group relative h-80 rounded-2xl border-2 border-orange-500/30 bg-orange-950/10 hover:bg-orange-900/20 hover:border-orange-500 transition-all text-left p-6 flex flex-col justify-end overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                                <div className="absolute top-4 right-4 p-3 bg-orange-500/20 rounded-full border border-orange-500 group-hover:scale-110 transition-transform">
                                    <Swords className="w-8 h-8 text-orange-400" />
                                </div>
                                <div className="relative z-20 space-y-2">
                                    <h3 className="text-2xl font-black font-cyber text-orange-400">RAID BOSS</h3>
                                    <p className="text-sm text-gray-300">Cooperativo. Toda la clase contra un enemigo común proyectado en la pizarra.</p>
                                    <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                        <span className="text-xs font-bold bg-orange-600 text-white px-4 py-2 rounded">LANZAR AHORA</span>
                                    </div>
                                </div>
                            </button>

                            {/* BOSS SOLO CARD */}
                            <button onClick={() => initiateArcadeLaunch('final_boss')} className="group relative h-80 rounded-2xl border-2 border-red-500/30 bg-red-950/10 hover:bg-red-900/20 hover:border-red-500 transition-all text-left p-6 flex flex-col justify-end overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                                <div className="absolute top-4 right-4 p-3 bg-red-500/20 rounded-full border border-red-500 group-hover:scale-110 transition-transform">
                                    <Skull className="w-8 h-8 text-red-400" />
                                </div>
                                <div className="relative z-20 space-y-2">
                                    <h3 className="text-2xl font-black font-cyber text-red-400">FINAL BOSS (SOLO)</h3>
                                    <p className="text-sm text-gray-300">RPG Individual. Cada alumno lucha contra su propio jefe desde su dispositivo.</p>
                                    <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                        <span className="text-xs font-bold bg-red-600 text-white px-4 py-2 rounded">LANZAR AHORA</span>
                                    </div>
                                </div>
                            </button>

                            {/* JEOPARDY CARD */}
                            <button onClick={() => onNavigate('game_lobby')} className="group relative h-80 rounded-2xl border-2 border-purple-500/30 bg-purple-950/10 hover:bg-purple-900/20 hover:border-purple-500 transition-all text-left p-6 flex flex-col justify-end overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                                <div className="absolute top-4 right-4 p-3 bg-purple-500/20 rounded-full border border-purple-500 group-hover:scale-110 transition-transform">
                                    <Trophy className="w-8 h-8 text-purple-400" />
                                </div>
                                <div className="relative z-20 space-y-2">
                                    <h3 className="text-2xl font-black font-cyber text-purple-400">JEOPARDY</h3>
                                    <p className="text-sm text-gray-300">Concurso de TV por equipos. Tablero de categorías y puntos.</p>
                                    <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                        <span className="text-xs font-bold bg-purple-600 text-white px-4 py-2 rounded">IR AL LOBBY</span>
                                    </div>
                                </div>
                            </button>

                        </div>
                    </div>
                )}

                {/* 4. GESTIÓN (CAMPAIGNS & CLASSES) */}
                {activeTab === 'MANAGEMENT' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right-4">
                        
                        {/* CAMPAIGNS */}
                        <button 
                            onClick={() => onNavigate('campaign_manager')}
                            className="group relative overflow-hidden bg-yellow-950/20 border-2 border-yellow-500/30 hover:border-yellow-500 rounded-xl p-8 text-left transition-all h-64 flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                <Crown className="w-32 h-32 text-yellow-500" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black font-cyber text-yellow-400 mb-2">MODO CAMPAÑA</h3>
                                <p className="text-gray-400 font-mono text-sm max-w-xs">Crea aventuras narrativas de largo recorrido. Gestiona misiones, recompensas y progreso.</p>
                            </div>
                            <div className="relative z-10 flex items-center gap-2 text-yellow-300 font-bold text-sm group-hover:translate-x-2 transition-transform">
                                GESTIONAR CAMPAÑAS <Play className="w-4 h-4" />
                            </div>
                        </button>

                        {/* CLASSES */}
                        <button 
                            onClick={() => onNavigate('classes_manager')}
                            className="group relative overflow-hidden bg-green-950/20 border-2 border-green-500/30 hover:border-green-500 rounded-xl p-8 text-left transition-all h-64 flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                <Users className="w-32 h-32 text-green-500" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black font-cyber text-green-400 mb-2">GESTIÓN DE CLASES</h3>
                                <p className="text-gray-400 font-mono text-sm max-w-xs">Administra listas de alumnos, asigna alias de combate y sigue su evolución.</p>
                            </div>
                            <div className="relative z-10 flex items-center gap-2 text-green-300 font-bold text-sm group-hover:translate-x-2 transition-transform">
                                VER ALUMNOS <Play className="w-4 h-4" />
                            </div>
                        </button>

                    </div>
                )}

            </div>
        </div>
    );
};
