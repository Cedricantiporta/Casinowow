import React, { useState, useEffect } from 'react';
import { formatK } from '../constants';

interface JackpotCelebrationProps {
    tier: { name: string; color: string; icon: string; amount: number } | null;
    onClose: () => void;
}

const TIER_STYLES: Record<string, { border: string; textColor: string; shadow: string }> = {
    MINI:  { border: '#22c55e', textColor: '#4ade80', shadow: 'rgba(34,197,94,0.6)' },
    MINOR: { border: '#22d3ee', textColor: '#67e8f9', shadow: 'rgba(34,211,238,0.6)' },
    MAJOR: { border: '#a855f7', textColor: '#d8b4fe', shadow: 'rgba(168,85,247,0.6)' },
    MEGA:  { border: '#f43f5e', textColor: '#fda4af', shadow: 'rgba(244,63,94,0.6)'  },
    GRAND: { border: '#fbbf24', textColor: '#fde68a', shadow: 'rgba(251,191,36,0.6)' },
};

const ARCHIVO_3D = (color: string, shadow: string): React.CSSProperties => ({
    fontFamily: "'Archivo Black', sans-serif",
    color,
    textShadow: `2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.5), 0 0 20px ${shadow}`,
    WebkitTextStroke: '1px rgba(0,0,0,0.6)',
    paintOrder: 'stroke fill',
});

export const JackpotCelebration: React.FC<JackpotCelebrationProps> = ({ tier, onClose }) => {
    const [canClose, setCanClose] = useState(false);
    const [displayAmount, setDisplayAmount] = useState(0);

    useEffect(() => {
        if (!tier) return;
        setCanClose(false);
        setDisplayAmount(0);
        const isMini = tier.name === 'MINI';
        // MINI auto-closes at 3s; others lock for 3s then show collect button
        const lockTimer = setTimeout(() => {
            if (isMini) onClose();
            else setCanClose(true);
        }, 3000);
        const startTime = Date.now();
        const duration = 2000;
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) { setDisplayAmount(tier.amount); clearInterval(interval); return; }
            const p = 1 - Math.pow(1 - elapsed / duration, 3);
            setDisplayAmount(Math.floor(tier.amount * p));
        }, 16);
        return () => { clearTimeout(lockTimer); clearInterval(interval); };
    }, [tier, onClose]);

    if (!tier) return null;

    const style = TIER_STYLES[tier.name] || TIER_STYLES.GRAND;

    return (
        <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center select-none"
            style={{ background: 'linear-gradient(160deg,#050505,#0d0d18,#050505)' }}
            onClick={canClose ? onClose : undefined}>

            <div className="relative z-10 flex flex-col items-center gap-4 p-6">
                {/* Tier name */}
                <div style={{ fontSize: 'clamp(40px,10vw,80px)', lineHeight: 1, ...ARCHIVO_3D(style.textColor, style.shadow) }}>
                    {tier.name} JACKPOT!
                </div>

                {/* Amount box */}
                <div className="flex items-center justify-center px-8 py-3 rounded-2xl"
                    style={{ background: '#000', border: `4px solid ${style.border}`, boxShadow: `0 0 24px ${style.shadow}, inset 0 0 12px rgba(0,0,0,0.8)` }}>
                    <span style={{ fontSize: 'clamp(28px,7vw,56px)', lineHeight: 1, ...ARCHIVO_3D(style.textColor, style.shadow) }}>
                        +{formatK(displayAmount)}
                    </span>
                </div>

                {canClose && (
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="mt-2 px-10 py-3 rounded-2xl uppercase text-white btn-3d animate-pop-in"
                        style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '1.1rem', background: `linear-gradient(180deg,${style.border},rgba(0,0,0,0.6))`, boxShadow: `0 4px 0 rgba(0,0,0,0.7), 0 0 20px ${style.shadow}`, border: `1.5px solid ${style.textColor}` }}>
                        COLLECT
                    </button>
                )}
            </div>
        </div>
    );
};
