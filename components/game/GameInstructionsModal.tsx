
import React from 'react';
import { CyberCard, CyberButton } from '../ui/CyberUI';
import { HelpCircle, X, Shield, Zap, Skull, Crosshair, Map, Coins, Lock } from 'lucide-react';
import { GameMode } from '../../types';

interface GameInstructionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameMode: GameMode;
    t: any;
}

export const GameInstructionsModal: React.FC<GameInstructionsModalProps> = ({ isOpen, onClose, gameMode, t }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <CyberCard className="w-full max-w-2xl border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3 text-cyan-400">
                        <HelpCircle className="w-8 h-8" />
                        <h2 className="text-2xl font-cyber">{t.instr_title}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {gameMode === 'JEOPARDY' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-white font-mono">NEURAL JEOPARDY</h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-gray-300">
                                    <span className="bg-cyan-900/50 text-cyan-400 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0">1</span>
                                    <span>{t.instr_jeopardy_1}</span>
                                </li>
                                <li className="flex items-start gap-3 text-gray-300">
                                    <span className="bg-cyan-900/50 text-cyan-400 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0">2</span>
                                    <span>{t.instr_jeopardy_2}</span>
                                </li>
                                <li className="flex items-start gap-3 text-gray-300">
                                    <span className="bg-cyan-900/50 text-cyan-400 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0">3</span>
                                    <span>{t.instr_jeopardy_3}</span>
                                </li>
                            </ul>
                            
                            <div className="mt-6 pt-4 border-t border-gray-800">
                                <h4 className="text-sm font-mono text-gray-500 mb-3 uppercase tracking-widest">ITEMS (CHAOS MODE)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 p-2 rounded"><Zap className="w-4 h-4 text-yellow-400" /> x2 Points</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 p-2 rounded"><Skull className="w-4 h-4 text-red-500" /> Bomb (-200 all)</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 p-2 rounded"><Crosshair className="w-4 h-4 text-purple-400" /> Steal 300 pts</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 p-2 rounded"><Shield className="w-4 h-4 text-cyan-400" /> Shield</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {gameMode === 'HEX_CONQUEST' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-white font-mono">HEX CONQUEST</h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-gray-300">
                                    <span className="bg-yellow-900/50 text-yellow-400 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0">1</span>
                                    <span>{t.instr_hex_1}</span>
                                </li>
                                <li className="flex items-start gap-3 text-gray-300">
                                    <span className="bg-yellow-900/50 text-yellow-400 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0">2</span>
                                    <span>{t.instr_hex_2}</span>
                                </li>
                                <li className="flex items-start gap-3 text-gray-300">
                                    <span className="bg-yellow-900/50 text-yellow-400 font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0">3</span>
                                    <span>{t.instr_hex_3}</span>
                                </li>
                            </ul>

                            <div className="mt-6 pt-4 border-t border-gray-800">
                                <h4 className="text-sm font-mono text-gray-500 mb-3 uppercase tracking-widest">MARKET ACTIONS</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 p-2 rounded"><Map className="w-4 h-4 text-green-400" /> Conquer (50g)</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 p-2 rounded"><Crosshair className="w-4 h-4 text-red-400" /> Invade (150g)</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 p-2 rounded"><Shield className="w-4 h-4 text-cyan-400" /> Shield (100g)</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 p-2 rounded"><Lock className="w-4 h-4 text-gray-400" /> Block (75g)</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end">
                    <CyberButton onClick={onClose} className="px-8">ENTENDIDO</CyberButton>
                </div>
            </CyberCard>
        </div>
    );
};
