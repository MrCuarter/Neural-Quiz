
import React, { useEffect, useState } from 'react';
import { getCampaignByPublicId, subscribeToLogs } from '../../../services/campaignService';
import { Campaign, CampaignLog } from '../../../types';
import { Loader2, Lock, CheckCircle, PlayCircle, Trophy, History } from 'lucide-react';

interface PublicCampaignViewProps {
    // Usually mapped from URL params in App.tsx
    publicId: string; 
}

const THEMES: Record<string, any> = {
    fantasy: { bg: 'bg-[#1a0b0b]', text: 'text-amber-100', accent: 'text-amber-500', border: 'border-amber-700', font: 'font-serif', bar: 'bg-amber-600' },
    cyberpunk: { bg: 'bg-[#050505]', text: 'text-cyan-100', accent: 'text-cyan-400', border: 'border-cyan-500', font: 'font-mono', bar: 'bg-cyan-500' },
    space: { bg: 'bg-[#0b0b1a]', text: 'text-blue-100', accent: 'text-blue-400', border: 'border-blue-500', font: 'font-sans', bar: 'bg-blue-600' },
    arcade: { bg: 'bg-[#1a0b1a]', text: 'text-pink-100', accent: 'text-pink-400', border: 'border-pink-500', font: 'font-mono', bar: 'bg-pink-500' },
    kids: { bg: 'bg-[#f0f9ff]', text: 'text-slate-800', accent: 'text-blue-600', border: 'border-blue-300', font: 'font-sans', bar: 'bg-green-500' },
};

export const PublicCampaignView: React.FC<PublicCampaignViewProps> = ({ publicId }) => {
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [logs, setLogs] = useState<CampaignLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCampaign();
    }, [publicId]);

    const loadCampaign = async () => {
        const c = await getCampaignByPublicId(publicId);
        setCampaign(c);
        setLoading(false);
        if (c?.id) {
            subscribeToLogs(c.id, (newLogs) => setLogs(newLogs));
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin w-12 h-12"/></div>;
    if (!campaign) return <div className="min-h-screen bg-black flex items-center justify-center text-white">CAMPAÑA NO ENCONTRADA (404)</div>;

    const theme = THEMES[campaign.theme] || THEMES['cyberpunk'];
    const progress = Math.min(100, (campaign.currentAmount / campaign.goalAmount) * 100);

    return (
        <div className={`min-h-screen ${theme.bg} ${theme.text} ${theme.font} p-4 md:p-8 flex flex-col items-center`}>
            
            {/* HERO HEADER */}
            <div className="max-w-4xl w-full text-center mb-12 animate-in slide-in-from-top-10 duration-700">
                <h1 className={`text-4xl md:text-6xl font-bold mb-4 uppercase tracking-widest ${theme.accent} drop-shadow-lg`}>{campaign.title}</h1>
                <p className="opacity-80 max-w-2xl mx-auto text-lg">{campaign.description}</p>
                
                {/* PROGRESS BAR BIG */}
                <div className="mt-8 relative pt-4">
                    <div className="flex justify-between mb-2 text-xl font-bold">
                        <span>PROGRESO</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className={`w-full h-8 bg-black/30 rounded-full overflow-hidden border-2 ${theme.border}`}>
                        <div className={`h-full transition-all duration-1000 ${theme.bar}`} style={{ width: `${progress}%` }}>
                            <div className="w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
                        </div>
                    </div>
                    <div className="mt-2 text-center text-2xl font-bold">
                        {campaign.currentAmount.toLocaleString()} / {campaign.goalAmount.toLocaleString()} {campaign.resourceEmoji}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COL 1: MISSIONS */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className={`text-2xl font-bold border-b-2 ${theme.border} pb-2 mb-4 flex items-center gap-2`}>
                        <Trophy className="w-6 h-6"/> MISIONES
                    </h2>
                    
                    <div className="grid gap-4">
                        {campaign.missions.map(m => (
                            <div key={m.id} className={`p-4 rounded-lg border-2 ${theme.border} bg-black/20 flex justify-between items-center transition-all ${m.status === 'locked' ? 'opacity-50 grayscale' : 'hover:scale-[1.01]'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${m.status === 'active' ? theme.bar : 'bg-gray-800'}`}>
                                        {m.status === 'locked' && <Lock className="w-6 h-6 text-gray-400"/>}
                                        {m.status === 'active' && <PlayCircle className="w-6 h-6 text-white animate-pulse"/>}
                                        {m.status === 'finished' && <CheckCircle className="w-6 h-6 text-white"/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{m.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded bg-black/50 ${theme.accent}`}>RECOMPENSA x{m.multiplier}</span>
                                    </div>
                                </div>
                                {m.status === 'active' && (
                                    // Normally this link would go to an arcade eval wrapper linked to this campaign/mission
                                    <button className={`px-6 py-2 rounded font-bold ${theme.bar} text-white shadow-lg`}>
                                        INICIAR
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* COL 2: LOG */}
                <div className="h-[500px] flex flex-col">
                    <h2 className={`text-2xl font-bold border-b-2 ${theme.border} pb-2 mb-4 flex items-center gap-2`}>
                        <History className="w-6 h-6"/> BITÁCORA
                    </h2>
                    <div className={`flex-1 overflow-y-auto p-4 rounded-lg border ${theme.border} bg-black/10 space-y-3 custom-scrollbar`}>
                        {logs.map(log => (
                            <div key={log.id} className="text-sm border-b border-white/10 pb-2 mb-2">
                                <div className="flex justify-between opacity-50 text-xs mb-1">
                                    <span>{new Date(log.timestamp?.seconds * 1000).toLocaleDateString()}</span>
                                    <span>{new Date(log.timestamp?.seconds * 1000).toLocaleTimeString()}</span>
                                </div>
                                <div className="font-bold">
                                    <span className={theme.accent}>{log.studentAlias}</span>: {log.message}
                                </div>
                                <div className={`text-right font-bold ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {log.amount > 0 ? '+' : ''}{log.amount}
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="text-center opacity-50 py-10">La aventura acaba de comenzar...</div>}
                    </div>
                </div>

            </div>
        </div>
    );
};
