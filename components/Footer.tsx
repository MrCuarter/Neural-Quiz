
import React from 'react';
import { Twitter, Linkedin, Instagram, Mail } from 'lucide-react';

interface FooterProps {
  onPrivacy?: () => void;
  onTerms?: () => void;
}

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
                 <button onClick={onPrivacy} className="hover:text-cyan-400 transition-colors uppercase">Política de Privacidad</button>
                 <span className="text-gray-700">|</span>
                 <button onClick={onTerms} className="hover:text-pink-400 transition-colors uppercase">Condiciones del Servicio</button>
              </div>
          </div>

          {/* REDES SOCIALES DERECHA */}
          <div className="flex items-center gap-6">
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
