
import React, { useState, useRef, useEffect } from 'react';
import { CyberButton, CyberCard, CyberInput, CyberTextArea, CyberSelect } from '../../ui/CyberUI';
import { X, ArrowRight, ArrowLeft, Wand2, Image as ImageIcon, Upload, Search, Palette, Coins, Scroll, Heart, Zap, Globe, Save } from 'lucide-react';
import { Campaign, CampaignResource, CampaignTheme, CampaignVisuals } from '../../../types';
import { compressImage } from '../../../utils/imageOptimizer';
import { uploadImageToCloudinary } from '../../../services/cloudinaryService';
import { useToast } from '../../ui/Toast';

interface CreateQuestModalProps {
    onClose: () => void;
    onCreate: (campaignData: Partial<Campaign>) => void;
}

// ASSETS CONFIG
const QUEST_ASSETS_BASE = "https://raw.githubusercontent.com/MrCuarter/neuralquiz-assets/79e18fb06409dc5669a2b360950e0e87e61a4abb/quest";

// THEME PRESETS
const THEME_PRESETS: Record<CampaignTheme, { visuals: CampaignVisuals, resources: CampaignResource[] }> = {
    fantasy: {
        visuals: { primaryColor: '#f59e0b', font: 'serif', backgroundUrl: `${QUEST_ASSETS_BASE}/fantasy.png` }, // Amber
        resources: [
            { id: 'r1', name: 'Oro', emoji: '🪙', type: 'accumulate', startValue: 0, targetValue: 1000 },
            { id: 'r2', name: 'Salud', emoji: '❤️', type: 'drain', startValue: 100, targetValue: 100 }
        ]
    },
    space: {
        visuals: { primaryColor: '#3b82f6', font: 'sans', backgroundUrl: `${QUEST_ASSETS_BASE}/space.png` }, // Blue
        resources: [
            { id: 'r1', name: 'Créditos', emoji: '💳', type: 'accumulate', startValue: 0, targetValue: 5000 },
            { id: 'r2', name: 'Combustible', emoji: '⛽', type: 'drain', startValue: 100, targetValue: 100 }
        ]
    },
    historical: {
        visuals: { primaryColor: '#d97706', font: 'serif', backgroundUrl: `${QUEST_ASSETS_BASE}/history.png` }, // Bronze
        resources: [
            { id: 'r1', name: 'Reputación', emoji: '📜', type: 'accumulate', startValue: 0, targetValue: 100 },
            { id: 'r2', name: 'Provisiones', emoji: '🍞', type: 'drain', startValue: 50, targetValue: 50 }
        ]
    },
    arcade: {
        visuals: { primaryColor: '#ec4899', font: 'mono', backgroundUrl: `${QUEST_ASSETS_BASE}/arcade.png` }, // Pink
        resources: [
            { id: 'r1', name: 'Score', emoji: '🏆', type: 'accumulate', startValue: 0, targetValue: 99999 },
            { id: 'r2', name: 'Vidas', emoji: '👾', type: 'drain', startValue: 3, targetValue: 3 }
        ]
    },
    kids: {
        visuals: { primaryColor: '#10b981', font: 'sans', backgroundUrl: `${QUEST_ASSETS_BASE}/infantil.png` }, // Emerald
        resources: [
            { id: 'r1', name: 'Estrellas', emoji: '⭐', type: 'accumulate', startValue: 0, targetValue: 50 }
        ]
    },
    custom: {
        visuals: { primaryColor: '#6366f1', font: 'mono', backgroundUrl: '' },
        resources: []
    }
};

