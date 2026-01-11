
import React from 'react';
import { Twitter, Linkedin, Instagram, Mail, Image as ImageIcon } from 'lucide-react';

interface FooterProps {
  onPrivacy?: () => void;
  onTerms?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onPrivacy, onTerms }) => {
  
  const handleDownloadLogo = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background (Transparent)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Font setup
    ctx.font = 'bold 60px "Orbitron", sans-serif';
    
    // Draw "NEURAL"
    ctx.fillStyle = '#ffffff';
    ctx.fillText('NEURAL', 20, 90);
    
    // Draw "_QUIZ"
    const neuralWidth = ctx.measureText('NEURAL').width;
    ctx.fillStyle = '#22d3ee'; // Cyan-400
    ctx.fillText('_QUIZ', 20 + neuralWidth, 90);
    
    // Subtitle
    ctx.font = '20px "Share Tech Mono", monospace';
    ctx.fillStyle = '#9ca3af'; // Gray-400
    ctx.letterSpacing = "4px";
    ctx.fillText('UNIVERSAL CONVERTER SYSTEM', 24, 125);

    // Export
    const link = document.createElement('a');
    link.download = 'Neural_Quiz_Logo.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <footer className="border-t border-gray-800 bg-[#06090f] py-8 mt-auto relative z-30">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* CRÉDITOS IZQUIERDA */}
          <div className="text-left space-y-2">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Built with Google AI Studio</p>
                <p className="text-xs font-mono font-bold text-gray-400">Designed by Norberto Cuartero</p>
              </div>
              
              {/* Legal Links */}
              <div className="flex gap-4 text-[10px] font-mono text-gray-600">
                 <button onClick={onPrivacy} className="hover:text-cyan-400 transition-colors uppercase">Política de Privacidad</button>
                 <span className="text-gray-700">|</span>
                 <button onClick={onTerms} className="hover:text-pink-400 transition-colors uppercase">Condiciones del Servicio</button>
              </div>
          </div>

          {/* REDES SOCIALES DERECHA */}
          <div className="flex items-center gap-6">
              
              {/* Download Logo Button */}
              <button 
                onClick={handleDownloadLogo}
                className="flex items-center gap-2 text-[10px] font-mono text-gray-500 hover:text-cyan-400 transition-colors uppercase tracking-widest group mr-4"
                title="Descargar Logo PNG"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline group-hover:underline">Logo</span>
              </button>

              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest hidden md:block">SÍGUEME EN</span>
              
              <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors" title="Twitter / X">
                 <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors" title="LinkedIn">
                 <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="text-gray-500 hover:text-pink-400 transition-colors" title="Instagram">
                 <Instagram className="w-4 h-4" />
              </a>
              <a href="mailto:contact@mistercuarter.es" className="text-gray-500 hover:text-white transition-colors" title="Email">
                 <Mail className="w-4 h-4" />
              </a>
          </div>
       </div>
    </footer>
  );
};
