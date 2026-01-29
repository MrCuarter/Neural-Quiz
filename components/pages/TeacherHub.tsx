
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
    Crown // New Icon
} from 'lucide-react';
// ... existing imports ...
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
    // ... existing state ...
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [profile, setProfile] = useState<TeacherProfile>({});
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (user) {
            getUserData(user.uid).then(data => {
                if (data) setProfile(data);
            });
        }
    }, [user]);

    const handleAvatarClick = () => { fileInputRef.current?.click(); };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... existing logic ... */ };
    const handleCropSave = async (blob: Blob) => { /* ... existing logic ... */ };
    const handleSaveProfile = async () => { /* ... existing logic ... */ };

    if (!user) return <div className="...">{/* ... Access Denied ... */}</div>;

    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 pt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ... Cropper ... */}
            <div className="max-w-7xl mx-auto space-y-12">
                {/* ... Header Profile ... */}
                
                {/* ... Section 1 ... */}

                {/* ... Section 2 ... */}

                {/* --- EXTRA: GESTIÓN (FILA 3) --- */}
                <div className="pt-4 border-t border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* CLASSES */}
                    <button 
                        onClick={() => onNavigate('classes_manager')}
                        className="w-full flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-green-500/50 hover:bg-green-900/10 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-900/20 rounded-full flex items-center justify-center border border-green-500/20">
                                <Users className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-white group-hover:text-green-300">GESTIONAR CLASES</h3>
                                <p className="text-xs text-gray-500">Listas de alumnos y seguimiento.</p>
                            </div>
                        </div>
                        <div className="text-gray-600 group-hover:text-green-400">→</div>
                    </button>

                    {/* CAMPAIGN MANAGER (NEW) */}
                    <button 
                        onClick={() => onNavigate('campaign_manager')}
                        className="w-full flex items-center justify-between p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-yellow-500/50 hover:bg-yellow-900/10 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-yellow-900/20 rounded-full flex items-center justify-center border border-yellow-500/20">
                                <Crown className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-white group-hover:text-yellow-300">MODO CAMPAÑA</h3>
                                <p className="text-xs text-gray-500">Crea aventuras largas y narrativas.</p>
                            </div>
                        </div>
                        <div className="text-gray-600 group-hover:text-yellow-400">→</div>
                    </button>

                </div>

            </div>
        </div>
    );
};
