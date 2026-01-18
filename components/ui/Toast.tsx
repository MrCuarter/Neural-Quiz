
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Component
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const helpers = {
      success: (msg: string, dur?: number) => addToast(msg, 'success', dur),
      error: (msg: string, dur?: number) => addToast(msg, 'error', dur),
      warning: (msg: string, dur?: number) => addToast(msg, 'warning', dur),
      info: (msg: string, dur?: number) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, ...helpers }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-md shadow-lg border backdrop-blur-md min-w-[300px] max-w-sm animate-in slide-in-from-right-10 fade-in duration-300
              ${toast.type === 'success' ? 'bg-green-950/80 border-green-500 text-green-100' : ''}
              ${toast.type === 'error' ? 'bg-red-950/80 border-red-500 text-red-100' : ''}
              ${toast.type === 'warning' ? 'bg-yellow-950/80 border-yellow-500 text-yellow-100' : ''}
              ${toast.type === 'info' ? 'bg-blue-950/80 border-blue-500 text-blue-100' : ''}
            `}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="flex-1 text-sm font-mono leading-relaxed">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
