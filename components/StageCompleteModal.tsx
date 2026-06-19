import React, { useEffect } from 'react';
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
    useEffect(() => {
        if (!isOpen || gameType !== 'DICE') return;
        const t = setTimeout(onNext, 2000);
        return () => clearTimeout(t);
    }, [isOpen, gameType]);

    if (!isOpen) return null;

    const bg = gameType === 'WILD'
        ? 'linear-gradient(180deg,#1e3a8a,#0f172a)'
        : 'linear-gradient(180deg,#78350f,#1c0a00)';

    return (
        <div className="absolute inset-0 z-[350] flex items-end justify-center pb-4 bg-black/75 backdrop-blur-sm">
            <div className="animate-pop-in flex items-center gap-4 rounded-2xl px-5 py-3 mx-3 w-full max-w-sm"
                style={{ background: bg, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.9)' }}>
                <div className="flex-1 flex items-center gap-4 min-w-0">
                    {coins > 0 && (
                        <span className="text-white font-black font-mono leading-none" style={{ fontSize: '1.6rem' }}>+{formatCommaNumber(coins)}</span>
                    )}
                    {diamonds > 0 && (
                        <span className="text-white font-black font-mono leading-none" style={{ fontSize: '1.4rem' }}>+{diamonds}</span>
                    )}
                </div>
                <button
                    onClick={onNext}
                    className="btn-3d px-5 py-2.5 rounded-xl font-black text-sm uppercase text-white tracking-wide shrink-0"
                    style={{ background: 'linear-gradient(180deg,#22c55e,#15803d)', boxShadow: '0 3px 0 #0a4a23' }}>
                    Next Stage →
                </button>
            </div>
        </div>
    );
};
