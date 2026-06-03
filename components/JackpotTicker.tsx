
import React, { useState, useEffect, useRef } from 'react';
import { formatCommaNumber } from '../constants';

interface JackpotTickerProps {
    currentBet: number;
    isSpinning?: boolean;
}

const JACKPOT_CONFIG = [
    { name: 'MINI', multiplier: 50, tierClass: 't-green' },
    { name: 'MINOR', multiplier: 150, tierClass: 't-cyan' },
    { name: 'MAJOR', multiplier: 500, tierClass: 't-purple' },
    { name: 'MAXI', multiplier: 1500, tierClass: 't-red' },
    { name: 'GRAND', multiplier: 5000, tierClass: 't-gold' }
];

export const JackpotTicker: React.FC<JackpotTickerProps> = ({ currentBet, isSpinning = false }) => {
    const [amounts, setAmounts] = useState<number[]>(() =>
        JACKPOT_CONFIG.map(jp => currentBet * jp.multiplier + Math.floor(Math.random() * currentBet * 0.5))
    );
    const prevBetRef = useRef(currentBet);

    // Reset to new base when bet changes
    useEffect(() => {
        if (currentBet !== prevBetRef.current) {
            prevBetRef.current = currentBet;
            setAmounts(JACKPOT_CONFIG.map(jp => currentBet * jp.multiplier));
        }
    }, [currentBet]);

    // Continuously increase during spin
    useEffect(() => {
        if (!isSpinning) return;
        const interval = setInterval(() => {
            const tick = Math.max(50, currentBet * 0.0008);
            setAmounts(prev => prev.map(v => v + Math.floor(Math.random() * tick + tick * 0.3)));
        }, 60);
        return () => clearInterval(interval);
    }, [isSpinning, currentBet]);

    return (
        <div className="jackpot font-nunito w-full select-none">
            {JACKPOT_CONFIG.map((jp, idx) => (
                <div key={jp.name} className={`jp ${jp.tierClass}`}>
                    <div className="jp-tier">{jp.name}</div>
                    <div className="jp-amt">{formatCommaNumber(amounts[idx])}</div>
                </div>
            ))}
        </div>
    );
};
