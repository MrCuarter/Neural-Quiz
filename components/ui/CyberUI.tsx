
import React from 'react';
import { Loader2, Check } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'neural';
  isLoading?: boolean;
}

export const CyberButton: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', isLoading, ...props }) => {
  const baseStyle = "relative px-6 py-3 font-mono-cyber uppercase font-bold tracking-wider transition-all duration-200 clip-path-polygon group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-cyan-600 text-white hover:bg-cyan-500 border-2 border-transparent shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]",
    secondary: "bg-transparent text-cyan-400 border-2 border-cyan-500 hover:bg-cyan-950/40 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]",
    neural: "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] hover:scale-105",
    danger: "bg-transparent text-red-500 border-2 border-red-500 hover:bg-red-950/30 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
           <Loader2 className="animate-spin w-4 h-4" /> PROCESSING...
        </span>
      ) : (
        <>
          {children}
          {/* Decorative corner bits - hidden in classroom mode via CSS if needed, but subtle enough to keep */}
          {variant !== 'ghost' && (
            <>
              <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/30" />
              <span className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/30" />
            </>
          )}
        </>
      )}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const CyberInput: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-mono-cyber text-cyan-400/80 uppercase tracking-widest">{label}</label>}
      <input 
        className={`cyber-input bg-black/40 backdrop-blur-sm border border-gray-700 text-cyan-100 p-3 font-mono focus:border-cyan-500 focus:outline-none focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all placeholder:text-gray-600 rounded-sm ${className}`}
        {...props}
      />
    </div>
  );
};

interface SelectOption {
    value: string;
    label: string;
    options?: SelectOption[]; // For optgroup support
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const CyberSelect: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-mono-cyber text-cyan-400/80 uppercase tracking-widest">{label}</label>}
      <select 
        className={`cyber-select bg-black/40 backdrop-blur-sm border border-gray-700 text-cyan-100 p-3 font-mono focus:border-cyan-500 focus:outline-none focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all rounded-sm appearance-none ${className}`}
        {...props}
      >
        {options.map((opt: any) => (
          opt.options ? (
            <optgroup key={opt.label} label={opt.label} className="bg-gray-900 text-gray-400 font-bold">
              {opt.options.map((subOpt: any) => (
                <option key={subOpt.value} value={subOpt.value} className="bg-gray-900 text-gray-200 pl-4">
                  {subOpt.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={opt.value} value={opt.value} className="bg-gray-900 text-gray-200">
              {opt.label}
            </option>
          )
        ))}
      </select>
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const CyberTextArea: React.FC<TextAreaProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-mono-cyber text-cyan-400/80 uppercase tracking-widest">{label}</label>}
      <textarea 
        className={`cyber-textarea bg-black/40 backdrop-blur-sm border border-gray-700 text-cyan-100 p-3 font-mono focus:border-cyan-500 focus:outline-none focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] transition-all placeholder:text-gray-600 resize-y min-h-[100px] rounded-sm ${className}`}
        {...props}
      />
    </div>
  );
};

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  warning?: boolean;
}

export const CyberCheckbox: React.FC<CheckboxProps> = ({ label, checked, onChange, disabled, warning }) => {
  return (
    <label className={`flex items-center gap-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div 
        className={`w-5 h-5 border transition-all flex items-center justify-center ${
          checked 
            ? (warning ? 'bg-yellow-900/50 border-yellow-500' : 'bg-cyan-900/50 border-cyan-500')
            : 'bg-black/40 border-gray-700 group-hover:border-cyan-700'
        }`}
        onClick={() => !disabled && onChange(!checked)}
      >
        {checked && <Check className={`w-3 h-3 ${warning ? 'text-yellow-500' : 'text-cyan-400'}`} />}
      </div>
      <span className={`text-sm font-mono transition-colors ${checked ? (warning ? 'text-yellow-200' : 'text-cyan-100') : 'text-gray-400 group-hover:text-gray-300'}`}>
        {label}
      </span>
    </label>
  );
};

export const CyberProgressBar: React.FC<{ progress: number, text?: string }> = ({ progress, text }) => {
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs font-mono-cyber text-cyan-400 uppercase">
        <span>{text || 'PROCESSING'}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
        <div 
          className="h-full bg-gradient-to-r from-cyan-600 via-purple-500 to-pink-500 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const CyberCard: React.FC<CardProps> = ({ children, className = '', title, ...props }) => {
  return (
    <div className={`cyber-card relative bg-gray-950/60 border border-gray-800 p-4 md:p-6 backdrop-blur-md shadow-xl ${className}`} {...props}>
      {/* Tech Decorations - Hidden in classroom mode via CSS if conflicting */}
      <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t border-l border-cyan-500" />
      <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t border-r border-cyan-500" />
      <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b border-l border-cyan-500" />
      <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b border-r border-cyan-500" />
      
      {title && (
        <div className="absolute -top-3 left-6 bg-gray-950 px-2 border border-cyan-500/30 text-xs font-mono-cyber text-cyan-400 uppercase tracking-widest z-10">
          {title}
        </div>
      )}

      {children}
    </div>
  );
};
