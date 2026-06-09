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

export const JackpotCelebration: React.FC<JackpotCelebrationProps> = ({ tier, onClose }) => {
    const [displayAmount, setDisplayAmount] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(3);
    const onCloseRef = React.useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!tier) return;
        setDisplayAmount(0);
        setSecondsLeft(3);

        const autoClose = setTimeout(() => onCloseRef.current(), 3000);
        const countdown = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);

        const startTime = Date.now();
        const duration = 2000;
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) { setDisplayAmount(tier.amount); clearInterval(interval); return; }
            const p = 1 - Math.pow(1 - elapsed / duration, 3);
            setDisplayAmount(Math.floor(tier.amount * p));
        }, 16);

        return () => { clearTimeout(autoClose); clearInterval(countdown); clearInterval(interval); };
    }, [tier]);

    if (!tier) return null;

    const style = TIER_STYLES[tier.name] || TIER_STYLES.GRAND;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center select-none"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={onClose}>
            <div className="animate-pop-in flex flex-col items-center gap-3 p-6 rounded-3xl"
                style={{ background: 'linear-gradient(160deg,#0a0018,#1a0035)', border: `3px solid ${style.border}`, boxShadow: `0 0 40px ${style.shadow}, 0 16px 48px rgba(0,0,0,0.9)`, minWidth: 260 }}
                onClick={e => e.stopPropagation()}>

                {/* Tier name */}
                <div style={{ fontSize: '2rem', lineHeight: 1, fontFamily: "'Archivo Black', sans-serif", color: style.textColor, textShadow: `0 0 20px ${style.shadow}` }}>
                    {tier.name} JACKPOT!
                </div>

                {/* Amount */}
                <div className="flex items-center justify-center px-6 py-2.5 rounded-xl"
                    style={{ background: '#000', border: `2px solid ${style.border}`, boxShadow: `inset 0 0 12px rgba(0,0,0,0.8)` }}>
                    <span style={{ fontSize: '2rem', lineHeight: 1, fontFamily: "'Archivo Black', sans-serif", color: style.textColor }}>
                        +{formatK(displayAmount)}
                    </span>
                </div>

                <button onClick={onClose}
                    className="btn-3d px-10 py-2.5 rounded-2xl uppercase text-white font-black text-sm tracking-widest"
                    style={{ background: `linear-gradient(180deg,${style.border},rgba(0,0,0,0.6))`, boxShadow: `0 4px 0 rgba(0,0,0,0.7), 0 0 16px ${style.shadow}`, border: `1.5px solid ${style.textColor}` }}>
                    COLLECT ({secondsLeft})
                </button>
            </div>
        </div>
    );
};
