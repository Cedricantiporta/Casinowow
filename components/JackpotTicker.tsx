
import React, { useState, useEffect } from 'react';
import { formatK } from '../constants';

const JP_MULTIPLIERS = [10, 20, 30, 50, 100];

const TOPBAR_IMGS = [
    '/topbarjackpot (1).png',
    '/topbarjackpot (2).png',
    '/topbarjackpot (3).png',
    '/topbarjackpot (4).png',
    '/topbarjackpot (5).png',
];
const TIER_KEYS = ['mini', 'minor', 'major', 'mega', 'grand'] as const;
const TIER_CLASSES = ['t-green', 't-cyan', 't-purple', 't-red', 't-gold'] as const;
const TIER_NAMES = ['MINI', 'MINOR', 'MAJOR', 'MEGA', 'GRAND'] as const;

interface JackpotTickerProps {
    slotIdx?: number;
    currentBet: number;
    isSpinning?: boolean;
    theme?: string;
}

export const JackpotTicker: React.FC<JackpotTickerProps> = ({ currentBet }) => {
    const [growth, setGrowth] = useState<number[]>([0, 0, 0, 0, 0]);

    useEffect(() => {
        setGrowth([0, 0, 0, 0, 0]);
    }, [currentBet]);

    useEffect(() => {
        const id = setInterval(() => {
            setGrowth(prev => prev.map((v) =>
                v + Math.floor(Math.random() * currentBet * 0.0012 + currentBet * 0.0006)
            ));
        }, 120);
        return () => clearInterval(id);
    }, [currentBet]);

    const amounts = JP_MULTIPLIERS.map((m, i) => Math.floor(currentBet * m + growth[i]));

    return (
        <div className="jackpot font-nunito w-full select-none">
            {TIER_KEYS.map((key, idx) => (
                <div key={key} className={`jp ${TIER_CLASSES[idx]}`}>
                    <div className="jp-tier flex items-center justify-center">
                        <img
                            src={TOPBAR_IMGS[idx]}
                            alt={TIER_NAMES[idx]}
                            className="select-none pointer-events-none"
                            style={{ height: '1.4em', width: 'auto', objectFit: 'contain' }}
                        />
                    </div>
                    <div className="jp-amt">{formatK(amounts[idx] ?? 0)}</div>
                </div>
            ))}
        </div>
    );
};
