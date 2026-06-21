
import React, { useState, useEffect } from 'react';
import { formatK } from '../constants';

// Jackpot prizes are currentBet × these multipliers (same as win amounts)
const JP_MULTIPLIERS = [10, 20, 30, 50, 100];

const TIER_META = [
    { name: 'MINI',  tierClass: 't-green',  img: '/mini.png'  },
    { name: 'MINOR', tierClass: 't-cyan',   img: '/minor.png' },
    { name: 'MAJOR', tierClass: 't-purple', img: '/major.png' },
    { name: 'MEGA',  tierClass: 't-red',    img: '/mega.png'  },
    { name: 'GRAND', tierClass: 't-gold',   img: '/grand.png' },
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
                    <div className="jp-tier flex items-center justify-center">
                        <img src={tier.img} alt={tier.name} className="select-none pointer-events-none" style={{ height: '1.1em', width: 'auto', objectFit: 'contain' }} />
                    </div>
                    <div className="jp-amt">{formatK(amounts[idx] ?? 0)}</div>
                </div>
            ))}
        </div>
    );
};
