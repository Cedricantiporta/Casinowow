import React, { useState, useEffect } from 'react';
import { formatNumber } from '../constants';

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
        <div className="absolute inset-0 z-[400] flex items-center justify-center select-none"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={guardedClose}>
            <div className="animate-pop-in flex flex-col items-center gap-3 p-6 rounded-3xl"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                    minWidth: 260,
                }}
                onClick={e => e.stopPropagation()}>

                {/* Tier name — color coded */}
                <div style={{ fontSize: '2rem', lineHeight: 1, fontFamily: "'Tanker', cursive", textTransform: 'uppercase', color: style.textColor }}>
                    {tier.name} Jackpot!
                </div>

                {/* Amount — color coded */}
                <div className="flex items-center justify-center rounded-2xl px-6 py-2.5"
                    style={{
                        background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(160,60,255,0.22) 20%,rgba(10,0,50,0.75) 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)',
                    }}>
                    <span style={{ fontSize: '2rem', lineHeight: 1, fontFamily: "'Tanker', cursive", textTransform: 'uppercase', color: style.textColor }}>
                        +{formatNumber(displayAmount)}
                    </span>
                </div>

                <button onClick={guardedClose} className="pill-green">
                    <div className="pill-face">Collect ({secondsLeft})</div>
                </button>
            </div>
        </div>
    );
};
