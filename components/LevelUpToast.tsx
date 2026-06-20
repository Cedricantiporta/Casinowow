import React, { useEffect } from 'react';
import { formatNumber } from '../constants';

interface LevelUpToastProps {
    level: number;
    reward: number;
    maxBetIncreased: boolean;
    newMaxBet: number;
    onClose: () => void;
}

export const LevelUpToast: React.FC<LevelUpToastProps> = ({ level, reward, maxBetIncreased, newMaxBet, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 2500);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/10 backdrop-blur-md pointer-events-none animate-pop-in">
            <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)', padding: '24px 36px' }}>
                <div className="flex flex-col items-center gap-3 text-center">
                    <img src="/ui/star.png" alt="" style={{ width: '3rem', height: '3rem', objectFit: 'contain' }} />
                    <div>
                        <div className="font-tanker text-white tracking-widest" style={{ fontSize: '1.4rem' }}>Level {level}!</div>
                        {reward > 0 && <div className="text-purple-300 text-sm font-bold mt-1">+{formatNumber(reward)} coins</div>}
                        {maxBetIncreased && <div className="text-yellow-300 text-sm font-bold">Max Bet ↑ {formatNumber(newMaxBet)}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
