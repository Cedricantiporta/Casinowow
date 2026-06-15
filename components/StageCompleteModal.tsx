import React from 'react';
import { formatCommaNumber } from '../constants';

interface StageCompleteModalProps {
    isOpen: boolean;
    gameType: 'WILD' | 'DICE';
    stage: number;
    coins: number;
    diamonds: number;
    onNext: () => void;
}

export const StageCompleteModal: React.FC<StageCompleteModalProps> = ({ isOpen, gameType, stage, coins, diamonds, onNext }) => {
    if (!isOpen) return null;

    const icon = gameType === 'WILD' ? '🗿' : '🎲';
    const color = gameType === 'WILD' ? 'from-indigo-600 to-purple-900' : 'from-amber-500 to-orange-800';

    return (
        <div className="absolute inset-0 z-[350] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className={`animate-pop-in flex flex-col items-center gap-3 rounded-3xl p-8 bg-gradient-to-b ${color} shadow-2xl border border-white/20 min-w-[260px]`}>
                <div className="text-5xl leading-none animate-bounce">{icon}</div>
                <div className="font-black text-white text-center uppercase tracking-widest text-xl" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                    Stage {stage} Complete!
                </div>
                {coins > 0 && (
                    <div className="font-mono font-black text-yellow-300 text-2xl" style={{ textShadow: '0 0 10px rgba(255,200,0,0.6)' }}>
                        +{formatCommaNumber(coins)} 🪙
                    </div>
                )}
                {diamonds > 0 && (
                    <div className="font-mono font-black text-cyan-300 text-lg">
                        +{diamonds} 💎
                    </div>
                )}
                <button
                    onClick={onNext}
                    className="mt-2 px-8 py-3 rounded-2xl font-black uppercase text-white text-lg btn-3d"
                    style={{ background: 'linear-gradient(180deg,#22c55e,#15803d)', boxShadow: '0 4px 0 #052e16', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                    Next Stage →
                </button>
            </div>
        </div>
    );
};
