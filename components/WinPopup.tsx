import React, { useEffect, useState } from 'react';
import { audioService } from '../services/audioService';
import { formatK } from '../constants';

interface WinPopupProps {
    amount: number;
    type: string;
    onComplete: () => void;
}

const WIN_STYLES: Record<string, { textColor: string; shadow: string }> = {
    'ULTIMATE WIN': { textColor: '#fde68a', shadow: 'rgba(251,191,36,0.7)' },
    'MEGA WIN':     { textColor: '#fda4af', shadow: 'rgba(244,63,94,0.7)'  },
    'EPIC WIN':     { textColor: '#d8b4fe', shadow: 'rgba(168,85,247,0.7)' },
    'GREAT WIN':    { textColor: '#67e8f9', shadow: 'rgba(34,211,238,0.7)' },
    'BIG WIN':      { textColor: '#86efac', shadow: 'rgba(34,197,94,0.7)'  },
};

// Image art per win tier
const WIN_IMAGES: Record<string, string> = {
    'ULTIMATE WIN': '/ultimatewin.png',
    'MEGA WIN':     '/megawin.png',
    'EPIC WIN':     '/epicwin.png',
    'GREAT WIN':    '/greatwin.png',
    'BIG WIN':      '/bigwin.png',
};

const NUNITO_3D = (color: string): React.CSSProperties => ({
    fontFamily: "'Tanker', cursive",
    fontWeight: 400,
    textTransform: 'uppercase' as const,
    color,
    textShadow: `2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.5)`,
    WebkitTextStroke: '1px rgba(0,0,0,0.6)',
    paintOrder: 'stroke fill',
});

const AMOUNT_STYLE: React.CSSProperties = {
    fontFamily: "'Tanker', cursive",
    fontWeight: 400,
    color: '#ffffff',
    textShadow: '2px 2px 0 #000, 0 0 8px rgba(0,0,0,0.9)',
    WebkitTextStroke: '1.5px #000',
    paintOrder: 'stroke fill',
};

export const WinPopup: React.FC<WinPopupProps> = ({ amount, type, onComplete }) => {
    const [displayAmount, setDisplayAmount] = useState(0);
    const onCompleteRef = React.useRef(onComplete);
    onCompleteRef.current = onComplete;
    const mountTimeRef = React.useRef(Date.now());

    const guardedComplete = React.useCallback(() => {
        if (Date.now() - mountTimeRef.current > 1500) onCompleteRef.current();
    }, []);

    useEffect(() => {
        mountTimeRef.current = Date.now();
        audioService.playWinCheer();
        const startTime = Date.now();
        const countDuration = 1500;
        let lastTick = 0;
        const timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= countDuration) {
                setDisplayAmount(amount);
                clearInterval(timerInterval);
            } else {
                const p = 1 - Math.pow(1 - elapsed / countDuration, 3);
                setDisplayAmount(Math.floor(amount * p));
                // Coin tick every ~75ms, speeds up proportionally to count rate
                const speed = 1 + p * 1.5;
                if (elapsed - lastTick >= Math.max(35, 80 / speed)) {
                    audioService.playCoinTick(speed);
                    lastTick = elapsed;
                }
            }
        }, 16);
        const autoClose = setTimeout(() => onCompleteRef.current(), 3000);
        return () => { clearTimeout(autoClose); clearInterval(timerInterval); };
    }, [type, amount]);

    const s = WIN_STYLES[type] || WIN_STYLES['BIG WIN'];

    return (
        <div onClick={guardedComplete}
            className="absolute inset-0 z-[200] flex flex-col items-center justify-center cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.45)' }}>

            <div className="flex flex-col items-center gap-4 p-6">
                {/* Win type — image art */}
                {WIN_IMAGES[type] ? (
                    <img src={WIN_IMAGES[type]} alt={type} className="select-none pointer-events-none"
                        style={{ width: 'clamp(220px, 70vw, 520px)', height: 'auto', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.6))' }} />
                ) : (
                    <div style={{ fontSize: 'clamp(40px,11vw,88px)', lineHeight: 1, ...NUNITO_3D(s.textColor) }}>
                        {type}
                    </div>
                )}

                {/* Amount — no container, just the text */}
                <span style={{ fontSize: 'clamp(28px,7vw,56px)', lineHeight: 1, ...AMOUNT_STYLE }}>
                    {formatK(displayAmount)}
                </span>

                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 900, fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>
                    Tap to close
                </div>
            </div>
        </div>
    );
};
