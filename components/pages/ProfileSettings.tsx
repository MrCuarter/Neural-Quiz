
import React, { useState, useRef, useEffect } from 'react';
import { CyberButton, CyberCard, CyberInput, CyberTextArea } from '../ui/CyberUI';
import { ArrowLeft, Camera, Save, User, Globe, Linkedin, Twitter, Sparkles, AlertTriangle } from 'lucide-react';
import { auth, getUserProfile, updateUserProfile, UserProfileData } from '../../services/firebaseService';
import { processImage } from '../../utils/imageOptimizer';
import { useToast } from '../ui/Toast';

interface ProfileSettingsProps {
    onNavigate: (view: string) => void;
    user: any;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onNavigate, user }) => {
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- FORM STATE ---
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [bio, setBio] = useState("");
    const [website, setWebsite] = useState("");
    const [twitter, setTwitter] = useState("");
    const [linkedin, setLinkedin] = useState("");
    
    // --- IMAGE STATE ---
    const [currentPhotoUrl, setCurrentPhotoUrl] = useState(user?.photoURL || "");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<Blob | null>(null);

    // Load extra data from Firestore on mount
    useEffect(() => {
        if (user) {
            const loadData = async () => {
                setIsLoading(true);
                try {
                    const profile = await getUserProfile(user.uid);
                    if (profile) {
                        setBio(profile.bio || "");
                        setWebsite(profile.website || "");
                        setTwitter(profile.socialLinks?.twitter || "");
                        setLinkedin(profile.socialLinks?.linkedin || "");
                        // Use Firestore photo if available (more reliable if auth token is stale)
                        if (profile.photoURL) setCurrentPhotoUrl(profile.photoURL);
                    }
                } catch (error) {
                    console.error("Error loading profile:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            loadData();
        }
    }, [user]);

    // Handle File Selection
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        
        // Immediate local processing
        try {
            const processedBlob = await processImage(file);
            setImageFile(processedBlob);
            
            // Generate local preview URL
            const objectUrl = URL.createObjectURL(processedBlob);
            setPreviewUrl(objectUrl);
            
            toast.info("Imagen procesada. Recuerda guardar los cambios.");
        } catch (error) {
            toast.error("Error al procesar la imagen.");
            console.error(error);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSave = async () => {
        if (!user) return;
        if (!displayName.trim()) {
            toast.warning("El nombre es obligatorio.");
            return;
        }

        setIsSaving(true);
        try {
            const profileData: UserProfileData = {
                displayName,
                bio,
                website,
                socialLinks: {
                    twitter,
                    linkedin
                },
                photoURL: currentPhotoUrl // Fallback if no new image
            };

            await updateUserProfile(user.uid, profileData, imageFile || undefined);
            
            toast.success("Perfil actualizado correctamente.");
            // Reset local state if needed, or redirect
            // If image was uploaded, revoke the object URL to free memory
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setImageFile(null);
            
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error("Error al guardar perfil: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
                <CyberCard className="border-red-500/50 p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-cyber mb-2">SESIÓN REQUERIDA</h2>
                    <CyberButton onClick={() => onNavigate('home')}>IR A INICIO</CyberButton>
                </CyberCard>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 pt-20 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
                    <CyberButton variant="ghost" onClick={() => onNavigate('teacher_hub')} className="pl-0 gap-2">
                        <ArrowLeft className="w-4 h-4" /> VOLVER
                    </CyberButton>
                    <h1 className="text-3xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                        PERFIL DOCENTE
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* LEFT COL: AVATAR */}
                    <div className="md:col-span-1 flex flex-col items-center gap-4">
                        <div className="relative group w-48 h-48">
                            <div className="w-full h-full rounded-full border-4 border-cyan-500/30 p-1 bg-black/50 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    currentPhotoUrl ? (
                                        <img src={currentPhotoUrl} alt="Current" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-700">
                                            <User className="w-20 h-20" />
                                        </div>
                                    )
                                )}
                            </div>
                            
                            {/* Overlay Button */}
                            <button 
                                onClick={triggerFileInput}
                                className="absolute bottom-2 right-2 bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-full shadow-lg transition-all border-2 border-black"
                                title="Cambiar foto"
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleFileChange} 
                            />
                        </div>
                        
                        <div className="text-center">
                            <p className="text-xs text-gray-500 font-mono mt-2">
                                Se recortará automáticamente a formato cuadrado.
                            </p>
                            {previewUrl && (
                                <span className="text-xs text-yellow-400 font-bold block mt-1 animate-pulse">
                                    ● Cambios pendientes
                                </span>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COL: FORM */}
                    <CyberCard className="md:col-span-2 border-purple-500/20 bg-gray-900/20 p-6 md:p-8 space-y-6">
                        
                        {isLoading ? (
                            <div className="text-center py-10 text-gray-500 font-mono">Cargando datos del perfil...</div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-cyan-400 border-b border-gray-800 pb-2 mb-4">
                                        <Sparkles className="w-4 h-4" />
                                        <h3 className="font-cyber font-bold text-sm">IDENTIDAD DIGITAL</h3>
                                    </div>

                                    <CyberInput 
                                        label="NOMBRE PÚBLICO" 
                                        value={displayName} 
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Ej: Profe Juan"
                                    />

                                    <div>
                                        <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest block mb-1">BIO / ACERCA DE MÍ</label>
                                        <CyberTextArea 
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Comparte tu experiencia, materias favoritas o filosofía de enseñanza..."
                                            className="min-h-[120px] text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-purple-400 border-b border-gray-800 pb-2 mb-4">
                                        <Globe className="w-4 h-4" />
                                        <h3 className="font-cyber font-bold text-sm">ENLACES PROFESIONALES</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-9 w-4 h-4 text-gray-500" />
                                            <CyberInput 
                                                label="SITIO WEB" 
                                                value={website} 
                                                onChange={(e) => setWebsite(e.target.value)}
                                                className="pl-10"
                                                placeholder="https://tuweb.com"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Twitter className="absolute left-3 top-9 w-4 h-4 text-gray-500" />
                                            <CyberInput 
                                                label="TWITTER / X" 
                                                value={twitter} 
                                                onChange={(e) => setTwitter(e.target.value)}
                                                className="pl-10"
                                                placeholder="@usuario"
                                            />
                                        </div>
                                        <div className="relative md:col-span-2">
                                            <Linkedin className="absolute left-3 top-9 w-4 h-4 text-gray-500" />
                                            <CyberInput 
                                                label="LINKEDIN" 
                                                value={linkedin} 
                                                onChange={(e) => setLinkedin(e.target.value)}
                                                className="pl-10"
                                                placeholder="URL de perfil"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-800 flex justify-end">
                                    <CyberButton 
                                        onClick={handleSave} 
                                        isLoading={isSaving}
                                        className="px-8 h-12 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 border-none text-white font-bold tracking-wider"
                                    >
                                        <Save className="w-5 h-5 mr-2" /> GUARDAR CAMBIOS
                                    </CyberButton>
                                </div>
                            </>
                        )}
                    </CyberCard>
                </div>
            </div>
        </div>
    );
};
