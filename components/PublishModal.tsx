
import React, { useState, useEffect } from 'react';
import { CyberCard, CyberButton, CyberInput } from './ui/CyberUI';
import { Share2, X, Hash, Globe, Loader2, CheckCircle2 } from 'lucide-react';

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tags: string[]) => void;
    initialTags: string[];
    isPublishing: boolean;
}

export const PublishModal: React.FC<PublishModalProps> = ({ 
    isOpen, onClose, onConfirm, initialTags, isPublishing 
}) => {
    const [tags, setTags] = useState<string[]>([]);
    const [currentInput, setCurrentInput] = useState("");

    useEffect(() => {
        if (isOpen) {
            setTags(initialTags);
        }
    }, [isOpen, initialTags]);

    const addTag = () => {
        const val = currentInput.trim().toLowerCase();
        if (val && !tags.includes(val)) {
            setTags([...tags, val]);
            setCurrentInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <CyberCard className="w-full max-w-lg border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                {/* Header */}
                <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3 text-cyan-400">
                        <Globe className="w-6 h-6" />
                        <div>
                            <h2 className="text-xl font-cyber font-bold">PUBLICAR EN COMUNIDAD</h2>
                            <p className="text-[10px] text-gray-400 font-mono">COMPARTE TU CONOCIMIENTO CON EL MUNDO</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isPublishing} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    <div className="bg-blue-900/20 p-4 rounded border border-blue-500/30">
                        <p className="text-sm text-blue-200 font-mono flex items-start gap-2">
                            <Share2 className="w-4 h-4 mt-0.5 shrink-0" />
                            Tu quiz será visible públicamente. La IA ha sugerido estas etiquetas para facilitar su búsqueda.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
                            ETIQUETAS INTELIGENTES (SMART TAGS)
                        </label>
                        
                        <div className="flex flex-wrap gap-2 mb-3 bg-black/40 p-3 rounded border border-gray-800 min-h-[50px]">
                            {tags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 bg-cyan-950 text-cyan-300 text-xs px-2 py-1 rounded border border-cyan-700">
                                    <Hash className="w-3 h-3" /> {tag}
                                    <button onClick={() => removeTag(tag)} className="hover:text-white ml-1"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                            {tags.length === 0 && <span className="text-gray-600 text-xs italic">Añade etiquetas...</span>}
                        </div>

                        <div className="flex gap-2">
                            <CyberInput 
                                value={currentInput}
                                onChange={(e) => setCurrentInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe nueva etiqueta y pulsa Enter..."
                                className="text-xs"
                            />
                            <CyberButton onClick={addTag} variant="secondary" className="h-full px-4">+</CyberButton>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-800">
                    <CyberButton variant="ghost" onClick={onClose} disabled={isPublishing}>
                        CANCELAR
                    </CyberButton>
                    <CyberButton 
                        onClick={() => onConfirm(tags)} 
                        isLoading={isPublishing}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-none"
                    >
                        {isPublishing ? 'PUBLICANDO...' : <><CheckCircle2 className="w-4 h-4 mr-2" /> CONFIRMAR PUBLICACIÓN</>}
                    </CyberButton>
                </div>
            </CyberCard>
        </div>
    );
};
