
import React, { useState } from 'react';
import { CyberButton, CyberCard } from './ui/CyberUI';
import { ArrowLeft, BookOpen, Terminal, HelpCircle, FileQuestion, Globe, FileText, Cpu, User } from 'lucide-react';

interface HelpViewProps {
  onBack: () => void;
  t: any;
}

export const HelpView: React.FC<HelpViewProps> = ({ onBack, t }) => {
  const [tab, setTab] = useState<'guide' | 'howto'>('guide');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500">
       <div className="flex items-center justify-between">
         <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2">
            <ArrowLeft className="w-4 h-4" /> {t.back}
         </CyberButton>
         <div className="flex bg-black/40 rounded border border-gray-800 p-1">
            <button 
                onClick={() => setTab('guide')}
                className={`px-4 py-2 text-xs font-mono font-bold rounded transition-colors flex items-center gap-2 ${tab === 'guide' ? 'bg-cyan-950 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <BookOpen className="w-4 h-4" /> {t.guide_title.split(' ')[0]}...
            </button>
            <button 
                onClick={() => setTab('howto')}
                className={`px-4 py-2 text-xs font-mono font-bold rounded transition-colors flex items-center gap-2 ${tab === 'howto' ? 'bg-pink-950 text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <Terminal className="w-4 h-4" /> {t.how_to_title.split(' ')[0]}...
            </button>
         </div>
       </div>

       {tab === 'guide' ? (
           <div className="space-y-6">
               <div className="text-center space-y-4 py-8">
                   <h2 className="text-5xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-500 uppercase">
                       {t.guide_title}
                   </h2>
                   <p className="text-gray-400 font-mono text-lg">{t.guide_intro}</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <CyberCard className="bg-cyan-950/10 border-cyan-500/30">
                       <Cpu className="w-10 h-10 text-cyan-400 mb-4" />
                       <p className="text-gray-300 text-sm leading-relaxed">{t.guide_p1}</p>
                   </CyberCard>
                   <CyberCard className="bg-purple-950/10 border-purple-500/30">
                       <Globe className="w-10 h-10 text-purple-400 mb-4" />
                       <p className="text-gray-300 text-sm leading-relaxed">{t.guide_p2}</p>
                   </CyberCard>
                   <CyberCard className="bg-pink-950/10 border-pink-500/30">
                       <User className="w-10 h-10 text-pink-400 mb-4" />
                       <p className="text-gray-300 text-sm leading-relaxed">{t.guide_p3}</p>
                   </CyberCard>
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
