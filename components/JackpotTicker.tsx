
import React, { useState, useEffect } from 'react';
import { formatK } from '../constants';

// Jackpot prizes are currentBet × these multipliers (same as win amounts)
const JP_MULTIPLIERS = [20, 35, 55, 75, 100];

const TIER_META = [
    { name: 'MINI',  tierClass: 't-green'  },
    { name: 'MINOR', tierClass: 't-cyan'   },
    { name: 'MAJOR', tierClass: 't-purple' },
    { name: 'MAXI',  tierClass: 't-red'    },
    { name: 'GRAND', tierClass: 't-gold'   },
];

interface JackpotTickerProps {
    slotIdx?: number;
    currentBet: number;
    isSpinning?: boolean;
}

export const JackpotTicker: React.FC<JackpotTickerProps> = ({ currentBet, isSpinning = false }) => {
    // Small animated growth on top of base amounts for visual excitement
    const [growth, setGrowth] = useState<number[]>([0, 0, 0, 0, 0]);

    useEffect(() => {
        setGrowth([0, 0, 0, 0, 0]);
    }, [currentBet]);

    useEffect(() => {
        const id = setInterval(() => {
            setGrowth(prev => prev.map((v, i) =>
                v + Math.floor(Math.random() * currentBet * 0.002 + currentBet * 0.001)
            ));
        }, 60);
        return () => clearInterval(id);
    }, [currentBet]);

    const amounts = JP_MULTIPLIERS.map((m, i) => Math.floor(currentBet * m + growth[i]));

    return (
        <div className="jackpot font-nunito w-full select-none">
            {TIER_META.map((tier, idx) => (
                <div key={tier.name} className={`jp ${tier.tierClass}`}>
                    <div className="jp-tier">{tier.name}</div>
                    <div className="jp-amt">{formatK(amounts[idx] ?? 0)}</div>
                </div>
            ))}
        </div>
    );
};
