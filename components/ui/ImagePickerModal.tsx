
import React, { useState, useRef } from 'react';
import { CyberButton, CyberCard, CyberInput } from './CyberUI';
import { X, Upload, Search, Link as LinkIcon, Image as ImageIcon, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import { searchStockImages, triggerDownload, ImageResult } from '../../services/imageService';
import { getSafeImageUrl } from '../../services/imageProxyService';

interface ImagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (result: ImageResult) => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'stock' | 'url'>('upload');
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    // Stock Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ImageResult[]>([]);
    
    // URL State
    const [urlInput, setUrlInput] = useState('');
    const [urlPreview, setUrlPreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // --- HANDLERS ---

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setLoading(true);
        try {
            const url = await uploadImageToCloudinary(file);
            onSelect({
                url,
                alt: file.name,
                attribution: null // User upload
            });
            onClose();
        } catch (e) {
            alert("Error al subir imagen.");
        } finally {
            setLoading(false);
        }
    };

    const handleStockSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const results = await searchStockImages(searchQuery);
            setSearchResults(results);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStockSelect = (img: ImageResult) => {
        // 1. Trigger the download event (Unsplash Compliance)
        if (img.attribution?.downloadLocation) {
            triggerDownload(img.attribution.downloadLocation);
        }
        // 2. Pass data back
        onSelect(img);
        onClose();
    };

    const handleUrlConfirm = () => {
        if (urlPreview) {
            onSelect({
                url: urlPreview,
                alt: "Linked Image",
                attribution: null // External URL, unknown rights
            });
            onClose();
        }
    };

    // --- DRAG & DROP ---
    const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]); };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <CyberCard className="w-full max-w-2xl border-cyan-500/50 flex flex-col max-h-[80vh] overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4 shrink-0">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <ImageIcon className="w-6 h-6" />
                        <h2 className="font-cyber font-bold text-lg">SELECTOR DE IMÁGENES</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4 shrink-0">
                    <button onClick={() => setActiveTab('upload')} className={`flex-1 py-2 text-xs font-bold font-mono rounded transition-colors flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50' : 'bg-black/40 text-gray-500 border border-transparent hover:border-gray-600'}`}>
                        <Upload className="w-4 h-4" /> SUBIR
                    </button>
                    <button onClick={() => setActiveTab('stock')} className={`flex-1 py-2 text-xs font-bold font-mono rounded transition-colors flex items-center justify-center gap-2 ${activeTab === 'stock' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50' : 'bg-black/40 text-gray-500 border border-transparent hover:border-gray-600'}`}>
                        <Search className="w-4 h-4" /> BUSCAR IMÁGENES
                    </button>
                    <button onClick={() => setActiveTab('url')} className={`flex-1 py-2 text-xs font-bold font-mono rounded transition-colors flex items-center justify-center gap-2 ${activeTab === 'url' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50' : 'bg-black/40 text-gray-500 border border-transparent hover:border-gray-600'}`}>
                        <LinkIcon className="w-4 h-4" /> URL
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative p-1">
                    
                    {/* 1. UPLOAD */}
                    {activeTab === 'upload' && (
                        <div 
                            className={`h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 transition-colors ${dragActive ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700 hover:border-gray-500'}`}
                            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        >
                            {loading ? (
                                <div className="text-center">
                                    <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
                                    <p className="font-mono text-cyan-400 animate-pulse">OPTIMIZANDO IMAGEN...</p>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-16 h-16 text-gray-600 mb-4" />
                                    <p className="text-gray-300 font-bold mb-2">ARRASTRA TU IMAGEN AQUÍ</p>
                                    <p className="text-xs text-gray-500 mb-6">o haz clic para explorar</p>
                                    <CyberButton onClick={() => fileInputRef.current?.click()} variant="secondary">SELECCIONAR ARCHIVO</CyberButton>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                                </>
                            )}
                        </div>
                    )}

                    {/* 2. STOCK SEARCH */}
                    {activeTab === 'stock' && (
                        <div className="h-full flex flex-col">
                            <div className="flex gap-2 mb-4">
                                <CyberInput 
                                    placeholder="Buscar imágenes (ej: Gatos, Espacio)..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleStockSearch()}
                                    className="text-sm"
                                />
                                <CyberButton onClick={handleStockSearch} isLoading={loading}>BUSCAR</CyberButton>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {loading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
                                ) : searchResults.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {searchResults.map((img, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => handleStockSelect(img)}
                                                className="aspect-video relative group overflow-hidden rounded border border-gray-800 hover:border-cyan-500 transition-all w-full text-left"
                                            >
                                                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                                                    <CheckCircle2 className="w-8 h-8 text-cyan-400" />
                                                </div>
                                                {/* Attribution Overlay - STRICT UNSPLASH COMPLIANCE */}
                                                {img.attribution && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-[9px] text-gray-300 leading-tight z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        {img.attribution.sourceName === 'Unsplash' ? (
                                                            <>
                                                                Photo by <span className="text-white font-bold">{img.attribution.authorName}</span> on <span className="text-white font-bold">Unsplash</span>
                                                            </>
                                                        ) : (
                                                            <span>{img.attribution.sourceName} / {img.attribution.authorName}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 text-gray-500 text-xs font-mono">
                                        Introduce un término para buscar imágenes libres de derechos (Unsplash, Pexels, Pixabay).
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. URL */}
                    {activeTab === 'url' && (
                        <div className="h-full flex flex-col items-center justify-center space-y-6">
                            <div className="w-full max-w-md space-y-4">
                                <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest">ENLACE DIRECTO A LA IMAGEN</label>
                                <CyberInput 
                                    placeholder="https://ejemplo.com/imagen.jpg" 
                                    value={urlInput}
                                    onChange={(e) => {
                                        setUrlInput(e.target.value);
                                        const safe = getSafeImageUrl(e.target.value);
                                        setUrlPreview(safe || e.target.value);
                                    }}
                                />
                                
                                {urlPreview && (
                                    <div className="mt-4 p-2 bg-black/40 border border-gray-700 rounded flex flex-col items-center">
                                        <p className="text-[10px] text-gray-500 mb-2 w-full text-left">VISTA PREVIA:</p>
                                        <img 
                                            src={urlPreview} 
                                            alt="Preview" 
                                            className="max-h-48 object-contain rounded"
                                            onError={() => setUrlPreview(null)}
                                        />
                                    </div>
                                )}

                                <CyberButton 
                                    onClick={handleUrlConfirm} 
                                    disabled={!urlPreview} 
                                    className="w-full"
                                >
                                    CONFIRMAR IMAGEN
                                </CyberButton>
                            </div>
                        </div>
                    )}
                </div>
            </CyberCard>
        </div>
    );
};
