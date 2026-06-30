import React, { useEffect } from 'react';
import { formatCommaNumber } from '../constants';

interface StageCompleteModalProps {
    isOpen: boolean;
    gameType: 'WILD' | 'DICE';
    stage: number;
    coins: number;
    diamonds: number;
    autoAdvance?: boolean;
    onNext: () => void;
}

export const StageCompleteModal: React.FC<StageCompleteModalProps> = ({ isOpen, gameType, stage, coins, diamonds, autoAdvance, onNext }) => {
    useEffect(() => {
        if (!isOpen || gameType !== 'DICE') return;
        const delay = autoAdvance ? 2000 : 3000;
        const t = setTimeout(onNext, delay);
        return () => clearTimeout(t);
    }, [isOpen, gameType, autoAdvance]);

    if (!isOpen) return null;

    // Dice auto-roll: compact toast instead of full-screen overlay
    if (gameType === 'DICE' && autoAdvance) {
        return (
            <div className="absolute bottom-16 left-0 right-0 z-[350] flex justify-center pointer-events-none px-4 animate-pop-in">
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{
                        background: 'linear-gradient(180deg,#c9901a,#5a3800)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.14)',
                        maxWidth: 280,
                    }}>
                    <span style={{ fontSize: 18 }}>🎲</span>
                    <div className="flex flex-col">
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.1em' }}>Stage {stage} Complete!</span>
                        {coins > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>+{formatCommaNumber(coins)} Coins</span>}
                        {diamonds > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#c4b5fd' }}>+{diamonds} Gems</span>}
                    </div>
                </div>
            </div>
        );
    }

    const isDice = gameType === 'DICE';
    const bg = isDice
        ? 'linear-gradient(180deg,#c9901a 0%,#9a6800 35%,#5a3800 100%)'
        : 'linear-gradient(180deg,#1e3a8a,#0f172a)';
    const shadowColor = isDice ? 'rgba(251,191,36,0.4)' : 'rgba(59,130,246,0.4)';
    const accentColor = isDice ? '#fbbf24' : '#60a5fa';
    const subtitleColor = isDice ? '#fde68a' : '#93c5fd';

    return (
        <div className="absolute inset-0 z-[350] flex items-center justify-center bg-black/75 backdrop-blur-sm">
            <div className="animate-pop-in flex flex-col items-center gap-3 rounded-2xl px-6 py-5 mx-4 w-full max-w-xs text-center"
                style={{ background: bg, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 32px ${shadowColor}` }}>
                {/* Title */}
                <div className="flex flex-col items-center gap-0.5">
                    <span style={{ fontSize: 11, fontWeight: 900, color: accentColor, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Stage {stage} Complete!
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: subtitleColor, letterSpacing: '0.08em' }}>
                        {isDice ? 'Dice Quest' : 'Mine Quest'} Rewards
                    </span>
                </div>
                {/* Rewards */}
                <div className="flex items-center justify-center gap-4">
                    {coins > 0 && (
                        <div className="flex flex-col items-center gap-0.5">
                            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>+{formatCommaNumber(coins)}</span>
                            <span style={{ fontSize: 8, fontWeight: 700, color: subtitleColor, letterSpacing: '0.1em' }}>COINS</span>
                        </div>
                    )}
                    {diamonds > 0 && (
                        <div className="flex flex-col items-center gap-0.5">
                            <span style={{ fontSize: 22, fontWeight: 900, color: '#a78bfa', lineHeight: 1 }}>+{diamonds} 💎</span>
                            <span style={{ fontSize: 8, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.1em' }}>GEMS</span>
                        </div>
                    )}
                </div>
                {/* Next button */}
                <button onClick={onNext} className="pill-green">
                    <div className="pill-face" style={{ padding: '7px 24px', fontSize: '11px' }}>Next Stage →</div>
                </button>
            </div>
        </div>
    );
};
