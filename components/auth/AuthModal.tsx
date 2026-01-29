
import React, { useState } from 'react';
import { CyberCard, CyberButton, CyberInput } from '../ui/CyberUI';
import { X, Mail, Key, LogIn, UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import { signInWithGoogle, loginWithEmail, registerWithEmail, resetPassword } from '../../services/firebaseService';
import { useToast } from '../ui/Toast';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'RESET';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState<AuthMode>('LOGIN');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    
    const toast = useToast();

    if (!isOpen) return null;

    const translateError = (code: string) => {
        if (code.includes('auth/invalid-email')) return "El formato del correo no es válido.";
        if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) return "Credenciales incorrectas.";
        if (code.includes('auth/email-already-in-use')) return "Este correo ya está registrado.";
        if (code.includes('auth/weak-password')) return "La contraseña debe tener al menos 6 caracteres.";
        return "Error de autenticación. Inténtalo de nuevo.";
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setErrorMsg("");
        try {
            await signInWithGoogle();
            onClose();
            toast.success("¡Bienvenido al sistema!");
        } catch (e: any) {
            setErrorMsg(translateError(e.code || ""));
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            if (mode === 'LOGIN') {
                await loginWithEmail(email, password);
                toast.success("Sesión iniciada correctamente.");
                onClose();
            } else if (mode === 'REGISTER') {
                await registerWithEmail(email, password);
                toast.success("Cuenta creada. ¡Bienvenido!");
                onClose();
            } else if (mode === 'RESET') {
                await resetPassword(email);
                toast.info("Correo de recuperación enviado. Revisa tu bandeja.");
                setMode('LOGIN');
            }
        } catch (err: any) {
            setErrorMsg(translateError(err.code || ""));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <CyberCard className="w-full max-w-md border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)] p-8">
                
                {/* Header */}
                <div className="text-center mb-8 relative">
                    <button onClick={onClose} className="absolute -top-4 -right-4 text-gray-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <h2 className="text-3xl font-black font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
                        {mode === 'LOGIN' ? 'ACCESO DOCENTE' : mode === 'REGISTER' ? 'NUEVO REGISTRO' : 'RECUPERAR ACCESO'}
                    </h2>
                    <p className="text-gray-400 font-mono text-xs mt-2 uppercase tracking-widest">NEURAL QUIZ SYSTEM v2.0</p>
                </div>

                {/* Google Button (Only for Login/Register) */}
                {mode !== 'RESET' && (
                    <>
                        <button 
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-all shadow-lg mb-6 group"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 group-hover:scale-110 transition-transform" alt="Google" />
                            <span>Continuar con Google</span>
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-px bg-gray-800 flex-1"></div>
                            <span className="text-gray-500 text-xs font-mono">O</span>
                            <div className="h-px bg-gray-800 flex-1"></div>
                        </div>
                    </>
                )}

                {/* Email Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-mono text-cyan-400 uppercase">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-cyan-500 outline-none transition-all"
                                placeholder="profesor@escuela.com"
                            />
                        </div>
                    </div>

                    {mode !== 'RESET' && (
                        <div className="space-y-1">
                            <label className="text-xs font-mono text-cyan-400 uppercase">Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                <input 
                                    type="password" 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-cyan-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/30 p-2 rounded border border-red-500/30">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {errorMsg}
                        </div>
                    )}

                    <CyberButton 
                        type="submit" 
                        isLoading={isLoading} 
                        className={`w-full h-12 text-sm ${mode === 'RESET' ? 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400' : ''}`}
                    >
                        {mode === 'LOGIN' && <><LogIn className="w-4 h-4 mr-2" /> INICIAR SESIÓN</>}
                        {mode === 'REGISTER' && <><UserPlus className="w-4 h-4 mr-2" /> CREAR CUENTA</>}
                        {mode === 'RESET' && 'ENVIAR ENLACE'}
                    </CyberButton>
                </form>

                {/* Footer Links */}
                <div className="mt-6 text-center space-y-3">
                    {mode === 'LOGIN' && (
                        <>
                            <button onClick={() => setMode('RESET')} className="text-xs text-gray-500 hover:text-cyan-400 underline decoration-gray-700 hover:decoration-cyan-400 transition-all">
                                ¿Olvidaste tu contraseña?
                            </button>
                            <p className="text-xs text-gray-400">
                                ¿No tienes cuenta? <button onClick={() => setMode('REGISTER')} className="text-cyan-400 font-bold hover:text-white ml-1">Regístrate</button>
                            </p>
                        </>
                    )}

                    {mode === 'REGISTER' && (
                        <p className="text-xs text-gray-400">
                            ¿Ya tienes cuenta? <button onClick={() => setMode('LOGIN')} className="text-cyan-400 font-bold hover:text-white ml-1">Inicia sesión</button>
                        </p>
                    )}

                    {mode === 'RESET' && (
                        <button onClick={() => setMode('LOGIN')} className="flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-white mx-auto">
                            <ArrowLeft className="w-3 h-3" /> Volver al login
                        </button>
                    )}
                </div>

            </CyberCard>
        </div>
    );
};