export const CreateQuestModal: React.FC<CreateQuestModalProps> = ({ onClose, onCreate }) => {
    const toast = useToast();
    const [step, setStep] = useState(1);
    
    // --- STATE: DATA ---
    const [theme, setTheme] = useState<CampaignTheme>('fantasy');
    const [visuals, setVisuals] = useState<CampaignVisuals>(THEME_PRESETS['fantasy'].visuals);
    const [resources, setResources] = useState<CampaignResource[]>(THEME_PRESETS['fantasy'].resources);
    
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    
    // --- STATE: UI ---
    const [unsplashQuery, setUnsplashQuery] = useState("");
    const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
    const [showUnsplash, setShowUnsplash] = useState(false);
    const [loadingUnsplash, setLoadingUnsplash] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- STEP 1: THEME & VISUALS LOGIC ---

    const handleThemeSelect = (t: CampaignTheme) => {
        setTheme(t);
        // Load presets INCLUDING the backgroundUrl from the preset
        setVisuals(THEME_PRESETS[t].visuals);
        setResources(THEME_PRESETS[t].resources);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const compressed = await compressImage(file, 1280, 0.7);
            // Upload to Cloudinary (using existing service)
            // Note: compressImage returns Blob, uploadImageToCloudinary expects File. 
            // We cast Blob to File for the service.
            const fileToUpload = new File([compressed], "cover.jpg", { type: "image/jpeg" });
            const url = await uploadImageToCloudinary(fileToUpload);
            
            setVisuals(prev => ({ ...prev, backgroundUrl: url }));
            toast.success("Portada actualizada");
        } catch (err) {
            console.error(err);
            toast.error("Error al subir imagen");
        } finally {
            setUploading(false);
        }
    };

    const searchUnsplash = async () => {
        if (!unsplashQuery) return;
        setLoadingUnsplash(true);
        try {
            // SAFE ACCESS TO ENV
            const apiKey = (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY;
            
            if (!apiKey) throw new Error("Missing Unsplash API Key");

            const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=9&orientation=landscape&client_id=${apiKey}`);
            const data = await res.json();
            
            if (data.results) {
                setUnsplashResults(data.results);
            }
        } catch (err) {
            toast.error("Error conectando con Unsplash");
        } finally {
            setLoadingUnsplash(false);
        }
    };

    const selectUnsplashImage = (url: string) => {
        setVisuals(prev => ({ ...prev, backgroundUrl: url }));
        setShowUnsplash(false);
    };

    // --- STEP 2: ECONOMY LOGIC ---

    const addResource = () => {
        if (resources.length >= 4) {
            toast.warning("Máximo 4 recursos permitidos");
            return;
        }
        setResources(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            name: "Nuevo",
            emoji: "🔹",
            type: "accumulate",
            startValue: 0,
            targetValue: 100
        }]);
    };

    const updateResource = (idx: number, field: keyof CampaignResource, value: any) => {
        const newRes = [...resources];
        // @ts-ignore
        newRes[idx][field] = value;
        setResources(newRes);
    };

    const removeResource = (idx: number) => {
        const newRes = [...resources];
        newRes.splice(idx, 1);
        setResources(newRes);
    };

    // --- STEP 3: SUBMIT ---

    const handleFinish = () => {
        if (!title.trim()) {
            toast.error("La campaña necesita un título");
            return;
        }
        
        onCreate({
            title,
            description,
            theme,
            visualSettings: visuals,
            resources: resources,
            // Fallback legacy fields mapping
            resourceName: resources[0]?.name || "Puntos",
            resourceEmoji: resources[0]?.emoji || "⭐",
            goalAmount: resources[0]?.targetValue || 100
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <CyberCard className="w-full max-w-4xl h-[90vh] flex flex-col p-0 border-cyan-500/50 overflow-hidden relative shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                
                {/* --- HEADER (STEPPER) --- */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-cyber font-bold text-cyan-400">CREAR AVENTURA</h2>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`w-3 h-3 rounded-full ${step >= i ? 'bg-cyan-500 shadow-[0_0_10px_cyan]' : 'bg-gray-700'}`} />
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500 hover:text-white" /></button>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#050505] relative">
                    
                    {/* STEP 1: THE WORLD */}
                    {step === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-right-8">
                            <div>
                                <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-purple-400" /> 1. ELIGE TU UNIVERSO
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {(['fantasy', 'space', 'historical', 'arcade', 'kids', 'custom'] as CampaignTheme[]).map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => handleThemeSelect(t)}
                                            className={`p-4 rounded border-2 transition-all flex flex-col items-center gap-2 capitalize ${theme === t ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300' : 'border-gray-700 bg-gray-900/50 text-gray-500 hover:border-gray-500'}`}
                                        >
                                            <span className="text-2xl">{t === 'fantasy' ? '🐉' : t === 'space' ? '🚀' : t === 'historical' ? '🏛️' : t === 'arcade' ? '🕹️' : t === 'kids' ? '🧸' : '⚙️'}</span>
                                            <span className="text-xs font-bold">{t}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-pink-400" /> PORTADA DEL MUNDO
                                    </h3>
                                    
                                    <div className="relative aspect-video rounded-lg border-2 border-dashed border-gray-700 bg-gray-900 flex flex-col items-center justify-center overflow-hidden group">
                                        {visuals.backgroundUrl ? (
                                            <>
                                                <img src={visuals.backgroundUrl} className="w-full h-full object-cover" alt="Cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                    <button onClick={() => setVisuals(prev => ({...prev, backgroundUrl: ''}))} className="p-2 bg-red-600 rounded-full hover:scale-110 transition-transform"><X className="w-5 h-5 text-white"/></button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4">
                                                <p className="text-gray-500 text-xs">Sube una imagen o busca en Unsplash</p>
                                                <div className="flex gap-2">
                                                    <CyberButton variant="secondary" onClick={() => fileInputRef.current?.click()} isLoading={uploading} className="text-xs h-8">
                                                        <Upload className="w-3 h-3 mr-2" /> SUBIR
                                                    </CyberButton>
                                                    <CyberButton variant="neural" onClick={() => setShowUnsplash(true)} className="text-xs h-8">
                                                        <Search className="w-3 h-3 mr-2" /> UNSPLASH
                                                    </CyberButton>
                                                </div>
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-2">
                                        <Palette className="w-5 h-5 text-yellow-400" /> PERSONALIZACIÓN
                                    </h3>
                                    <div className="space-y-4 bg-gray-900/30 p-4 rounded border border-gray-800">
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase block mb-2">Color Primario</label>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="color" 
                                                    value={visuals.primaryColor} 
                                                    onChange={(e) => setVisuals({...visuals, primaryColor: e.target.value})} 
                                                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                                                />
                                                <span className="font-mono text-cyan-400">{visuals.primaryColor}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase block mb-2">Tipografía</label>
                                            <div className="flex gap-2">
                                                {['sans', 'serif', 'mono'].map(f => (
                                                    <button 
                                                        key={f} 
                                                        onClick={() => setVisuals({...visuals, font: f as any})}
                                                        className={`flex-1 p-2 text-xs border rounded capitalize ${visuals.font === f ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-black border-gray-700 text-gray-500'}`}
                                                    >
                                                        {f}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ECONOMY */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-yellow-400" /> SISTEMA DE RECURSOS
                                </h3>
                                <CyberButton onClick={addResource} className="text-xs h-8"><Wand2 className="w-3 h-3 mr-2"/> AÑADIR RECURSO</CyberButton>
                            </div>

                            <div className="space-y-4">
                                {resources.map((res, idx) => (
                                    <div key={res.id} className="flex flex-col md:flex-row gap-4 items-end bg-gray-900/40 p-4 rounded border border-gray-700 animate-in fade-in">
                                        <div className="w-16">
                                            <label className="text-[10px] text-gray-500 block mb-1">ICONO</label>
                                            <input value={res.emoji} onChange={(e) => updateResource(idx, 'emoji', e.target.value)} className="w-full bg-black border border-gray-600 rounded p-2 text-center text-xl" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-500 block mb-1">NOMBRE</label>
                                            <input value={res.name} onChange={(e) => updateResource(idx, 'name', e.target.value)} className="w-full bg-black border border-gray-600 rounded p-2 text-sm text-white" />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-[10px] text-gray-500 block mb-1">TIPO</label>
                                            <select value={res.type} onChange={(e) => updateResource(idx, 'type', e.target.value)} className="w-full bg-black border border-gray-600 rounded p-2 text-sm text-white">
                                                <option value="accumulate">Acumulable (XP)</option>
                                                <option value="drain">Consumible (HP)</option>
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] text-gray-500 block mb-1">{res.type === 'accumulate' ? 'INICIO' : 'MÁXIMO'}</label>
                                            <input type="number" value={res.startValue} onChange={(e) => updateResource(idx, 'startValue', parseInt(e.target.value))} className="w-full bg-black border border-gray-600 rounded p-2 text-sm text-white" />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] text-gray-500 block mb-1">{res.type === 'accumulate' ? 'META' : 'INICIO'}</label>
                                            <input type="number" value={res.targetValue} onChange={(e) => updateResource(idx, 'targetValue', parseInt(e.target.value))} className="w-full bg-black border border-gray-600 rounded p-2 text-sm text-white" />
                                        </div>
                                        <button onClick={() => removeResource(idx)} className="p-2 text-red-500 hover:bg-red-900/20 rounded mb-0.5">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-200">
                                <p><strong>💡 Tip de Economía:</strong> Usa recursos "Acumulables" para el progreso (Oro, XP, Karma) y "Consumibles" para la supervivencia (Salud, Combustible, Cordura). Si un recurso consumible llega a 0, puedes configurar penalizaciones manuales.</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: NARRATIVE */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8">
                            <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                                <Scroll className="w-5 h-5 text-green-400" /> 3. NARRATIVA Y OBJETIVOS
                            </h3>
                            
                            <div className="max-w-2xl mx-auto space-y-6">
                                <CyberInput label="TÍTULO DE LA CAMPAÑA" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: La Búsqueda del Conocimiento Perdido" />
                                
                                <div>
                                    <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-2">INTRODUCCIÓN / SINOPSIS</label>
                                    <CyberTextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el mundo y el objetivo final a tus alumnos..." className="h-40" />
                                </div>

                                {/* PREVIEW CARD */}
                                <div className="mt-8 pt-8 border-t border-gray-800">
                                    <p className="text-center text-xs text-gray-500 mb-4 uppercase tracking-widest">VISTA PREVIA DE TARJETA</p>
                                    <div className="w-full max-w-sm mx-auto rounded-xl overflow-hidden border-2 border-gray-800 bg-[#0a0a0a] relative group">
                                        <div className="h-32 bg-gray-800 relative">
                                            {visuals.backgroundUrl && <img src={visuals.backgroundUrl} className="w-full h-full object-cover opacity-60" />}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
                                        </div>
                                        <div className="p-6 relative -mt-12">
                                            <div className="w-16 h-16 rounded-full border-4 border-[#0a0a0a] bg-gray-900 flex items-center justify-center text-3xl shadow-lg mb-3" style={{backgroundColor: visuals.primaryColor}}>
                                                {resources[0]?.emoji || '🚀'}
                                            </div>
                                            <h3 className={`text-xl font-bold text-white mb-2 font-${visuals.font}`}>{title || "Título de Campaña"}</h3>
                                            <p className="text-xs text-gray-400 line-clamp-3">{description || "Descripción..."}</p>
                                            
                                            <div className="mt-4 flex gap-2">
                                                {resources.slice(0, 3).map(r => (
                                                    <span key={r.id} className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-300 border border-gray-700">
                                                        {r.emoji} {r.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* --- FOOTER (NAV) --- */}
                <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-between">
                    {step > 1 ? (
                        <CyberButton variant="ghost" onClick={() => setStep(s => s - 1)}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> ANTERIOR
                        </CyberButton>
                    ) : (
                        <div></div> // Spacer
                    )}

                    {step < 3 ? (
                        <CyberButton onClick={() => setStep(s => s + 1)}>
                            SIGUIENTE <ArrowRight className="w-4 h-4 ml-2" />
                        </CyberButton>
                    ) : (
                        <CyberButton variant="neural" onClick={handleFinish} className="px-8">
                            <Save className="w-4 h-4 mr-2" /> CREAR CAMPAÑA
                        </CyberButton>
                    )}
                </div>

                {/* --- UNSPLASH MODAL --- */}
                {showUnsplash && (
                    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-cyber font-bold text-white">BUSCAR EN UNSPLASH</h3>
                            <button onClick={() => setShowUnsplash(false)}><X className="w-6 h-6 text-gray-500 hover:text-white"/></button>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <CyberInput 
                                placeholder="Ej: Paisaje fantasía, Espacio, Cyberpunk city..." 
                                value={unsplashQuery}
                                onChange={(e) => setUnsplashQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchUnsplash()}
                            />
                            <CyberButton onClick={searchUnsplash} isLoading={loadingUnsplash}>BUSCAR</CyberButton>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 md:grid-cols-3 gap-2">
                            {unsplashResults.map((img: any) => (
                                <button 
                                    key={img.id} 
                                    onClick={() => selectUnsplashImage(img.urls.regular)}
                                    className="aspect-video relative group overflow-hidden rounded border border-gray-800 hover:border-cyan-500 transition-all"
                                >
                                    <img src={img.urls.small} className="w-full h-full object-cover" alt={img.alt_description} />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-gray-300 p-1 truncate">
                                        By {img.user.name}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            </CyberCard>
        </div>
    );
};
