
import React, { useState, useEffect } from 'react';
import { formatCommaNumber } from '../constants';

interface JackpotTickerProps {
    currentBet: number;
}

const JACKPOT_CONFIG = [
    { name: 'MINI', multiplier: 50, tierClass: 't-green' },
    { name: 'MINOR', multiplier: 150, tierClass: 't-cyan' },
    { name: 'MAJOR', multiplier: 500, tierClass: 't-purple' },
    { name: 'MAXI', multiplier: 1500, tierClass: 't-red' },
    { name: 'GRAND', multiplier: 5000, tierClass: 't-gold' }
];

export const JackpotTicker: React.FC<JackpotTickerProps> = ({ currentBet }) => {
    const [fluctuation, setFluctuation] = useState<number[]>([0, 0, 0, 0, 0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setFluctuation(prev => prev.map(() => Math.floor(Math.random() * (currentBet * 0.1 || 500))));
        }, 1000);
        return () => clearInterval(interval);
    }, [currentBet]);

    return (
        <div className="jackpot font-nunito w-full select-none">
            {JACKPOT_CONFIG.map((jp, idx) => {
                const baseAmount = currentBet * jp.multiplier;
                const displayAmount = baseAmount + fluctuation[idx];

                return (
                    <div key={jp.name} className={`jp ${jp.tierClass}`}>
                        <div className="jp-tier">{jp.name}</div>
                        <div className="jp-box">
                            <div className="jp-amt">
                                {formatCommaNumber(displayAmount)}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

