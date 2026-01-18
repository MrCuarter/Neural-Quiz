
import React from 'react';
import { Linkedin, Instagram, Mail, Youtube } from 'lucide-react';

interface FooterProps {
  onPrivacy?: () => void;
  onTerms?: () => void;
}

// X (formerly Twitter) Logo Component
const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const Footer: React.FC<FooterProps> = ({ onPrivacy, onTerms }) => {
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
                 <a href="https://mistercuarter.es/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors uppercase">Política de Privacidad</a>
                 <span className="text-gray-700">|</span>
                 <a href="https://mistercuarter.es/condiciones" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors uppercase">Condiciones del Servicio</a>
              </div>
          </div>

          {/* REDES SOCIALES DERECHA */}
          <div className="flex items-center gap-6">
              
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest hidden md:block">SÍGUEME EN</span>
              
              <a href="https://x.com/MrCuarter" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" title="X (Twitter)">
                 <XLogo className="w-4 h-4" />
              </a>
              <a href="https://es.linkedin.com/in/norberto-cuartero-toledo-9279a813b" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400 transition-colors" title="LinkedIn">
                 <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://www.instagram.com/mrcuarter/?hl=es" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-400 transition-colors" title="Instagram">
                 <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.youtube.com/@mr.cuarter2770" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-500 transition-colors" title="YouTube">
                 <Youtube className="w-4 h-4" />
              </a>
              <a href="mailto:hola@mistercuarter.es" className="text-gray-500 hover:text-white transition-colors" title="Email">
                 <Mail className="w-4 h-4" />
              </a>
          </div>
       </div>
    </footer>
  );
};
