
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
    Instagram,
    Youtube,
    Eye,
    Bot,
    PenTool,
    Upload,
    FolderOpen,
    FileText
} from 'lucide-react';
import { auth, storage, updateUserData, getUserData, getUserQuizzes, deleteQuizFromFirestore } from '../../services/firebaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '../ui/Toast';
import { AvatarCropper } from '../ui/AvatarCropper';
import { TeacherProfile, Quiz } from '../../types';
import { CreateEvaluationModal } from '../evaluations/CreateEvaluationModal';

interface TeacherHubProps {
    user: any;
    onNavigate: (view: string) => void;
}

export const TeacherHub: React.FC<TeacherHubProps> = ({ user, onNavigate }) => {
    // --- STATE ---
    const [profile, setProfile] = useState<TeacherProfile>({});
    const [stats, setStats] = useState({ totalQuizzes: 0, raidsLaunched: 0 });
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    
    // Avatar Logic
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Quizzes Data
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(false);
    
    // Evaluation Modal
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [selectedQuizForEval, setSelectedQuizForEval] = useState<Quiz | null>(null);
    const [showQuizPicker, setShowQuizPicker] = useState(false);
    const [selectedArcadeMode, setSelectedArcadeMode] = useState<'classic' | 'time_attack' | 'final_boss' | 'raid'>('classic');

    const toast = useToast();

    // --- INITIAL LOAD ---
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

    // --- SCROLL NAVIGATION ---
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const yOffset = -100; // Offset for sticky header
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    // --- HANDLERS ---
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
            
            // Just update profile in state + firestore, let auth refresh eventually
            toast.success("Avatar subido (Recarga para ver cambios en cabecera)");
        } catch (e) {
            toast.error("Error al subir avatar");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleLaunchQuiz = (quiz: Quiz) => {
        setSelectedQuizForEval(quiz);
        setSelectedArcadeMode('classic'); // Default
        setShowEvalModal(true);
    };

    const handleDeleteQuiz = async (quizId: string) => {
        if (confirm("¿Estás seguro?")) {
            await deleteQuizFromFirestore(quizId);
            setQuizzes(prev => prev.filter(q => q.id !== quizId));
            toast.success("Quiz eliminado");
        }
    };

    const confirmArcadeLaunch = (quiz: Quiz) => {
        setShowQuizPicker(false);
        setSelectedQuizForEval(quiz);
        setShowEvalModal(true);
    };

    const initiateArcadeLaunch = (mode: 'classic' | 'time_attack' | 'final_boss' | 'raid') => {
        setSelectedArcadeMode(mode);
        setShowQuizPicker(true);
    };

    // --- NAVIGATION HELPERS ---
    const goToCreate = () => onNavigate('create_menu');
    const goToMyQuizzes = () => onNavigate('my_quizzes');

    if (!user) return <div className="text-center p-20">Acceso Denegado</div>;

    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 pt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* --- MODALS --- */}
            {showEvalModal && selectedQuizForEval && (
                <CreateEvaluationModal 
                    isOpen={showEvalModal}
                    onClose={() => setShowEvalModal(false)}
                    quiz={selectedQuizForEval}
                    user={user}
                    initialGameMode={selectedArcadeMode}
                    onGoToDashboard={() => onNavigate('teacher_hub')} 
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
                            <h3 className="font-cyber font-bold text-white">SELECCIONA UN QUIZ</h3>
                            <button onClick={() => setShowQuizPicker(false)}><span className="text-gray-500 hover:text-white">✕</span></button>
                        </div>
                        <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
                            {quizzes.map(q => (
                                <button key={q.id} onClick={() => confirmArcadeLaunch(q)} className="w-full text-left p-3 rounded border border-gray-700 hover:border-cyan-500 bg-gray-900/50 hover:bg-cyan-900/20 transition-all flex justify-between">
                                    <span className="font-bold text-gray-300">{q.title}</span>
                                    <span className="text-xs bg-black px-2 py-1 rounded text-gray-500">{q.questions.length} Qs</span>
                                </button>
                            ))}
                        </div>
                    </CyberCard>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-12">
                
                {/* --- 1. PROFILE SUMMARY CARD (TOP) --- */}
                <CyberCard className="border-cyan-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        {/* Avatar Column */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer w-32 h-32" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-full h-full rounded-full border-4 border-cyan-500/50 p-1 overflow-hidden bg-black shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} className="w-full h-full object-cover rounded-full" alt="Profile" />
                                    ) : (
                                        <div className="w-full h-full bg-cyan-900/20 flex items-center justify-center text-cyan-500 font-bold text-4xl">
                                            {user.displayName?.charAt(0) || "U"}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                            </div>
                            <div className="text-center">
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/50 text-purple-300 text-xs font-mono mb-2">
                                    NIVEL PRO
                                </div>
                                <p className="text-gray-500 text-xs font-mono">{stats.totalQuizzes} Quizzes Creados</p>
                            </div>
                        </div>

                        {/* Info Column (View vs Edit) */}
                        <div className="flex-1 w-full">
                            {!isEditingProfile ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-4xl font-black font-cyber text-white uppercase">{user.displayName}</h1>
                                            <p className="text-xl text-cyan-400 font-mono mt-1">{profile.role || "Docente Digital"} <span className="text-gray-600">|</span> {profile.school || "Sin centro asignado"}</p>
                                        </div>
                                        <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-white border border-gray-700 hover:border-white px-4 py-2 rounded transition-all">
                                            <Edit3 className="w-4 h-4"/> EDITAR PERFIL
                                        </button>
                                    </div>

                                    <p className="text-gray-300 leading-relaxed max-w-3xl">
                                        {profile.bio || "No hay biografía disponible. Añade una descripción para tus alumnos."}
                                    </p>

                                    {/* Socials Display */}
                                    <div className="flex gap-4 pt-4 border-t border-gray-800">
                                        {profile.socials?.twitter && (
                                            <a href={profile.socials.twitter} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors"><Twitter className="w-5 h-5"/></a>
                                        )}
                                        {profile.socials?.linkedin && (
                                            <a href={profile.socials.linkedin} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors"><Linkedin className="w-5 h-5"/></a>
                                        )}
                                        {profile.socials?.instagram && (
                                            <a href={profile.socials.instagram} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-pink-500 transition-colors"><Instagram className="w-5 h-5"/></a>
                                        )}
                                        {profile.socials?.youtube && (
                                            <a href={profile.socials.youtube} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-red-500 transition-colors"><Youtube className="w-5 h-5"/></a>
                                        )}
                                        {profile.socials?.website && (
                                            <a href={profile.socials.website} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors"><LinkIcon className="w-5 h-5"/></a>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 bg-black/20 p-6 rounded-lg border border-cyan-500/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <CyberInput label="Centro Educativo" value={profile.school || ""} onChange={(e) => setProfile({...profile, school: e.target.value})} />
                                        <CyberInput label="Cargo / Rol" value={profile.role || ""} onChange={(e) => setProfile({...profile, role: e.target.value})} />
                                    </div>
                                    
                                    <CyberTextArea label="Biografía" value={profile.bio || ""} onChange={(e) => setProfile({...profile, bio: e.target.value})} className="h-24" />
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <CyberInput label="Twitter (URL)" value={profile.socials?.twitter || ""} onChange={(e) => setProfile({...profile, socials: {...profile.socials, twitter: e.target.value}})} placeholder="https://x.com/..." />
                                        <CyberInput label="LinkedIn (URL)" value={profile.socials?.linkedin || ""} onChange={(e) => setProfile({...profile, socials: {...profile.socials, linkedin: e.target.value}})} placeholder="https://linkedin.com/..." />
                                        <CyberInput label="Instagram (URL)" value={profile.socials?.instagram || ""} onChange={(e) => setProfile({...profile, socials: {...profile.socials, instagram: e.target.value}})} placeholder="https://instagram.com/..." />
                                        <CyberInput label="YouTube (URL)" value={profile.socials?.youtube || ""} onChange={(e) => setProfile({...profile, socials: {...profile.socials, youtube: e.target.value}})} placeholder="https://youtube.com/..." />
                                        <CyberInput label="Website" value={profile.socials?.website || ""} onChange={(e) => setProfile({...profile, socials: {...profile.socials, website: e.target.value}})} placeholder="https://miguayweb.com" />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button onClick={() => setIsEditingProfile(false)} className="text-sm text-gray-400 hover:text-white px-4">Cancelar</button>
                                        <CyberButton onClick={handleSaveProfile} className="h-10 px-6">GUARDAR CAMBIOS</CyberButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CyberCard>

                {/* --- NAVIGATION BAR (STICKY) --- */}
                <div className="sticky top-20 z-30 bg-[#020617]/90 backdrop-blur border-y border-gray-800 py-3 flex justify-center gap-2 overflow-x-auto">
                    <button onClick={() => scrollToSection('quiz-manager')} className="px-6 py-2 rounded-full border border-gray-700 hover:border-blue-500 hover:text-blue-400 text-gray-400 text-xs font-mono font-bold transition-all whitespace-nowrap">
                        GESTOR DE QUIZZES
                    </button>
                    <button onClick={() => scrollToSection('arcade')} className="px-6 py-2 rounded-full border border-gray-700 hover:border-purple-500 hover:text-purple-400 text-gray-400 text-xs font-mono font-bold transition-all whitespace-nowrap">
                        ZONA ARCADE
                    </button>
                    <button onClick={() => scrollToSection('management')} className="px-6 py-2 rounded-full border border-gray-700 hover:border-green-500 hover:text-green-400 text-gray-400 text-xs font-mono font-bold transition-all whitespace-nowrap">
                        GESTIÓN
                    </button>
                </div>

                {/* --- SECTIONS --- */}

                {/* 1. NEW: GESTOR DE QUIZZES (MAIN ACTIONS) */}
                <div id="quiz-manager" className="scroll-mt-32 space-y-6">
                    <h2 className="text-2xl font-black font-cyber text-blue-400 flex items-center gap-2"><LayoutGrid className="w-6 h-6"/> GESTOR DE QUIZZES</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* BOTÓN 1: GENERAR CON IA */}
                        <button onClick={goToCreate} className="group relative h-40 rounded-xl overflow-hidden border-2 border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/40 hover:border-purple-500 transition-all text-left p-5 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 p-12 bg-purple-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/50 group-hover:scale-110 transition-transform">
                                <Bot className="w-6 h-6 text-purple-300" />
                            </div>
                            <div>
                                <h3 className="font-bold font-cyber text-white text-lg">GENERAR CON IA</h3>
                                <p className="text-[10px] text-gray-400 font-mono mt-1">Creación automática desde tema</p>
                            </div>
                        </button>

                        {/* BOTÓN 2: GENERACIÓN MANUAL */}
                        <button onClick={goToCreate} className="group relative h-40 rounded-xl overflow-hidden border-2 border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/40 hover:border-cyan-500 transition-all text-left p-5 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 p-12 bg-cyan-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/50 group-hover:scale-110 transition-transform">
                                <PenTool className="w-6 h-6 text-cyan-300" />
                            </div>
                            <div>
                                <h3 className="font-bold font-cyber text-white text-lg">MANUAL</h3>
                                <p className="text-[10px] text-gray-400 font-mono mt-1">Editor clásico pregunta a pregunta</p>
                            </div>
                        </button>

                        {/* BOTÓN 3: IMPORTAR QUIZ */}
                        <button onClick={goToCreate} className="group relative h-40 rounded-xl overflow-hidden border-2 border-green-500/30 bg-green-950/20 hover:bg-green-900/40 hover:border-green-500 transition-all text-left p-5 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 p-12 bg-green-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/50 group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-green-300" />
                            </div>
                            <div>
                                <h3 className="font-bold font-cyber text-white text-lg">IMPORTAR QUIZ</h3>
                                <p className="text-[10px] text-gray-400 font-mono mt-1">Desde PDF, Excel, Kahoot, Texto...</p>
                            </div>
                        </button>

                        {/* BOTÓN 4: MIS QUIZZES */}
                        <button onClick={goToMyQuizzes} className="group relative h-40 rounded-xl overflow-hidden border-2 border-yellow-500/30 bg-yellow-950/20 hover:bg-yellow-900/40 hover:border-yellow-500 transition-all text-left p-5 flex flex-col justify-between">
                            <div className="absolute top-0 right-0 p-12 bg-yellow-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/50 group-hover:scale-110 transition-transform">
                                <FolderOpen className="w-6 h-6 text-yellow-300" />
                            </div>
                            <div>
                                <h3 className="font-bold font-cyber text-white text-lg">MIS QUIZZES</h3>
                                <p className="text-[10px] text-gray-400 font-mono mt-1">Accede a tu biblioteca ({stats.totalQuizzes})</p>
                            </div>
                        </button>
                    </div>

                    {/* RECENT QUIZZES PREVIEW (Optional) */}
                    <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">ACTIVIDAD RECIENTE</h4>
                            <button onClick={goToMyQuizzes} className="text-xs text-cyan-400 hover:underline">Ver Todo</button>
                        </div>
                        {loadingQuizzes ? (
                            <div className="text-xs text-gray-500 text-center py-4">Cargando...</div>
                        ) : quizzes.length === 0 ? (
                            <div className="text-xs text-gray-500 text-center py-4 italic">No hay actividad reciente.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {quizzes.slice(0, 3).map(q => (
                                    <div key={q.id} onClick={() => handleLaunchQuiz(q)} className="flex items-center gap-3 p-2 rounded bg-black/40 border border-gray-800 hover:border-cyan-500/30 cursor-pointer group">
                                        <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-gray-300 truncate group-hover:text-cyan-300">{q.title}</div>
                                            <div className="text-[9px] text-gray-600">{q.questions.length} preguntas • {new Date(q.updatedAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. ARCADE */}
                <div id="arcade" className="scroll-mt-32 space-y-6 pt-12 border-t border-gray-900">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black font-cyber text-purple-400 flex items-center gap-2"><Gamepad2 className="w-6 h-6"/> ZONA ARCADE</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* RAID BOSS */}
                        <button onClick={() => initiateArcadeLaunch('raid')} className="group relative h-64 rounded-xl border-2 border-orange-500/30 bg-orange-950/10 hover:bg-orange-900/20 hover:border-orange-500 transition-all text-left p-6 flex flex-col justify-end overflow-hidden">
                            <div className="absolute top-4 right-4 p-3 bg-orange-500/20 rounded-full border border-orange-500 group-hover:scale-110 transition-transform"><Swords className="w-8 h-8 text-orange-400" /></div>
                            <h3 className="text-2xl font-black font-cyber text-orange-400 relative z-10">RAID BOSS</h3>
                            <p className="text-xs text-gray-400 relative z-10 mt-1">Cooperativo en vivo. Toda la clase vs El Jefe.</p>
                        </button>
                        
                        {/* BOSS SOLO */}
                        <button onClick={() => initiateArcadeLaunch('final_boss')} className="group relative h-64 rounded-xl border-2 border-red-500/30 bg-red-950/10 hover:bg-red-900/20 hover:border-red-500 transition-all text-left p-6 flex flex-col justify-end overflow-hidden">
                            <div className="absolute top-4 right-4 p-3 bg-red-500/20 rounded-full border border-red-500 group-hover:scale-110 transition-transform"><Skull className="w-8 h-8 text-red-400" /></div>
                            <h3 className="text-2xl font-black font-cyber text-red-400 relative z-10">BOSS SOLO</h3>
                            <p className="text-xs text-gray-400 relative z-10 mt-1">RPG Individual. Tarea para casa o examen.</p>
                        </button>

                        {/* JEOPARDY */}
                        <button onClick={() => onNavigate('game_lobby')} className="group relative h-64 rounded-xl border-2 border-purple-500/30 bg-purple-950/10 hover:bg-purple-900/20 hover:border-purple-500 transition-all text-left p-6 flex flex-col justify-end overflow-hidden">
                            <div className="absolute top-4 right-4 p-3 bg-purple-500/20 rounded-full border border-purple-500 group-hover:scale-110 transition-transform"><Trophy className="w-8 h-8 text-purple-400" /></div>
                            <h3 className="text-2xl font-black font-cyber text-purple-400 relative z-10">JEOPARDY</h3>
                            <p className="text-xs text-gray-400 relative z-10 mt-1">Concurso TV por equipos. Tablero clásico.</p>
                        </button>
                    </div>
                </div>

                {/* 3. MANAGEMENT */}
                <div id="management" className="scroll-mt-32 space-y-6 pt-12 border-t border-gray-900">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black font-cyber text-green-400 flex items-center gap-2"><Globe className="w-6 h-6"/> GESTIÓN Y CAMPAÑAS</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button onClick={() => onNavigate('campaign_manager')} className="group p-6 rounded-xl border-2 border-yellow-500/30 bg-yellow-950/10 hover:border-yellow-500 transition-all text-left flex items-center gap-4">
                            <div className="p-4 bg-yellow-900/30 rounded-full"><Crown className="w-8 h-8 text-yellow-500"/></div>
                            <div>
                                <h3 className="text-xl font-bold font-cyber text-yellow-400">MODO CAMPAÑA</h3>
                                <p className="text-xs text-gray-400 mt-1">Gestor de aventuras de largo recorrido.</p>
                            </div>
                        </button>
                        <button onClick={() => onNavigate('classes_manager')} className="group p-6 rounded-xl border-2 border-green-500/30 bg-green-950/10 hover:border-green-500 transition-all text-left flex items-center gap-4">
                            <div className="p-4 bg-green-900/30 rounded-full"><Users className="w-8 h-8 text-green-500"/></div>
                            <div>
                                <h3 className="text-xl font-bold font-cyber text-green-400">CLASES Y ALUMNOS</h3>
                                <p className="text-xs text-gray-400 mt-1">Listas, alias y seguimiento.</p>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
