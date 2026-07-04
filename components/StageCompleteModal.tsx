import React, { useEffect } from 'react';
import { formatK } from '../constants';

interface StageCompleteModalProps {
    isOpen: boolean;
    gameType: 'WILD' | 'DICE' | 'WHEEL';
    stage: number;
    run?: number;
    coins: number;
    diamonds: number;
    autoAdvance?: boolean;
    onNext: () => void;
}

export const StageCompleteModal: React.FC<StageCompleteModalProps> = ({ isOpen, gameType, stage, run = 0, coins, diamonds, autoAdvance, onNext }) => {
    useEffect(() => {
        if (!isOpen || gameType !== 'DICE') return;
        const delay = autoAdvance ? 2000 : 3000;
        const t = setTimeout(onNext, delay);
        return () => clearTimeout(t);
    }, [isOpen, gameType, autoAdvance]);

    if (!isOpen) return null;

    const stageLabel = run > 0 ? `Stage ${stage} · Run ${run + 1}` : `Stage ${stage}`;

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
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>Congratulations! {stageLabel}</span>
                        {coins > 0 && <span style={{ fontSize: 14, fontWeight: 900, color: '#facc15' }}>+{formatK(coins)} Coins</span>}
                        {diamonds > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>+{diamonds} Gems</span>}
                    </div>
                </div>
            </div>
        );
    }

    const isDice = gameType === 'DICE';
    const isWheel = gameType === 'WHEEL';
    const bg = isDice
        ? 'linear-gradient(180deg,#c9901a 0%,#9a6800 35%,#5a3800 100%)'
        : isWheel
        ? 'linear-gradient(180deg,#a855f7 0%,#7c1fd4 35%,#3b0764 100%)'
        : 'linear-gradient(180deg,#1e3a8a,#0f172a)';
    const shadowColor = isDice ? 'rgba(251,191,36,0.4)' : isWheel ? 'rgba(168,85,247,0.4)' : 'rgba(59,130,246,0.4)';

    return (
        <div className="absolute inset-0 z-[350] flex items-center justify-center bg-black/75 backdrop-blur-sm">
            <div className="animate-pop-in flex flex-col items-center gap-3 rounded-2xl px-6 py-5 mx-4 w-full max-w-xs text-center"
                style={{ background: bg, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 32px ${shadowColor}` }}>
                {/* Title */}
                <div className="flex flex-col items-center gap-0.5">
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>Congratulations!</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {stageLabel} Prize
                    </span>
                </div>
                {/* Rewards */}
                <div className="flex items-center justify-center gap-4">
                    {coins > 0 && (
                        <div className="flex flex-col items-center gap-0.5">
                            <span style={{ fontSize: 26, fontWeight: 900, color: '#facc15', lineHeight: 1 }}>+{formatK(coins)}</span>
                            <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>COINS</span>
                        </div>
                    )}
                    {diamonds > 0 && (
                        <div className="flex flex-col items-center gap-0.5">
                            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>+{diamonds} 💎</span>
                            <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>GEMS</span>
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
