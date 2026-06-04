import React, { useState, useEffect } from 'react';
import { formatCommaNumber } from '../constants';

interface JackpotCelebrationProps {
    tier: { name: string; color: string; icon: string; amount: number } | null;
    onClose: () => void;
}

const TIER_STYLES: Record<string, { bg: string; glow: string; textColor: string }> = {
    MINI:  { bg: 'linear-gradient(160deg,#052e16,#14532d,#052e16)', glow: '#22c55e', textColor: '#4ade80' },
    MINOR: { bg: 'linear-gradient(160deg,#0c1a5e,#1e3a8a,#0c1a5e)', glow: '#60a5fa', textColor: '#93c5fd' },
    MAJOR: { bg: 'linear-gradient(160deg,#2e1065,#5b21b6,#2e1065)', glow: '#a855f7', textColor: '#c084fc' },
    MEGA:  { bg: 'linear-gradient(160deg,#4c0519,#9f1239,#4c0519)', glow: '#f43f5e', textColor: '#fb7185' },
    GRAND: { bg: 'linear-gradient(160deg,#451a03,#92400e,#451a03)', glow: '#fbbf24', textColor: '#fde68a' },
};

export const JackpotCelebration: React.FC<JackpotCelebrationProps> = ({ tier, onClose }) => {
    const [canClose, setCanClose] = useState(false);
    const [displayAmount, setDisplayAmount] = useState(0);

    useEffect(() => {
        if (!tier) return;
        setCanClose(false);
        setDisplayAmount(0);
        const lockTimer = setTimeout(() => setCanClose(true), 3000);
        // count up animation
        const startTime = Date.now();
        const duration = 2000;
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) { setDisplayAmount(tier.amount); clearInterval(interval); return; }
            const p = 1 - Math.pow(1 - elapsed / duration, 3);
            setDisplayAmount(Math.floor(tier.amount * p));
        }, 16);
        return () => { clearTimeout(lockTimer); clearInterval(interval); };
    }, [tier]);

    if (!tier) return null;

    const style = TIER_STYLES[tier.name] || TIER_STYLES.GRAND;

    return (
        <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center select-none"
            style={{ background: style.bg }}
            onClick={canClose ? onClose : undefined}>
            {/* Particle icons */}
            <style>{`
                @keyframes jpFall { 0%{transform:translateY(-10vh) rotate(0deg);opacity:0} 10%{opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0.6} }
            `}</style>
            {[...Array(30)].map((_, i) => (
                <div key={i} className="absolute text-2xl pointer-events-none"
                    style={{ left:`${Math.random()*100}%`, top:'-10%', animation:`jpFall ${2+Math.random()*3}s linear infinite`, animationDelay:`${Math.random()*4}s` }}>
                    {tier.icon}
                </div>
            ))}

            <div className="relative z-10 flex flex-col items-center gap-3 p-6">
                <div className="text-6xl leading-none drop-shadow-2xl animate-bounce">{tier.icon}</div>
                <div className="font-black uppercase tracking-widest text-center"
                    style={{ fontSize:'clamp(36px,10vw,72px)', color: style.textColor, WebkitTextStroke:'3px rgba(0,0,0,0.8)', paintOrder:'stroke fill', filter:`drop-shadow(0 0 20px ${style.glow}) drop-shadow(0 0 40px ${style.glow})` }}>
                    {tier.name} JACKPOT!
                </div>
                <div className="font-mono font-black text-white"
                    style={{ fontSize:'clamp(24px,6vw,48px)', WebkitTextStroke:'2px #000', paintOrder:'stroke fill', textShadow:`0 0 15px ${style.glow}, 0 0 30px ${style.glow}` }}>
                    +{formatCommaNumber(displayAmount)}
                </div>

                {canClose ? (
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="mt-4 px-10 py-3 rounded-2xl font-black uppercase text-white text-xl btn-3d animate-pop-in"
                        style={{ background:`linear-gradient(180deg,${style.glow},rgba(0,0,0,0.5))`, boxShadow:`0 4px 0 rgba(0,0,0,0.6), 0 0 20px ${style.glow}`, border:`1px solid ${style.textColor}` }}>
                        COLLECT 🎉
                    </button>
                ) : (
                    <div className="mt-4 text-white/40 text-sm font-bold uppercase tracking-widest animate-pulse">
                        Please wait...
                    </div>
                )}
            </div>
        </div>
    );
};
