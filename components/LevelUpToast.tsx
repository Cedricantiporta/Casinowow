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
        <div className="fixed top-[40px] right-2 z-[200] animate-pop-in pointer-events-none"
            style={{ background: 'linear-gradient(180deg,#6820c0 0%,#3c0e90 45%,#1a0535)', border: '1px solid rgba(180,120,255,0.45)', borderRadius: 14, padding: '10px 14px', boxShadow: 'inset 0 1px 0 rgba(210,160,255,0.5), 0 4px 0 #0e0028, 0 8px 24px rgba(0,0,0,0.8)' }}>
            <div className="flex items-center gap-2">
                <img src="/ui/star.png" alt="" style={{ width: '1.6rem', height: '1.6rem', objectFit: 'contain' }} />
                <div>
                    <div className="font-black text-white text-xs uppercase tracking-widest">Level {level}!</div>
                    {reward > 0 && <div className="text-purple-300 text-[9px] font-bold">+{formatNumber(reward)} coins</div>}
                    {maxBetIncreased && <div className="text-yellow-300 text-[9px] font-bold">Max Bet ↑ {formatNumber(newMaxBet)}</div>}
                </div>
            </div>
        </div>
    );
};
