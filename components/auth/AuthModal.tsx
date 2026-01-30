
import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { signInWithGoogle, registerWithEmail, loginWithEmail } from '../../services/firebaseService';
import { CyberButton, CyberCard } from '../ui/CyberUI';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    if (!isOpen) return null;

    const resetForm = () => {
        setError(null);
        setEmail('');
        setPassword('');
        setName('');
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!email || !password) {
            setError("Por favor completa todos los campos.");
            setLoading(false);
            return;
        }

        if (mode === 'register' && !name) {
            setError("El nombre es obligatorio para el registro.");
            setLoading(false);
            return;
        }

        try {
            if (mode === 'register') {
                await registerWithEmail(email, password, name);
            } else {
                await loginWithEmail(email, password);
            }
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(prev => prev === 'login' ? 'register' : 'login');
        resetForm();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <CyberCard className="w-full max-w-md border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative overflow-hidden bg-[#0a0a0a]">
                
                {/* Decorative Background FX */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-2xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
                        {mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded flex items-start gap-2 text-xs text-red-200 animate-in slide-in-from-top-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* GOOGLE LOGIN (Featured) */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-3 bg-white text-black font-bold rounded flex items-center justify-center gap-3 hover:bg-gray-200 transition-all mb-6 relative group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />
                    <span>Continuar con Google</span>
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-gray-800 flex-1"></div>
                    <span className="text-[10px] text-gray-500 font-mono uppercase">O usa tu correo</span>
                    <div className="h-px bg-gray-800 flex-1"></div>
                </div>

                {/* EMAIL FORM */}
                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                    {mode === 'register' && (
                        <div className="space-y-1">
                            <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Nombre</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                <input 
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-700 rounded p-2.5 pl-10 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                                    placeholder="Tu nombre"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded p-2.5 pl-10 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                                placeholder="usuario@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded p-2.5 pl-10 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <CyberButton 
                        type="submit" 
                        isLoading={loading} 
                        className="w-full mt-4 bg-gradient-to-r from-cyan-900 to-blue-900 border-cyan-500 hover:border-white"
                    >
                        {mode === 'login' ? 'ENTRAR AL SISTEMA' : 'CREAR CUENTA'} <ArrowRight className="w-4 h-4 ml-2" />
                    </CyberButton>
                </form>

                {/* Footer Toggle */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-400">
                        {mode === 'login' ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                        <button 
                            onClick={toggleMode} 
                            className="text-cyan-400 hover:text-white font-bold underline decoration-cyan-500/30 hover:decoration-white transition-all"
                        >
                            {mode === 'login' ? "Regístrate aquí" : "Inicia Sesión"}
                        </button>
                    </p>
                </div>

            </CyberCard>
        </div>
    );
};
