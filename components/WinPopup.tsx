import React, { useEffect, useState } from 'react';
import { audioService } from '../services/audioService';
import { formatK } from '../constants';

interface WinPopupProps {
    amount: number;
    type: string;
    onComplete: () => void;
}

export const WinPopup: React.FC<WinPopupProps> = ({ amount, type, onComplete }) => {
    const [displayAmount, setDisplayAmount] = useState(0);

    useEffect(() => {
        audioService.playWinCheer();

        // Count up animation — 1.5s
        const startTime = Date.now();
        const countDuration = 1500;
        const timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= countDuration) {
                setDisplayAmount(amount);
                clearInterval(timerInterval);
            } else {
                const easedProgress = 1 - Math.pow(1 - elapsed / countDuration, 3);
                setDisplayAmount(Math.floor(amount * easedProgress));
            }
        }, 16);

        // Auto-close after 3 seconds
        const autoClose = setTimeout(onComplete, 3000);

        return () => {
            clearTimeout(autoClose);
            clearInterval(timerInterval);
        };
    }, [type, amount, onComplete]);

    const getCoinCount = (tier: string) => {
        switch(tier) {
            case 'ULTIMATE WIN': return 250;
            case 'MEGA WIN': return 150;
            case 'EPIC WIN': return 100;
            case 'GREAT WIN': return 75;
            case 'BIG WIN': return 40;
            default: return 15;
        }
    };

    const getTheme = (tier: string) => {
        switch(tier) {
            case 'ULTIMATE WIN': return { color: 'text-yellow-400', title: tier };
            case 'MEGA WIN': return { color: 'text-red-500', title: tier };
            case 'EPIC WIN': return { color: 'text-purple-500', title: tier };
            case 'GREAT WIN': return { color: 'text-blue-500', title: tier };
            default: return { color: 'text-green-400', title: tier };
        }
    };

    const theme = getTheme(type);
    const particleCount = getCoinCount(type);

    return (
        <div
            onClick={onComplete}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm overflow-hidden cursor-pointer"
        >
            <style>{`
                @keyframes coinFall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 1; }
                }
            `}</style>

            <div className="relative flex flex-col items-center z-20 w-full p-4">
                <h2 className={`font-titan font-black uppercase text-center tracking-tighter mb-4 ${theme.color}`}
                    style={{ fontSize: 'clamp(72px, 18vw, 144px)', lineHeight: 1.05, WebkitTextStroke: '3px #000', paintOrder: 'stroke fill', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.8))' }}>
                    {theme.title}
                </h2>
                <div className="text-4xl md:text-[4.5rem] font-mono font-black text-white transform scale-105"
                     style={{ textShadow: '0 0 5px #000, 0 0 10px #000, 0 3px 0 #000, 0 5px 5px rgba(0,0,0,0.5)', WebkitTextStroke: '1px black' }}>
                    {formatK(displayAmount)}
                </div>
                <div className="mt-4 text-white/30 text-xs uppercase tracking-widest">Tap to close</div>
            </div>

            {/* Particles */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-10">
                {[...Array(particleCount)].map((_, i) => (
                    <div key={i} className="absolute text-xl opacity-80"
                        style={{ left: `${Math.random() * 100}%`, top: `-10%`, animation: `coinFall ${2 + Math.random() * 2}s linear infinite`, animationDelay: `${Math.random() * 5}s` }}>🪙</div>
                ))}
            </div>
        </div>
    );
};
