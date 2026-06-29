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
        const timer = setTimeout(onClose, 1500);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="absolute top-[38px] right-2 z-[200] animate-pop-in pointer-events-none">
            <div className="rounded-2xl overflow-hidden flex items-center gap-2.5" style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 6px 20px rgba(0,0,0,0.8)', padding: '9px 13px' }}>
                <img src="/topbar_levelstar.png" alt="" style={{ width: '1.4rem', height: '1.4rem', objectFit: 'contain', flexShrink: 0 }} />
                <div>
                    <div className="font-tanker text-white" style={{ fontSize: '0.95rem', lineHeight: 1.1 }}>Level {level}!</div>
                    {reward > 0 && <div className="text-purple-200 font-bold" style={{ fontSize: 9, marginTop: 2 }}>+{formatNumber(reward)} coins</div>}
                    {maxBetIncreased && <div className="text-yellow-300 font-bold" style={{ fontSize: 9 }}>Max Bet ↑ {formatNumber(newMaxBet)}</div>}
                </div>
            </div>
        </div>
    );
};
