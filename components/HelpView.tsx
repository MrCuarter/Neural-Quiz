
import React, { useState } from 'react';
import { CyberButton, CyberCard } from './ui/CyberUI';
import { ArrowLeft, BookOpen, Terminal, HelpCircle, FileQuestion, Globe, FileText, Cpu, User, Hash, ChevronsDown } from 'lucide-react';

interface HelpViewProps {
  onBack: () => void;
  t: any;
}

export const HelpView: React.FC<HelpViewProps> = ({ onBack, t }) => {
  const [tab, setTab] = useState<'guide' | 'howto'>('guide');

  const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500">
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
         <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2 self-start sm:self-center">
            <ArrowLeft className="w-4 h-4" /> {t.back}
         </CyberButton>
         <div className="flex bg-black/40 rounded border border-gray-800 p-1 w-full sm:w-auto justify-center">
            <button 
                onClick={() => setTab('guide')}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-mono font-bold rounded transition-colors flex items-center justify-center gap-2 ${tab === 'guide' ? 'bg-cyan-950 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <BookOpen className="w-4 h-4" /> {t.guide_title.split(' ')[0]}...
            </button>
            <button 
                onClick={() => setTab('howto')}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-mono font-bold rounded transition-colors flex items-center justify-center gap-2 ${tab === 'howto' ? 'bg-pink-950 text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <Terminal className="w-4 h-4" /> {t.how_to_title.split(' ')[0]}...
            </button>
         </div>
       </div>

       {tab === 'guide' ? (
           <div className="space-y-12 pb-20">
               {/* Header / Intro */}
               <div className="text-center space-y-4 py-8">
                   <h2 className="text-4xl md:text-5xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-500 uppercase">
                       {t.guide_title}
                   </h2>
               </div>

               {/* TABLE OF CONTENTS (INDEX) */}
               <CyberCard className="bg-black/40 border-gray-700">
                   <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                       <Hash className="w-5 h-5 text-cyan-400" />
                       <span className="font-mono-cyber text-cyan-400 font-bold">{t.guide_index}</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <button onClick={() => scrollToSection('sec-mission')} className="text-left p-3 rounded border border-gray-800 hover:bg-cyan-950/20 hover:border-cyan-500/50 transition-all group">
                           <span className="text-xs text-gray-500 block group-hover:text-cyan-400">01</span>
                           <span className="font-mono font-bold text-gray-300 group-hover:text-white">{t.guide_sec_intro}</span>
                       </button>
                       <button onClick={() => scrollToSection('sec-philosophy')} className="text-left p-3 rounded border border-gray-800 hover:bg-purple-950/20 hover:border-purple-500/50 transition-all group">
                           <span className="text-xs text-gray-500 block group-hover:text-purple-400">02</span>
                           <span className="font-mono font-bold text-gray-300 group-hover:text-white">{t.guide_sec_phil}</span>
                       </button>
                       <button onClick={() => scrollToSection('sec-mechanics')} className="text-left p-3 rounded border border-gray-800 hover:bg-pink-950/20 hover:border-pink-500/50 transition-all group">
                           <span className="text-xs text-gray-500 block group-hover:text-pink-400">03</span>
                           <span className="font-mono font-bold text-gray-300 group-hover:text-white">{t.guide_sec_mech}</span>
                       </button>
                   </div>
               </CyberCard>

               {/* SECTIONS */}
               <div id="sec-mission" className="space-y-6 pt-8 scroll-mt-24">
                   <div className="flex items-center gap-4 text-cyan-400 border-b border-cyan-500/30 pb-2">
                        <Cpu className="w-8 h-8" />
                        <h3 className="text-2xl font-cyber">{t.guide_sec_intro}</h3>
                   </div>
                   <CyberCard className="bg-cyan-950/10 border-cyan-500/30">
                       <p className="text-gray-300 text-lg leading-relaxed font-mono">{t.guide_intro}</p>
                       <div className="mt-4 p-4 bg-black/40 rounded border-l-4 border-cyan-500 text-gray-400 italic">
                           "{t.guide_p1}"
                       </div>
                   </CyberCard>
               </div>

               <div id="sec-philosophy" className="space-y-6 pt-8 scroll-mt-24">
                   <div className="flex items-center gap-4 text-purple-400 border-b border-purple-500/30 pb-2">
                        <Globe className="w-8 h-8" />
                        <h3 className="text-2xl font-cyber">{t.guide_sec_phil}</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CyberCard className="bg-purple-950/10 border-purple-500/30">
                            <p className="text-gray-300 text-sm leading-relaxed">{t.guide_p2}</p>
                        </CyberCard>
                        <div className="flex items-center justify-center">
                            <ArrowRightLeft className="w-16 h-16 text-purple-500 opacity-50 animate-pulse" />
                        </div>
                   </div>
               </div>

               <div id="sec-mechanics" className="space-y-6 pt-8 scroll-mt-24">
                   <div className="flex items-center gap-4 text-pink-400 border-b border-pink-500/30 pb-2">
                        <User className="w-8 h-8" />
                        <h3 className="text-2xl font-cyber">{t.guide_sec_mech}</h3>
                   </div>
                   <CyberCard className="bg-pink-950/10 border-pink-500/30">
                       <p className="text-gray-300 text-sm leading-relaxed">{t.guide_p3}</p>
                   </CyberCard>
               </div>

               <div className="flex justify-center pt-8">
                   <CyberButton variant="ghost" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                       <ChevronsDown className="w-4 h-4 rotate-180" /> TOP
                   </CyberButton>
               </div>
           </div>
       ) : (
           <div className="grid gap-6">
                <h2 className="text-3xl font-cyber text-pink-400 border-b border-gray-800 pb-4">{t.how_to_title}</h2>
                
                <div className="bg-black/40 border border-gray-800 p-6 rounded-lg hover:border-pink-500/50 transition-colors group">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-pink-950/30 rounded border border-pink-500/30 group-hover:bg-pink-950/50">
                            <HelpCircle className="w-6 h-6 text-pink-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold font-mono text-white mb-2">{t.ht_kahoot_title}</h3>
                            <p className="text-gray-400 text-sm">{t.ht_kahoot_desc}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 border border-gray-800 p-6 rounded-lg hover:border-purple-500/50 transition-colors group">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-950/30 rounded border border-purple-500/30 group-hover:bg-purple-950/50">
                            <FileQuestion className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold font-mono text-white mb-2">{t.ht_quizizz_title}</h3>
                            <p className="text-gray-400 text-sm">{t.ht_quizizz_desc}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 border border-gray-800 p-6 rounded-lg hover:border-cyan-500/50 transition-colors group">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-cyan-950/30 rounded border border-cyan-500/30 group-hover:bg-cyan-950/50">
                            <FileText className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold font-mono text-white mb-2">{t.ht_import_title}</h3>
                            <p className="text-gray-400 text-sm">{t.ht_import_desc}</p>
                        </div>
                    </div>
                </div>
           </div>
       )}
    </div>
  );
};

// Need this simple icon for the "philosophy" visual
function ArrowRightLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 19 3 3 3-3" />
      <path d="M19 22V9a3 3 0 0 0-3-3H6" />
      <path d="m8 5-3-3-3 3" />
      <path d="M2 2v13a3 3 0 0 0 3 3h13" />
    </svg>
  )
}
