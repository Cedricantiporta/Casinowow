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
        const timer = setTimeout(onClose, 1000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-[40px] md:top-[70px] right-2 md:right-4 z-[200] w-full max-w-[180px] origin-top-right pointer-events-none">
            <div 
                onClick={onClose}
                className="animate-pop-in cursor-pointer pointer-events-auto bg-zinc-950 rounded-xl p-3 shadow-2xl flex flex-col items-center text-center leading-tight"
            >
                <h3 className="text-xs font-display font-medium text-white mb-2 tracking-widest opacity-90">
                    LEVEL {level}
                </h3>
                
                {reward > 0 && (
                    <div className="bg-green-800 px-2.5 py-0.5 rounded-md mb-2">
                        <span className="text-green-200 font-mono font-bold text-xs">
                            +{formatNumber(reward)}
                        </span>
                    </div>
                )}
                
                {maxBetIncreased && (
                    <div className="flex flex-col items-center mt-1 animate-pulse">
                        <div className="text-gold-300 text-[8px] font-bold uppercase tracking-wider mb-0.5">
                            MAX BET UP
                        </div>
                        <div className="bg-gold-900 px-2 py-0.5 rounded text-gold-100 font-mono font-bold text-[10px] shadow-md">
                            {formatNumber(newMaxBet)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
