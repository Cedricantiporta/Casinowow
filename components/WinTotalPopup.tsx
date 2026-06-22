import React, { useEffect, useRef } from 'react';
import { formatK } from '../constants';

interface WinTotalPopupProps {
    amount: number;
    onComplete: () => void;
    duration?: number;
}

// Lightweight, non-blocking win badge for regular (below-tier) wins so every
// winning spin shows its total — not just big wins. Auto-dismisses quickly.
export const WinTotalPopup: React.FC<WinTotalPopupProps> = ({ amount, onComplete, duration = 950 }) => {
    const cbRef = useRef(onComplete);
    cbRef.current = onComplete;

    useEffect(() => {
        const t = setTimeout(() => cbRef.current(), duration);
        return () => clearTimeout(t);
    }, [amount, duration]);

    return (
        <div className="absolute inset-0 z-[140] flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-5 py-2 rounded-full animate-pop-in"
                style={{
                    background: 'linear-gradient(180deg,rgba(22,8,42,0.92),rgba(8,2,20,0.92))',
                    boxShadow: '0 0 22px rgba(255,200,60,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                }}>
                <img src="/symbols/coin.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                <span style={{
                    fontFamily: "'Tanker', cursive",
                    fontSize: 'clamp(20px,4.5vw,32px)',
                    lineHeight: 1,
                    color: '#ffe066',
                    textShadow: '0 2px 0 #000, 0 0 10px rgba(255,200,60,0.65)',
                }}>
                    {formatK(amount)}
                </span>
            </div>
        </div>
    );
};
