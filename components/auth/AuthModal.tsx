import React, { useState } from 'react';
import { CyberCard, CyberButton, CyberInput } from '../ui/CyberUI';
import { Mail, Lock, User, X, Loader2, LogIn } from 'lucide-react';
import { signInWithGoogle, loginWithEmail, registerWithEmail } from '../../services/firebaseService';
import { useToast } from '../ui/Toast';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
            toast.success("¡Bienvenido al sistema!");
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!email || !password) throw new Error("Completa todos los campos.");
            
            if (mode === 'REGISTER') {
                if (!name) throw new Error("El nombre es obligatorio.");
                await registerWithEmail(email, password, name);
                toast.success("Cuenta creada. ¡Bienvenido!");
            } else {
                await loginWithEmail(email, password);
                toast.success("Sesión iniciada.");
            }
            onClose();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <CyberCard className="w-full max-w-md border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.2)] bg-black/80 relative">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-cyber font-bold text-white tracking-widest">
                        NEURAL<span className="text-cyan-400">_ID</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Google Login (Highlighted) */}
                <button 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-bold py-3 rounded-md transition-all mb-6 group disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    )}
                    <span>Continuar con Google</span>
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-2 text-gray-500 font-mono">O mediante credenciales</span></div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'REGISTER' && (
                        <div className="space-y-1 animate-in slide-in-from-left-2">
                            <label className="text-xs font-mono text-cyan-400">NOMBRE DE DOCENTE</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                <input 
                                    type="text" 
                                    className="w-full bg-black/50 border border-gray-700 rounded p-2.5 pl-10 text-white focus:border-cyan-500 outline-none text-sm"
                                    placeholder="Ej: Profe Juan"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-mono text-cyan-400">CORREO ELECTRÓNICO</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="email" 
                                className="w-full bg-black/50 border border-gray-700 rounded p-2.5 pl-10 text-white focus:border-cyan-500 outline-none text-sm"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-mono text-cyan-400">CONTRASEÑA</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input 
                                type="password" 
                                className="w-full bg-black/50 border border-gray-700 rounded p-2.5 pl-10 text-white focus:border-cyan-500 outline-none text-sm"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <CyberButton 
                        type="submit" 
                        isLoading={isLoading} 
                        className="w-full mt-4 bg-cyan-700 hover:bg-cyan-600 border-none"
                    >
                        {mode === 'LOGIN' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'} <LogIn className="w-4 h-4 ml-2" />
                    </CyberButton>
                </form>

                {/* Toggle Mode */}
                <div className="mt-6 text-center text-sm font-mono text-gray-400">
                    {mode === 'LOGIN' ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                    <button 
                        onClick={() => {
                            setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                        }}
                        className="text-cyan-400 hover:text-white underline decoration-cyan-500/50"
                    >
                        {mode === 'LOGIN' ? "Regístrate aquí" : "Inicia Sesión"}
                    </button>
                </div>

            </CyberCard>
        </div>
    );
};