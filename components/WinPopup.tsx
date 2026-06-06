import React, { useEffect, useState } from 'react';
import { audioService } from '../services/audioService';
import { formatK } from '../constants';

interface WinPopupProps {
    amount: number;
    type: string;
    onComplete: () => void;
}

const WIN_STYLES: Record<string, { border: string; textColor: string; shadow: string }> = {
    'ULTIMATE WIN': { border: '#fbbf24', textColor: '#fde68a', shadow: 'rgba(251,191,36,0.7)' },
    'MEGA WIN':     { border: '#f43f5e', textColor: '#fda4af', shadow: 'rgba(244,63,94,0.7)'  },
    'EPIC WIN':     { border: '#a855f7', textColor: '#d8b4fe', shadow: 'rgba(168,85,247,0.7)' },
    'GREAT WIN':    { border: '#22d3ee', textColor: '#67e8f9', shadow: 'rgba(34,211,238,0.7)' },
    'BIG WIN':      { border: '#22c55e', textColor: '#86efac', shadow: 'rgba(34,197,94,0.7)'  },
};

const ARCHIVO_3D = (color: string, shadow: string): React.CSSProperties => ({
    fontFamily: "'Archivo Black', sans-serif",
    color,
    textShadow: `2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.5), 0 0 20px ${shadow}`,
    WebkitTextStroke: '1px rgba(0,0,0,0.6)',
    paintOrder: 'stroke fill',
});

export const WinPopup: React.FC<WinPopupProps> = ({ amount, type, onComplete }) => {
    const [displayAmount, setDisplayAmount] = useState(0);

    useEffect(() => {
        audioService.playWinCheer();
        const startTime = Date.now();
        const countDuration = 1500;
        const timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= countDuration) {
                setDisplayAmount(amount);
                clearInterval(timerInterval);
            } else {
                const p = 1 - Math.pow(1 - elapsed / countDuration, 3);
                setDisplayAmount(Math.floor(amount * p));
            }
        }, 16);
        const autoClose = setTimeout(onComplete, 3000);
        return () => { clearTimeout(autoClose); clearInterval(timerInterval); };
    }, [type, amount, onComplete]);

    const s = WIN_STYLES[type] || WIN_STYLES['BIG WIN'];

    return (
        <div onClick={onComplete}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center cursor-pointer"
            style={{ background: 'linear-gradient(160deg,#050505,#0d0d18,#050505)' }}>

            <div className="flex flex-col items-center gap-4 p-6">
                {/* Win type */}
                <div style={{ fontSize: 'clamp(40px,11vw,88px)', lineHeight: 1, ...ARCHIVO_3D(s.textColor, s.shadow) }}>
                    {type}
                </div>

                {/* Amount box */}
                <div className="flex items-center justify-center px-8 py-3 rounded-2xl"
                    style={{ background: '#000', border: `4px solid ${s.border}`, boxShadow: `0 0 24px ${s.shadow}, inset 0 0 12px rgba(0,0,0,0.8)` }}>
                    <span style={{ fontSize: 'clamp(28px,7vw,56px)', lineHeight: 1, ...ARCHIVO_3D(s.textColor, s.shadow) }}>
                        {formatK(displayAmount)}
                    </span>
                </div>

                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>
                    Tap to close
                </div>
            </div>
        </div>
    );
};
