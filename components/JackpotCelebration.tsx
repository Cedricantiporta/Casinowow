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
    const [secondsLeft, setSecondsLeft] = useState(5);
    const onCloseRef = React.useRef(onClose);
    onCloseRef.current = onClose;
    const mountTimeRef = React.useRef(0);

    const guardedClose = React.useCallback(() => {
        if (Date.now() - mountTimeRef.current > 1500) onCloseRef.current();
    }, []);

    useEffect(() => {
        if (!tier) return;
        mountTimeRef.current = Date.now();
        setDisplayAmount(0);
        setSecondsLeft(5);

        const autoClose = setTimeout(() => onCloseRef.current(), 5000);
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
            onClick={guardedClose}>
            <div className="animate-pop-in flex flex-col items-center gap-3 p-6 rounded-3xl"
                style={{ background: 'linear-gradient(160deg,#1a0535,#3b0764)', boxShadow: '0 16px 48px rgba(0,0,0,0.9)', minWidth: 260 }}
                onClick={e => e.stopPropagation()}>

                {/* Tier name — color coded */}
                <div style={{ fontSize: '2rem', lineHeight: 1, fontFamily: "'Archivo Black', sans-serif", color: style.textColor }}>
                    {tier.name} JACKPOT!
                </div>

                {/* Amount — color coded */}
                <div className="flex items-center justify-center px-6 py-2.5 rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <span style={{ fontSize: '2rem', lineHeight: 1, fontFamily: "'Archivo Black', sans-serif", color: style.textColor }}>
                        +{formatK(displayAmount)}
                    </span>
                </div>

                <button onClick={guardedClose}
                    className="btn-3d px-10 py-2.5 rounded-2xl uppercase text-white font-black text-sm tracking-widest"
                    style={{ background: 'linear-gradient(180deg,#a855f7,#6d28d9)', boxShadow: '0 4px 0 #4c1d95' }}>
                    COLLECT ({secondsLeft})
                </button>
            </div>
        </div>
    );
};
