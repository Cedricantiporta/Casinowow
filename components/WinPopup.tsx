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
    
    useEffect(() => {
        audioService.playWinCheer();

        let duration = 3000; 
        if (type === 'BIG WIN') duration = 3500;
        else if (type === 'GREAT WIN') duration = 4000;
        else if (type === 'EPIC WIN') duration = 5000;
        else if (type === 'MEGA WIN') duration = 6000;
        else if (type === 'ULTIMATE WIN') duration = 7000;
        
        // Counting Animation
        const startTime = Date.now();
        const countDuration = Math.min(2000, duration - 500); // Count faster than total popup time
        
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

        const completeTimer = setTimeout(() => {
            onComplete();
        }, duration); 
        return () => {
            clearTimeout(completeTimer);
            clearInterval(timerInterval);
        };
    }, [onComplete, type, amount]);

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
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm cursor-pointer overflow-hidden"
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
