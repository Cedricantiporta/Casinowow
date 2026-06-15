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
            style={{ background: 'linear-gradient(160deg,#1a0535,#3b0764)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
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
