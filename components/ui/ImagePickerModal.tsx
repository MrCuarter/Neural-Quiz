
import React, { useState, useRef, useEffect } from 'react';
import { CyberButton, CyberCard, CyberInput } from './CyberUI';
import { X, Upload, Search, Link as LinkIcon, Image as ImageIcon, Loader2, CheckCircle2, ExternalLink, Maximize2, Trash2, Film } from 'lucide-react';
import { uploadImageToCloudinary } from '../../services/cloudinaryService';
import { searchStockImages, searchGifs, triggerDownload, ImageResult } from '../../services/imageService';
import { getSafeImageUrl } from '../../services/imageProxyService';
import { ImageCredit } from '../../types';

interface ImagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (result: ImageResult) => void;
    initialUrl?: string;
    initialCredit?: ImageCredit; // NEW PROP
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ isOpen, onClose, onSelect, initialUrl, initialCredit }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'stock' | 'giphy' | 'url'>('upload');
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    
    // Stock Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ImageResult[]>([]);
    
    // URL State
    const [urlInput, setUrlInput] = useState('');
    const [urlPreview, setUrlPreview] = useState<string | null>(null);
    const [currentCredit, setCurrentCredit] = useState<ImageCredit | undefined | null>(null);

    // Fullscreen Preview State
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset or Initialize when opening
    useEffect(() => {
        if (isOpen) {
            // If we have an initial URL, pre-fill the URL tab inputs
            if (initialUrl) {
                setUrlInput(initialUrl);
                setUrlPreview(getSafeImageUrl(initialUrl) || initialUrl);
                setCurrentCredit(initialCredit); // SET CREDIT
            } else {
                setUrlInput('');
                setUrlPreview(null);
                setCurrentCredit(null);
            }
            
            // Reset other states
            setSearchResults([]);
            setSearchQuery('');
            setActiveTab('upload');
            setIsFullscreen(false);
        }
    }, [isOpen, initialUrl, initialCredit]);

    if (!isOpen) return null;

    // --- HANDLERS ---

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setLoading(true);
        try {
            const url = await uploadImageToCloudinary(file);
            // Auto-select on upload success
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

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            let results: ImageResult[] = [];
            if (activeTab === 'stock') {
                results = await searchStockImages(searchQuery);
            } else if (activeTab === 'giphy') {
                results = await searchGifs(searchQuery);
            }
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

    const handleDeletePreview = () => {
        setUrlPreview(null);
        setUrlInput('');
        setCurrentCredit(null);
    };

    // --- DRAG & DROP ---
    const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]); };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            
            {/* FULLSCREEN OVERLAY */}
            {isFullscreen && urlPreview && (
                <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center p-4" onClick={() => setIsFullscreen(false)}>
                    <img src={urlPreview} className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 text-white hover:text-red-500 bg-black/50 rounded-full p-2" onClick={() => setIsFullscreen(false)}>
                        <X className="w-8 h-8" />
                    </button>
                </div>
            )}

            <CyberCard className="w-full max-w-2xl border-cyan-500/50 flex flex-col max-h-[85vh] overflow-hidden relative">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4 shrink-0">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <ImageIcon className="w-6 h-6" />
                        <h2 className="font-cyber font-bold text-lg">SELECTOR DE IMÁGENES</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto">
                    <button onClick={() => setActiveTab('upload')} className={`flex-1 py-2 px-3 text-xs font-bold font-mono rounded transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'upload' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50' : 'bg-black/40 text-gray-500 border border-transparent hover:border-gray-600'}`}>
                        <Upload className="w-4 h-4" /> SUBIR / ACTUAL
                    </button>
                    <button onClick={() => { setActiveTab('stock'); setSearchResults([]); setSearchQuery(''); }} className={`flex-1 py-2 px-3 text-xs font-bold font-mono rounded transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'stock' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50' : 'bg-black/40 text-gray-500 border border-transparent hover:border-gray-600'}`}>
                        <Search className="w-4 h-4" /> BUSCAR IMAGEN
                    </button>
                    <button onClick={() => { setActiveTab('giphy'); setSearchResults([]); setSearchQuery(''); }} className={`flex-1 py-2 px-3 text-xs font-bold font-mono rounded transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'giphy' ? 'bg-purple-900/50 text-purple-400 border border-purple-500/50' : 'bg-black/40 text-gray-500 border border-transparent hover:border-gray-600'}`}>
                        <Film className="w-4 h-4" /> BUSCAR GIF
                    </button>
                    <button onClick={() => setActiveTab('url')} className={`flex-1 py-2 px-3 text-xs font-bold font-mono rounded transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'url' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50' : 'bg-black/40 text-gray-500 border border-transparent hover:border-gray-600'}`}>
                        <LinkIcon className="w-4 h-4" /> URL
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative p-1 min-h-[350px]">
                    
                    {/* 1. UPLOAD TAB (Handles Current Image & New Uploads) */}
                    {activeTab === 'upload' && (
                        urlPreview ? (
                            <div className="h-full flex flex-col items-center justify-center p-2 animate-in fade-in">
                                <div className="relative group w-full h-full max-h-[300px] flex items-center justify-center bg-black/40 border border-gray-700 rounded-lg overflow-hidden">
                                    <img src={urlPreview} className="max-w-full max-h-full object-contain" alt="Preview" />
                                    
                                    {/* CREDIT OVERLAY */}
                                    {currentCredit && (
                                        <div className="absolute top-0 left-0 right-0 bg-black/70 text-white p-2 text-xs font-mono z-10 flex justify-between items-center pointer-events-auto">
                                            <span>
                                                {currentCredit.source === 'Unsplash' ? 'Photo by ' : 'Image by '}
                                                <a href={currentCredit.link} target="_blank" rel="noreferrer" className="underline font-bold text-cyan-400 hover:text-white">
                                                    {currentCredit.name}
                                                </a>
                                                {' on ' + currentCredit.source}
                                            </span>
                                        </div>
                                    )}

                                    {/* Overlay Controls */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button 
                                            onClick={() => setIsFullscreen(true)}
                                            className="p-3 bg-gray-800 rounded-full hover:bg-cyan-600 text-white transition-colors"
                                            title="Ver pantalla completa"
                                        >
                                            <Maximize2 className="w-6 h-6" />
                                        </button>
                                        <button 
                                            onClick={handleDeletePreview}
                                            className="p-3 bg-gray-800 rounded-full hover:bg-red-600 text-white transition-colors"
                                            title="Eliminar imagen"
                                        >
                                            <Trash2 className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-3 w-full">
                                    <CyberButton onClick={handleUrlConfirm} className="flex-1">CONFIRMAR ESTA IMAGEN</CyberButton>
                                    <CyberButton variant="secondary" onClick={handleDeletePreview}>CAMBIAR</CyberButton>
                                </div>
                            </div>
                        ) : (
                            <div 
                                className={`h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 transition-colors ${dragActive ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700 hover:border-gray-500'}`}
                                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                            >
                                {loading ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
                                        <p className="font-mono text-cyan-400 animate-pulse">PROCESANDO IMAGEN...</p>
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
                        )
                    )}

                    {/* 2. STOCK SEARCH OR GIF SEARCH */}
                    {(activeTab === 'stock' || activeTab === 'giphy') && (
                        <div className="h-full flex flex-col">
                            <div className="flex gap-2 mb-4">
                                <CyberInput 
                                    placeholder={activeTab === 'stock' ? "Buscar imágenes (ej: Gatos, Espacio)..." : "Buscar GIFs (ej: Aplausos, Fail)..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="text-sm"
                                />
                                <CyberButton onClick={handleSearch} isLoading={loading}>BUSCAR</CyberButton>
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
                                                className={`aspect-video relative group overflow-hidden rounded border border-gray-800 hover:border-cyan-500 transition-all w-full text-left ${activeTab === 'giphy' ? 'border-purple-900/50 hover:border-purple-500' : ''}`}
                                            >
                                                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                                                    <CheckCircle2 className={`w-8 h-8 ${activeTab === 'giphy' ? 'text-purple-400' : 'text-cyan-400'}`} />
                                                </div>
                                                {/* Attribution Overlay */}
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
                                        {activeTab === 'stock' 
                                            ? "Introduce un término para buscar imágenes libres de derechos (Unsplash, Pexels, Pixabay)."
                                            : "Introduce un término para buscar GIFs en Giphy."
                                        }
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
