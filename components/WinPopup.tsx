import React, { useEffect, useState } from 'react';
import { audioService } from '../services/audioService';
import { formatCommaNumber } from '../constants';

interface WinPopupProps {
    amount: number;
    type: string;
    onComplete: () => void;
}

export const WinPopup: React.FC<WinPopupProps> = ({ amount, type, onComplete }) => {
    const [displayAmount, setDisplayAmount] = useState(0);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        audioService.playWinCheer();
        setCanClose(false);

        let duration = 1500;
        if (type === 'BIG WIN') duration = 1750;
        else if (type === 'GREAT WIN') duration = 2000;
        else if (type === 'EPIC WIN') duration = 2500;
        else if (type === 'MEGA WIN') duration = 3000;
        else if (type === 'ULTIMATE WIN') duration = 3500;

        // Counting Animation
        const startTime = Date.now();
        const countDuration = Math.min(1000, duration - 300);

        const timerInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTime;
            if (elapsed >= countDuration) {
                setDisplayAmount(amount);
                clearInterval(timerInterval);
            } else {
                const progress = elapsed / countDuration;
                // Ease out cubic
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                setDisplayAmount(Math.floor(amount * easedProgress));
            }
        }, 16);

        const canCloseTimer = setTimeout(() => {
            setCanClose(true);
        }, 1500);

        return () => {
            clearTimeout(canCloseTimer);
            clearInterval(timerInterval);
        };
    }, [type, amount]);

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
            onClick={canClose ? onComplete : undefined}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm overflow-hidden"
            style={{ cursor: canClose ? 'pointer' : 'default' }}
        >
            <style>{`
                @keyframes coinFall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 1; }
                }
            `}</style>

            <div className="relative flex flex-col items-center z-20 w-full p-4">
                {/* Flat Title — 3X bigger */}
                <h2 className={`font-titan font-black uppercase text-center tracking-tighter mb-4 ${theme.color}`}
                    style={{ fontSize: 'clamp(72px, 18vw, 144px)', lineHeight: 1.05, WebkitTextStroke: '3px #000', paintOrder: 'stroke fill', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.8))' }}
                >
                    {theme.title}
                </h2>
                
                {/* Amount - No container, just huge text with heavy shadow */}
                <div className="text-4xl md:text-[4.5rem] font-mono font-black text-white transform scale-105"
                     style={{
                         textShadow: '0 0 5px #000, 0 0 10px #000, 0 3px 0 #000, 0 5px 5px rgba(0,0,0,0.5)',
                         WebkitTextStroke: '1px black'
                     }}>
                    {formatCommaNumber(displayAmount)}
                </div>

                {canClose && (
                    <button onClick={onComplete}
                        className="mt-6 px-8 py-3 rounded-2xl font-black uppercase text-white text-lg btn-3d"
                        style={{ background: 'linear-gradient(180deg,#22c55e,#15803d)', boxShadow: '0 4px 0 #052e16', border: '1px solid rgba(255,255,255,0.3)' }}>
                        COLLECT
                    </button>
                )}
            </div>

            {/* 2D Particles */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-10">
                {[...Array(particleCount)].map((_, i) => (
                    <div key={i} 
                            className="absolute text-xl opacity-80"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`, 
                                animation: `coinFall ${2 + Math.random() * 2}s linear infinite`,
                                animationDelay: `${Math.random() * 5}s`,
                            }}
                    >🪙</div>
                ))}
            </div>
        </div>
    );
};
