
import React from 'react';
import { Quiz } from '../../types';
import { CyberCard, CyberButton } from '../ui/CyberUI';
import { CheckCircle2, Globe, User, Calendar, Hash, ArrowRight, X, Lock } from 'lucide-react';

interface SaveSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPublishRequest: () => void;
    quiz: Quiz;
    user: any;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({ isOpen, onClose, onPublishRequest, quiz, user }) => {
    if (!isOpen) return null;

    const authorName = user?.displayName || "Usuario";
    const dateStr = new Date().toLocaleDateString();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <CyberCard className="w-full max-w-2xl border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.2)] relative overflow-hidden">
                
                {/* Background FX */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>

                {/* Header */}
                <div className="text-center mb-8 pt-4">
                    <div className="inline-flex items-center justify-center p-3 bg-green-900/30 rounded-full border border-green-500/50 mb-4 shadow-[0_0_20px_rgba(34,197,94,0.3)] animate-bounce">
                        <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-3xl font-black font-cyber text-white mb-2">¡GUARDADO EN TU COLECCIÓN!</h2>
                    <p className="text-gray-400 font-mono text-sm">Tu quiz está seguro en tu librería privada.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    
                    {/* Left: The Pitch */}
                    <div className="flex-1 space-y-4">
                        <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl">
                            <h3 className="text-purple-300 font-bold font-cyber mb-2 flex items-center gap-2">
                                <Globe className="w-5 h-5" /> EXPADE EL CONOCIMIENTO
                            </h3>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                ¿Sabías que otros profesores podrían usar tu material? Publicar en la comunidad ayuda a miles de docentes y estudiantes.
                            </p>
                        </div>
                        <ul className="text-xs text-gray-400 space-y-2 font-mono ml-2">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-cyan-500"/> Tu nombre aparecerá como autor.</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-cyan-500"/> Gana reconocimiento en el ranking.</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-cyan-500"/> Siempre puedes borrarlo después.</li>
                        </ul>
                    </div>

                    {/* Right: The Preview Card */}
                    <div className="w-full md:w-72">
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2 text-center">VISTA PREVIA EN COMUNIDAD</p>
                        
                        {/* MOCK COMMUNITY CARD */}
                        <div className="bg-black/60 border border-cyan-500/50 rounded-xl p-4 shadow-xl transform rotate-2 hover:rotate-0 transition-transform duration-500 cursor-default relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-50"></div>
                            
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <h3 className="font-bold font-cyber text-white line-clamp-2 text-sm">{quiz.title}</h3>
                                <Globe className="w-4 h-4 text-cyan-500" />
                            </div>
                            
                            <p className="text-xs text-gray-400 font-mono line-clamp-2 min-h-[32px] mb-3 relative z-10">
                                {quiz.description || "Sin descripción..."}
                            </p>

                            <div className="flex flex-wrap gap-1 mb-3 relative z-10">
                                {(quiz.tags || ['Educación']).slice(0, 2).map(tag => (
                                    <span key={tag} className="text-[9px] bg-cyan-950/50 border border-cyan-700/50 px-1.5 py-0.5 rounded text-cyan-200 flex items-center gap-1">
                                        <Hash className="w-2 h-2" /> {tag}
                                    </span>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-2 text-[9px] text-gray-500 border-t border-gray-700 pt-2 relative z-10">
                                <span className="flex items-center gap-1"><User className="w-2 h-2"/> {authorName}</span>
                                <span className="flex items-center gap-1 ml-auto"><Calendar className="w-2 h-2"/> {dateStr}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex gap-4 border-t border-gray-800 pt-6">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 text-xs font-bold hover:bg-gray-800 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Lock className="w-4 h-4" /> MANTENER PRIVADO
                    </button>
                    <CyberButton 
                        onClick={onPublishRequest} 
                        variant="neural" 
                        className="flex-1 text-sm h-auto py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 border-none"
                    >
                        PUBLICAR AHORA <ArrowRight className="w-4 h-4 ml-2" />
                    </CyberButton>
                </div>

                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <X className="w-6 h-6" />
                </button>

            </CyberCard>
        </div>
    );
};
